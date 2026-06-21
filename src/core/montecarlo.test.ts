import { describe, it, expect } from "vitest";
import {
  addMonths,
  simulateCone,
  SCENARIO_ANNUAL_SHIFT,
  type SimParams,
} from "./montecarlo.ts";

const base: SimParams = {
  startValue: 10000,
  startDate: "2026-01-01",
  monthlyMean: 0.008, // ~10%/yr
  monthlyVol: 0.04, // ~14%/yr
  months: 120,
  sims: 800,
  seed: 42,
};

describe("addMonths", () => {
  it("steps forward in UTC months", () => {
    expect(addMonths("2026-01-01", 1)).toBe("2026-02-01");
    expect(addMonths("2026-01-01", 12)).toBe("2027-01-01");
    expect(addMonths("2026-11-01", 3)).toBe("2027-02-01");
  });
});

describe("simulateCone", () => {
  it("is deterministic for a given seed", () => {
    const a = simulateCone(base);
    const b = simulateCone(base);
    expect(a.band).toEqual(b.band);
  });

  it("produces one band point per month, dated monthly from the start", () => {
    const { band } = simulateCone(base);
    expect(band).toHaveLength(120);
    expect(band[0].date).toBe("2026-02-01");
    expect(band[119].date).toBe("2036-01-01");
  });

  it("keeps percentiles ordered p10 <= p50 <= p90 at every step", () => {
    const { band } = simulateCone(base);
    for (const p of band) {
      expect(p.p10).toBeLessThanOrEqual(p.p50);
      expect(p.p50).toBeLessThanOrEqual(p.p90);
    }
  });

  it("widens the cone over time (later spread > earlier spread)", () => {
    const { band } = simulateCone(base);
    const early = band[0].p90 - band[0].p10;
    const late = band[band.length - 1].p90 - band[band.length - 1].p10;
    expect(late).toBeGreaterThan(early);
  });

  it("grows the median upward with a positive drift", () => {
    const { band } = simulateCone(base);
    expect(band[band.length - 1].p50).toBeGreaterThan(base.startValue);
  });

  it("a bull shift lifts the median above the base case", () => {
    const baseRun = simulateCone(base);
    const bull = simulateCone({
      ...base,
      monthlyMean: base.monthlyMean + SCENARIO_ANNUAL_SHIFT.bull / 12,
    });
    const last = (r: typeof baseRun) => r.band[r.band.length - 1].p50;
    expect(last(bull)).toBeGreaterThan(last(baseRun));
  });

  it("returns an empty band for degenerate inputs", () => {
    expect(simulateCone({ ...base, months: 0 }).band).toEqual([]);
    expect(simulateCone({ ...base, startValue: 0 }).band).toEqual([]);
  });
});
