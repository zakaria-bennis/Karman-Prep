// Common SAT forms (c-transfer.md section 14): lines, standard form, vertex form, exponential
// functions, value definitions, one-variable equations, circles, systems and plain choices.

import type { TransferItemKind } from "../classify";
import type { TransferFixture } from "./types";

let n = 0;
const id = () => `sat-forms-${++n}`;
const qd = (k: number) => `question-dialect-${k}`;

/** An allowed `$L$` stem inserted into an empty calculator. */
const allowed = (
  rules: string[],
  latex: string,
  kind: TransferItemKind,
  rows: string[],
  corpus: number[]
): TransferFixture => ({
  id: id(),
  rules,
  source: { kind: "stem", text: `$${latex}$`, segment: 0 },
  expect: {
    control: true,
    kind,
    rows,
    corpus: corpus.map(qd),
    status: "added",
    inserted: rows,
  },
});

const SERIALIZED =
  "5. The function f is defined by f(x) = (1/2)(x + 11). What is the value of f(3)?";

const fixtures: TransferFixture[] = [
  allowed(["TR-13", "TR-26"], "y=2x+3", "equation", ["y=2x+3"], [45]),
  allowed(["TR-13", "TR-14"], "2x+3y=6", "equation", ["2x+3y=6"], [68]),
  allowed(["TR-13"], "y=2(x-3)^{2}+1", "equation", ["y=2(x-3)^{2}+1"], [69]),
  allowed(["TR-13"], "P(t)=500(1.03)^{t}", "function", ["P(t)=500(1.03)^{t}"], [46]),
  allowed(["TR-13"], "C=8h+15", "equation", ["C=8h+15"], [56]),
  allowed(["TR-13", "TR-26"], "3p+4=19", "equation", ["3p+4=19"], [47]),
  allowed(["TR-13", "TR-14"], "(x-2)^2+(y+1)^2=9", "equation", ["(x-2)^2+(y+1)^2=9"], [55]),
  allowed(["TR-13", "TR-14"], "x^{2}+y^{2}=25", "equation", ["x^{2}+y^{2}=25"], [67]),
  allowed(
    ["TR-12", "TR-27"],
    "\\begin{cases}y=2x\\\\y=x+1\\end{cases}",
    "system",
    ["y=2x", "y=x+1"],
    [58, 59]
  ),
  allowed(
    ["TR-12", "TR-27"],
    "\\begin{aligned}2x+y&=5\\\\x-y&=1\\end{aligned}",
    "system",
    ["2x+y=5", "x-y=1"],
    [65, 66]
  ),
  {
    id: id(),
    rules: ["TR-12"],
    source: {
      kind: "stem",
      text: "$f(x)=\\begin{cases}x&x<0\\\\2x&x\\ge0\\end{cases}$",
      segment: 0,
    },
    expect: { control: false, rule: "TR-12" },
  },
  {
    id: id(),
    rules: ["TR-13", "TR-40"],
    source: { kind: "choice", letter: "C", text: "$y=2x+3$" },
    expect: {
      control: true,
      kind: "choice",
      rows: ["y=2x+3"],
      corpus: [qd(45)],
      status: "added",
      inserted: ["y=2x+3"],
    },
  },
  {
    id: id(),
    rules: ["TR-13", "TR-40"],
    source: { kind: "choice", letter: "C", text: "y = 2x + 3" },
    expect: {
      control: true,
      kind: "choice",
      rows: ["y = 2x + 3"],
      corpus: [qd(81)],
      status: "added",
      inserted: ["y = 2x + 3"],
    },
  },
  {
    id: id(),
    rules: ["TR-1", "TR-13"],
    source: { kind: "stem", text: SERIALIZED, segment: 1, serializedFunctionLines: true },
    expect: {
      control: true,
      kind: "function",
      rows: ["f(x) = \\frac{1}{2}(x + 11)"],
      corpus: [qd(82)],
      status: "added",
      inserted: ["f(x) = \\frac{1}{2}(x + 11)"],
    },
  },
];

export default fixtures;
