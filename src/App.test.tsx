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

const snapshot = {
  meta: { source: "test", resolution: "monthly", generatedAt: "2026-06-21" },
  prices: {
    VOO: [
      { date: "2015-01-01", adjClose: 100 },
      { date: "2020-01-01", adjClose: 150 },
      { date: "2026-01-01", adjClose: 200 },
    ],
    QQQ: [
      { date: "2015-01-01", adjClose: 50 },
      { date: "2020-01-01", adjClose: 100 },
      { date: "2026-01-01", adjClose: 150 },
    ],
    BND: [
      { date: "2015-01-01", adjClose: 80 },
      { date: "2020-01-01", adjClose: 82 },
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
  window.history.replaceState(null, "", "/");
});

describe("App", () => {
  it("loads the default portfolio and shows a hero value", async () => {
    mockFetchOk();
    render(<App />);
    expect(screen.getByText("VOO")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByText(/\$[0-9,]+/).length).toBeGreaterThan(0),
    );
  });

  it("shows a Retry path when price data fails to load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 500 })),
    );
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument(),
    );
  });

  it("recovers when Retry succeeds after an initial failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(snapshot) });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    const retry = await screen.findByRole("button", { name: /retry/i });
    fireEvent.click(retry);
    await waitFor(() =>
      expect(screen.getAllByText(/\$[0-9,]+/).length).toBeGreaterThan(0),
    );
  });
});
