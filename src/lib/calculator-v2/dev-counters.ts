// Development-only live-instance counters (AR-61, AR-41). Production builds replace
// process.env.NODE_ENV, so bundlers fold bumpDevCounter to an empty function.

export type DevCounter = "calculators" | "workers" | "reflows";

declare global {
  // ESLint 9's no-var does not report a var inside declare global, so it needs no directive.
  var __karmanCalculatorCounters: Record<DevCounter, number> | undefined;
}

/** Adds `delta` to one global counter; does nothing in production. */
export function bumpDevCounter(name: DevCounter, delta: 1 | -1): void {
  if (process.env.NODE_ENV === "production") return;
  globalThis.__karmanCalculatorCounters ??= {
    calculators: 0,
    workers: 0,
    reflows: 0,
  };
  globalThis.__karmanCalculatorCounters[name] += delta;
}
