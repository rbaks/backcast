import { describe, it, expect } from "vitest";
import { computePortfolioValueSeries } from "./backtest.ts";
import type { PriceSeries } from "./types.ts";

const A: PriceSeries = [
  { date: "2020-01-01", adjClose: 100 },
  { date: "2020-02-01", adjClose: 110 },
  { date: "2020-03-01", adjClose: 200 },
];
const B: PriceSeries = [
  { date: "2020-01-01", adjClose: 50 },
  { date: "2020-02-01", adjClose: 50 },
  { date: "2020-03-01", adjClose: 25 },
];

describe("computePortfolioValueSeries", () => {
  it("buys fixed shares at start and holds (single ticker doubling)", () => {
    const r = computePortfolioValueSeries(
      { startDate: "2020-01-01", holdings: [{ ticker: "A", amount: 1000 }] },
      { A },
    );
    expect(r.series.map((p) => p.value)).toEqual([1000, 1100, 2000]);
    expect(r.clamped).toBe(false);
  });

  it("sums multiple holdings at each date", () => {
    const r = computePortfolioValueSeries(
      {
        startDate: "2020-01-01",
        holdings: [
          { ticker: "A", amount: 1000 }, // 10 sh
          { ticker: "B", amount: 1000 }, // 20 sh
        ],
      },
      { A, B },
    );
    // 2020-03: 10*200 + 20*25 = 2500
    expect(r.series[2].value).toBe(2500);
  });

  it("clamps the start date forward and warns when data starts late", () => {
    const r = computePortfolioValueSeries(
      { startDate: "2019-01-01", holdings: [{ ticker: "A", amount: 100 }] },
      { A },
    );
    expect(r.clamped).toBe(true);
    expect(r.startDate).toBe("2020-01-01");
    expect(r.warnings.some((w) => w.includes("clamped"))).toBe(true);
  });

  it("uses only dates common to all held tickers", () => {
    const short: PriceSeries = [{ date: "2020-01-01", adjClose: 10 }];
    const r = computePortfolioValueSeries(
      {
        startDate: "2020-01-01",
        holdings: [
          { ticker: "A", amount: 100 },
          { ticker: "SHORT", amount: 100 },
        ],
      },
      { A, SHORT: short },
    );
    expect(r.series).toHaveLength(1);
    expect(r.series[0].date).toBe("2020-01-01");
  });

  it("drops missing tickers and reports them", () => {
    const r = computePortfolioValueSeries(
      {
        startDate: "2020-01-01",
        holdings: [
          { ticker: "A", amount: 1000 },
          { ticker: "NOPE", amount: 1000 },
        ],
      },
      { A },
    );
    expect(r.missingTickers).toEqual(["NOPE"]);
    expect(r.series[0].value).toBe(1000);
  });

  it("returns an empty result when no holdings have data", () => {
    const r = computePortfolioValueSeries(
      { startDate: "2020-01-01", holdings: [{ ticker: "NOPE", amount: 1000 }] },
      { A },
    );
    expect(r.series).toEqual([]);
    expect(r.missingTickers).toEqual(["NOPE"]);
  });
});
