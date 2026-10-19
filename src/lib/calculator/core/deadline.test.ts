import { afterEach, describe, expect, it, vi } from "vitest";
import * as D from "./deadline";
import { bumpDevCounter } from "../dev-counters";
describe("deadline", () => {
  it("createDeadline throws DeadlineExceeded with the row id once ms have elapsed; NO_DEADLINE never throws; budgets 250, 1000, 500 ms", () => {
    let now = 1000;
    const deadline = D.createDeadline(250, () => now, "row-3");
    now = 1249;
    expect(() => deadline.check()).not.toThrow();
    now = 1250;
    expect(() => deadline.check()).toThrow(
      expect.objectContaining({ name: "DeadlineExceeded", rowId: "row-3" })
    );
    expect(
      [() => deadline.check(), () => D.NO_DEADLINE.check()].map((f) => {
        try {
          f();
          return null;
        } catch (e) {
          return e instanceof D.DeadlineExceeded;
        }
      })
    ).toEqual([true, null]);
    expect([D.ROW_VALUE_DEADLINE_MS, D.REGRESSION_DEADLINE_MS, D.POI_DEADLINE_MS]).toEqual([
      250, 1000, 500,
    ]);
  });
});
describe("development counters", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.__karmanCalculatorCounters = undefined;
  });
  it("bumpDevCounter creates and updates the global counters outside production, and does nothing in production", () => {
    for (const [name, delta] of [
      ["workers", 1],
      ["workers", 1],
      ["workers", -1],
      ["calculators", 1],
    ] as const)
      bumpDevCounter(name, delta);
    expect(globalThis.__karmanCalculatorCounters).toEqual({
      calculators: 1,
      workers: 1,
      reflows: 0,
    });
    globalThis.__karmanCalculatorCounters = undefined;
    vi.stubEnv("NODE_ENV", "production");
    bumpDevCounter("reflows", 1);
    expect(globalThis.__karmanCalculatorCounters).toBeUndefined();
  });
});
