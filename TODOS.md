# TODOS

## Run Monte Carlo in a Web Worker (v2, before step 7)
- **What:** Move the Monte Carlo simulation off the main thread into a Web Worker.
- **Why:** Thousands of simulations on the main thread will freeze the UI (no scroll, no
  input) for the duration. A worker keeps the terminal responsive while it computes.
- **Pros:** Smooth UX; can show a progress indicator; can run more sims without jank.
- **Cons:** Slight plumbing (serialize inputs/outputs across the worker boundary).
- **Context:** Only relevant once build step 7 (Monte Carlo cone) starts. The cone samples
  from annualized historical mean/vol over ~360 monthly points. Keep the sim function pure
  in `core/montecarlo.ts` so it can be called from both the worker and a unit test.
- **Depends on:** step 6/7 of the v2 build.

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
