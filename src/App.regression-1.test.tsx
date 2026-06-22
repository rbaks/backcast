// Regression: ISSUE-002 — windowed headline paired the window-start value with
// the fixed inception date ("$38,657 invested from 2015-01-01"). The "invested
// from" date must track the selected range's first visible point.
// Found by /qa on 2026-06-22
// Report: .gstack/qa-reports/qa-report-localhost-2026-06-22.md
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import App from "./App.tsx";

// Lightweight Charts needs a canvas (absent in jsdom) — stub it.
vi.mock("lightweight-charts", () => {
  const series = { setData: vi.fn(), applyOptions: vi.fn() };
  const chart = {
    addSeries: () => series,
    applyOptions: vi.fn(),
    timeScale: () => ({ fitContent: vi.fn() }),
    remove: vi.fn(),
  };
  return {
    createChart: () => chart,
    AreaSeries: "Area",
    LineSeries: "Line",
    LineStyle: { Solid: 0, Dotted: 1, Dashed: 2 },
    ColorType: { Solid: "solid" },
  };
});

// Inception 2015 plus two recent points so a 1Y window starts at 2025-06-01,
// distinct from the inception date.
const snapshot = {
  meta: { source: "test", resolution: "monthly", generatedAt: "2026-06-21" },
  prices: {
    VOO: [
      { date: "2015-01-01", adjClose: 100 },
      { date: "2020-01-01", adjClose: 150 },
      { date: "2025-06-01", adjClose: 190 },
      { date: "2026-01-01", adjClose: 200 },
    ],
    QQQ: [
      { date: "2015-01-01", adjClose: 50 },
      { date: "2020-01-01", adjClose: 100 },
      { date: "2025-06-01", adjClose: 140 },
      { date: "2026-01-01", adjClose: 150 },
    ],
    BND: [
      { date: "2015-01-01", adjClose: 80 },
      { date: "2020-01-01", adjClose: 82 },
      { date: "2025-06-01", adjClose: 84 },
      { date: "2026-01-01", adjClose: 85 },
    ],
  },
};

function mockFetchOk() {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(snapshot) }),
    ),
  );
}

beforeEach(() => {
  vi.unstubAllGlobals();
  // Default portfolio starting 2015-01-01: ["2015-01-01",[["VOO",5000],["QQQ",3000],["BND",2000]]]
  window.history.replaceState(
    null,
    "",
    "/?p=WyIyMDE1LTAxLTAxIixbWyJWT08iLDUwMDBdLFsiUVFRIiwzMDAwXSxbIkJORCIsMjAwMF1dXQ",
  );
});

describe("App headline 'invested from' date (ISSUE-002)", () => {
  it("shows the inception date on the full (MAX) range", async () => {
    mockFetchOk();
    render(<App />);
    await waitFor(() =>
      expect(screen.getByText(/invested from 2015-01-01/)).toBeInTheDocument(),
    );
  });

  it("shows the window-start date — not the inception date — on a 1Y range", async () => {
    mockFetchOk();
    render(<App />);
    // Wait for the MAX-range headline first.
    await screen.findByText(/invested from 2015-01-01/);

    fireEvent.click(screen.getByRole("button", { name: "1Y" }));

    // The 1Y window starts at 2025-06-01, so the headline date must follow it.
    await waitFor(() =>
      expect(screen.getByText(/invested from 2025-06-01/)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/invested from 2015-01-01/)).toBeNull();
  });
});
