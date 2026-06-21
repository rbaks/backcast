// Portfolio <-> URL serialization for shareable links (no backend needed).
// Encoded as URL-safe base64 of a compact JSON form, carried in `?p=`.

import type { Holding, Portfolio } from "./types.ts";

const PARAM = "p";

/** Compact wire form: [startDate, [[ticker, amount], ...]]. */
type Wire = [string, [string, number][]];

function toBase64Url(s: string): string {
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b64)));
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function encodePortfolio(portfolio: Portfolio): string {
  const wire: Wire = [
    portfolio.startDate,
    portfolio.holdings.map((h) => [h.ticker.toUpperCase(), h.amount]),
  ];
  return toBase64Url(JSON.stringify(wire));
}

/** Decode a portfolio; returns null on any malformed/garbage input. */
export function decodePortfolio(encoded: string): Portfolio | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 2) return null;
    const [startDate, rawHoldings] = parsed as [unknown, unknown];
    if (typeof startDate !== "string" || !ISO_DATE.test(startDate)) return null;
    if (!Array.isArray(rawHoldings)) return null;

    const holdings: Holding[] = [];
    for (const item of rawHoldings) {
      if (!Array.isArray(item) || item.length !== 2) return null;
      const [ticker, amount] = item as [unknown, unknown];
      if (typeof ticker !== "string" || ticker.length === 0) return null;
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
        return null;
      }
      holdings.push({ ticker: ticker.toUpperCase(), amount });
    }
    return { startDate, holdings };
  } catch {
    return null;
  }
}

/** Read a portfolio from a URL query string (e.g. `location.search`). */
export function readPortfolioFromQuery(search: string): Portfolio | null {
  const params = new URLSearchParams(search);
  const encoded = params.get(PARAM);
  return encoded ? decodePortfolio(encoded) : null;
}

/** Build a shareable absolute URL for a portfolio. */
export function buildShareUrl(portfolio: Portfolio, base: string): string {
  const url = new URL(base);
  url.searchParams.set(PARAM, encodePortfolio(portfolio));
  return url.toString();
}
