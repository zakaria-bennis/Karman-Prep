// The engine's default dependencies: what
// createEngine uses for each EngineDeps member the caller leaves out. Package-internal. The browser
// globals are read behind typeof guards, so the module also loads in node, where there are none.

import {
  createMainThreadBackend,
  createWorkerBackend,
  type ComputeBackend,
} from "../../worker/backend";

/** AR-43, AR-50: the worker backend in browsers; the main-thread backend where Worker is missing. */
export function defaultBackend(): ComputeBackend {
  return typeof window !== "undefined" && typeof Worker === "function"
    ? createWorkerBackend()
    : createMainThreadBackend();
}

/** API-8's frames: requestAnimationFrame when it exists, else a 16 ms timer (node). */
export function defaultScheduleFrame(callback: () => void): void {
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => callback());
  else setTimeout(callback, 16);
}

/** API-1, FN-7: a new random seed for each mount and reset, unless options.seed replaces it. */
export function defaultRandomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
