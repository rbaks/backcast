import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { computePortfolioValueSeries } from "./core/backtest.ts";
import { computeStats, monthlyMoments } from "./core/stats.ts";
import {
  BENCHMARK_TICKERS,
  benchmarkPortfolio,
  compareToBenchmark,
  type BenchmarkKind,
} from "./core/benchmark.ts";
import { BundledJsonProvider } from "./core/provider.ts";
import {
  SCENARIO_ANNUAL_SHIFT,
  type Scenario,
  type SimParams,
} from "./core/montecarlo.ts";
import type { Holding, Portfolio, PriceSeries, ValuePoint } from "./core/types.ts";
import { buildShareUrl, encodePortfolio, readPortfolioFromQuery } from "./core/url.ts";
import { useProjectionCone } from "./lib/useProjectionCone.ts";
import { HoldingsPanel } from "./components/HoldingsPanel.tsx";
import { StatsPanel } from "./components/StatsPanel.tsx";
import { ChartPanel } from "./components/ChartPanel.tsx";
import { ProjectionControls } from "./components/ProjectionControls.tsx";
import { BenchmarkControls } from "./components/BenchmarkControls.tsx";
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

/** Slice a value series to the selected range, measured back from `end`. The
 *  portfolio and the benchmark share the same `end` so their right edges align. */
function windowSeries(
  series: ValuePoint[],
  end: string,
  range: Range,
): ValuePoint[] {
  const cutoff = rangeCutoff(end, range);
  return series.filter((p) => p.date >= cutoff);
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
  // The tickers the provider can actually serve — feeds add-row autocomplete
  // and the "not in dataset" warning so users aren't left guessing.
  const [knownTickers, setKnownTickers] = useState<string[]>([]);

  // Forward projection (v2): a Monte Carlo cone of outcomes.
  const [forecast, setForecast] = useState(true);
  const [horizon, setHorizon] = useState(10); // years
  const [scenario, setScenario] = useState<Scenario>("base");

  // Benchmark comparison: an index reference line + a "vs index" readout.
  const [benchmarkOn, setBenchmarkOn] = useState(true);
  const [benchmarkKind, setBenchmarkKind] = useState<BenchmarkKind>("voo");
  const [benchPrices, setBenchPrices] = useState<Record<string, PriceSeries>>({});

  // Layout effect (not passive): the `data-theme` attribute swaps the CSS vars
  // that ChartPanel reads to repaint its canvas. Effects fire child-before-parent,
  // so a passive effect here would run AFTER ChartPanel's and leave the canvas one
  // theme behind. Layout effects always precede passive ones, so the attribute is
  // updated before any child reads it.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Load the served-ticker universe once for autocomplete / validation.
  useEffect(() => {
    let cancelled = false;
    provider
      .listTickers()
      .then((t) => {
        if (!cancelled) setKnownTickers(t);
      })
      .catch(() => {
        /* non-fatal: add-row just loses autocomplete */
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

  // Load the fixed benchmark tickers once. They never change, so this runs a
  // single time; switching the selector just re-slices the already-loaded map.
  // Kept separate from `loadPrices` (which drives missingTickers / tickerKey on
  // the user's holdings only).
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      BENCHMARK_TICKERS.map((t) =>
        provider.getPrices(t).then((s) => [t, s] as const),
      ),
    )
      .then((entries) => {
        if (!cancelled) setBenchPrices(Object.fromEntries(entries));
      })
      .catch(() => {
        /* non-fatal: benchmark just won't render */
      });
    return () => {
      cancelled = true;
    };
  }, [provider]);

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
    return windowSeries(result.series, end, range);
  }, [result.series, range]);

  const stats = useMemo(() => computeStats(windowed), [windowed]);

  // Dollars actually invested = sum over USABLE holdings (drop tickers with no
  // data) so the benchmark's base matches the portfolio's real invested capital.
  const totalInvested = useMemo(() => {
    const missing = new Set(result.missingTickers);
    return portfolio.holdings
      .filter((h) => !missing.has(h.ticker.toUpperCase()))
      .reduce((s, h) => s + h.amount, 0);
  }, [portfolio.holdings, result.missingTickers]);

  // The benchmark: a synthetic portfolio through the same engine, windowed with
  // the portfolio's own end date, then clipped to the portfolio's visible window
  // so it can never widen the x-axis. Comparison runs on the overlap.
  const benchmark = useMemo(() => {
    if (!benchmarkOn || windowed.length < 2 || totalInvested <= 0) return null;
    const benchPortfolio = benchmarkPortfolio(
      benchmarkKind,
      totalInvested,
      result.startDate,
    );
    const benchFull = computePortfolioValueSeries(benchPortfolio, benchPrices)
      .series;
    if (benchFull.length === 0) return null;
    const end = result.series[result.series.length - 1].date;
    const windowedBenchmark = windowSeries(benchFull, end, range);
    if (windowedBenchmark.length === 0) return null;
    const portStart = windowed[0].date;
    return {
      line: windowedBenchmark.filter((p) => p.date >= portStart),
      comparison: compareToBenchmark(windowed, windowedBenchmark),
    };
  }, [
    benchmarkOn,
    benchmarkKind,
    benchPrices,
    totalInvested,
    result.series,
    result.startDate,
    windowed,
    range,
  ]);

  // --- forward projection ---
  // Moments come from the full history (more data = steadier estimate); the cone
  // is anchored at the chart's last visible point. The scenario shifts the mean.
  const moments = useMemo(() => monthlyMoments(result.series), [result.series]);
  const lastPoint = windowed[windowed.length - 1];
  const simParams: SimParams | null =
    status === "ready" && forecast && lastPoint && moments.vol > 0
      ? {
          startValue: lastPoint.value,
          startDate: lastPoint.date,
          monthlyMean: moments.mean + SCENARIO_ANNUAL_SHIFT[scenario] / 12,
          monthlyVol: moments.vol,
          months: horizon * 12,
          sims: 1000,
          seed: 42,
        }
      : null;

  const { band: cone, computing: coneComputing } = useProjectionCone(simParams);
  const projected =
    cone && cone.length > 0
      ? {
          years: horizon,
          p10: cone[cone.length - 1].p10,
          p25: cone[cone.length - 1].p25,
          p50: cone[cone.length - 1].p50,
          p75: cone[cone.length - 1].p75,
          p90: cone[cone.length - 1].p90,
        }
      : null;

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
  // The "invested from" date must match startValue: in a non-MAX window the
  // baseline is the window's first visible point, not the portfolio inception.
  const startValueDate = windowed[0]?.date ?? result.startDate;
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
            knownTickers={knownTickers}
            loading={loading}
            onAmountChange={onAmountChange}
            onRemove={onRemove}
            onAdd={onAdd}
            onStartDateChange={onStartDateChange}
          />
        </div>

        <div className="col center">
          <div className="readout">
            {status === "loading" ? (
              <span className="sk-bar sk-big" aria-label="Loading portfolio value" />
            ) : (
              <span className="big tnum">
                {status === "ready" ? formatCurrency(endValue) : "—"}
              </span>
            )}
            {status === "loading" && <span className="sk-bar sk-chg" />}
            {status === "ready" && windowed.length > 1 && (
              <span className={`chg tnum ${dir === "down" ? "down" : "up"}`}>
                {glyph(dir)} {formatPercent(change)} ({formatSignedCurrency(gain)})
              </span>
            )}
            <div className="sub">
              {formatCurrency(startValue || 0)} invested{" "}
              {startValueDate ? `from ${startValueDate}` : ""} · total return,
              dividends reinvested (nominal)
              {result.clamped ? " · start clamped to available data" : ""}
            </div>
          </div>

          {status === "ready" && windowed.length > 1 && (
            <BenchmarkControls
              enabled={benchmarkOn}
              onToggle={() => setBenchmarkOn((b) => !b)}
              kind={benchmarkKind}
              onKind={setBenchmarkKind}
              comparison={benchmark?.comparison ?? null}
            />
          )}

          {status === "ready" && windowed.length > 1 && (
            <ProjectionControls
              enabled={forecast}
              onToggle={() => setForecast((f) => !f)}
              horizon={horizon}
              onHorizon={setHorizon}
              scenario={scenario}
              onScenario={setScenario}
              projected={projected}
              computing={coneComputing}
            />
          )}

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
            <ChartPanel
              series={windowed}
              cone={forecast ? cone : null}
              benchmark={benchmark?.line ?? null}
              computing={forecast && coneComputing}
              theme={theme}
            />
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
