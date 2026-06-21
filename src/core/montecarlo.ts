// Forward projection engine: a Monte Carlo "cone of outcomes".
//
// The backtest replays the *factual* past. This projects a *modeled* future:
// resample the portfolio's historical monthly-return behavior (mean + vol)
// forward N months across many simulated paths, then read percentile bands at
// each future month. The spread between p10 and p90 is the cone — uncertainty
// made visible, never a single false-precision number.
//
// Pure and framework-free so it runs identically in a Web Worker and in a unit
// test. Deterministic given `seed`.

import type { ISODate } from "./types.ts";

/** A market scenario: shifts the projected annual return up or down. */
export type Scenario = "bear" | "base" | "bull";

/** Annual return shift applied on top of the historical mean for each scenario. */
export const SCENARIO_ANNUAL_SHIFT: Record<Scenario, number> = {
  bear: -0.03,
  base: 0,
  bull: 0.03,
};

export const SCENARIOS: Scenario[] = ["bear", "base", "bull"];

export interface SimParams {
  /** Value the cone emanates from — the last historical portfolio value. */
  startValue: number;
  /** Date of that last historical value; the cone steps monthly from here. */
  startDate: ISODate;
  /** Mean monthly simple return (already scenario-adjusted by the caller). */
  monthlyMean: number;
  /** Standard deviation of monthly simple returns. */
  monthlyVol: number;
  /** Number of forward months to project. */
  months: number;
  /** Simulated paths to run. */
  sims: number;
  /** PRNG seed — same seed ⇒ same cone (stable UI, testable). */
  seed: number;
}

/**
 * One future month. Two nested bands plus the median:
 *   - p10..p90 is the 80% band (the outer cone),
 *   - p25..p75 is the 50% interquartile range (the denser inner cone),
 *   - p50 is the median.
 */
export interface ConePoint {
  date: ISODate;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface ConeResult {
  band: ConePoint[];
}

/** mulberry32 — tiny, fast, seedable PRNG. Returns floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard-normal draws via Box–Muller, driven by a uniform PRNG. */
function gaussian(rand: () => number): () => number {
  return () => {
    // u1 in (0,1] to keep log finite.
    const u1 = 1 - rand();
    const u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

/** Linear-interpolated percentile of an ascending-sorted array. */
function percentile(sortedAsc: Float64Array, p: number): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  if (n === 1) return sortedAsc[0];
  const idx = (n - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

/** Add `n` calendar months to an ISO date, in UTC. */
export function addMonths(iso: ISODate, n: number): ISODate {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, d)).toISOString().slice(0, 10);
}

/**
 * Run the simulation and return percentile bands per future month.
 *
 * Each path compounds monthly simple returns drawn from N(monthlyMean,
 * monthlyVol). Value is floored at 0 (a position can't go negative); with
 * realistic monthly vol the floor is essentially never hit. The first band
 * point is one month after `startDate`.
 */
export function simulateCone(params: SimParams): ConeResult {
  const { startValue, startDate, monthlyMean, monthlyVol, months, sims, seed } =
    params;

  if (months <= 0 || sims <= 0 || startValue <= 0) {
    return { band: [] };
  }

  const nextNormal = gaussian(mulberry32(seed));

  // cols[m][s] = value of path s at future month m. One column per month so we
  // can sort each independently for its percentiles.
  const cols: Float64Array[] = Array.from(
    { length: months },
    () => new Float64Array(sims),
  );

  for (let s = 0; s < sims; s++) {
    let v = startValue;
    for (let m = 0; m < months; m++) {
      const r = monthlyMean + monthlyVol * nextNormal();
      v = v * (1 + r);
      if (v < 0) v = 0;
      cols[m][s] = v;
    }
  }

  const band: ConePoint[] = [];
  for (let m = 0; m < months; m++) {
    const col = cols[m];
    col.sort();
    band.push({
      date: addMonths(startDate, m + 1),
      p10: percentile(col, 0.1),
      p25: percentile(col, 0.25),
      p50: percentile(col, 0.5),
      p75: percentile(col, 0.75),
      p90: percentile(col, 0.9),
    });
  }

  return { band };
}
