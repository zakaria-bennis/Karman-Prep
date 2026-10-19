import { expect, it } from "vitest";
import { analyzeRows } from "../calculator/core/analysis/index";
import { CORPUS } from "../calculator/core/corpus/index";
import { classifyStem, explainStem, type StemInput } from "./classify";

const REAL = { angleMode: "radians", complex: false } as const;
const stem = (text: string, serializedFunctionLines = false): StemInput => ({
  text,
  serializedFunctionLines,
});
const verdicts = (text: string) =>
  [...explainStem(stem(text))].map(([i, v]) => [i, "item" in v ? "item" : v.rule]);
const rowsOf = (text: string) =>
  [...classifyStem(stem(text))].map(([i, t]) => [i, t.payload.rows, t.payload.dependencies]);

const TASK5_SEGMENTS = [
  // TR-10
  "x",
  "5",
  "-5",
  "+5",
  "3.25",
  ".5",
  "\\frac{3}{4}",
  "-\\frac{3}{4}",
  "2\\frac{1}{2}",
  "-2\\frac{1}{2}",
  "x_{1}",
  "a_n",
  "x^{2}",
  "x^2",
  "y^{-1}",
  "x^{\\frac{1}{2}}",
  "y^{-\\frac{2}{3}}",
  "x^{2\\frac{1}{2}}",
  "f(x)",
  "g(t)",
  "h(x_{1})",
  "r",
  "\\theta",
  "2x",
  "\\sqrt{50}",
  "2^{10}",
  "-x",
  "x+1",
  "f(3)",
  "\\pi",
  "x^{a}",
  "\\frac{x}{2}",
  // TR-11
  "2x+1",
  "y=2x+3",
  "3p+4=19",
  "y>2x+1",
  "0\\le x<10",
  "-2<x\\le5",
  "5>y\\ge-1",
  "3p+4>19",
  "0<x>2",
  "x=y<3",
  "x<y=3",
  "x=y=3",
  "1<x\\ge0",
  "(x=2)",
  "\\frac{x<1}{2}",
  "2+",
  "=3",
  "x==2",
  "y=",
  "x^",
  "x^2^3",
  "\\sqrt{}",
  "\\frac{1}{}",
  "()",
  "(1,2,3)",
  "\\sin",
  "\\log_{2}",
  "x+\\left|y",
  "1,2",
  // TR-12
  "\\begin{cases}y=2x\\\\y=x+1\\end{cases}",
  "\\begin{aligned}2x+y&=5\\\\x-y&=1\\\\\\end{aligned}",
  "\\begin{gathered}y\\ge x^{2}\\\\y<4\\end{gathered}",
  "\\left\\{\\begin{array}{l}y=2x+1\\\\y>x\\end{array}\\right.",
  "\\begin{cases} y = 2x \\\\ y = x + 1 \\end{cases}",
  "\\begin{cases}y=2x\\\\2x\\end{cases}",
  "\\begin{cases}y=2x\\\\y\\ne3\\end{cases}",
  "\\begin{cases}y=2x\\\\0<y>2\\end{cases}",
  "f(x)=\\begin{cases}x&x<0\\\\2x&x\\ge0\\end{cases}",
  "\\begin{cases}y=2x\\end{cases}+1",
  "\\begin{cases}\\end{cases}",
  "\\begin{cases}y=\\sinh x\\\\y=1\\end{cases}",
  // TR-13, TR-14, TR-18
  "P(t)=500(1.03)^{t}",
  "f_{1}(x)=x^{2}",
  "C=8h+15",
  "g(x)=f(x,1)",
  "\\alpha(x)=x",
  "f(x_{1})=x_{1}+1",
  "(x-2)^2+(y+1)^2=9",
  "x^{2}+y^{2}=25",
  "(x+3)^{2}+y^{2}=\\frac{1}{4}",
  "y=a(x+3)",
  "g(x)=f(x+1)+f(2)",
  // TR-21
  "x+y",
  "e=2",
  "\\pi=3",
  "a=a+1",
  "(x,2)+1",
  "P=(1,y)",
  "f(r)=\\pi r^{2}",
  "f(x)=f(x-1)+1",
  "y(x)=x+1",
  "x(t)=t",
  "e(x)=x",
  "1+".repeat(1025) + "1",
  "1+".repeat(300) + "1",
  "y=" + "(".repeat(65) + "x" + ")".repeat(65),
  "2^{".repeat(65) + "1" + "}".repeat(65),
  "y=\\sqrt{" + "\\frac{1}{".repeat(64) + "x" + "}".repeat(65),
  "x+2y=1",
  "t=2",
  "P=(1,2)",
  "f(t)=t+1",
  "1+".repeat(299) + "1",
  "-" + "1+".repeat(299) + "1",
  "y=" + "(".repeat(64) + "x" + ")".repeat(64),
  "2^{".repeat(64) + "1" + "}".repeat(64),
  // TR-77
  "\\sinh x",
  "y=\\cosh(x)",
  "\\tanh2",
  "\\sin\\theta=\\frac{3}{5}",
  "2\\pi r",
  "r=5",
  "y=r+1",
  "(\\cos t,\\sin t)",
  "(2,5)",
  "(1,2),(3,4)",
  "(1,2);(3,4)",
  "(h,k)",
  "(2a,0)",
  "f(2)=5",
  "A=\\pi r^{2}",
  "C=2\\pi r",
  "P=(t,2)",
];

const TR21_STEMS = [
  // Task 6
  "If $y=2x+3$ and \\(2x+5=17\\), then $$x^{2}+y^{2}=25$$ holds.",
  "5. The function f is defined by f(x) = (1/2)(x + 11). What is the value of f(3)?",
  "Prose y=2x+3 outside delimiters",
  "Graph $y=2x+3$.",
  "$\\begin{cases}y=2x\\\\y\\ge x^{2}\\end{cases}$",
  "Find $x$ if $x\\ne3$, $(2,5)$, $\\sinh x$ and $y=2x$.",
  "[[u]]Use $y=2x$[[/u]] and <i>$y>x+1$</i> with \\(2x+5=17\\)",
  "Use <i>$a=1$</i>$b=2$",
  "It was $5 for the pen and $6 for the case, so $y=5x+6$.",
  // Task 7
  "Graph $y=a(x+3)$.",
  "For the function $a$, graph $y=a(x+3)$.",
  "Let $f(x)=x^{2}$; graph $y=f(x)+1$.",
  "For the function $f$, find $y=f(x)$.",
  "If $f(x)=2x$ or $f(x)=3x$, graph $y=f(x)$.",
  "If $f(x)=g(x)+1$ and $g(x)=f(x)$, graph $y=f(x)$.",
  "The function $g$ is linear. If $f(x)=g(x)+1$, graph $y=f(x)$.",
  "The function $f$ has $f(x)=x^{2}$; graph $y=f(x)+1$.",
  "If $k=3$, graph $y=kx+1$.",
  "If $k=3$ or $k=5$, graph $y=kx+1$.",
  "Let $a=2$, $f(x)=ax^{2}$ and $g(x)=f(x)+3$.",
  "If $A=\\pi r^{2}$, find $y=A$.",
  "Plot $P=(t,2)$.",
  "If $t=2$, plot $P=(t,2)$.",
  "If $t=2$ or $t=3$, plot $P=(t,2)$.",
  "If $a=t+1$, plot $P=(a,2)$.",
  "Solve $\\begin{cases}a=2\\\\a=3\\end{cases}$.",
  "Solve $\\begin{cases}a=b\\\\b=a\\end{cases}$.",
  "Use $\\begin{cases}f(x)=2x\\\\f(x)=3x\\end{cases}$.",
  "If $a=2$, solve $\\begin{cases}a=5\\\\y=ax\\end{cases}$.",
  "If $a=2$ and $f(x)=ax$, solve $\\begin{cases}a=5\\\\y=f(x)\\end{cases}$.",
  // Task 5 segments
  ...TASK5_SEGMENTS.map((s) => `$${s}$`),
];

it("TR-18 name(…) is implicit multiplication unless name is a question function name", () => {
  expect(rowsOf("Graph $y=a(x+3)$.")).toEqual([[1, ["y=a(x+3)"], []]]);
  expect(verdicts("For the function $a$, graph $y=a(x+3)$.")).toEqual([
    [1, "TR-10"],
    [3, "TR-20"],
  ]);
});
it("TR-19 a stem definition name(v)=… makes name a question function name", () => {
  expect(rowsOf("Let $f(x)=x^{2}$; graph $y=f(x)+1$.")).toEqual([
    [1, ["f(x)=x^{2}"], []],
    [3, ["y=f(x)+1"], ["f(x)=x^{2}"]],
  ]);
  const serialized = classifyStem(
    stem("5. The function f is defined by f(x) = (1/2)(x + 11). What is the value of f(3)?", true)
  );
  expect([...serialized].map(([i, t]) => [i, t.kind, t.payload.rows])).toEqual([
    [1, "function", ["f(x) = \\frac{1}{2}(x + 11)"]],
  ]);
});
it("TR-20 a call to a question function name needs exactly one exportable stem definition", () => {
  expect(verdicts("For the function $f$, find $y=f(x)$.")).toEqual([
    [1, "TR-10"],
    [3, "TR-20"],
  ]);
  expect(verdicts("If $f(x)=2x$ or $f(x)=3x$, graph $y=f(x)$.")).toEqual([
    [1, "item"],
    [3, "item"],
    [5, "TR-20"],
  ]);
  // decision 9: the cycle set comes first, so both definitions get TR-21 before their calls are
  // looked at, and f is left with no exportable definition
  expect(verdicts("If $f(x)=g(x)+1$ and $g(x)=f(x)$, graph $y=f(x)$.")).toEqual([
    [1, "TR-21"],
    [3, "TR-21"],
    [5, "TR-20"],
  ]);
  // f's only definition fails its own call check (g has no definition), so it is not exportable
  expect(verdicts("The function $g$ is linear. If $f(x)=g(x)+1$, graph $y=f(x)$.")).toEqual([
    [1, "TR-10"],
    [3, "TR-20"],
    [5, "TR-20"],
  ]);
  expect(verdicts("The function $f$ has $f(x)=x^{2}$; graph $y=f(x)+1$.")).toEqual([
    [1, "TR-10"],
    [3, "item"],
    [5, "item"],
  ]);
});
it("TR-37 a name defined by exactly one exportable stem segment becomes a dependency, deepest first", () => {
  expect(rowsOf("If $k=3$, graph $y=kx+1$.")).toEqual([
    [1, ["k=3"], []],
    [3, ["y=kx+1"], ["k=3"]],
  ]);
  expect(rowsOf("If $k=3$ or $k=5$, graph $y=kx+1$.")).toEqual([
    [1, ["k=3"], []],
    [3, ["k=5"], []],
    [5, ["y=kx+1"], []],
  ]);
  expect(rowsOf("Let $a=2$, $f(x)=ax^{2}$ and $g(x)=f(x)+3$.").at(-1)).toEqual([
    5,
    ["g(x)=f(x)+3"],
    ["a=2", "f(x)=ax^{2}"],
  ]);
});
it("TR-77 a row that is not a definition and depends on a stem definition built on r gets no control in Phase 1", () => {
  expect(verdicts("If $A=\\pi r^{2}$, find $y=A$.")).toEqual([
    [1, "item"],
    [3, "TR-77"],
  ]);
});
it("TR-77 a point whose parts use a t that neither the item's rows nor its dependencies define gets no control in Phase 1", () => {
  expect(verdicts("Plot $P=(t,2)$.")).toEqual([[1, "TR-77"]]);
  expect(rowsOf("If $t=2$, plot $P=(t,2)$.")).toEqual([
    [1, ["t=2"], []],
    [3, ["P=(t,2)"], ["t=2"]],
  ]);
  expect(verdicts("If $t=2$ or $t=3$, plot $P=(t,2)$.")).toEqual([
    [1, "item"],
    [3, "item"],
    [5, "TR-77"],
  ]);
  expect(verdicts("If $a=t+1$, plot $P=(a,2)$.")).toEqual([
    [1, "item"],
    [3, "TR-77"],
  ]);
});
it("TR-21 an item whose rows define a name twice or cyclically gets no control, and an item never carries a dependency for a name its own rows define", () => {
  expect(verdicts("Solve $\\begin{cases}a=2\\\\a=3\\end{cases}$.")).toEqual([[1, "TR-21"]]);
  expect(verdicts("Solve $\\begin{cases}a=b\\\\b=a\\end{cases}$.")).toEqual([[1, "TR-21"]]);
  expect(verdicts("Use $\\begin{cases}f(x)=2x\\\\f(x)=3x\\end{cases}$.")).toEqual([[1, "TR-21"]]);
  expect(rowsOf("If $a=2$, solve $\\begin{cases}a=5\\\\y=ax\\end{cases}$.")).toEqual([
    [1, ["a=2"], []],
    [3, ["a=5", "y=ax"], []],
  ]);
  expect(
    rowsOf("If $a=2$ and $f(x)=ax$, solve $\\begin{cases}a=5\\\\y=f(x)\\end{cases}$.").at(-1)
  ).toEqual([5, ["a=5", "y=f(x)"], ["f(x)=ax"]]);
});
it("TR-21 every output the classifier accepts analyses in the calculator core with no row error", () => {
  const stems = [
    ...TR21_STEMS,
    ...CORPUS.flatMap((c) =>
      "question" in c.input
        ? [`$${c.input.question}$`]
        : "latex" in c.input && c.id.startsWith("sat-forms-")
          ? [`$${c.input.latex}$`]
          : []
    ),
  ];
  let accepted = 0;
  for (const text of stems)
    for (const item of classifyStem(stem(text)).values()) {
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
  expect(accepted).toBeGreaterThan(50);
});
