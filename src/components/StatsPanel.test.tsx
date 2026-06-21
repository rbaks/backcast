import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsPanel } from "./StatsPanel.tsx";
import type { PortfolioStats } from "../core/stats.ts";

const STATS: PortfolioStats = {
  startValue: 10000,
  endValue: 25000,
  cagr: 0.12,
  totalReturn: 1.5,
  volatility: 0.15,
  maxDrawdown: -0.2,
  best: { year: 2019, return: 0.31 },
  worst: { year: 2008, return: -0.37 },
};

describe("StatsPanel", () => {
  it("shimmers value slots while loading instead of static dashes", () => {
    const { container } = render(<StatsPanel stats={null} loading />);
    // One shimmer bar per stat row, and no value text yet.
    expect(container.querySelectorAll(".sk-bar.sk-stat")).toHaveLength(6);
    expect(screen.getByLabelText("Loading CAGR")).toBeInTheDocument();
  });

  it("renders real values once loaded", () => {
    const { container } = render(<StatsPanel stats={STATS} loading={false} />);
    expect(container.querySelectorAll(".sk-bar")).toHaveLength(0);
    expect(screen.getByText("+12.0%")).toBeInTheDocument();
  });
});
