import { beforeEach, expect, it } from "vitest";
import captured from "../eval/__fixtures__/desmos-fractions.json";
import { fractionText } from "../eval/fraction";
import { createTestEngine, type TestEngine } from "./__fixtures__/test-engine";
import { toggleRowFraction } from "./row-commands";

let m: TestEngine;
beforeEach(() => {
  m = createTestEngine(undefined, { backend: "main-thread" });
});
const row = (id: string) => m.engine.getSnapshot().rows.find((r) => r.id === id)!;
const state = (id: string) => m.engine.getExpressions().find((s) => s.id === id);
const offered = (id: string) => {
  const f = row(id).fraction;
  return f === null ? null : fractionText(f);
};

it("NM-7 each captured Desmos row offers the toggle, with the same fraction, exactly when Desmos does", async () => {
  const cases = captured.values;
  for (let i = 0; i < cases.length; i += 50) {
    const chunk = cases.slice(i, i + 50);
    m.engine.setExpressions(chunk.map((c, k) => ({ id: `v${k}`, latex: c.latex })));
    await m.settled();
    const diffs = chunk
      .map((c, k) => ({ latex: c.latex, want: c.fraction, got: offered(`v${k}`) }))
      .filter((c) => c.want !== c.got);
    expect(diffs).toEqual([]);
    m.engine.setBlank();
  }
});

it("NM-7 only a computed value, definition, literal or slider of one real number offers it", async () => {
  m.engine.setExpressions([
    { id: "list", latex: "[0.5,0.25]+0" },
    { id: "point", latex: "(0.5,0.25)+(0,0)" },
    { id: "slider", latex: "a=0.5" },
    { id: "def", latex: "b=\\frac{1}{3}" },
    { id: "use", latex: "b+1" },
    { id: "graph", latex: "y=0.5" },
    { id: "vline", latex: "x=0.5" },
    { id: "fn", latex: "f(x)=\\frac{x}{3}" },
    { id: "call", latex: "f(2)" },
    { id: "ineq", latex: "0.5<1" },
    { id: "undef", latex: "\\frac{1}{0}" },
    { id: "lit", latex: "0.75" },
    { id: "int", latex: "2+3" },
    { id: "err", latex: "\\frac{1}{3}+" },
    { id: "cplx", latex: "\\frac{1+i}{2}" },
  ]);
  m.engine.setExpression({ id: "def", hidden: true });
  await m.settled();
  const offers = Object.fromEntries(
    m.engine
      .getSnapshot()
      .rows.filter((r) => r.id !== "1")
      .map((r) => [r.id, r.fraction === null ? null : fractionText(r.fraction)])
  );
  expect(offers).toEqual({
    list: null,
    point: null,
    slider: "1/2",
    def: "1/3",
    use: "4/3",
    graph: null,
    vline: null,
    fn: null,
    call: "2/3",
    ineq: null,
    undef: null,
    lit: "3/4",
    int: null,
    err: null,
    cplx: null,
  });
});

it("R-5 the toggle is one undo step that stays with the row through edits, whole values and emptying, and is saved as displayEvaluationAsFraction", async () => {
  m.engine.setExpressions([{ id: "a", latex: "\\frac{7}{12}" }]);
  await m.settled();
  expect(row("a")).toMatchObject({ asFraction: false, valueText: "0.583333333333" });
  expect(toggleRowFraction(m.engine, "a")).toBe(true);
  await m.settled();
  expect(row("a")).toMatchObject({ asFraction: true, fraction: { n: 7, d: 12 } });
  expect(state("a")).toMatchObject({ displayEvaluationAsFraction: true });

  m.engine.setExpression({ id: "a", latex: "1+2" });
  await m.settled();
  expect(row("a")).toMatchObject({ fraction: null, asFraction: false, valueText: "3" });
  m.engine.setExpression({ id: "a", latex: "" });
  m.engine.setExpression({ id: "a", latex: "0.2+0" });
  await m.settled();
  expect(row("a")).toMatchObject({ asFraction: true, fraction: { n: 1, d: 5 } });

  m.engine.undo();
  m.engine.undo();
  m.engine.undo();
  await m.settled();
  expect(row("a")).toMatchObject({ latex: "\\frac{7}{12}", asFraction: true });
  m.engine.undo();
  await m.settled();
  expect(row("a").asFraction).toBe(false);
  expect(state("a")).not.toHaveProperty("displayEvaluationAsFraction");
});

it("R-5 a toggled literal or slider shows its value as the fraction, still not displayed to the API", async () => {
  m.engine.setExpressions([
    { id: "lit", latex: "0.75", displayEvaluationAsFraction: true },
    { id: "s", latex: "a=0.5", displayEvaluationAsFraction: true },
    { id: "off", latex: "0.75" },
  ]);
  await m.settled();
  expect(row("lit")).toMatchObject({ asFraction: true, valueText: "0.75" });
  expect(row("s")).toMatchObject({ asFraction: true, valueText: "0.5" });
  expect(row("off").valueText).toBeNull();
  expect(m.engine.expressionAnalysis.lit.evaluationDisplayed).toBe(false);
  expect(m.engine.expressionAnalysis.s.evaluationDisplayed).toBe(false);
  const state = m.engine.getState();
  m.engine.setBlank();
  m.engine.setState(state);
  await m.settled();
  expect(row("lit").asFraction).toBe(true);
  expect(() =>
    m.engine.setExpression({ id: "x", displayEvaluationAsFraction: 1 as never })
  ).toThrow();
});

it("NM-7 degree mode and complex mode keep the toggle for a real value", async () => {
  m.engine.setExpressions([
    { id: "a", latex: "\\sin(30)" },
    { id: "b", latex: "\\frac{1}{4}" },
  ]);
  m.engine.updateSettings({ angleMode: "degrees" });
  await m.settled();
  expect(offered("a")).toBe("1/2");
  m.engine.updateSettings({ angleMode: "radians", complex: true });
  await m.settled();
  expect(offered("b")).toBe("1/4");
});
