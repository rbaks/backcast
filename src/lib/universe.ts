// Human-readable names for the snapshot universe. Falls back to the ticker for
// anything not listed.

const NAMES: Record<string, string> = {
  // broad ETFs
  SPY: "S&P 500 ETF (SPDR)",
  VOO: "S&P 500 ETF (Vanguard)",
  VTI: "Total US Market ETF",
  QQQ: "Nasdaq 100 ETF",
  DIA: "Dow 30 ETF",
  IWM: "Russell 2000 ETF",
  // bonds
  BND: "Total Bond ETF",
  AGG: "US Aggregate Bond ETF",
  TLT: "20+ Year Treasury ETF",
  LQD: "Investment-Grade Corp Bond ETF",
  // international
  VEA: "Developed Markets ETF",
  VWO: "Emerging Markets ETF",
  VXUS: "Total Intl ex-US ETF",
  // style / dividend / size / sector
  VUG: "US Growth ETF",
  VTV: "US Value ETF",
  VYM: "High Dividend Yield ETF",
  SCHD: "Dividend Equity ETF",
  IJR: "S&P SmallCap 600 ETF",
  IJH: "S&P MidCap 400 ETF",
  VNQ: "US Real Estate ETF",
  XLK: "Technology Sector ETF",
  XLF: "Financials Sector ETF",
  XLE: "Energy Sector ETF",
  // commodity
  GLD: "Gold ETF",
  // individual stocks
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com Inc.",
  NVDA: "NVIDIA Corp.",
  JPM: "JPMorgan Chase & Co.",
  JNJ: "Johnson & Johnson",
  KO: "The Coca-Cola Co.",
  // reference indices (price-only)
  SPX: "S&P 500 Index",
  NDX: "Nasdaq 100 Index",
  DJI: "Dow Jones Industrial Avg",
};

export function tickerName(ticker: string): string {
  return NAMES[ticker.toUpperCase()] ?? ticker.toUpperCase();
}
