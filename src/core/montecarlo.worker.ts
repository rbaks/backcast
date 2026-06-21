// Web Worker wrapper around the pure simulation. Thousands of paths on the main
// thread would freeze the terminal (no scroll, no input) while they run; off the
// main thread the UI stays responsive. The math itself lives in montecarlo.ts so
// it can be unit-tested and run on the main thread as a fallback.

import { simulateCone, type SimParams } from "./montecarlo.ts";

// `self` is the worker global; type it as Worker for a single-arg postMessage.
const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<{ reqId: number; params: SimParams }>) => {
  const { reqId, params } = e.data;
  const { band } = simulateCone(params);
  ctx.postMessage({ reqId, band });
};
