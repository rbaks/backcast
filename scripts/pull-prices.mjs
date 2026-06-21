// Pulls real monthly adjusted closes (total return — dividends reinvested) for
// the ETF-lean universe from the Yahoo Finance chart API and writes
// public/prices.json. Run: node scripts/pull-prices.mjs
//
// Plan step 2 checkpoint: BEFORE trusting the data, the engine must reproduce a
// published historical figure. We validate SPY's 2019 calendar total return
// (~+31.2%) and refuse to write the snapshot if it's off.

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "public", "prices.json");

// yahooSymbol -> snapshot key (keys are what users type as tickers).
// Broad ETFs first (survivorship-minimal), a few individual stocks, a few indices.
const UNIVERSE = {
  // core broad ETFs
  SPY: "SPY", VOO: "VOO", VTI: "VTI", QQQ: "QQQ", DIA: "DIA", IWM: "IWM",
  // bonds
  BND: "BND", AGG: "AGG", TLT: "TLT", LQD: "LQD",
  // intl
  VEA: "VEA", VWO: "VWO", VXUS: "VXUS",
  // style / dividend / sector
  VUG: "VUG", VTV: "VTV", VYM: "VYM", SCHD: "SCHD", IJR: "IJR", IJH: "IJH",
  VNQ: "VNQ", XLK: "XLK", XLF: "XLF", XLE: "XLE",
  // commodity
  GLD: "GLD",
  // a handful of individual stocks (survivorship caveat applies)
  AAPL: "AAPL", MSFT: "MSFT", GOOGL: "GOOGL", AMZN: "AMZN", NVDA: "NVDA",
  JPM: "JPM", JNJ: "JNJ", KO: "KO",
  // reference indices (price-only: no dividends)
  "^GSPC": "SPX", "^NDX": "NDX", "^DJI": "DJI",
};

const PERIOD1 = Math.floor(Date.UTC(2004, 0, 1) / 1000);
const PERIOD2 = Math.floor(Date.now() / 1000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The sandbox permits curl's network but not node's raw sockets, so we shell
// out to curl for the HTTP and parse the JSON in node.
function fetchJson(url) {
  const body = execFileSync(
    "curl",
    ["-sS", "--max-time", "30", "-A", "Mozilla/5.0", url],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return JSON.parse(body);
}

async function fetchSeries(yahooSymbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}` +
    `?period1=${PERIOD1}&period2=${PERIOD2}&interval=1mo&events=div%2Csplit`;
  const json = fetchJson(url);
  const r = json?.chart?.result?.[0];
  if (!r?.timestamp) throw new Error(`${yahooSymbol}: no data`);

  const ts = r.timestamp;
  const adj = r.indicators?.adjclose?.[0]?.adjclose;
  const close = r.indicators?.quote?.[0]?.close;
  const source = adj ?? close; // indices have no adjclose -> fall back to close

  const series = [];
  for (let i = 0; i < ts.length; i++) {
    const v = source?.[i];
    if (v == null || !Number.isFinite(v)) continue; // skip gaps / partial month
    const d = new Date(ts[i] * 1000);
    // Normalize to first-of-month so every ticker shares identical date keys.
    const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
    series.push({ date, adjClose: Math.round(v * 100) / 100 });
  }
  // De-dup any collisions on the normalized month key (keep last).
  const byDate = new Map(series.map((p) => [p.date, p]));
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// --- validation: reproduce SPY 2019 calendar total return ---
function calendarReturn(series, year) {
  const last = (y) => {
    const pts = series.filter((p) => p.date.startsWith(`${y}-`));
    return pts.length ? pts[pts.length - 1].adjClose : null;
  };
  const prev = last(year - 1);
  const end = last(year);
  return prev && end ? end / prev - 1 : null;
}

const prices = {};
const report = [];

for (const [yahooSymbol, key] of Object.entries(UNIVERSE)) {
  try {
    const series = await fetchSeries(yahooSymbol);
    prices[key] = series;
    report.push(
      `  ${key.padEnd(6)} ${series.length} mo  ${series[0]?.date} -> ${series.at(-1)?.date}`,
    );
  } catch (e) {
    report.push(`  ${key.padEnd(6)} FAILED: ${e.message}`);
  }
  await sleep(200); // be polite to the API
}

console.log("Pulled:\n" + report.join("\n"));

// Gate: validate against a published figure before writing.
const spy2019 = calendarReturn(prices.SPY ?? [], 2019);
const EXPECTED = 0.312; // SPY 2019 total return ~+31.2% (S&P 500 TR +31.49%)
const TOL = 0.02;
if (spy2019 == null) {
  console.error("VALIDATION FAILED: no SPY data to validate.");
  process.exit(1);
}
const ok = Math.abs(spy2019 - EXPECTED) <= TOL;
console.log(
  `\nValidation — SPY 2019 total return: ${(spy2019 * 100).toFixed(2)}% ` +
    `(expected ~${(EXPECTED * 100).toFixed(1)}%, tol ±${TOL * 100}%) -> ${ok ? "PASS" : "FAIL"}`,
);
if (!ok) {
  console.error("Refusing to write snapshot: data does not match published figure.");
  process.exit(1);
}

const snapshot = {
  meta: {
    source: "Yahoo Finance (v8 chart API), monthly adjusted close (total return)",
    resolution: "monthly",
    generatedAt: new Date().toISOString().slice(0, 10),
    note: "Adjusted close = dividends reinvested. Indices (SPX/NDX/DJI) are price-only.",
    validation: `SPY 2019 total return ${(spy2019 * 100).toFixed(2)}% vs published ~31.2% (PASS)`,
  },
  prices,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(snapshot));
console.log(
  `\nWrote ${out}: ${Object.keys(prices).length} tickers, validation PASSED.`,
);
