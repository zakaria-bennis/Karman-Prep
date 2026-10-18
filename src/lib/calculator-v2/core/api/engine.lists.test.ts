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
    message: "A list can have at most 10,000 elements.",
    names: [],
    span: null,
  });
  expect(row("a").valueText).toBeNull();
  expect(row("b").error?.message).toBe(
    "A range can't step by 0. Make its first two values different."
  );
  expect(row("c").error).toBeNull();
  expect(row("c").valueText).toBe("undefined");
  expect(m.engine.expressionAnalysis.a).toMatchObject({
    isError: true,
    errorMessage: "A list can have at most 10,000 elements.",
    evaluationDisplayed: false,
  });
});
