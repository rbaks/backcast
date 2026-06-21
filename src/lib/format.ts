// Number formatting for the terminal. Gain/loss is NEVER color alone:
// every signed value pairs a direction glyph (▲/▼) and an explicit +/- sign.

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatCurrency(n: number): string {
  return usd.format(n);
}

/** Fractional value -> "+141.2%" / "-18.1%". */
export function formatPercent(frac: number, digits = 1): string {
  const sign = frac > 0 ? "+" : frac < 0 ? "−" : ""; // real minus sign
  return `${sign}${Math.abs(frac * 100).toFixed(digits)}%`;
}

/** Fractional value -> "+$14,118" / "-$1,200". */
export function formatSignedCurrency(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${usd.format(Math.abs(n))}`;
}

export type Direction = "up" | "down" | "flat";

export function direction(frac: number): Direction {
  if (frac > 0) return "up";
  if (frac < 0) return "down";
  return "flat";
}

/** Colorblind-safe glyph that travels with the sign and color. */
export function glyph(dir: Direction): string {
  return dir === "up" ? "▲" : dir === "down" ? "▼" : "–";
}
