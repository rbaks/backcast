import { describe, it, expect } from "vitest";
import {
  buildShareUrl,
  decodePortfolio,
  encodePortfolio,
  readPortfolioFromQuery,
} from "./url.ts";
import type { Portfolio } from "./types.ts";

const sample: Portfolio = {
  startDate: "2015-01-01",
  holdings: [
    { ticker: "VOO", amount: 5000 },
    { ticker: "QQQ", amount: 3000 },
    { ticker: "BND", amount: 2000 },
  ],
};

describe("portfolio URL state", () => {
  it("round-trips a portfolio through encode/decode", () => {
    expect(decodePortfolio(encodePortfolio(sample))).toEqual(sample);
  });

  it("uppercases tickers on decode", () => {
    const enc = encodePortfolio({
      startDate: "2015-01-01",
      holdings: [{ ticker: "voo", amount: 100 }],
    });
    expect(decodePortfolio(enc)?.holdings[0].ticker).toBe("VOO");
  });

  it("returns null for malformed input", () => {
    expect(decodePortfolio("not-base64-$$$")).toBeNull();
    expect(decodePortfolio(btoa("garbage"))).toBeNull();
    expect(decodePortfolio(btoa(JSON.stringify(["bad-date", []])))).toBeNull();
  });

  it("rejects negative amounts", () => {
    const bad = btoa(JSON.stringify(["2015-01-01", [["VOO", -1]]]))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(decodePortfolio(bad)).toBeNull();
  });

  it("reads from a query string and builds a share URL", () => {
    const url = buildShareUrl(sample, "https://mdapp.example/");
    const parsed = readPortfolioFromQuery(new URL(url).search);
    expect(parsed).toEqual(sample);
  });

  it("returns null when the query has no portfolio param", () => {
    expect(readPortfolioFromQuery("")).toBeNull();
  });
});
