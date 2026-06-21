import { useState } from "react";
import type { Holding } from "../core/types.ts";
import { formatCurrency } from "../lib/format.ts";
import { tickerName } from "../lib/universe.ts";

interface Props {
  holdings: Holding[];
  startDate: string;
  missingTickers: string[];
  onAmountChange: (index: number, amount: number) => void;
  onRemove: (index: number) => void;
  onAdd: (ticker: string, amount: number) => void;
  onStartDateChange: (date: string) => void;
}

export function HoldingsPanel({
  holdings,
  startDate,
  missingTickers,
  onAmountChange,
  onRemove,
  onAdd,
  onStartDateChange,
}: Props) {
  const total = holdings.reduce((s, h) => s + h.amount, 0);
  const [newTicker, setNewTicker] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const submitAdd = () => {
    const t = newTicker.trim().toUpperCase();
    const a = Number(newAmount);
    if (!t || !Number.isFinite(a) || a <= 0) return;
    onAdd(t, a);
    setNewTicker("");
    setNewAmount("");
  };

  return (
    <>
      <div className="phead">Portfolio · play money</div>
      {holdings.map((h, i) => {
        const weight = total > 0 ? (h.amount / total) * 100 : 0;
        const missing = missingTickers.includes(h.ticker.toUpperCase());
        return (
          <div className="hold" key={`${h.ticker}-${i}`}>
            <span className="tk">{h.ticker}</span>
            <input
              className="amt tnum"
              type="number"
              min={0}
              value={h.amount}
              aria-label={`${h.ticker} amount`}
              onChange={(e) => onAmountChange(i, Number(e.target.value))}
            />
            <span className="meta">{tickerName(h.ticker)}</span>
            <span className="w tnum">{weight.toFixed(0)}%</span>
            <button className="rm" onClick={() => onRemove(i)} aria-label={`Remove ${h.ticker}`}>
              remove
            </button>
            {missing && <span className="err">No price data — not counted</span>}
          </div>
        );
      })}

      <div className="addrow">
        <input
          className="tkr"
          placeholder="TICKER"
          value={newTicker}
          aria-label="New ticker"
          onChange={(e) => setNewTicker(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitAdd()}
        />
        <input
          className="amt"
          type="number"
          min={0}
          placeholder="$"
          value={newAmount}
          aria-label="New amount"
          onChange={(e) => setNewAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitAdd()}
        />
        <button onClick={submitAdd}>+ add</button>
      </div>

      <div className="startrow">
        <label htmlFor="start">Start date</label>
        <input
          id="start"
          className="tnum"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
      </div>

      <div className="hold">
        <span className="tk">TOTAL</span>
        <span className="amt tnum">{formatCurrency(total)}</span>
      </div>
    </>
  );
}
