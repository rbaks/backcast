import { describe, it, expect } from "vitest";
import {
  BENCHMARKS,
  BENCHMARK_TICKERS,
  benchmarkPortfolio,
  compareToBenchmark,
} from "./benchmark.ts";
import { computePortfolioValueSeries } from "./backtest.ts";
import type { PriceSeries, ValuePoint } from "./types.ts";

describe("benchmarkPortfolio", () => {
  it("splits invested dollars across legs by weight (60-40)", () => {
    const p = benchmarkPortfolio("60-40", 10_000, "2015-01-01");
    expect(p.startDate).toBe("2015-01-01");
    expect(p.holdings).toEqual([
      { ticker: "VOO", amount: 6_000 },
      { ticker: "BND", amount: 4_000 },
    ]);
  });

  it("puts the whole amount in a single-ticker benchmark", () => {
    const p = benchmarkPortfolio("voo", 5_000, "2015-01-01");
    expect(p.holdings).toEqual([{ ticker: "VOO", amount: 5_000 }]);
  });

  it("every benchmark's leg weights sum to 1", () => {
    for (const def of Object.values(BENCHMARKS)) {
      const sum = def.legs.reduce((s, l) => s + l.weight, 0);
      expect(sum).toBeCloseTo(1, 10);
    }
  });

  it("BENCHMARK_TICKERS is the deduped union of every leg", () => {
    expect([...BENCHMARK_TICKERS].sort()).toEqual(["BND", "QQQ", "VOO"]);
  });
});

// VOO and BND price histories with the same dates so they overlap cleanly.
const VOO: PriceSeries = [
  { date: "2020-01-01", adjClose: 100 },
  { date: "2020-02-01", adjClose: 110 },
  { date: "2020-03-01", adjClose: 120 },
];
const BND: PriceSeries = [
  { date: "2020-01-01", adjClose: 50 },
  { date: "2020-02-01", adjClose: 51 },
  { date: "2020-03-01", adjClose: 52 },
];

describe("60-40 linearity through the engine", () => {
  it("blend value == 0.6·(VOO-only) + 0.4·(BND-only) at every date", () => {
    const prices = { VOO, BND };
    const invested = 10_000;
    const blend = computePortfolioValueSeries(
      benchmarkPortfolio("60-40", invested, "2020-01-01"),
      prices,
    ).series;
    const vooOnly = computePortfolioValueSeries(
      benchmarkPortfolio("voo", invested, "2020-01-01"),
      prices,
    ).series;
    const bndOnly = computePortfolioValueSeries(
      { startDate: "2020-01-01", holdings: [{ ticker: "BND", amount: invested }] },
      prices,
    ).series;

    blend.forEach((p, i) => {
      expect(p.value).toBeCloseTo(0.6 * vooOnly[i].value + 0.4 * bndOnly[i].value, 6);
    });
  });
});

describe("validation anchor", () => {
  it("a VOO benchmark reproduces the index's own total return", () => {
    // VOO 100 -> 120 over the window is +20%. The synthetic benchmark must agree.
    const series = computePortfolioValueSeries(
      benchmarkPortfolio("voo", 1_000, "2020-01-01"),
      { VOO },
    ).series;
    const tr = series[series.length - 1].value / series[0].value - 1;
    expect(tr).toBeCloseTo(0.2, 10);
  });
});

// Helpers for compareToBenchmark: plain value series.
const vp = (pairs: [string, number][]): ValuePoint[] =>
  pairs.map(([date, value]) => ({ date, value }));

describe("compareToBenchmark", () => {
  it("positive trDelta + beat when the portfolio outperforms", () => {
    const port = vp([["2020-01-01", 100], ["2021-01-01", 200]]); // +100%
    const bench = vp([["2020-01-01", 100], ["2021-01-01", 150]]); // +50%
    const c = compareToBenchmark(port, bench)!;
    expect(c.trDelta).toBeCloseTo(0.5, 10);
    expect(c.beat).toBe(true);
    expect(c.sinceYear).toBeNull();
    expect(c.years).toBeCloseTo(1, 1);
  });

  it("negative trDelta + not beat when the portfolio lags", () => {
    const port = vp([["2020-01-01", 100], ["2021-01-01", 120]]); // +20%
    const bench = vp([["2020-01-01", 100], ["2021-01-01", 150]]); // +50%
    const c = compareToBenchmark(port, bench)!;
    expect(c.trDelta).toBeCloseTo(-0.3, 10);
    expect(c.beat).toBe(false);
  });

  it("uses overlapStart = later first date, and sets sinceYear", () => {
    // Benchmark starts a year later than the portfolio window.
    const port = vp([
      ["2019-01-01", 100],
      ["2020-01-01", 110],
      ["2021-01-01", 140],
    ]);
    const bench = vp([
      ["2020-01-01", 100],
      ["2021-01-01", 130],
    ]);
    const c = compareToBenchmark(port, bench)!;
    expect(c.sinceYear).toBe(2020);
    // Portfolio over the overlap: 110 -> 140 = +27.27%; bench +30%.
    expect(c.trDelta).toBeCloseTo(140 / 110 - 1 - 0.3, 10);
  });

  it("returns null with fewer than 2 overlapping points", () => {
    const port = vp([["2020-01-01", 100], ["2021-01-01", 120]]);
    const bench = vp([["2021-01-01", 100], ["2022-01-01", 130]]); // overlap = 1 pt
    expect(compareToBenchmark(port, bench)).toBeNull();
  });

  it("returns null when either series is too short", () => {
    expect(compareToBenchmark(vp([["2020-01-01", 100]]), vp([["2020-01-01", 100], ["2021-01-01", 110]]))).toBeNull();
  });
});
