// Inequalities, compound inequalities, mixed relation chains, systems and mixed systems
// (c-transfer.md section 14), each as a stem and as a whole choice.

import type { TransferItemKind } from "../classify";
import type { TransferFixture } from "./types";

let n = 0;
const id = () => `inequalities-${++n}`;

/** [math, stem kind, rows, question-dialect cases, rules]. */
const ALLOWED: readonly [string, TransferItemKind, string[], number[], string[]][] = [
  ["y>2x+1", "inequality", ["y>2x+1"], [51], ["TR-11", "TR-26"]],
  ["y\\le-x+4", "inequality", ["y\\le-x+4"], [53], ["TR-11"]],
  ["3p+4>19", "inequality", ["3p+4>19"], [54], ["TR-11", "TR-26"]],
  ["-2<x\\le5", "inequality", ["-2<x\\le5"], [52], ["TR-11"]],
  ["1<y<3", "inequality", ["1<y<3"], [75], ["TR-11"]],
  [
    "\\begin{cases}y\\ge x^{2}\\\\y<4\\end{cases}",
    "system",
    ["y\\ge x^{2}", "y<4"],
    [60, 61],
    ["TR-12"],
  ],
  [
    "\\left\\{\\begin{array}{l}y=2x+1\\\\y>x\\end{array}\\right.",
    "system",
    ["y=2x+1", "y>x"],
    [76, 77],
    ["TR-12"],
  ],
];

/** Relation chains that mix directions or an equation with an inequality. */
const BLOCKED: readonly string[] = ["0<x>2", "x=y<3", "\\begin{cases}y=2x\\\\0<y>2\\end{cases}"];

const fixtures: TransferFixture[] = [
  ...ALLOWED.flatMap(([latex, kind, rows, cases, rules]): TransferFixture[] => {
    const corpus = cases.map((k) => `question-dialect-${k}`);
    return [
      {
        id: id(),
        rules: [...rules, "PR-44"],
        source: { kind: "stem", text: `$${latex}$`, segment: 0 },
        expect: { control: true, kind, rows, corpus, status: "added", inserted: rows },
      },
      {
        id: id(),
        rules: [...rules, "TR-40", "PR-44"],
        source: { kind: "choice", letter: "D", text: `$${latex}$` },
        expect: { control: true, kind: "choice", rows, corpus, status: "added", inserted: rows },
      },
    ];
  }),
  ...BLOCKED.flatMap((latex): TransferFixture[] => [
    {
      id: id(),
      rules: ["TR-11"],
      source: { kind: "stem", text: `$${latex}$`, segment: 0 },
      expect: { control: false, rule: "TR-11" },
    },
    {
      id: id(),
      rules: ["TR-11", "TR-40"],
      source: { kind: "choice", letter: "D", text: `$${latex}$` },
      expect: { control: false, rule: "TR-11" },
    },
  ]),
];

export default fixtures;
