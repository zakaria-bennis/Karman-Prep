// TR-10 lone-symbol forms: blocked in a stem, inserted as a whole choice (TR-40); and the stem
// forms that are not lone symbols (c-transfer.md section 14, first category).

import type { TransferFixture } from "./types";

/** [question math, normalised row, question-dialect case]. */
const LONE: readonly [string, string, number][] = [
  ["x", "x", 83],
  ["5", "5", 84],
  ["-5", "-5", 85],
  ["3.25", "3.25", 86],
  ["\\frac{3}{4}", "\\frac{3}{4}", 8],
  ["2\\frac{1}{2}", "\\left(2+\\frac{1}{2}\\right)", 37],
  ["x_{1}", "x_{1}", 87],
  ["a_{n}", "a_{n}", 88],
  ["x^{2}", "x^{2}", 89],
  ["x^{-1}", "x^{-1}", 90],
  ["x^{\\frac{1}{2}}", "x^{\\frac{1}{2}}", 92],
  ["y^{-\\frac{2}{3}}", "y^{-\\frac{2}{3}}", 93],
  ["f(x)", "f(x)", 91],
];

/** Stem forms that are expressions, not lone symbols: [math, case]. */
const EXPRESSIONS: readonly [string, number][] = [
  ["2x", 48],
  ["\\sqrt{50}", 49],
  ["2^{10}", 50],
];

let n = 0;
const id = () => `lone-symbols-${++n}`;

const fixtures: TransferFixture[] = [
  ...LONE.flatMap(([latex, row, qd]): TransferFixture[] => [
    {
      id: id(),
      rules: ["TR-10"],
      source: { kind: "stem", text: `$${latex}$`, segment: 0 },
      expect: { control: false, rule: "TR-10" },
    },
    {
      id: id(),
      rules: ["TR-10", "TR-40"],
      source: { kind: "choice", letter: "B", text: `$${latex}$` },
      expect: {
        control: true,
        kind: "choice",
        rows: [row],
        corpus: [`question-dialect-${qd}`],
        status: "added",
        inserted: [row],
      },
    },
  ]),
  ...EXPRESSIONS.map(
    ([latex, qd]): TransferFixture => ({
      id: id(),
      rules: ["TR-10", "TR-11"],
      source: { kind: "stem", text: `$${latex}$`, segment: 0 },
      expect: {
        control: true,
        kind: "expression",
        rows: [latex],
        corpus: [`question-dialect-${qd}`],
        status: "added",
        inserted: [latex],
      },
    })
  ),
  {
    id: id(),
    rules: ["TR-10", "TR-40"],
    source: { kind: "choice", letter: "B", text: "−5" },
    expect: {
      control: true,
      kind: "choice",
      rows: ["-5"],
      corpus: ["question-dialect-85"],
      status: "added",
      inserted: ["-5"],
    },
  },
];

export default fixtures;
