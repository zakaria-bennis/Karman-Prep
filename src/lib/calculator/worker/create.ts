// The compute worker's constructor (AR-43). Vite and esbuild emit a module worker; Turbopack
// rewrites this exact call into a classic worker on a static/chunks/turbopack-worker-<hash>.js
// bootstrap (OI-29). The standalone build swaps this file for create.standalone.ts (owner 13).

/** One compute worker named karman-calculator, built from compute.worker.ts. */
export function createComputeWorker(): Worker {
  return new Worker(new URL("./compute.worker.ts", import.meta.url), {
    type: "module",
    name: "karman-calculator",
  });
}
