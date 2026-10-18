// TR-9 exclusions (table 4.2) and TR-8 extras, each blocked as a stem and as a choice; two
// allowed forms next to them (c-transfer.md section 14, first category).

import type { TransferFixture } from "./types";

/** Every TR-9 string of Task 4's lexer test. */
const TR9: readonly string[] = [
  "i+2",
  "2i",
  "f'(x)",
  "f^\\prime",
  "abc+1",
  "[2,5]",
  "\\begin{pmatrix}1\\\\2\\end{pmatrix}",
  "\\begin{array}{cc}1&2\\end{array}",
  "x=?",
  "1,2,\\ldots,10",
  "1+\\cdots+n",
  "\\dots",
  "1+...+n",
  "x\\approx3",
  "y\\sim x",
  "a\\cong b",
  "a\\equiv b",
  "x\\ne3",
  "x\\neq3",
  "\\pm2",
  "\\mp2",
  "\\infty",
  "x\\in A",
  "x\\notin A",
  "A\\subset B",
  "A\\cup B",
  "A\\cap B",
  "x\\to2",
  "p\\Rightarrow q",
  "p\\iff q",
  "12\\text{ cm}",
  "\\mathrm{kg}",
  "\\textrm{ft}",
  "\\mbox{in}",
  "90^\\circ",
  "90^{\\circ}",
  "90°",
  "\\$12.50",
  "15\\%",
  "€5",
  "£5",
  "¢5",
  "\\angle B",
  "\\measuredangle B",
  "\\triangle ABC",
  "\\overleftrightarrow{AB}",
  "\\overrightarrow{AB}",
  "\\widehat{A}",
  "AB\\parallel CD",
  "AB\\perp CD",
  "\\square",
  "\\odot",
  "\\circ",
  "\\overline{AB}",
  "12cm",
  "5 mm", // D2
  "3km",
  "6ft",
  "2yd",
  "4mi",
  "2in",
  "3hr",
  "5kg",
  "2lb",
  "8oz",
  "250mL",
];

/** TR-8 extras: unlisted notation (decision 4). */
const TR8: readonly string[] = [
  "\\Delta x",
  "\\tau+1",
  "\\operatorname{abs}(x)",
  "3!",
  "\\lvert x\\rvert",
];

const blocked: [string, string][] = [
  ...TR9.map((s): [string, string] => [s, "TR-9"]),
  ...TR8.map((s): [string, string] => [s, "TR-8"]),
];

let n = 0;
const id = () => `exclusions-${++n}`;

const fixtures: TransferFixture[] = [
  ...blocked.flatMap(([latex, rule]): TransferFixture[] => [
    {
      id: id(),
      rules: [rule],
      source: { kind: "stem", text: `$${latex}$`, segment: 0 },
      expect: { control: false, rule },
    },
    {
      id: id(),
      rules: [rule, "TR-40"],
      source: { kind: "choice", letter: "B", text: `$${latex}$` },
      expect: { control: false, rule },
    },
  ]),
  {
    id: id(),
    rules: ["TR-11"],
    source: { kind: "stem", text: "$x\\le3$", segment: 0 },
    expect: {
      control: true,
      kind: "inequality",
      rows: ["x\\le3"],
      corpus: ["question-dialect-11"],
      status: "added",
      inserted: ["x\\le3"],
    },
  },
  {
    id: id(),
    rules: ["TR-11", "TR-40"],
    source: { kind: "choice", letter: "B", text: "$x\\le3$" },
    expect: {
      control: true,
      kind: "choice",
      rows: ["x\\le3"],
      corpus: ["question-dialect-11"],
      status: "added",
      inserted: ["x\\le3"],
    },
  },
  {
    id: id(),
    rules: ["TR-7", "TR-11"],
    source: { kind: "stem", text: "$0.\\overline{3}x$", segment: 0 },
    expect: {
      control: true,
      kind: "expression",
      rows: ["\\frac{1}{3}x"],
      corpus: ["question-dialect-30"],
      status: "added",
      inserted: ["\\frac{1}{3}x"],
    },
  },
];

export default fixtures;
