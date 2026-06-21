import { useState } from "react";
import type { Holding } from "../core/types.ts";
import { formatCurrency } from "../lib/format.ts";
import { tickerName } from "../lib/universe.ts";

interface Props {
  holdings: Holding[];
  startDate: string;
  missingTickers: string[];
  knownTickers: string[];
  onAmountChange: (index: number, amount: number) => void;
  onRemove: (index: number) => void;
  onAdd: (ticker: string, amount: number) => void;
  onStartDateChange: (date: string) => void;
}

export function HoldingsPanel({
  holdings,
  startDate,
  missingTickers,
  knownTickers,
  onAmountChange,
  onRemove,
  onAdd,
  onStartDateChange,
}: Props) {
  const total = holdings.reduce((s, h) => s + h.amount, 0);
  const [newTicker, setNewTicker] = useState("");
  const [newAmount, setNewAmount] = useState("");

  // Validity drives the button's disabled state so an empty/zero amount no
  // longer fails silently. The unknown-ticker hint warns BEFORE adding that a
  // symbol outside the dataset won't be counted (it used to add, then surprise).
  const trimmedTicker = newTicker.trim().toUpperCase();
  const amount = Number(newAmount);
  const amountValid = Number.isFinite(amount) && amount > 0;
  const canAdd = trimmedTicker !== "" && amountValid;
  const unknownTicker =
    trimmedTicker !== "" &&
    knownTickers.length > 0 &&
    !knownTickers.includes(trimmedTicker);

  const submitAdd = () => {
    if (!canAdd) return;
    onAdd(trimmedTicker, amount);
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
          list="ticker-universe"
          value={newTicker}
          aria-label="New ticker"
          onChange={(e) => setNewTicker(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitAdd()}
        />
        <datalist id="ticker-universe">
          {knownTickers.map((t) => (
            <option key={t} value={t}>
              {tickerName(t)}
            </option>
          ))}
        </datalist>
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
        <button onClick={submitAdd} disabled={!canAdd}>
          + add
        </button>
      </div>
      {unknownTicker ? (
        <div className="addhint warn-hint">
          {trimmedTicker} not in dataset — it'll be added but won't be counted.
        </div>
      ) : (
        newTicker.trim() !== "" &&
        !amountValid && (
          <div className="addhint">Enter an amount above $0 to add.</div>
        )
      )}

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
