import { SCENARIOS, type Scenario } from "../core/montecarlo.ts";
import { formatCurrency } from "../lib/format.ts";

interface Projected {
  years: number;
  p10: number;
  p50: number;
  p90: number;
}

interface Props {
  enabled: boolean;
  onToggle: () => void;
  horizon: number;
  onHorizon: (years: number) => void;
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
  /** Band at the horizon, or null while computing / when disabled. */
  projected: Projected | null;
  /** Monte Carlo run in flight (first run or a re-run after a control change). */
  computing: boolean;
}

const SCENARIO_LABEL: Record<Scenario, string> = {
  bear: "BEAR",
  base: "BASE",
  bull: "BULL",
};

export function ProjectionControls({
  enabled,
  onToggle,
  horizon,
  onHorizon,
  scenario,
  onScenario,
  projected,
  computing,
}: Props) {
  return (
    <div className="forecast">
      <div className="fc-row">
        <button
          className={`fc-toggle${enabled ? " on" : ""}`}
          aria-pressed={enabled}
          onClick={onToggle}
        >
          {enabled ? "◢ FORECAST ON" : "◣ FORECAST OFF"}
        </button>

        {enabled && (
          <>
            <label className="fc-horizon">
              <span className="fc-k">HORIZON</span>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={horizon}
                onChange={(e) => onHorizon(Number(e.target.value))}
                aria-label="Projection horizon in years"
              />
              <span className="fc-yrs tnum">{horizon}Y</span>
            </label>

            <div className="fc-scen" role="group" aria-label="Scenario">
              {SCENARIOS.map((s) => (
                <button
                  key={s}
                  className={s === scenario ? "on" : ""}
                  aria-pressed={s === scenario}
                  onClick={() => onScenario(s)}
                >
                  {SCENARIO_LABEL[s]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {enabled && projected && (
        <div className="fc-readout">
          <span className="fc-label">PROJECTED {projected.years}Y · median</span>{" "}
          <span className="fc-med tnum">{formatCurrency(projected.p50)}</span>{" "}
          <span className="fc-range tnum">
            80% range {formatCurrency(projected.p10)}–
            {formatCurrency(projected.p90)}
          </span>
          {computing && <span className="fc-computing"> · updating…</span>}
        </div>
      )}

      {enabled && !projected && computing && (
        <div className="fc-readout">
          <span className="fc-label">PROJECTED {horizon}Y · median</span>{" "}
          <span className="sk-bar sk-proj" aria-label="Computing projection" />
        </div>
      )}
    </div>
  );
}
