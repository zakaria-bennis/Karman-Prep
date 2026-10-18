import { expect, expectTypeOf, it } from "vitest";
import { analyzeRows } from "../calculator-v2/core/analysis/index";
import {
  accessibleNames,
  classifyChoice,
  classifyStem,
  explainChoice,
  type ChoiceInput,
  type StemInput,
} from "./classify";

const REAL = { angleMode: "radians", complex: false } as const;
const stem = (text: string, serializedFunctionLines = false): StemInput => ({
  text,
  serializedFunctionLines,
});
const choice = (text: string, letter = "B") => classifyChoice({ letter, text }, null);

it("TR-1, TR-40 a whole choice is one item whose segments pass with TR-10 excepted and whose prose is only separators or 'and'", () => {
  expect(choice("$x$")).toEqual({
    sourceId: "choice:B",
    kind: "choice",
    ruleId: "TR-40",
    description: "choice B",
    payload: {
      version: 1,
      sourceId: "choice:B",
      description: "choice B",
      format: "rows",
      dependencies: [],
      rows: ["x"],
    },
  });
  expect(choice("$y=2x$ and $y=x+1$")?.payload.rows).toEqual(["y=2x", "y=x+1"]);
  expect(choice("$y=2x$; $y>x$, and $x\\le3$")?.payload.rows).toEqual(["y=2x", "y>x", "x\\le3"]);
  expect(choice("$\\begin{cases}y\\ge x^{2}\\\\y<4\\end{cases}$")?.payload.rows).toEqual([
    "y\\ge x^{2}",
    "y<4",
  ]);
  for (const t of [
    "$x$ only",
    "$y=2x$ or $y=3x$",
    "$x\\ne3$",
    "$y=2x$ and $\\angle B$",
    "No solution",
    "",
    "$12",
    "$(2,5)$",
    "$(1,2)$ and $(3,4)$",
    "$0<x>2$",
  ])
    expect(choice(t), t).toBeNull();
  expect(explainChoice({ letter: "B", text: "$y=2x$ or $y=3x$" }, null)).toMatchObject({
    rule: "TR-40",
  });
});
it("TR-40 a choice without delimiters is one segment when its whole text is plain math", () => {
  const cases: [string, string][] = [
    ["y = 2x + 3", "y = 2x + 3"],
    ["−5", "-5"],
    ["3/4", "\\frac{3}{4}"],
    ["2 1/2", "\\left(2+\\frac{1}{2}\\right)"],
    ["x² − 4 ≤ 5", "x^{2} - 4 \\le 5"],
    ["√(x+1)", "\\sqrt{x+1}"],
  ];
  for (const [t, row] of cases) expect(choice(t)?.payload.rows, t).toEqual([row]);
  for (const t of ["None of these", "x is 2", "|x|", "$5 per hour", "x ≈ 3"])
    expect(choice(t), t).toBeNull();
});
it("TR-37, TR-40 choices resolve calls and dependencies against the stem only; choices are never a dependency source", () => {
  expectTypeOf(classifyChoice).parameters.toEqualTypeOf<[ChoiceInput, StemInput | null]>();
  expect(
    classifyChoice(
      { letter: "A", text: "$y=f(x)+2$" },
      stem("The function $f$ is defined by $f(x)=x^{2}$.")
    )?.payload.dependencies
  ).toEqual(["f(x)=x^{2}"]);
  expect(classifyChoice({ letter: "A", text: "$y=g(x)$" }, stem("the function $g$"))).toBeNull();
  expect(classifyChoice({ letter: "A", text: "$y=kx$" }, null)?.payload.dependencies).toEqual([]);
  expect(
    classifyChoice({ letter: "A", text: "$y=kx$" }, stem("If $k=3$, which line?"))?.payload
      .dependencies
  ).toEqual(["k=3"]);
  expect(classifyChoice({ letter: "A", text: "$k=3$ and $y=kx$" }, null)?.payload).toMatchObject({
    rows: ["k=3", "y=kx"],
    dependencies: [],
  });
  // decision 9's stop rule: the choice's own k=5 is used, not the stem's k=3
  expect(
    classifyChoice({ letter: "A", text: "$k=5$ and $y=kx$" }, stem("If $k=3$, which line?"))
      ?.payload
  ).toMatchObject({ rows: ["k=5", "y=kx"], dependencies: [] });
});
it("TR-21 a choice whose rows define a name twice or cyclically gets no control, and every accepted choice analyses with no row error", () => {
  for (const text of ["$a=2$ and $a=3$", "$a=b$ and $b=a$", "$f(x)=2x$; $f(x)=3x$"])
    expect(explainChoice({ letter: "B", text }, null), text).toMatchObject({ rule: "TR-21" });
  const context = stem("The function $f$ is defined by $f(x)=x^{2}$, and $k=3$.");
  const TR21_CHOICES = [
    "$x$",
    "$y=2x$ and $y=x+1$",
    "$y=2x$; $y>x$, and $x\\le3$",
    "$\\begin{cases}y\\ge x^{2}\\\\y<4\\end{cases}$",
    "y = 2x + 3",
    "−5",
    "3/4",
    "2 1/2",
    "x² − 4 ≤ 5",
    "√(x+1)",
    "$y=f(x)+2$",
    "$y=kx$",
    "$k=3$ and $y=kx$",
    "$k=5$ and $y=kx$",
  ];
  let accepted = 0;
  for (const text of TR21_CHOICES) {
    const item = classifyChoice({ letter: "B", text }, context);
    if (!item) throw new Error(`no item: ${text}`);
    const latex = [...item.payload.dependencies, ...(item.payload.rows ?? [])];
    const a = analyzeRows(
      latex.map((l, i) => ({ id: `r${i}`, latex: l, hidden: false })),
      REAL
    );
    expect(
      a.rows.map((r) => r.error?.code ?? null),
      text
    ).toEqual(latex.map(() => null));
    accepted++;
  }
  expect(accepted).toBe(TR21_CHOICES.length);
});
it("TR-50 accessibleNames prefixes each description and numbers repeats within the question", () => {
  const items = [
    ...classifyStem(stem("Solve $2x=4$, check $2x=4$ and graph $y=x$; again $2x=4$.")).values(),
  ];
  expect([...accessibleNames(items)]).toEqual([
    ["stem:1", "Transfer to Calculator: 2x = 4"],
    ["stem:3", "Transfer to Calculator: 2x = 4, occurrence 2"],
    ["stem:5", "Transfer to Calculator: y = x"],
    ["stem:7", "Transfer to Calculator: 2x = 4, occurrence 3"],
  ]);
});
