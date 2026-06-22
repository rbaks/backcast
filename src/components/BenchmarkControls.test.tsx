import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BenchmarkControls } from "./BenchmarkControls.tsx";
import type { BenchmarkComparison } from "../core/benchmark.ts";

function base(overrides = {}) {
  return {
    enabled: true,
    onToggle: vi.fn(),
    kind: "voo" as const,
    onKind: vi.fn(),
    comparison: null as BenchmarkComparison | null,
    ...overrides,
  };
}

const beat: BenchmarkComparison = {
  trDelta: 0.41,
  cagrDelta: 0.05,
  beat: true,
  sinceYear: null,
  years: 6,
};

describe("BenchmarkControls", () => {
  it("flips the toggle on click", () => {
    const onToggle = vi.fn();
    render(<BenchmarkControls {...base({ onToggle })} />);
    fireEvent.click(screen.getByRole("button", { name: /benchmark on/i }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("changes the benchmark kind via the selector", () => {
    const onKind = vi.fn();
    render(<BenchmarkControls {...base({ onKind })} />);
    fireEvent.click(screen.getByRole("button", { name: /Nasdaq 100/i }));
    expect(onKind).toHaveBeenCalledWith("qqq");
  });

  it("renders the total-return delta with an up glyph + sign when beating", () => {
    render(<BenchmarkControls {...base({ comparison: beat })} />);
    expect(screen.getByText(/▲ \+41\.0% vs index/)).toBeInTheDocument();
  });

  it("shows a down glyph when lagging", () => {
    render(
      <BenchmarkControls
        {...base({ comparison: { ...beat, trDelta: -0.08, beat: false } })}
      />,
    );
    expect(screen.getByText(/▼ −8\.0% vs index/)).toBeInTheDocument();
  });

  it("adds a (since YYYY) suffix when the overlap starts later", () => {
    render(
      <BenchmarkControls {...base({ comparison: { ...beat, sinceYear: 2010 } })} />,
    );
    expect(screen.getByText(/\(since 2010\)/)).toBeInTheDocument();
  });

  it("shows the annualized CAGR figure only when years >= 2", () => {
    const { rerender } = render(
      <BenchmarkControls {...base({ comparison: { ...beat, years: 6 } })} />,
    );
    expect(screen.getByText(/\/yr annualized/)).toBeInTheDocument();

    rerender(
      <BenchmarkControls {...base({ comparison: { ...beat, years: 1 } })} />,
    );
    expect(screen.queryByText(/\/yr annualized/)).not.toBeInTheDocument();
  });

  it("renders no readout when disabled", () => {
    render(<BenchmarkControls {...base({ enabled: false, comparison: beat })} />);
    expect(screen.queryByText(/vs index/)).not.toBeInTheDocument();
  });
});
