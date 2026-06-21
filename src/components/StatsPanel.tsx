import type { PortfolioStats } from "../core/stats.ts";
import { direction, formatPercent, glyph } from "../lib/format.ts";

interface Props {
  stats: PortfolioStats | null;
  loading: boolean;
}

function Stat({ k, value, dir }: { k: string; value: string; dir?: "up" | "down" }) {
  return (
    <div className="stat">
      <span className="k">{k}</span>
      <span className={`v tnum${dir ? ` ${dir}` : ""}`}>{value}</span>
    </div>
  );
}

const DASH = "—";

export function StatsPanel({ stats, loading }: Props) {
  if (loading || !stats) {
    return (
      <>
        <div className="phead">Performance</div>
        {["CAGR", "Total return", "Volatility (ann.)", "Max drawdown", "Best year", "Worst year"].map(
          (k) => (
            <Stat key={k} k={k} value={DASH} />
          ),
        )}
        <Caveat />
      </>
    );
  }

  const ret = formatPercent(stats.totalReturn);
  const cagr = formatPercent(stats.cagr);

  return (
    <>
      <div className="phead">Performance</div>
      <Stat k="CAGR" value={cagr} dir={direction(stats.cagr) === "down" ? "down" : "up"} />
      <Stat
        k="Total return"
        value={ret}
        dir={direction(stats.totalReturn) === "down" ? "down" : "up"}
      />
      <Stat k="Volatility (ann.)" value={formatPercent(stats.volatility, 1)} />
      <Stat k="Max drawdown" value={formatPercent(stats.maxDrawdown)} dir="down" />
      <Stat
        k="Best year"
        value={
          stats.best
            ? `${glyph("up")} ${formatPercent(stats.best.return)} '${String(stats.best.year).slice(2)}`
            : DASH
        }
        dir="up"
      />
      <Stat
        k="Worst year"
        value={
          stats.worst
            ? `${glyph("down")} ${formatPercent(stats.worst.return)} '${String(stats.worst.year).slice(2)}`
            : DASH
        }
        dir="down"
      />
      <Caveat />
    </>
  );
}

function Caveat() {
  return (
    <div className="caveat">
      Backtests of individual past winners look better than reality (survivorship
      bias). The broad ETFs shown here minimize it.
    </div>
  );
}
