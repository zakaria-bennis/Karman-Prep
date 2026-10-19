import { expect, expectTypeOf, it } from "vitest";
import { splitMathText } from "../../components/learn/math-segments";
import {
  classifyStem,
  explainStem,
  type ChoiceInput,
  type StemInput,
  type TransferItem,
} from "./classify";
import { normalizeQuestionMath } from "./normalize";

const stem = (text: string, serializedFunctionLines = false): StemInput => ({
  text,
  serializedFunctionLines,
});
const verdicts = (text: string) =>
  [...explainStem(stem(text))].map(([i, v]) => [i, "item" in v ? "item" : v.rule]);
const rowMap = (m: ReadonlyMap<number, TransferItem>) =>
  [...m].map(([i, item]) => [i, item.payload.rows]);

it("TR-1 stem items come only from inline, display and reviewed serialized math segments", () => {
  expect(
    rowMap(classifyStem(stem("If $y=2x+3$ and \\(2x+5=17\\), then $$x^{2}+y^{2}=25$$ holds.")))
  ).toEqual([
    [1, ["y=2x+3"]],
    [3, ["2x+5=17"]],
    [5, ["x^{2}+y^{2}=25"]],
  ]);
  const serialized =
    "5. The function f is defined by f(x) = (1/2)(x + 11). What is the value of f(3)?";
  expect(rowMap(classifyStem(stem(serialized, true)))).toEqual([
    [1, ["f(x) = \\frac{1}{2}(x + 11)"]],
  ]);
  expect(classifyStem(stem(serialized, false)).size).toBe(0);
  expect(classifyStem(stem("Prose y=2x+3 outside delimiters")).size).toBe(0);
});
it("TR-1 an item carries its source id, kind, accepting rule, description and a rows payload without a question key", () => {
  expect(classifyStem(stem("Graph $y=2x+3$.")).get(1)).toEqual({
    sourceId: "stem:1",
    kind: "equation",
    ruleId: "TR-13",
    description: "y = 2x + 3",
    payload: {
      version: 1,
      sourceId: "stem:1",
      description: "y = 2x + 3",
      format: "rows",
      dependencies: [],
      rows: ["y=2x+3"],
    },
  });
  const sys = classifyStem(stem("$\\begin{cases}y=2x\\\\y\\ge x^{2}\\end{cases}$")).get(0);
  expect([sys?.kind, sys?.ruleId, sys?.description, sys?.payload.rows]).toEqual([
    "system",
    "TR-12",
    "system of 2 equations and inequalities",
    ["y=2x", "y\\ge x^{2}"],
  ]);
});
it("TR-3 classifier inputs carry no figure fields", () => {
  expectTypeOf<keyof StemInput>().toEqualTypeOf<"text" | "serializedFunctionLines">();
  expectTypeOf<keyof ChoiceInput>().toEqualTypeOf<"letter" | "text">();
});
it("TR-5 rejected segments get no entry and no placeholder", () => {
  const text = "Find $x$ if $x\\ne3$, $(h,5)$, $\\sinh x$ and $y=2x$.";
  expect([...classifyStem(stem(text)).keys()]).toEqual([9]);
  expect(verdicts(text)).toEqual([
    [1, "TR-10"],
    [3, "TR-9"],
    [5, "TR-15"],
    [7, "TR-77"],
    [9, "item"],
  ]);
  expectTypeOf<TransferItem>().not.toHaveProperty("disabled");
});
it("TR-6 classifyStem keys are indexes of one whole-text splitMathText call, rows come from that segment, and results are memoized", () => {
  const text = "[[u]]Use $y=2x$[[/u]] and <i>$y>x+1$</i> with \\(2x+5=17\\)";
  const segments = splitMathText(text, false, true, true);
  const items = classifyStem(stem(text));
  expect([...items.keys()]).toEqual([1, 3, 5]);
  for (const [i, item] of items) {
    const s = segments[i];
    expect(s.kind === "text" ? null : normalizeQuestionMath(s.latex, "math")).toBe(
      item.payload.rows?.[0]
    );
    expect(item.sourceId).toBe(`stem:${i}`);
  }
  expect(classifyStem(stem(text))).toBe(items);
  // a marker between math segments takes an index of its own; run-by-run numbering would give 1 and 2
  expect(
    [...classifyStem(stem("Use <i>$a=1$</i>$b=2$")).values()].map((t) => [
      t.sourceId,
      t.payload.rows,
    ])
  ).toEqual([
    ["stem:1", ["a=1"]],
    ["stem:3", ["b=2"]],
  ]);
  // a currency "$" kept as text splits the text in two, and both pieces count
  expect([
    ...classifyStem(stem("It was $5 for the pen and $6 for the case, so $y=5x+6$.")).keys(),
  ]).toEqual([3]);
});
