import { afterEach, expect, it, vi } from "vitest";
import { createComputeWorker } from "./create";

afterEach(() => {
  vi.unstubAllGlobals();
});

it("AR-43 createComputeWorker builds a module worker named karman-calculator from compute.worker.ts", () => {
  const calls: [URL, WorkerOptions][] = [];
  vi.stubGlobal(
    "Worker",
    class {
      constructor(u: URL, o: WorkerOptions) {
        calls.push([u, o]);
      }
    }
  );
  createComputeWorker();
  expect(calls[0][0].pathname).toMatch(/\/worker\/compute\.worker\.ts$/);
  expect(calls[0][1]).toEqual({ type: "module", name: "karman-calculator" });
});
