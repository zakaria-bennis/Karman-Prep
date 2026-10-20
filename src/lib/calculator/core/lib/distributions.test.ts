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
import {
  binomialCdf,
  binomialPdf,
  binomialQuantile,
  erf,
  normalCdf,
  normalPdf,
  normalQuantile,
  tCdf,
  tPdf,
  tQuantile,
} from "./probability";
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

it("PR-45 a dot after anything but a distribution stays unsupported, but for an inference member after a list and a one-letter member, which read Desmos's texts", () => {
  expect(rowOf("L.\\operatorname{mean}", ["L=[1,2]"]).error?.code).toBe("unsupported");
  expect(rowOf("L.\\operatorname{pright}", ["L=[1,2]"]).error?.message).toBe(
    "Function '.pright' cannot be applied to a list of numbers."
  );
  for (const latex of ["L.\\operatorname{p}", "\\operatorname{normaldist}().\\operatorname{p}"]) {
    expect(rowOf(latex, ["L=[1,2]"]).error?.message, latex).toBe(
      "Sorry, I don't understand the way that '.' is used here."
    );
  }
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

const close = (actual: number, expected: number) =>
  withinTolerance(actual, expected, "default") || `${actual} is not ${expected}`;

it("FN-47 FN-48 FN-49 a binomial with thousands of trials stays finite, as in Desmos (exact C(n, k)/2ⁿ)", () => {
  const big = distribution("binomialdist", [2000, 0.5]);
  expect([
    close(binomialPdf(1000, 2000, 0.5), 0.01783901114585432073),
    close(binomialCdf(1000, 2000, 0.5), 0.50891950557292716018),
    close(binomialPdf(550, 1100, 0.5), 0.02405165776823181045),
    close(binomialPdf(500, 1100, 0.5), 0.00025477219368326975),
    inverseCdf(big, 0.5),
    statistic(big, "median"),
  ]).toEqual([true, true, true, true, 1000, 1000]);
});

it("FN-48 FN-49 a binomial cdf and quantile with 10⁸ trials end well inside the worker's watchdog", () => {
  const start = performance.now();
  expect([
    close(binomialCdf(5e7, 1e8, 0.5), 0.5000398942279404077), // ½ + C(n, n/2)/2ⁿ⁺¹
    binomialQuantile(0.5, 1e8, 0.5),
  ]).toEqual([true, 5e7]);
  expect(performance.now() - start).toBeLessThan(500);
  // past 2⁵³ trials Desmos's sum would never end; here the median is undefined at once
  const huge = performance.now();
  expect(evaluateLatex("\\operatorname{binomialdist}(10^{300}).\\operatorname{median}")).toEqual({
    type: "undefined",
  });
  expect(performance.now() - huge).toBeLessThan(100);
});

it("FN-47 FN-48 FN-49 the t distribution keeps its digits for large ν", () => {
  // tails for even ν from the closed form ½(1 − sin θ·Σ (2k−1)!!/(2k)!! cos^{2k} θ), 300 digits
  const tails: [number, number, number][] = [
    [1, 1002, 1.58775967675240631e-1],
    [10, 1002, 8.29806678931020105e-23],
    [30, 1002, 6.49580920205992994e-142],
    [2, 20000, 2.27568809792499695e-2],
    [5, 20000, 2.89075707382902551e-7],
  ];
  for (const [t, nu, tail] of tails) expect(close(tCdf(-t, nu), tail), `${t}, ${nu}`).toBe(true);
  // the normal limit with its first terms in 1/ν (Cornish–Fisher for the quantile)
  const z = normalQuantile(0.975);
  expect([
    close(tCdf(1, 1e14), normalCdf(1)),
    close(tCdf(-1, 1e7), normalCdf(-1) + normalPdf(1) / 2e7),
    close(tPdf(0, 1e14), normalPdf(0) * (1 - 1 / 4e14)),
    close(tQuantile(0.975, 1e10), z + (z ** 3 + z) / 4e10),
    close(inverseCdf(distribution("tdist", [1e10]), 0.975), 1.9599639847772811),
  ]).toEqual([true, true, true, true, true]);
});

// Desmos's composition of each method from its legacy functions (normalcdf(lo, hi, μ, σ) is a
// point mass for σ = 0; binompdf and binomcdf clamp p into [0, 1]; mean round(n)·p, tdist's mean
// its location), read from its algorithm rather than captured live.
it("FN-45 FN-51 parameters at their edges follow Desmos's formulas", () => {
  const cases: [string, number][] = [
    ["\\operatorname{normalcdf}(-1,1,0,0)", 1],
    ["\\operatorname{normalcdf}(1,2,0,0)", 0],
    ["\\operatorname{normaldist}(0,0).\\operatorname{cdf}(1)", 1],
    ["\\operatorname{normaldist}(5,0).\\operatorname{inversecdf}(0.3)", 5],
    ["\\operatorname{normaldist}(5,0).\\operatorname{stdev}", 0],
    ["\\operatorname{tdist}(3,2,0).\\operatorname{cdf}(1,3)", 1],
    ["\\operatorname{tdist}(3,2,0).\\operatorname{inversecdf}(0.3)", 2],
    ["\\operatorname{tcdf}(0,1,3,5,0)", 0],
    ["\\operatorname{binompdf}(10,10,1.5)", 1],
    ["\\operatorname{binomialdist}(10,-0.5).\\operatorname{pdf}(0)", 1],
    ["\\operatorname{binomcdf}(0,10,10,1.5)", 1],
    ["\\operatorname{binomialdist}(10,1.5).\\operatorname{mean}", 15],
    ["\\operatorname{binomialdist}(10,1.5).\\operatorname{var}", -7.5],
    ["\\operatorname{binomialdist}(-1,0.5).\\operatorname{mean}", -0.5],
    ["\\operatorname{tdist}(0).\\operatorname{mean}", 0],
    ["\\operatorname{tdist}(-1,4).\\operatorname{median}", 4],
    ["\\operatorname{tdist}(3,0,0).\\operatorname{var}", 0],
  ];
  for (const [latex, value] of cases) {
    expect(evaluateLatex(latex), latex).toEqual({ type: "number", value });
  }
  for (const latex of [
    "\\operatorname{normalcdf}(0,1,0,10^{400})",
    "\\operatorname{binomialdist}(10,1.5).\\operatorname{stdev}",
    "\\operatorname{invBinom}(0.5,10,1.5)",
  ]) {
    expect(evaluateLatex(latex), latex).toEqual({ type: "undefined" });
  }
});

it("FN-45 a user function that returns a distribution reads, errors and graphs as one", () => {
  const f = "f(x)=\\operatorname{normaldist}(x,1)";
  expect(rowOf("\\operatorname{stdevp}(f(2))", [f]).error?.message).toBe(
    "Function 'stdevp' cannot be applied to a distribution."
  );
  expect(rowOf("f(2)+1", [f]).error?.message).toBe("Cannot add a distribution and a number.");
  expect(evaluateLatex("\\operatorname{mean}(f(2))", { rows: [f] })).toEqual({
    type: "number",
    value: 2,
  });
  const rows = [f, "y=\\operatorname{mean}(f(2))x"];
  const analysis = analyzeRows(
    rows.map((latex, i) => ({ id: `row-${i}`, latex, hidden: false })),
    { angleMode: "radians", complex: false }
  );
  const graph = analysis.rows[1].graph;
  const expr = graph?.kind === "explicit" ? graph.expr : null;
  const g = compileRealFunction1(expr!, "x", {
    functions: analysis.functions,
    values: new Map(),
    settings: { angleMode: "radians", complex: false },
  });
  expect([g(1), g(3)]).toEqual([2, 6]);
});
