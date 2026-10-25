import { expect, it } from "vitest";
import { createTestEngine, TEST_VIEW } from "./__fixtures__/test-engine";
import type { ExpressionState } from "./types";

// Differences a full SAT question-bank run found against live Desmos (run full-r1, 2026-10-25);
// each expectation is what live Desmos showed for the same rows.

async function run(rows: (string | ExpressionState)[], viewport = TEST_VIEW.viewport) {
  const m = createTestEngine(undefined, { backend: "main-thread" });
  m.engine.setExpressions(
    rows.map((r, k) => (typeof r === "string" ? { id: `e${k}`, latex: r } : r))
  );
  m.engine.setView({ ...TEST_VIEW, viewport });
  await m.settled();
  const value = (k: number) => m.engine.expressionAnalysis[`e${k}`];
  const param = (k: number, name: string) =>
    m.engine
      .getSnapshot()
      .rows.find((r) => r.id === `e${k}`)
      ?.regression?.result?.params.find((p) => p.name === name)?.value;
  return { m, value, param };
}

it("RC-19 `r=…` without θ defines r for every other row, as on Desmos", async () => {
  const a = await run(["r=\\frac{440}{2\\pi}", "r", "h(x)=x^{2}", "h(-7r)"]);
  expect(a.value(0)).toMatchObject({ isError: false, isGraphable: true });
  expect(a.value(1).evaluation).toEqual({
    type: "number",
    value: expect.closeTo(70.0281749604, 9),
  });
  expect(a.value(3).evaluation).toEqual({
    type: "number",
    value: expect.closeTo((7 * 440) ** 2 / (2 * Math.PI) ** 2, 6),
  });
  const b = await run(["r=\\sqrt{169}", "6+2r"]);
  expect(b.value(1).evaluation).toEqual({ type: "number", value: 32 });
  // with θ it stays a polar curve, not yet drawn here
  const c = await run(["r=2\\theta", "r+1"]);
  expect(c.value(0)).toMatchObject({
    isError: true,
    errorMessage: "Polar graphs (r) aren't available yet.",
  });
});

it("RC-19 `r(x)=…` defines a function r (b93B: s(x)=r(x)+1 peaks at 352.125)", async () => {
  const { value } = await run(["r(x)=53x-2x^{2}", "s(x)=r(x)+1", "s(13.25)"]);
  expect(value(1)).toMatchObject({ isError: false, isGraphable: true });
  expect(value(2).evaluation).toEqual({ type: "number", value: 352.125 });
});

it("RC-19 a defined r is an ordinary name inside a regression (b100B, b11B)", async () => {
  const a = await run(["r=2", "\\frac{1}{9}-\\frac{3r}{7}m\\sim0"]);
  expect(a.param(1, "m")).toBeCloseTo(7 / 54, 9);
  const b = await run(["f(x)=x+4", "g(x)=3x^{2}-rx+48", "f(1)g(1)\\sim3(1)^{3}+192"]);
  expect(b.param(2, "r")).toBeCloseTo(12, 9);
});

it("REGRESSION-10 two exact roots: the standard starts' root wins, as on Desmos (b36B, b39B)", async () => {
  const a = await run(["\\left|a+2\\right|+2\\sim\\left|5a-19\\right|+2"]);
  expect(a.param(0, "a")).toBeCloseTo(17 / 6, 9);
  const b = await run(["\\left|a+4\\right|\\sim\\left|2a-11\\right|"]);
  expect(b.param(0, "a")).toBeCloseTo(7 / 3, 9);
});

it("D-25 b and −b fit a·b^x on even x alike: Desmos keeps b > 0 (b89B)", async () => {
  const { param } = await run([
    {
      id: "1",
      type: "table",
      columns: [
        { latex: "x_{1}", values: ["0", "2", "4"] },
        { latex: "y_{1}", values: ["1.25", "1.80", "2.59"] },
      ],
    },
    "y_1\\sim ab^{x_1}",
  ]);
  expect(param(1, "a")).toBeCloseTo(1.25031, 4);
  expect(param(1, "b")).toBeCloseTo(1.19971, 4);
});

it("POI-TRACE-10 y=19 meets the ellipse where its two halves join, at (4, 19) (b73A)", async () => {
  const { m } = await run(["1=\\frac{(y-19)^{2}}{25}+\\frac{(x+3)^{2}}{49}", "y=19"], {
    left: -15,
    right: 10,
    bottom: 5,
    top: 30,
  });
  m.engine.setSelectedRow("e1");
  for (let k = 0; k < 20 && m.engine.getSnapshot().poi === null; k++) {
    await new Promise((r) => setTimeout(r, 5));
    m.flushFrames();
  }
  const points = m.engine.getSnapshot().poi?.points ?? [];
  const meets = points.filter((p) => p.kinds.includes("intersection"));
  expect(meets.map((p) => [p.x, p.y])).toEqual([
    [expect.closeTo(-10, 9), 19],
    [expect.closeTo(4, 9), 19],
  ]);
});

it("API-4 rows set after every row is removed come in their own order, as on Desmos", () => {
  // Desmos's API lists none after removing all; the harness then sets ids 1, 2, ... and Desmos
  // lists them in that order (live 2026-10-25). The order decides which of two close curves a
  // press picks (hit-test.ts).
  const m = createTestEngine(undefined, { backend: "main-thread" });
  m.engine.removeExpressions(m.engine.getExpressions().map(({ id }) => ({ id })));
  m.engine.setExpressions(
    ["y=x", "y=2x", "y=3x"].map((latex, k) => ({ id: String(k + 1), latex }))
  );
  expect(m.engine.getExpressions().map(({ id }) => id)).toEqual(["1", "2", "3"]);
});
