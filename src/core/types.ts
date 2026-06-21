// Pure domain types for the backtest engine. No framework imports.

/** ISO calendar date, always `YYYY-MM-DD`, interpreted as UTC. Never a naive Date. */
export type ISODate = string;

/** One observation of a ticker's adjusted close (total-return: dividends reinvested). */
export interface PricePoint {
  date: ISODate;
  adjClose: number;
}

/** A ticker's price history, ascending by date, monthly resolution for v1. */
export type PriceSeries = PricePoint[];

/** A single play-money position: dollars placed into `ticker` at the portfolio start. */
export interface Holding {
  ticker: string;
  /** Dollars invested at the start date (buy-and-hold, no rebalancing). */
  amount: number;
}

/** A hypothetical portfolio: what to buy and when to start the backtest. */
export interface Portfolio {
  holdings: Holding[];
  startDate: ISODate;
}

/** Total portfolio value on a given date. */
export interface ValuePoint {
  date: ISODate;
  value: number;
}

/** Output of a backtest run, including any data caveats surfaced to the user. */
export interface BacktestResult {
  /** Portfolio value over time, ascending by date. Empty if nothing could be computed. */
  series: ValuePoint[];
  /** The start date actually used (may be later than requested if clamped). */
  startDate: ISODate;
  /** What the caller asked for, before clamping. */
  requestedStartDate: ISODate;
  /** True if the start was pushed later because data did not reach the requested date. */
  clamped: boolean;
  /** Tickers with no usable data — dropped from the run. */
  missingTickers: string[];
  /** Human-readable caveats (clamping, dropped tickers) to show in the UI. */
  warnings: string[];
}
