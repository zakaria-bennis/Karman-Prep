import { expect, it } from "vitest";
import { analyzeRows, type AnalysisSettings, type RowGraph } from "./index";
import { CORPUS } from "../corpus/index";
import { toSExpr } from "../latex/index";

const REAL = { angleMode: "radians", complex: false } as const;
const src = (l: string[]) => l.map((latex, k) => ({ id: `r${k}`, latex, hidden: false }));
const analyze = (l: string[], s: AnalysisSettings = REAL) => analyzeRows(src(l), s);

function describeGraph(g: RowGraph | null): string {
  if (!g || g.kind === "point" || g.kind === "table") return g ? g.kind : "null";
  if (g.kind === "explicit") return `explicit ${g.independent} ${toSExpr(g.expr)}`;
  if (g.kind === "implicit" || g.kind === "lines")
    return `${g.kind === "lines" ? `lines ${g.orientation}` : "implicit"} ${toSExpr(g.expr)}`;
  return `${g.kind} ${g.ops.join(" ")} ${g.operands.map(toSExpr).join(" ")}`;
}

const X3 = "(add (mul (num 2) (id x)) (num 3))",
  X2 = "(pow (id x) (num 2))",
  Y2 = "(pow (id y) (num 2))";
const GRAPHS: Record<string, [string[], string][]> = {
  "RC-5": [
    [["f(x)=x^{2}"], "explicit x (call f (id x))"],
    [["P(t)=500(1.03)^{t}"], "explicit x (call P (id x))"],
    [["h(y)=y+1"], "explicit x (call h (id x))"],
    [["g(a,b)=a+b"], "null"],
  ],
  "RC-11": [
    [["y=2x+3"], `explicit x ${X3}`],
    [["2x+3=y"], `explicit x ${X3}`],
    [["x=y^{2}"], `explicit y ${Y2}`],
    [["y=5"], "lines horizontal (sub (id y) (num 5))"],
    [["x=-3"], "lines vertical (sub (id x) (neg (num 3)))"],
    [["a=2x", "y=a"], "explicit x (id a)"],
    [["y=ax+b"], "null"],
  ],
  "RC-12": [
    [["x^{2}+y^{2}=25"], `implicit (sub (add ${X2} ${Y2}) (num 25))`],
    [["x^{2}=4"], `lines vertical (sub ${X2} (num 4))`],
    [["y^{2}=9"], `lines horizontal (sub ${Y2} (num 9))`],
  ],
  "RC-14": [
    [["1<y<3"], "region < < (num 1) (id y) (num 3)"],
    [["2<3"], "constant-region < (num 2) (num 3)"],
    [["2=3"], "null"],
  ],
  "RC-15": [
    [["(1,2)"], "point"],
    [["a=3", "(a,2)"], "point"],
    [["(a,b)"], "null"],
  ],
  "RC-17": [
    [["x^{2}"], `explicit x ${X2}`],
    [["y^{2}+1"], `explicit y (add ${Y2} (num 1))`],
    [["3+4"], "null"],
  ],
};
for (const [id, cases] of Object.entries(GRAPHS))
  it(`${id} rows carry the graph descriptor their kind implies`, () => {
    for (const [rows, want] of cases)
      expect(describeGraph(analyze(rows).rows[rows.length - 1].graph), rows.join("; ")).toBe(want);
  });

it("RC-14, RC-15 graph is non-null exactly when the row is graphable, and hidden rows never graph", () => {
  for (const c of CORPUS.filter((x) => "latex" in x.input))
    for (const r of analyze([...(c.rows ?? []), (c.input as { latex: string }).latex], {
      ...REAL,
      ...c.settings,
    }).rows)
      expect(r.graph !== null, c.id).toBe(r.isGraphable);
  expect(analyzeRows([{ id: "h", latex: "y=x", hidden: true }], REAL).rows[0]).toMatchObject({
    kind: "curve-y",
    isGraphable: false,
    graph: null,
  });
});

it("RC-17, RC-2, RC-19 r, θ and unbound t errors name the variable", () => {
  const rows: [string, string[], string][] = [
    ["2\\pi r", ["r"], "r is for polar graphs, which aren't available yet."],
    ["\\sin\\theta", ["θ"], "θ is for polar graphs, which aren't available yet."],
    ["r=2", ["r"], "r is for polar graphs, which aren't available yet."],
    ["\\theta=1", ["θ"], "θ is for polar graphs, which aren't available yet."],
    ["(t,t^{2})", ["t"], "This calculator doesn't support that notation."],
  ];
  for (const [l, names, message] of rows)
    expect(analyze([l]).rows[0].error, l).toMatchObject({ code: "unsupported", names, message });
});
