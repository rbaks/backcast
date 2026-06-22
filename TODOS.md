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

## Benchmark comparison — analyst tier (deferred)
- **What:** Rolling 12-month relative-performance strip, tracking error, and beta on top
  of the benchmark comparison feature.
- **Why:** Deeper "is this portfolio riskier/streakier than the index" insight for users
  who want it.
- **Pros:** More "real terminal" depth; beta/TE are standard portfolio-analysis stats.
- **Cons:** Analyst-grade; past the teaching-value point for a learning sandbox. Beta is
  regression-based (more math + more UI than the headline delta).
- **Context:** Deferred from the benchmark-comparison feature (CEO + eng review, 2026-06-22).
  The headline ships total-return delta over the shown window; this is the next layer.
- **Depends on:** benchmark comparison shipped.

## Benchmark comparison — persist choice (deferred)
- **What:** Persist benchmark on/off + selected kind (VOO/QQQ/60-40) in the URL and
  localStorage, the way portfolio holdings already are.
- **Why:** A shared link should preserve the comparison the sender was looking at.
- **Pros:** Consistent with the existing shareable-URL state; small.
- **Cons:** Touches `core/url.ts` encode/decode + adds two more state params.
- **Context:** Deferred from the benchmark-comparison feature (CEO + eng review, 2026-06-22);
  local component state is fine for v1.
- **Depends on:** benchmark comparison shipped.
