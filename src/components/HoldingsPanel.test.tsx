import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HoldingsPanel } from "./HoldingsPanel.tsx";

function setup(overrides = {}) {
  const onAdd = vi.fn();
  const props = {
    holdings: [{ ticker: "VOO", amount: 1000 }],
    startDate: "2015-01-01",
    missingTickers: [],
    knownTickers: ["AAPL", "VOO", "QQQ"],
    loading: false,
    onAmountChange: vi.fn(),
    onRemove: vi.fn(),
    onAdd,
    onStartDateChange: vi.fn(),
    ...overrides,
  };
  const utils = render(<HoldingsPanel {...props} />);
  return { onAdd, ...utils };
}

describe("HoldingsPanel add row", () => {
  it("disables + add until a positive amount is entered", () => {
    const { onAdd } = setup();
    const button = screen.getByRole("button", { name: /\+ add/i });

    fireEvent.change(screen.getByLabelText("New ticker"), {
      target: { value: "AAPL" },
    });
    expect(button).toBeDisabled();
    expect(screen.getByText(/enter an amount above \$0/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("New amount"), {
      target: { value: "500" },
    });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onAdd).toHaveBeenCalledWith("AAPL", 500);
  });

  it("warns when the ticker is not in the dataset but still allows adding", () => {
    const { onAdd } = setup();
    fireEvent.change(screen.getByLabelText("New ticker"), {
      target: { value: "TSLA" },
    });
    fireEvent.change(screen.getByLabelText("New amount"), {
      target: { value: "500" },
    });
    expect(screen.getByText(/TSLA not in dataset/i)).toBeInTheDocument();

    const button = screen.getByRole("button", { name: /\+ add/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onAdd).toHaveBeenCalledWith("TSLA", 500);
  });
});

describe("HoldingsPanel price loading", () => {
  it("shows a per-row loader and suppresses the 'missing' error while loading", () => {
    const { container } = setup({
      loading: true,
      // Even though VOO reads as missing against the empty snapshot, that's just
      // the load in flight — no red error should show yet.
      missingTickers: ["VOO"],
    });
    expect(container.querySelector(".sk-bar.sk-row")).toBeInTheDocument();
    expect(screen.queryByText(/no price data/i)).not.toBeInTheDocument();
  });

  it("flags a genuinely missing ticker once loaded", () => {
    setup({ loading: false, missingTickers: ["VOO"] });
    expect(screen.getByText(/no price data/i)).toBeInTheDocument();
  });
});
