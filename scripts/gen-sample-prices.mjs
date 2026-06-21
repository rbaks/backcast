// Generates public/prices.json with SYNTHETIC monthly adjusted closes so the app
// renders during development. This is NOT real market data — step 3 of the plan
// replaces it with a real Stooq snapshot. Deterministic (seeded) for stable diffs.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "public", "prices.json");

// Seeded PRNG (mulberry32) — same output every run.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gaussian via Box-Muller, driven by the seeded uniform.
function gauss(rng) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// First-of-month dates from 2015-01 to 2026-06 inclusive.
function monthlyDates() {
  const dates = [];
  for (let y = 2015; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === 2026 && m > 6) break;
      dates.push(`${y}-${String(m).padStart(2, "0")}-01`);
    }
  }
  return dates;
}

// ticker -> { start price, annual drift, annual vol, seed }
const UNIVERSE = {
  VOO: { p0: 185, drift: 0.09, vol: 0.15, seed: 1 }, // S&P 500 ETF
  VTI: { p0: 95, drift: 0.09, vol: 0.155, seed: 2 }, // Total US market
  QQQ: { p0: 100, drift: 0.11, vol: 0.21, seed: 3 }, // Nasdaq 100
  BND: { p0: 81, drift: 0.015, vol: 0.04, seed: 4 }, // Total bond
  VXUS: { p0: 48, drift: 0.05, vol: 0.16, seed: 5 }, // Intl ex-US
  GLD: { p0: 115, drift: 0.06, vol: 0.14, seed: 6 }, // Gold
  AAPL: { p0: 27, drift: 0.18, vol: 0.28, seed: 7 }, // individual stock
  MSFT: { p0: 42, drift: 0.19, vol: 0.26, seed: 8 }, // individual stock
};

const dates = monthlyDates();
const prices = {};

for (const [ticker, cfg] of Object.entries(UNIVERSE)) {
  const rng = mulberry32(cfg.seed * 1009 + 7);
  const muM = cfg.drift / 12;
  const sigM = cfg.vol / Math.sqrt(12);
  let price = cfg.p0;
  const series = [];
  for (let i = 0; i < dates.length; i++) {
    if (i > 0) {
      // Geometric Brownian step on the monthly log-return.
      const r = muM - 0.5 * sigM * sigM + sigM * gauss(rng);
      price *= Math.exp(r);
    }
    series.push({ date: dates[i], adjClose: Math.round(price * 100) / 100 });
  }
  prices[ticker] = series;
}

const snapshot = {
  meta: {
    source: "SAMPLE — synthetic geometric Brownian motion, NOT real market data",
    resolution: "monthly",
    generatedAt: new Date().toISOString().slice(0, 10),
    note: "Placeholder for development. Replaced by a real Stooq snapshot in step 3.",
  },
  prices,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(snapshot));
console.log(
  `Wrote ${out}: ${Object.keys(prices).length} tickers x ${dates.length} months`,
);
