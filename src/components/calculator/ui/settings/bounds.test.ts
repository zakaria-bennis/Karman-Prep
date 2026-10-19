import { afterEach, expect, it, vi } from "vitest";
import { createEngine } from "@/lib/calculator/core/api/engine";
import { createMainThreadBackend } from "@/lib/calculator/worker/backend";
import { evaluateBoundLatex } from "./bounds";

afterEach(() => vi.useRealTimers());

it("S-7 evaluateBoundLatex returns finite values and null for undefined or non-numeric input", async () => {
  const engine = createEngine(undefined, { backend: createMainThreadBackend() });
  expect(await evaluateBoundLatex(engine, "2\\pi")).toBeCloseTo(6.283185307179586, 12);
  expect(await evaluateBoundLatex(engine, "-\\frac{15}{2}")).toBe(-7.5);
  expect(await evaluateBoundLatex(engine, "\\frac{1}{0}")).toBeNull();
  expect(await evaluateBoundLatex(engine, "x")).toBeNull();
});

it("S-7 evaluateBoundLatex gives null after the timeout and destroys the helper", async () => {
  vi.useFakeTimers();
  const destroy = vi.fn();
  const helper = {
    numericValue: NaN,
    listValue: undefined,
    observe: () => () => undefined,
    unobserve() {},
    destroy,
  };
  const pending = evaluateBoundLatex({ HelperExpression: () => helper }, "1", 1000);
  vi.advanceTimersByTime(1000);
  expect(await pending).toBeNull();
  expect(destroy).toHaveBeenCalledOnce();
});
