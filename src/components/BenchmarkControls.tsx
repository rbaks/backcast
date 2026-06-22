import { BENCHMARKS, type BenchmarkKind, type BenchmarkComparison } from "../core/benchmark.ts";
import { direction, formatPercent, glyph } from "../lib/format.ts";

interface Props {
  enabled: boolean;
  onToggle: () => void;
  kind: BenchmarkKind;
  onKind: (k: BenchmarkKind) => void;
  /** Overlap comparison vs the benchmark, or null while loading / too short. */
  comparison: BenchmarkComparison | null;
}

const KINDS = Object.keys(BENCHMARKS) as BenchmarkKind[];

export function BenchmarkControls({
  enabled,
  onToggle,
  kind,
  onKind,
  comparison,
}: Props) {
  return (
    <div className="bench">
      <div className="bc-row">
        <button
          className={`bc-toggle${enabled ? " on" : ""}`}
          aria-pressed={enabled}
          onClick={onToggle}
        >
          <span className="bc-dot" aria-hidden="true">
            ●
          </span>{" "}
          {enabled ? "BENCHMARK ON" : "BENCHMARK OFF"}
        </button>

        {enabled && (
          <div className="bc-scen" role="group" aria-label="Benchmark">
            {KINDS.map((k) => (
              <button
                key={k}
                className={k === kind ? "on" : ""}
                aria-pressed={k === kind}
                aria-label={BENCHMARKS[k].label}
                onClick={() => onKind(k)}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {enabled && comparison && (
        <div className="bc-readout">
          {(() => {
            const dir = direction(comparison.trDelta);
            return (
              <span className={`bc-delta tnum ${dir === "down" ? "down" : "up"}`}>
                {glyph(dir)} {formatPercent(comparison.trDelta)} vs index
                {comparison.sinceYear ? ` (since ${comparison.sinceYear})` : ""}
              </span>
            );
          })()}{" "}
          {comparison.years >= 2 && (
            <span className="bc-cagr tnum">
              {formatPercent(comparison.cagrDelta)}/yr annualized
            </span>
          )}
          <div className="bc-caveat">
            comparison over the shown period; not predictive.
          </div>
        </div>
      )}
    </div>
  );
}
