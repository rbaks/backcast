import { describe, it, expect } from "vitest";
import { computeStats, maxDrawdown, yearlyReturns } from "./stats.ts";
import type { ValuePoint } from "./types.ts";

describe("computeStats", () => {
  it("computes total return and ~CAGR over a clean doubling in one year", () => {
    const series: ValuePoint[] = [
      { date: "2020-01-01", value: 100 },
      { date: "2021-01-01", value: 200 },
    ];
    const s = computeStats(series)!;
    expect(s.totalReturn).toBeCloseTo(1.0, 6);
    expect(s.cagr).toBeCloseTo(1.0, 2); // ~+100%/yr
  });

  it("returns null for fewer than two points", () => {
    expect(computeStats([{ date: "2020-01-01", value: 100 }])).toBeNull();
  });

  it("finds best and worst calendar years", () => {
    const series: ValuePoint[] = [
      { date: "2019-12-01", value: 100 },
      { date: "2020-12-01", value: 150 }, // +50%
      { date: "2021-12-01", value: 120 }, // -20%
    ];
    const s = computeStats(series)!;
    expect(s.best?.year).toBe(2020);
    expect(s.best?.return).toBeCloseTo(0.5, 6);
    expect(s.worst?.year).toBe(2021);
    expect(s.worst?.return).toBeCloseTo(-0.2, 6);
  });
});

describe("maxDrawdown", () => {
  it("measures the largest peak-to-trough decline", () => {
    const series: ValuePoint[] = [
      { date: "2020-01-01", value: 100 },
      { date: "2020-02-01", value: 120 }, // peak
      { date: "2020-03-01", value: 60 }, // -50% from peak
      { date: "2020-04-01", value: 90 },
    ];
    expect(maxDrawdown(series)).toBeCloseTo(-0.5, 6);
  });
});

describe("yearlyReturns", () => {
  it("uses year-end values vs the prior year-end", () => {
    const series: ValuePoint[] = [
      { date: "2020-06-01", value: 100 },
      { date: "2020-12-01", value: 110 },
      { date: "2021-12-01", value: 132 }, // +20% on 110
    ];
    const yrs = yearlyReturns(series);
    expect(yrs.find((y) => y.year === 2021)?.return).toBeCloseTo(0.2, 6);
  });
});
