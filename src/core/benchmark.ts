// Benchmark comparison. The load-bearing insight: a benchmark IS a portfolio.
// Build a synthetic `Portfolio` (index weights × the user's invested dollars) and
// run it through the SAME `computePortfolioValueSeries` engine. Zero new finance
// math here — this file only assembles portfolios and diffs two value series.

import { computeStats } from "./stats.ts";
import type { ISODate, Portfolio, ValuePoint } from "./types.ts";

export type BenchmarkKind = "voo" | "qqq" | "60-40";

interface BenchmarkLeg {
  ticker: string;
  /** Fraction of the invested dollars in this leg. Legs sum to 1. */
  weight: number;
}

interface BenchmarkDef {
  label: string;
  legs: BenchmarkLeg[];
}

export const BENCHMARKS: Record<BenchmarkKind, BenchmarkDef> = {
  voo: { label: "VOO (S&P 500)", legs: [{ ticker: "VOO", weight: 1 }] },
  qqq: { label: "QQQ (Nasdaq 100)", legs: [{ ticker: "QQQ", weight: 1 }] },
  "60-40": {
    label: "60/40",
    legs: [
      { ticker: "VOO", weight: 0.6 },
      { ticker: "BND", weight: 0.4 },
    ],
  },
};

/** Every ticker any benchmark needs — loaded once up front (they never change). */
export const BENCHMARK_TICKERS: string[] = [
  ...new Set(
    Object.values(BENCHMARKS).flatMap((b) => b.legs.map((l) => l.ticker)),
  ),
];

/**
 * Synthetic portfolio for a benchmark: the user's invested dollars split across
 * the index legs by weight, starting on the same date. Feed this straight into
 * `computePortfolioValueSeries` — the engine re-clamps to the benchmark's own
 * data start (e.g. VOO only reaches back to 2010-09).
 */
export function benchmarkPortfolio(
  kind: BenchmarkKind,
  totalInvested: number,
  startDate: ISODate,
): Portfolio {
  return {
    startDate,
    holdings: BENCHMARKS[kind].legs.map((l) => ({
      ticker: l.ticker,
      amount: totalInvested * l.weight,
    })),
  };
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export interface BenchmarkComparison {
  /** Portfolio total return minus benchmark total return, over the overlap. */
  trDelta: number;
  /** Portfolio CAGR minus benchmark CAGR, over the overlap (noise when years < 2). */
  cagrDelta: number;
  /** True when the portfolio beat the benchmark on total return. */
  beat: boolean;
  /** Calendar year the overlap starts, if the benchmark begins later than the
   *  portfolio's window start; otherwise null (they share the same start). */
  sinceYear: number | null;
  /** Length of the overlap window in years — gates the secondary CAGR figure. */
  years: number;
}

/**
 * Compare two ALREADY-WINDOWED value series over the range they actually share.
 * Pure. The overlap start is the later of the two first dates (not the engine's
 * clamped start), so the delta always reflects the selected 1Y/5Y/MAX window.
 * Returns null when fewer than 2 points overlap (no honest delta to show).
 */
export function compareToBenchmark(
  portWindowed: ValuePoint[],
  benchWindowed: ValuePoint[],
): BenchmarkComparison | null {
  if (portWindowed.length < 2 || benchWindowed.length < 2) return null;

  const overlapStart =
    portWindowed[0].date > benchWindowed[0].date
      ? portWindowed[0].date
      : benchWindowed[0].date;

  const port = portWindowed.filter((p) => p.date >= overlapStart);
  const bench = benchWindowed.filter((p) => p.date >= overlapStart);

  const portStats = computeStats(port);
  const benchStats = computeStats(bench);
  if (!portStats || !benchStats) return null;

  const trDelta = portStats.totalReturn - benchStats.totalReturn;
  const cagrDelta = portStats.cagr - benchStats.cagr;
  const years =
    (Date.parse(port[port.length - 1].date) - Date.parse(port[0].date)) /
    MS_PER_YEAR;

  // Only "since YYYY" when the benchmark forced a later start than the portfolio
  // already had in this window.
  const sinceYear =
    overlapStart > portWindowed[0].date
      ? new Date(overlapStart).getUTCFullYear()
      : null;

  return { trDelta, cagrDelta, beat: trDelta > 0, sinceYear, years };
}
