import { expect, it } from "vitest";
import { classifyChoice, classifyStem, explainStem, type TransferItem } from "./classify";

const stem = (text: string) => ({ text, serializedFunctionLines: false });
const only = (text: string): TransferItem => {
  const items = [...classifyStem(stem(text)).values()];
  if (items.length !== 1) throw new Error(`${items.length} items in ${text}`);
  return items[0];
};
const ruleOf = (text: string, index: number) => {
  const v = explainStem(stem(text)).get(index);
  return v && "rule" in v ? v.rule : "item";
};

it("TR-15, TR-29 a coordinate pair or several pairs get Point and Table row payloads; pairs with names get none and a point label is not transferred", () => {
  const one = only("The graph passes through $(2,5)$.");
  expect(one).toMatchObject({
    sourceId: "stem:1",
    kind: "pair",
    ruleId: "TR-15",
    description: "point (2, 5)",
    payload: { format: "point", rows: ["(2,5)"], dependencies: [] },
  });
  expect(one.chooser).toEqual({
    point: { ...one.payload },
    tableRow: {
      version: 1,
      sourceId: "stem:1",
      description: "point (2, 5)",
      format: "tableRow",
      dependencies: [],
      pairs: [["2", "5"]],
      pointTableKey: "points",
    },
    evaluate: null,
  });
  // several pairs, comma or semicolon separated, labels dropped, mixed numbers as improper fractions
  const many = only("Plot $A(1,-2), B(3,4);(2 1/2,3/4)$ on the grid.");
  expect([many.kind, many.description, many.payload.rows, many.chooser?.tableRow.pairs]).toEqual([
    "pair",
    "3 points",
    ["(1,-2)", "(3,4)", "(\\frac{5}{2},\\frac{3}{4})"],
    [
      ["1", "-2"],
      ["3", "4"],
      ["\\frac{5}{2}", "\\frac{3}{4}"],
    ],
  ]);
  for (const text of ["$(h,k)$", "$(2a,0)$", "$(\\cos t,\\sin t)$", "$(1,x)$"])
    expect(ruleOf(text, 0), text).toBe("TR-15");
  // a pair line in a system and a point definition keep their earlier rules
  expect(ruleOf("$\\begin{cases}y=x\\\\(1,2)\\end{cases}$", 0)).toBe("TR-12");
  expect(only("Let $P=(1,2)$.").kind).toBe("equation");
});

it("TR-16 a pair whose sentence calls it an interval, domain or range gets no control", () => {
  for (const text of [
    "The function increases on the interval $(2,5)$.",
    "Its domain is $(0,4)$.",
    "The range of values is $(1,3)$.",
  ])
    expect(ruleOf(text, 1), text).toBe("TR-16");
  // only the same sentence counts
  expect(ruleOf("The domain is all reals. The graph passes through $(2,5)$.", 1)).toBe("item");
});

it("TR-17, TR-30, TR-62 a function coordinate gets Point, Table row and a disabled Evaluate with its reason", () => {
  const item = only("For the function $g$, $g(2)=5$.");
  expect([item.kind, item.ruleId, item.description, item.payload.rows]).toEqual([
    "functionCoordinate",
    "TR-17",
    "g(2) = 5",
    ["(2,5)"],
  ]);
  expect(item.chooser?.tableRow).toMatchObject({ pairs: [["2", "5"]], pointTableKey: "g" });
  expect(item.chooser?.evaluate).toEqual({
    label: "Evaluate g(2)",
    reason: "g isn't defined in the calculator or this question",
  });
  const reason = (text: string, index: number) =>
    classifyStem(stem(text)).get(index)?.chooser?.evaluate?.reason;
  expect(reason("If $f(x)=x^{2}$ and $f(x)=3x$, the function $f$ has $f(2)=4$.", 7)).toBe(
    "f has more than one definition in this question"
  );
  expect(reason("If $f(x)=kx$, the function $f$ has $f(2)=6$.", 5)).toBe(
    "f uses k, which has no value"
  );
  expect(reason("If $f(x)=3x$, the function $f$ has $f(2)=6$.", 5)).toBe(
    "f(2) has no value in the calculator"
  );
  // a call that is not the left side of a function coordinate still needs a definition (TR-20)
  expect(ruleOf("For the function $f$, $y=f(2)+1$.", 3)).toBe("TR-20");
});

it("TR-40, TR-15 a choice of pairs is a coordinate-pair item and a function coordinate choice keeps its chooser", () => {
  const pairs = classifyChoice({ letter: "B", text: "$(1,2)$ and $(3,4)$" }, null);
  expect([pairs?.kind, pairs?.description, pairs?.chooser?.tableRow.pairs]).toEqual([
    "pair",
    "choice B",
    [
      ["1", "2"],
      ["3", "4"],
    ],
  ]);
  const coordinate = classifyChoice({ letter: "C", text: "$h(1)=3$" }, stem("The function $h$."));
  expect([coordinate?.kind, coordinate?.chooser?.evaluate?.label]).toEqual([
    "functionCoordinate",
    "Evaluate h(1)",
  ]);
  // pairs beside other math transfer as rows, the pairs as point rows
  const mixed = classifyChoice({ letter: "D", text: "$y=2x$ and $(1,2)$" }, null);
  expect([mixed?.kind, mixed?.payload.rows, mixed?.chooser]).toEqual([
    "choice",
    ["y=2x", "(1,2)"],
    undefined,
  ]);
});
