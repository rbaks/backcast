// Performance statistics derived from a portfolio value series. Pure functions.
// These are the numbers the stats panel shows — and the reason to build this by
// hand: you understand CAGR/volatility/drawdown because you implemented them.

import type { ISODate, ValuePoint } from "./types.ts";

export interface YearReturn {
  year: number;
  return: number; // fractional, e.g. 0.287 = +28.7%
}

export interface PortfolioStats {
  startValue: number;
  endValue: number;
  /** Fractional total return over the whole window, e.g. 1.412 = +141.2%. */
  totalReturn: number;
  /** Compound annual growth rate, fractional. */
  cagr: number;
  /** Annualized volatility of monthly returns, fractional. */
  volatility: number;
  /** Largest peak-to-trough decline, fractional and negative (e.g. -0.239). */
  maxDrawdown: number;
  best: YearReturn | null;
  worst: YearReturn | null;
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function yearsBetween(a: ISODate, b: ISODate): number {
  return (Date.parse(b) - Date.parse(a)) / MS_PER_YEAR;
}

/** Sample standard deviation (n-1). Returns 0 for fewer than 2 points. */
function sampleStdDev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const variance =
    xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/** Period-over-period simple returns of a value series. */
function periodReturns(series: ValuePoint[]): number[] {
  const rs: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].value;
    if (prev > 0) rs.push(series[i].value / prev - 1);
  }
  return rs;
}

/**
 * Mean and standard deviation of the series' period-over-period returns.
 * For monthly data these are *monthly* moments — the projection engine resamples
 * them forward. Returns zeros for a series too short to have ≥2 returns.
 */
export function monthlyMoments(series: ValuePoint[]): { mean: number; vol: number } {
  const rs = periodReturns(series);
  if (rs.length < 2) return { mean: 0, vol: 0 };
  const mean = rs.reduce((s, x) => s + x, 0) / rs.length;
  return { mean, vol: sampleStdDev(rs) };
}

/** Calendar-year returns, using each year's last value vs the prior year's last. */
export function yearlyReturns(series: ValuePoint[]): YearReturn[] {
  if (series.length === 0) return [];
  const lastByYear = new Map<number, number>();
  for (const p of series) {
    lastByYear.set(new Date(p.date).getUTCFullYear(), p.value);
  }
  const years = [...lastByYear.keys()].sort((a, b) => a - b);
  const out: YearReturn[] = [];
  let prev = series[0].value;
  for (const y of years) {
    const end = lastByYear.get(y)!;
    if (prev > 0) out.push({ year: y, return: end / prev - 1 });
    prev = end;
  }
  return out;
}

export function maxDrawdown(series: ValuePoint[]): number {
  let peak = -Infinity;
  let worst = 0;
  for (const p of series) {
    if (p.value > peak) peak = p.value;
    if (peak > 0) {
      const dd = p.value / peak - 1;
      if (dd < worst) worst = dd;
    }
  }
  return worst;
}

export function computeStats(series: ValuePoint[]): PortfolioStats | null {
  if (series.length < 2) return null;

  const startValue = series[0].value;
  const endValue = series[series.length - 1].value;
  const totalReturn = startValue > 0 ? endValue / startValue - 1 : 0;

  const years = yearsBetween(series[0].date, series[series.length - 1].date);
  const cagr =
    years > 0 && startValue > 0 ? (endValue / startValue) ** (1 / years) - 1 : 0;

  // Monthly data -> annualize the monthly-return std by sqrt(12).
  const volatility = sampleStdDev(periodReturns(series)) * Math.sqrt(12);

  const yearly = yearlyReturns(series);
  let best: YearReturn | null = null;
  let worst: YearReturn | null = null;
  for (const yr of yearly) {
    if (!best || yr.return > best.return) best = yr;
    if (!worst || yr.return < worst.return) worst = yr;
  }

  return {
    startValue,
    endValue,
    totalReturn,
    cagr,
    volatility,
    maxDrawdown: maxDrawdown(series),
    best,
    worst,
  };
}
