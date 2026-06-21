# mdapp // terminal

A Bloomberg-terminal-style sandbox for **seeing** how a hypothetical ("play money")
portfolio would have grown against real historical prices. A learning project —
building it teaches both investing and software craft.

> Past is factual (real historical adjusted closes, replayed). Future is modeled
> (a *cone* of outcomes, never a promise — v2).

## Stack

React + Vite + TypeScript, frontend-only ("Static Sandbox"). All finance math
lives in a pure, framework-free `src/core/` module behind an async data seam
(`PriceProvider`), so a backend can drop in later with zero caller changes.

```
src/
  core/        pure engine — types, backtest, stats, url state, PriceProvider
  components/  terminal shell — TopBar, Holdings, Chart, Stats
  lib/         formatting, theming, ticker names
  styles/      design tokens (DESIGN.md) + layout
public/
  prices.json  bundled price snapshot (currently SAMPLE/synthetic — see below)
```

## Develop

```bash
npm install
npm run dev         # local dev server
npm test            # unit + component tests (Vitest)
npm run typecheck
npm run build       # production build -> dist/
npm run gen:prices  # regenerate the sample price snapshot
```

## Data status

`public/prices.json` is currently **synthetic** (geometric Brownian motion, seeded)
so the app renders during development. Step 3 of the plan replaces it with a real
Stooq monthly snapshot, validated against a published SPY total-return figure first.

## Model assumptions (v1)

Nominal, total-return (adjusted close), buy-and-hold (no rebalancing), monthly
resolution. Start dates clamp forward to the earliest common data and warn rather
than zero-fill. Backtests of individual past winners overstate reality
(survivorship bias) — broad ETFs minimize it; the UI says so.

See [DESIGN.md](DESIGN.md) for the design system and [TODOS.md](TODOS.md) for v2.
