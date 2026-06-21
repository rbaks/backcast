import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computePortfolioValueSeries } from "./core/backtest.ts";
import { computeStats } from "./core/stats.ts";
import { BundledJsonProvider } from "./core/provider.ts";
import type { Holding, Portfolio, PriceSeries, ValuePoint } from "./core/types.ts";
import { buildShareUrl, encodePortfolio, readPortfolioFromQuery } from "./core/url.ts";
import { HoldingsPanel } from "./components/HoldingsPanel.tsx";
import { StatsPanel } from "./components/StatsPanel.tsx";
import { ChartPanel } from "./components/ChartPanel.tsx";
import { TopBar, type Range } from "./components/TopBar.tsx";
import {
  applyTheme,
  getInitialTheme,
  type Theme,
} from "./lib/theme.ts";
import {
  direction,
  formatCurrency,
  formatPercent,
  formatSignedCurrency,
  glyph,
} from "./lib/format.ts";

const DEFAULT_PORTFOLIO: Portfolio = {
  startDate: "2015-01-01",
  holdings: [
    { ticker: "VOO", amount: 5000 },
    { ticker: "QQQ", amount: 3000 },
    { ticker: "BND", amount: 2000 },
  ],
};

type DataStatus = "loading" | "ready" | "error";

function rangeCutoff(endDate: string, range: Range): string {
  if (range === "MAX") return "0000-00-00";
  const years = range === "1Y" ? 1 : range === "5Y" ? 5 : 10;
  const d = new Date(endDate);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export default function App() {
  const provider = useMemo(() => new BundledJsonProvider(), []);

  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [range, setRange] = useState<Range>("MAX");
  const [portfolio, setPortfolio] = useState<Portfolio>(
    () => readPortfolioFromQuery(window.location.search) ?? DEFAULT_PORTFOLIO,
  );
  const [prices, setPrices] = useState<Record<string, PriceSeries>>({});
  const [status, setStatus] = useState<DataStatus>("loading");
  const [shared, setShared] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Keep the address bar in sync (shareable on refresh/bookmark).
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("p", encodePortfolio(portfolio));
    window.history.replaceState(null, "", url.toString());
  }, [portfolio]);

  // Load prices for every held ticker. Re-runs when the ticker set changes.
  const tickerKey = portfolio.holdings
    .map((h) => h.ticker.toUpperCase())
    .sort()
    .join(",");
  const reloadRef = useRef(0);

  const loadPrices = useCallback(() => {
    let cancelled = false;
    setStatus("loading");
    const tickers = [...new Set(portfolio.holdings.map((h) => h.ticker.toUpperCase()))];
    Promise.all(tickers.map((t) => provider.getPrices(t).then((s) => [t, s] as const)))
      .then((entries) => {
        if (cancelled) return;
        setPrices(Object.fromEntries(entries));
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey, provider, reloadRef.current]);

  useEffect(() => loadPrices(), [loadPrices]);

  const result = useMemo(
    () => computePortfolioValueSeries(portfolio, prices),
    [portfolio, prices],
  );

  // Apply the selected time range to the full value series.
  const windowed: ValuePoint[] = useMemo(() => {
    if (result.series.length === 0) return [];
    const end = result.series[result.series.length - 1].date;
    const cutoff = rangeCutoff(end, range);
    return result.series.filter((p) => p.date >= cutoff);
  }, [result.series, range]);

  const stats = useMemo(() => computeStats(windowed), [windowed]);

  // --- handlers ---
  const setHoldings = (holdings: Holding[]) =>
    setPortfolio((p) => ({ ...p, holdings }));

  const onAmountChange = (i: number, amount: number) =>
    setHoldings(
      portfolio.holdings.map((h, idx) =>
        idx === i ? { ...h, amount: Math.max(0, amount) } : h,
      ),
    );
  const onRemove = (i: number) =>
    setHoldings(portfolio.holdings.filter((_, idx) => idx !== i));
  const onAdd = (ticker: string, amount: number) =>
    setHoldings([...portfolio.holdings, { ticker, amount }]);
  const onStartDateChange = (startDate: string) =>
    setPortfolio((p) => ({ ...p, startDate }));

  const onShare = async () => {
    const url = buildShareUrl(portfolio, window.location.href);
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1600);
    } catch {
      window.prompt("Copy this share link:", url);
    }
  };

  const onRetry = () => {
    reloadRef.current += 1;
    loadPrices();
  };

  // --- readout ---
  const loading = status === "loading";
  const startValue = windowed[0]?.value ?? 0;
  const endValue = windowed[windowed.length - 1]?.value ?? 0;
  const change = startValue > 0 ? endValue / startValue - 1 : 0;
  const gain = endValue - startValue;
  const dir = direction(change);

  return (
    <div className="app">
      <TopBar
        range={range}
        onRange={setRange}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onShare={onShare}
        shared={shared}
      />
      <div className="grid3">
        <div className="col">
          <HoldingsPanel
            holdings={portfolio.holdings}
            startDate={portfolio.startDate}
            missingTickers={result.missingTickers}
            onAmountChange={onAmountChange}
            onRemove={onRemove}
            onAdd={onAdd}
            onStartDateChange={onStartDateChange}
          />
        </div>

        <div className="col center">
          <div className="readout">
            <span className="big tnum">
              {status === "ready" ? formatCurrency(endValue) : "—"}
            </span>
            {status === "ready" && windowed.length > 1 && (
              <span className={`chg tnum ${dir === "down" ? "down" : "up"}`}>
                {glyph(dir)} {formatPercent(change)} ({formatSignedCurrency(gain)})
              </span>
            )}
            <div className="sub">
              {formatCurrency(startValue || 0)} invested{" "}
              {result.startDate ? `from ${result.startDate}` : ""} · total return,
              dividends reinvested (nominal)
              {result.clamped ? " · start clamped to available data" : ""}
            </div>
          </div>

          {status === "loading" && <div className="skeleton" />}
          {status === "error" && (
            <div className="chart-empty">
              <div>
                Couldn't load price data.
                <div>
                  <button className="retry" onClick={onRetry}>
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}
          {status === "ready" && windowed.length > 1 && (
            <ChartPanel series={windowed} theme={theme} />
          )}
          {status === "ready" && windowed.length <= 1 && (
            <div className="chart-empty">
              Add a holding to see its growth over time.
            </div>
          )}
        </div>

        <div className="col">
          {result.warnings.length > 0 && status === "ready" && (
            <div className="warn">{result.warnings.join(" ")}</div>
          )}
          <StatsPanel stats={stats} loading={loading} />
        </div>
      </div>
    </div>
  );
}
