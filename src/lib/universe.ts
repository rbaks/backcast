// Human-readable names for the sample universe. Falls back to the ticker for
// anything not listed (e.g. once the real snapshot adds more symbols).

const NAMES: Record<string, string> = {
  VOO: "S&P 500 ETF",
  VTI: "Total US Market ETF",
  QQQ: "Nasdaq 100 ETF",
  BND: "Total Bond ETF",
  VXUS: "Intl ex-US ETF",
  GLD: "Gold ETF",
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
};

export function tickerName(ticker: string): string {
  return NAMES[ticker.toUpperCase()] ?? ticker.toUpperCase();
}
