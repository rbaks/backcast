// The async data seam: "Approach A now, architected for B later."
// Every caller awaits getPrices(); whether the bytes come from a bundled JSON
// snapshot today or a backend tomorrow is invisible upstream.

import type { PriceSeries } from "./types.ts";

export interface PriceProvider {
  /** Resolve a ticker's full price history. Rejects only on transport failure. */
  getPrices(ticker: string): Promise<PriceSeries>;
  /** All tickers this provider can serve (for autocomplete / validation). */
  listTickers(): Promise<string[]>;
}

/** On-disk shape of the bundled `prices.json` snapshot. */
export interface PriceSnapshot {
  meta: {
    source: string;
    resolution: "monthly" | "daily";
    generatedAt: string;
    note?: string;
  };
  prices: Record<string, PriceSeries>;
}

/**
 * Reads the static `prices.json` asset once and serves per-ticker slices.
 * The fetch promise is memoized so concurrent callers share a single request.
 */
export class BundledJsonProvider implements PriceProvider {
  private snapshot: Promise<PriceSnapshot> | null = null;
  private readonly url: string;

  constructor(url = `${import.meta.env.BASE_URL}prices.json`) {
    this.url = url;
  }

  private load(): Promise<PriceSnapshot> {
    if (!this.snapshot) {
      this.snapshot = fetch(this.url).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load price data (${res.status})`);
        }
        return res.json() as Promise<PriceSnapshot>;
      });
      // Don't cache a rejected promise — let the next call (Retry) try again.
      this.snapshot.catch(() => {
        this.snapshot = null;
      });
    }
    return this.snapshot;
  }

  async getPrices(ticker: string): Promise<PriceSeries> {
    const snap = await this.load();
    return snap.prices[ticker.toUpperCase()] ?? [];
  }

  async listTickers(): Promise<string[]> {
    const snap = await this.load();
    return Object.keys(snap.prices).sort();
  }
}
