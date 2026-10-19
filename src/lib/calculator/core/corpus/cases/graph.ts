// Row inputs for the G- golden graph cases (01-interfaces.md section 2.1, owner 07-engine-worker).
// No expected fields: plot/golden.test.ts runs each input through analyzeRows, evaluateRows,
// plotInputFor and plotRow and holds one check per case id (AR-44). The case row comes after its
// context `rows`, in order.

import type { CorpusCase } from "../types";

const cases: CorpusCase[] = [
  { id: "graph-1", rules: ["G-9"], input: { latex: "y=\\tan x" } },
  { id: "graph-2", rules: ["G-9"], input: { latex: "y=\\frac{1}{x}" } },
  { id: "graph-3", rules: ["G-9"], input: { latex: "y=\\frac{x^{2}-1}{x-2}" } },
  { id: "graph-4", rules: ["G-10"], input: { latex: "y=\\sqrt{1-x^{2}}" } },
  { id: "graph-5", rules: ["G-10"], input: { latex: "y=\\sqrt{x}" } },
  { id: "graph-6", rules: ["G-10"], input: { latex: "y=\\sqrt{x-3}+2" } },
  { id: "graph-7", rules: ["G-10"], input: { latex: "y=\\ln x" } },
  { id: "graph-8", rules: ["G-11"], input: { latex: "y=x^{2}" } },
  { id: "graph-9", rules: ["G-11"], input: { latex: "y=\\sin x" } },
  { id: "graph-10", rules: ["G-12"], input: { latex: "y=\\sin(100x)" } },
  { id: "graph-11", rules: ["G-13"], input: { latex: "y=\\frac{x^{2}-1}{x-1}" } },
  { id: "graph-12", rules: ["G-16"], input: { latex: "x^{2}+y^{2}=25" } },
  { id: "graph-13", rules: ["G-16"], input: { latex: "xy=6" } },
  { id: "graph-14", rules: ["G-16"], rows: ["y=5"], input: { latex: "x^{2}+y^{2}=25" } },
  { id: "graph-15", rules: ["G-8"], input: { latex: "x=3" } },
  { id: "graph-16", rules: ["G-7"], input: { latex: "(2,3)" } },
  { id: "graph-17", rules: ["G-1", "G-17"], input: { latex: "1<y<3" } },
  { id: "graph-18", rules: ["G-1"], input: { latex: "y<2x+1" } },
  { id: "graph-19", rules: ["G-1"], input: { latex: "y\\le2x+1" } },
  { id: "graph-20", rules: ["G-6"], rows: ["y=f(x)"], input: { latex: "f(x)=x^{2}+1" } },
  { id: "graph-21", rules: ["G-1"], input: { latex: "x=y^{2}" } },
];
export default cases;
