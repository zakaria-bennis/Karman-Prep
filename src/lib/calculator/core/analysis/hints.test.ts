import { expect, it } from "vitest";
import { createTestEngine, TEST_VIEW } from "../api/__fixtures__/test-engine";
import { studentHint } from "./hints";

async function tip(latex: string, ...more: string[]) {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  m.engine.setExpressions([{ id: "r", latex }, ...more.map((l, i) => ({ id: `m${i}`, latex: l }))]);
  m.engine.setView(TEST_VIEW);
  await m.settled();
  return m.engine.expressionAnalysis.r?.errorMessage;
}

it("words students type for statistics get the function to use instead (2026-11-22)", async () => {
  expect(await tip("\\operatorname{mod}e\\left([1,2,2]\\right)")).toBe(
    "There's no mode function. Try sort(L) to spot the most common value."
  );
  expect(await tip("IQR\\left(L\\right)", "L=[1,2,3]")).toBe(
    "For the IQR, use quartile(L,3) - quartile(L,1)."
  );
  expect(await tip("range(L)", "L=[1,2]")).toBe("For the range, use max(L) - min(L).");
  expect(await tip("\\sum\\left([1,2]\\right)")).toBe("To add up a list, use total(L).");
  expect(await tip("avg(L)", "L=[1,2]")).toBe("For the average, use mean(L).");
  expect(await tip("\\operatorname{stats}(L)", "L=[1,2]")).toBe(
    "For min, Q1, median, Q3 and max, use quartile(L,[0,1,2,3,4])."
  );
});

it("f(2) before f is defined, = in a fit, x in a fit and { } for a list say what to do", async () => {
  expect(await tip("f(2)")).toBe("f isn't defined yet. Define f(x) = ... on its own line first.");
  expect(await tip("y_{1}=mx_{1}+b", "x_{1}=[1,2,3]", "y_{1}=[2,4,7]")).toBe(
    "m and b aren't defined. To fit data, use ~ instead of =."
  );
  expect(await tip("y_{1}\\sim mx+b", "x_{1}=[1,2,3]", "y_{1}=[2,4,7]")).toBe(
    "Use the data's name here, like x_1, not x."
  );
  expect(await tip("\\{4,7\\}")).toBe("Lists use [ ], like [4, 7]. { } needs a condition.");
});

it("valid rows keep working and other errors keep their own text", async () => {
  expect(await tip("\\operatorname{mean}([1,2])")).toBeUndefined();
  expect(await tip("a(x+1)")).toBe("a is not defined."); // a coefficient, not a function
  expect(await tip("2x+")).toBe("'+' needs something on both sides.");
  expect(studentHint("y=x", "syntax", [])).toBeNull();
  expect(await tip("\\sum_{n=1}^{5}n")).not.toBe("To add up a list, use total(L).");
});
