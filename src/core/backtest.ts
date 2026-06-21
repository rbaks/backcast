// The backtest engine. Buy-and-hold, no rebalancing, total-return (adjusted close).
// Pure: portfolio + price data in, value series + caveats out.

import type {
  BacktestResult,
  ISODate,
  Portfolio,
  PriceSeries,
  ValuePoint,
} from "./types.ts";

/** Build a date -> adjClose lookup for O(1) access. */
function toLookup(series: PriceSeries): Map<ISODate, number> {
  const m = new Map<ISODate, number>();
  for (const p of series) m.set(p.date, p.adjClose);
  return m;
}

/**
 * Compute portfolio value over time.
 *
 * Each holding buys a fixed share count at the start date (amount / price@start)
 * and holds it. Portfolio value on any later date is the sum of share counts
 * times that date's adjusted close.
 *
 * Start-date guarding: if a held ticker has no data at the requested start, the
 * start is clamped forward to the earliest date for which *every* held ticker
 * has data, and the caller is warned rather than silently zero-filled.
 */
export function computePortfolioValueSeries(
  portfolio: Portfolio,
  pricesByTicker: Record<string, PriceSeries>,
): BacktestResult {
  const { holdings, startDate: requestedStartDate } = portfolio;
  const warnings: string[] = [];
  const missingTickers: string[] = [];

  // Resolve usable holdings (non-empty price data).
  const usable = holdings.filter((h) => {
    const series = pricesByTicker[h.ticker.toUpperCase()];
    if (!series || series.length === 0) {
      missingTickers.push(h.ticker.toUpperCase());
      return false;
    }
    return true;
  });

  if (missingTickers.length > 0) {
    warnings.push(
      `No price data for: ${missingTickers.join(", ")}. Dropped from the backtest.`,
    );
  }

  if (usable.length === 0) {
    return {
      series: [],
      startDate: requestedStartDate,
      requestedStartDate,
      clamped: false,
      missingTickers,
      warnings,
    };
  }

  const lookups = new Map<string, Map<ISODate, number>>();
  for (const h of usable) {
    const t = h.ticker.toUpperCase();
    if (!lookups.has(t)) {
      lookups.set(t, toLookup(pricesByTicker[t]));
    }
  }

  // Dates present in EVERY held ticker, on/after the requested start.
  const tickers = [...lookups.keys()];
  const firstLookup = lookups.get(tickers[0])!;
  const commonDates = [...firstLookup.keys()]
    .filter((d) => d >= requestedStartDate)
    .filter((d) => tickers.every((t) => lookups.get(t)!.has(d)))
    .sort();

  if (commonDates.length === 0) {
    warnings.push(
      "No overlapping price data on or after the start date for the chosen holdings.",
    );
    return {
      series: [],
      startDate: requestedStartDate,
      requestedStartDate,
      clamped: false,
      missingTickers,
      warnings,
    };
  }

  const startDate = commonDates[0];
  const clamped = startDate > requestedStartDate;
  if (clamped) {
    warnings.push(
      `Data does not reach ${requestedStartDate}. Start clamped to ${startDate}.`,
    );
  }

  // Fix share counts at the start date.
  const shares = new Map<string, number>();
  for (const h of usable) {
    const t = h.ticker.toUpperCase();
    const startPrice = lookups.get(t)!.get(startDate)!;
    shares.set(t, (shares.get(t) ?? 0) + h.amount / startPrice);
  }

  const series: ValuePoint[] = commonDates.map((date) => {
    let value = 0;
    for (const [t, sh] of shares) {
      value += sh * lookups.get(t)!.get(date)!;
    }
    return { date, value };
  });

  return { series, startDate, requestedStartDate, clamped, missingTickers, warnings };
}
