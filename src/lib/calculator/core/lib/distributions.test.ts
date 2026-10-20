// FN-45 to FN-51: distribution values beyond the captured Desmos cases
// (desmos-distributions.reference.test.ts): the dot's parse and print, display, graphing, the
// errors Desmos's bundle words but the capture did not reach, and the maths at its edges.
import { expect, it } from "vitest";
import { analyzeRows } from "../analysis";
import { compileRealFunction1, evaluateLatex } from "../eval/compile";
import { formatValue, formatValueLatex } from "../eval/format";
import { parseLatex, toSExpr } from "../latex/index";
import { printLatex } from "../latex/printer";
import { cdf, distribution, inverseCdf, pdf, statistic } from "./distributions";
import { binomialQuantile, erf, normalQuantile, tCdf, tQuantile } from "./probability";
import { withinTolerance } from "./tolerance";

function rowOf(latex: string, rows: string[] = []) {
  const all = [...rows, latex].map((l, i) => ({ id: `row-${i}`, latex: l, hidden: false }));
  return analyzeRows(all, { angleMode: "radians", complex: false }).rows[rows.length];
}

it("PR-45 a dot reads a method with its arguments or a property, and prints back", () => {
  const cases: [string, string][] = [
    ["D.\\operatorname{pdf}\\left(x\\right)", "(call .pdf (id D) (id x))"],
    [
      "D.\\operatorname{cdf}\\left(1,2\\right)^{2}",
      "(pow (call .cdf (id D) (num 1) (num 2)) (num 2))",
    ],
    ["D.\\operatorname{mean}", "(call .mean (id D))"],
    [
      "\\operatorname{normaldist}\\left(\\right).\\operatorname{pleft}",
      "(call .pleft (call normaldist))",
    ],
  ];
  for (const [latex, tree] of cases) {
    const parsed = parseLatex(latex);
    expect(parsed.ok && toSExpr(parsed.tree), latex).toBe(tree);
    const again = parsed.ok ? parseLatex(printLatex(parsed.tree)) : parsed;
    expect(again.ok && toSExpr(again.tree), latex).toBe(tree);
  }
});

it("PR-45 a dot after anything but a distribution stays unsupported", () => {
  expect(rowOf("L.\\operatorname{mean}", ["L=[1,2]"]).error?.code).toBe("unsupported");
  expect(rowOf("P.x", ["P=(1,2)"]).error?.code).toBe("unsupported");
  expect(rowOf("\\operatorname{normaldist}().\\operatorname{random}(2)").error?.code).toBe(
    "unsupported"
  );
});

it("FN-45 Desmos's bundle words arithmetic on a distribution by its operator", () => {
  expect(
    [
      "\\operatorname{normaldist}()-1",
      "\\frac{\\operatorname{normaldist}()}{2}",
      "\\operatorname{normaldist}()^{2}",
      "-\\operatorname{normaldist}()",
      "\\sin(\\operatorname{normaldist}())",
      "\\operatorname{normaldist}((1,2))",
      "2\\cdot[\\operatorname{normaldist}(),\\operatorname{tdist}(3)]",
    ].map((latex) => rowOf(latex).error?.message)
  ).toEqual([
    "Cannot subtract a number from a distribution.",
    "Cannot divide a distribution by a number.",
    "Cannot raise a distribution to a number.",
    "Cannot negate a distribution.",
    "Function 'sin' cannot be applied to a distribution.",
    "Function 'normaldist' cannot be applied to a point.",
    "Cannot multiply a number by a list of distributions.",
  ]);
  // only a name directly before parentheses is a call; `N\cdot 2` multiplies
  expect(rowOf("N\\cdot 2", ["N=\\operatorname{normaldist}()"]).error?.message).toBe(
    "Cannot multiply a distribution by a number."
  );
});

it("FN-45 a distribution row shows its constructor, defaults filled", () => {
  const v = evaluateLatex("\\operatorname{tdist}(3)");
  expect([formatValue(v), formatValueLatex(v)]).toEqual([
    "tdist(3, 0, 1)",
    "\\operatorname{tdist}\\left(3,0,1\\right)",
  ]);
  expect(rowOf("\\operatorname{binomialdist}(10)").kind).toBe("value");
});

it("FN-47 FN-48 y=D.pdf(x) and y=D.cdf(x) graph as functions of x", () => {
  const rows = ["N=\\operatorname{normaldist}(1,2)"];
  for (const [latex, at0] of [
    ["y=N.\\operatorname{pdf}(x)", 0.17603266338214976],
    ["y=\\operatorname{pdf}(\\operatorname{binomialdist}(10),x)", 0.0009765625],
    ["y=N.\\operatorname{cdf}(x)", 0.3085375387259869],
    ["y=\\operatorname{mean}(N)+x", 1],
  ] as const) {
    const row = rowOf(latex, rows);
    expect([row.kind, row.isGraphable], latex).toEqual(["curve-y", true]);
    const analysis = analyzeRows(
      [...rows, latex].map((l, i) => ({ id: `row-${i}`, latex: l, hidden: false })),
      { angleMode: "radians", complex: false }
    );
    const values = new Map([["N", evaluateLatex(rows[0])]]);
    const graph = analysis.rows[1].graph;
    const expr = graph?.kind === "explicit" ? graph.expr : null;
    const f = compileRealFunction1(expr!, "x", {
      functions: analysis.functions,
      values,
      settings: { angleMode: "radians", complex: false },
    });
    expect(withinTolerance(f(0), at0, "default"), `${latex}: ${f(0)}`).toBe(true);
  }
});

it("FN-48 FN-49 the maths at its edges", () => {
  const normal = distribution("normaldist", [0, 1]),
    t = distribution("tdist", [3]),
    binomial = distribution("binomialdist", [10, 0.5]);
  expect([
    cdf(normal, [3, 2]) === cdf(normal, [2, 3]),
    // upper tails Q(8) − Q(9) from tables, not 1 − 1 = 0
    withinTolerance(
      cdf(normal, [8, 9]),
      6.2209605742717841e-16 - 1.1285884059538408e-19,
      "default"
    ),
    // ν = 1 is Cauchy and ν = 2 has a closed form
    withinTolerance(tCdf(-20, 1), 0.5 - Math.atan(20) / Math.PI, "default"),
    withinTolerance(tCdf(-20, 2), 0.5 - 20 / (2 * Math.sqrt(2 + 400)), "default"),
    withinTolerance(cdf(t, [2, 3]), tCdf(3, 3) - tCdf(2, 3), "default"),
    inverseCdf(normal, 1),
    inverseCdf(normal, 0),
    tQuantile(0.5, 3),
    withinTolerance(tQuantile(0.75, 1), 1, "default"),
    binomialQuantile(0, 10, 0.5),
    binomialQuantile(1, 10, 0.5),
    statistic(distribution("tdist", [1.5]), "stdev"),
    Number.isNaN(statistic(distribution("tdist", [1]), "stdev")),
    statistic(binomial, "median"),
    pdf(binomial, 10.5),
    Number.isNaN(normalQuantile(2)),
    erf(-0),
  ]).toEqual([
    true,
    true,
    true,
    true,
    true,
    Infinity,
    -Infinity,
    0,
    true,
    0,
    10,
    Infinity,
    true,
    5,
    0,
    true,
    -0,
  ]);
});
