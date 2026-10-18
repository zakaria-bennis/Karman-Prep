import { beforeEach, expect, it, vi } from "vitest";
import { splitMathText } from "@/components/learn/math-segments";

beforeEach(() => vi.resetModules());

it("AR-33 the lazy splitter throws until installed, then is MathText's splitMathText", async () => {
  // A fresh module, without the test setup's install.
  const split = await import("./math-split");
  expect(() => split.splitMathText("$x$", false, true, true)).toThrow(/not installed/);
  const calls: unknown[][] = [];
  split.installMathSplit((...args) => {
    calls.push(args);
    return splitMathText(...args);
  });
  const text = "Let $f(x)=2x+3$ and $$y=x^2$$ cost \\$5.";
  expect(split.splitMathText(text, true, true, false)).toEqual(
    splitMathText(text, true, true, false)
  );
  expect(calls).toEqual([[text, true, true, false]]);
});
