import { expect, it } from "vitest";
import { createTestEngine, TEST_VIEW } from "./__fixtures__/test-engine";

// Regressions fitted whole with no exact solution, and exact linear solves; each expectation is
// what live Desmos showed for the same row (probe runs, 2026-10-25).

async function run(rows: string[]) {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  m.engine.setExpressions(rows.map((latex, k) => ({ id: `e${k}`, latex })));
  m.engine.setView(TEST_VIEW);
  await m.settled();
  const param = (name: string) =>
    m.engine
      .getSnapshot()
      .rows.find((r) => r.id === "e0")
      ?.regression?.result?.params.find((p) => p.name === name)?.value;
  const value = (k: number) => m.engine.expressionAnalysis[`e${k}`].evaluation;
  return { param, value };
}

it("REGRESSION-10 a stall below 10^-6 shows 0 where 0 fits no worse", async () => {
  expect((await run(["-n^2\\sim264"])).param("n")).toBe(0);
  expect((await run(["-\\left(0.2n\\right)^2\\sim5767"])).param("n")).toBe(0);
  expect((await run(["n^3\\sim0"])).param("n")).toBe(0);
  expect((await run(["\\cos\\left(n\\right)\\sim3"])).param("n")).toBe(0);
  const pair = await run(["\\left[-n^2,m\\right]\\sim\\left[264,0.0000005\\right]"]);
  expect([pair.param("n"), pair.param("m")]).toEqual([0, 0]);
});

it("REGRESSION-10 larger stalls and exact tiny fits stay", async () => {
  expect((await run(["-\\left(0.1n\\right)^2\\sim150"])).param("n")).toBeCloseTo(1.01828e-6, 10);
  expect((await run(["-n^2\\sim50000"])).param("n")).toBeCloseTo(-1.0873e-6, 10);
  expect((await run(["n^3\\sim10^{-21}"])).param("n")).toBeCloseTo(1e-7, 12);
});

it("REGRESSION-10 the search from 1 by the model's derivatives stands within rounding", async () => {
  expect((await run(["-n^4\\sim264"])).param("n")).toBeCloseTo(-6.31202e-5, 9);
  expect((await run(["-n^6\\sim264"])).param("n")).toBeCloseTo(-0.00645282, 8);
  expect((await run(["e^n\\sim-1"])).param("n")).toBeCloseTo(-39.21173, 5);
  expect((await run(["2^n\\sim0"])).param("n")).toBeCloseTo(-143.26663, 5);
  expect((await run(["\\left|2n+7\\right|+4\\sim1"])).param("n")).toBeCloseTo(-3.5, 9);
});

it("RT-17 an exact affine fit is solved in fractions (b30B, b114B, b102B)", async () => {
  const a = await run(["\\frac{a+5}{3}\\sim\\frac{a+5}{13}", "a+5"]);
  expect(a.param("a")).toBe(-5);
  expect(a.value(1)).toEqual({ type: "number", value: 0 });
  const b = await run(["\\left[-9a+b,9a+b\\right]\\sim\\left[17,17\\right]"]);
  expect([b.param("a"), b.param("b")]).toEqual([0, 17]);
  const c = await run([
    "-8+a+\\frac{1}{3}\\sim\\frac{34}{3}",
    "12\\left(a+\\frac{1}{3}-a\\right)\\left(a+\\frac{1}{3}+8\\right)-4\\left(a+\\frac{1}{3}+8\\right)",
  ]);
  expect(c.value(1)).toEqual({ type: "number", value: 0 });
});
