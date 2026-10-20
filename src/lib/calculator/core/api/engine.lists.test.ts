import { expect, it } from "vitest";
import { createTestEngine, TEST_VIEW } from "./__fixtures__/test-engine";
import type { ExpressionState } from "./types";

async function run(rows: ExpressionState[]) {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  m.engine.setExpressions(rows);
  m.engine.setView(TEST_VIEW);
  await m.settled();
  const row = (id: string) => m.engine.getSnapshot().rows.find((r) => r.id === id)!;
  return { m, row };
}

it("RC-6 a list definition row shows its list value", async () => {
  const { m, row } = await run([{ id: "a", latex: "x_{1}=[1...10]" }]);
  expect(row("a").kind).toBe("definition");
  expect(row("a").error).toBeNull();
  expect(row("a").value).toEqual({
    type: "list",
    value: Array.from({ length: 10 }, (_, k) => ({ type: "number", value: k + 1 })),
  });
  expect(row("a").valueText).toBe("[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]");
  expect(m.engine.expressionAnalysis.a).toMatchObject({
    isError: false,
    evaluationDisplayed: true,
    evaluation: { type: "list", value: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  });
});

it("NM-42, NM-35, NM-36 a list error found while evaluating is the row's error and shows no value", async () => {
  const { m, row } = await run([
    { id: "n", latex: "n=20000" },
    { id: "a", latex: "[1...n]" },
    { id: "s", latex: "s=1" },
    { id: "b", latex: "L=[s,s,...,5]" },
    { id: "c", latex: "L+1" },
  ]);
  expect(row("a").error).toEqual({
    code: "list-too-long",
    message: "Lists may not have more than 10,000 elements.",
    names: [],
    span: null,
  });
  expect(row("a").valueText).toBeNull();
  expect(row("b").error?.message).toBe("Ranges must be arithmetic sequences.");
  expect(row("c").error).toBeNull();
  expect(row("c").valueText).toBe("undefined");
  expect(m.engine.expressionAnalysis.a).toMatchObject({
    isError: true,
    errorMessage: "Lists may not have more than 10,000 elements.",
    evaluationDisplayed: false,
  });
});

it("D-22, G-3 list definitions fit a regression and a point of lists draws one dot per pair", async () => {
  const { m, row } = await run([
    { id: "x", latex: "x_{1}=[1,2,3]" },
    { id: "y", latex: "y_{1}=[3,5,7]" },
    { id: "r", latex: "y_{1}\\sim mx_{1}+b" },
    { id: "p", latex: "(x_{1},y_{1})" },
  ]);
  expect(row("r").error).toBeNull();
  expect(row("r").regression?.result?.params).toEqual([
    { name: "m", value: expect.closeTo(2, 12) },
    { name: "b", value: expect.closeTo(1, 12) },
  ]);
  expect(m.engine.getSnapshot().geometry.get("r")?.kind).toBe("curve");
  const dots = m.engine.getSnapshot().geometry.get("p");
  expect(dots?.kind === "points" ? [...dots.coords] : null).toEqual([1, 3, 2, 5, 3, 7]);
});

it("NM-34, G-22 the founder's nested-list row and a list-valued curve show their errors", async () => {
  const { m, row } = await run([
    { id: "x", latex: "x_{1}=[1...10]" },
    { id: "y", latex: "y_{1}=[1...10]" },
    { id: "s", latex: "[x_{1},x_{1}]\\sim[y_{1},y_{1}]" },
    { id: "c", latex: "y=[1,2]x" },
  ]);
  expect(row("s").error?.message).toBe("Cannot store a list of numbers in a list.");
  expect(row("c").error?.message).toBe("Graphing a list of curves isn't supported yet.");
  expect(row("c").error?.span).toEqual({ start: 2, end: 7 });
  expect(m.engine.getSnapshot().geometry.has("c")).toBe(false);
});

it("API-9, R-5 a list of points reports other and an indexed row reports a number", async () => {
  const { m, row } = await run([
    { id: "L", latex: "L=[5,3,8,1]" },
    { id: "i", latex: "L[2]" },
    { id: "p", latex: "[(1,2),(3,4)]+(1,1)" },
  ]);
  expect(row("i").valueText).toBe("3");
  expect(m.engine.expressionAnalysis.i).toMatchObject({
    isError: false,
    evaluationDisplayed: true,
    evaluation: { type: "number", value: 3 },
  });
  expect(row("p").error).toBeNull();
  expect(m.engine.expressionAnalysis.p).toMatchObject({
    isError: false,
    evaluation: { type: "other" },
  });
  expect(m.engine.getSnapshot().geometry.get("p")?.kind).toBe("points");
});
