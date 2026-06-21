// Theme handling. CSS variables drive the whole UI, but Lightweight Charts is
// themed in JS (not CSS) — so we read the resolved CSS vars and re-apply chart
// colors on every theme switch.

export type Theme = "dark" | "light";

const STORAGE_KEY = "mdapp:theme";

export function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return "dark"; // dark is the default
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

/** Read a CSS custom property off :root as a trimmed string. */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export interface ChartColors {
  text: string;
  grid: string;
  line: string;
  areaTop: string;
  areaBottom: string;
}

export function readChartColors(): ChartColors {
  const line = cssVar("--gain") || "#2ebd85";
  return {
    text: cssVar("--dim") || "#6c7a8d",
    grid: cssVar("--grid") || "#16202c",
    line,
    areaTop: hexToRgba(line, 0.25),
    areaBottom: hexToRgba(line, 0),
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const full =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
