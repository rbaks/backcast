import type { Theme } from "../lib/theme.ts";

export type Range = "1Y" | "5Y" | "10Y" | "MAX";
export const RANGES: Range[] = ["1Y", "5Y", "10Y", "MAX"];

interface Props {
  range: Range;
  onRange: (r: Range) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onShare: () => void;
  shared: boolean;
}

export function TopBar({ range, onRange, theme, onToggleTheme, onShare, shared }: Props) {
  return (
    <div className="top">
      <span className="brand">
        MDAPP<span className="dot">//</span>TERMINAL
      </span>
      <div className="range" role="group" aria-label="Time range">
        {RANGES.map((r) => (
          <button
            key={r}
            className={r === range ? "on" : ""}
            aria-pressed={r === range}
            onClick={() => onRange(r)}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="spacer" />
      <button className={`tbtn${shared ? " copied" : ""}`} onClick={onShare}>
        {shared ? "✓ COPIED" : "SHARE"}
      </button>
      <button className="tbtn" onClick={onToggleTheme} aria-label="Toggle theme">
        {theme === "dark" ? "◐ DARK" : "◑ LIGHT"}
      </button>
    </div>
  );
}
