import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectionControls } from "./ProjectionControls.tsx";

function base(overrides = {}) {
  return {
    enabled: true,
    onToggle: vi.fn(),
    horizon: 10,
    onHorizon: vi.fn(),
    scenario: "base" as const,
    onScenario: vi.fn(),
    projected: null,
    computing: false,
    ...overrides,
  };
}

describe("ProjectionControls loaders", () => {
  it("shows a shimmer readout on the first run (computing, no band yet)", () => {
    const { container } = render(
      <ProjectionControls {...base({ computing: true, projected: null })} />,
    );
    expect(container.querySelector(".sk-bar.sk-proj")).toBeInTheDocument();
  });

  it("keeps the prior band and shows an 'updating…' hint while re-computing", () => {
    render(
      <ProjectionControls
        {...base({
          computing: true,
          projected: { years: 10, p10: 100, p25: 150, p50: 200, p75: 250, p90: 300 },
        })}
      />,
    );
    expect(screen.getByText(/updating…/i)).toBeInTheDocument();
    expect(screen.queryByText(/80%/)).toBeInTheDocument();
  });

  it("renders no loader when idle with a band", () => {
    const { container } = render(
      <ProjectionControls
        {...base({
          computing: false,
          projected: { years: 10, p10: 100, p25: 150, p50: 200, p75: 250, p90: 300 },
        })}
      />,
    );
    expect(container.querySelector(".sk-bar")).not.toBeInTheDocument();
    expect(screen.queryByText(/updating…/i)).not.toBeInTheDocument();
  });
});
