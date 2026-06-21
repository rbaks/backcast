# TODOS

## ✅ DONE — Monte Carlo cone in a Web Worker (v2)
- **Shipped:** Forward projection cone (p10/median/p90), horizon slider (1–30y), and
  bear/base/bull scenario toggles. The sim is pure in `core/montecarlo.ts` (seeded,
  unit-tested), runs in `core/montecarlo.worker.ts` off the main thread via the
  `useProjectionCone` hook, and falls back to a synchronous main-thread run where Web
  Workers are unavailable (e.g. jsdom under test). The cone resamples the portfolio's
  own historical monthly mean/vol forward across 1,000 paths.
- **Future polish (not blocking):** progress indicator during long runs; non-parametric
  bootstrap resampling as an alternative to the normal-draw model; richer percentile bands
  (p25/p75) for a denser cone.

## A→B backend migration trigger (when to add a backend)
- **What:** Record the concrete signal that means it's time to swap `BundledJsonProvider`
  for a `BackendProvider`.
- **Why:** "B later" should be a decision with a trigger, not a vague someday.
- **Triggers:** (1) you want a ticker outside the bundled snapshot on demand, (2) you want
  live "today's value" / recent prices, (3) the bundled `prices.json` grows large enough to
  hurt load time, (4) you want real-holdings tracking.
- **Pros:** The async `PriceProvider` seam already makes this a drop-in — no caller changes.
- **Cons:** Introduces ops (a server, a data provider, rate limits, caching) — spend the
  innovation token deliberately.
- **Context:** Thin backend (Bun/Node or FastAPI) owning a market-data layer (fetch → cache
  in SQLite/Postgres → serve). See "Approach B" in the design doc.
- **Depends on:** v1 shipped; one of the triggers above actually fires.
