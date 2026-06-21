# mdapp // terminal

A Bloomberg-terminal-style sandbox for **seeing** how a hypothetical ("play money")
portfolio would have grown against real historical prices. A learning project —
building it teaches both investing and software craft.

> Past is factual (real historical adjusted closes, replayed). Future is modeled
> (a *cone* of outcomes, never a promise).

## Stack

React + Vite + TypeScript, frontend-only ("Static Sandbox"). All finance math
lives in a pure, framework-free `src/core/` module behind an async data seam
(`PriceProvider`), so a backend can drop in later with zero caller changes.

```
src/
  core/        pure engine — types, backtest, stats, montecarlo, url state, PriceProvider
  components/  terminal shell — TopBar, Holdings, Chart, Projection, Stats
  lib/         formatting, theming, ticker names, projection-worker hook
  styles/      design tokens (DESIGN.md) + layout
public/
  prices.json  bundled price snapshot (real data — see below)
```

## Develop

```bash
npm install
npm run dev          # local dev server
npm test             # unit + component tests (Vitest)
npm run typecheck
npm run build        # production build -> dist/
npm run pull:prices  # refresh public/prices.json from Yahoo (real data)
npm run gen:prices   # offline fallback: synthetic sample snapshot
```

## Data status

`public/prices.json` holds **real monthly adjusted closes** (total return —
dividends reinvested) for ~35 symbols: broad ETFs, a handful of individual
stocks, and 3 reference indices. Pulled from the Yahoo Finance chart API via
`npm run pull:prices`.

The pull is **gated by a validation check** (plan step 2): it reproduces SPY's
2019 calendar total return and refuses to write the snapshot unless it matches
the published figure (~+31.2%) within tolerance — proving both the math and the
data source before anything is trusted. `gen:prices` produces a synthetic
fallback if the network source is unavailable.

## Model assumptions (v1)

Nominal, total-return (adjusted close), buy-and-hold (no rebalancing), monthly
resolution. Start dates clamp forward to the earliest common data and warn rather
than zero-fill. Backtests of individual past winners overstate reality
(survivorship bias) — broad ETFs minimize it; the UI says so.

## Forward projection (v2)

The backtest replays the factual past; the **forecast** models a possible future.
Toggle FORECAST, pick a horizon (1–30y) and a scenario (bear/base/bull), and the
chart grows a **cone of outcomes** out of the last real value: a filled 80% band
(p10–p90) with a dashed median.

It's a Monte Carlo simulation — 1,000 paths that resample the portfolio's own
historical monthly return/volatility forward, with the scenario shifting the mean
±3%/yr. The math is pure in [`core/montecarlo.ts`](src/core/montecarlo.ts)
(seeded, so the cone is stable and unit-tested) and runs in a **Web Worker** so
the terminal never freezes; it falls back to the main thread where workers aren't
available. The spread *is* the message: a range, never a single false-precise
number.

## Deploy

Static frontend — connect the repo to Vercel or Netlify once and every push
ships. Configs for both are checked in. See [DEPLOY.md](DEPLOY.md).

See [DESIGN.md](DESIGN.md) for the design system and [TODOS.md](TODOS.md) for v2.
