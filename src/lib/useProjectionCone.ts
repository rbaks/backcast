// Runs the Monte Carlo projection off the main thread and returns the latest
// cone band. Falls back to a synchronous main-thread run where Web Workers are
// unavailable (e.g. jsdom under test). Stale results are dropped via a request
// id so a fast slider drag never paints an older cone.

import { useEffect, useRef, useState } from "react";
import { simulateCone, type ConePoint, type SimParams } from "../core/montecarlo.ts";

interface WorkerReply {
  reqId: number;
  band: ConePoint[];
}

export interface ConeState {
  /** Latest cone band, or null before the first run / when disabled. */
  band: ConePoint[] | null;
  /** True from the moment a run is requested until its result lands. */
  computing: boolean;
}

export function useProjectionCone(params: SimParams | null): ConeState {
  const [band, setBand] = useState<ConePoint[] | null>(null);
  const [computing, setComputing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const reqRef = useRef(0);

  // Spin up the worker once. If construction throws (no Worker support), stay
  // null and use the main-thread path below.
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL("../core/montecarlo.worker.ts", import.meta.url),
        { type: "module" },
      );
    } catch {
      workerRef.current = null;
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const key = params ? JSON.stringify(params) : null;

  useEffect(() => {
    if (!params) {
      setBand(null);
      setComputing(false);
      return;
    }
    const reqId = ++reqRef.current;
    const worker = workerRef.current;
    setComputing(true);

    if (worker) {
      const onMessage = (e: MessageEvent<WorkerReply>) => {
        if (e.data.reqId === reqRef.current) {
          setBand(e.data.band);
          setComputing(false);
        }
      };
      worker.addEventListener("message", onMessage);
      worker.postMessage({ reqId, params });
      return () => worker.removeEventListener("message", onMessage);
    }

    // Main-thread fallback (also the test path).
    const { band: result } = simulateCone(params);
    if (reqId === reqRef.current) {
      setBand(result);
      setComputing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { band, computing };
}
