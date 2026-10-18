// Phase 1 polar, parametric, hyperbolic, point and function-coordinate blocks (TR-77); the
// pairs and `f(2)=5` that Phase 3 enables are blocked here (c-transfer.md section 14).

import type { TransferFixture } from "./types";

let n = 0;
const id = () => `phase-blocks-${++n}`;

const BLOCKED: readonly string[] = [
  "2\\pi r",
  "\\sin\\theta=\\frac{3}{5}",
  "(\\cos t,\\sin t)",
  "\\sinh x",
  "y=\\cosh(x)",
  "\\tanh2",
  "(2,5)",
  "(1,2),(3,4)",
  "r=5",
  "P=(t,2)", // a point on a t that no row defines
];

const fixtures: TransferFixture[] = [
  ...BLOCKED.map(
    (latex): TransferFixture => ({
      id: id(),
      rules: ["TR-77"],
      source: { kind: "stem", text: `$${latex}$`, segment: 0 },
      expect: { control: false, rule: "TR-77" },
    })
  ),
  {
    id: id(),
    rules: ["TR-77", "TR-13"],
    source: { kind: "stem", text: "The linear function $f$ has $f(2)=5$.", segment: 3 },
    expect: { control: false, rule: "TR-77" },
  },
  {
    id: id(),
    rules: ["TR-77", "TR-37"],
    source: { kind: "stem", text: "If $A=\\pi r^{2}$, find $y=A$.", segment: 3 },
    expect: { control: false, rule: "TR-77" },
  },
  {
    id: id(),
    rules: ["TR-77", "TR-13"],
    source: { kind: "stem", text: "$A=\\pi r^{2}$", segment: 0 },
    expect: {
      control: true,
      kind: "equation",
      rows: ["A=\\pi r^{2}"],
      corpus: ["question-dialect-62"],
      status: "added",
      inserted: ["A=\\pi r^{2}"],
    },
  },
  {
    id: id(),
    rules: ["TR-77", "TR-13"],
    source: { kind: "stem", text: "$C=2\\pi r$", segment: 0 },
    expect: {
      control: true,
      kind: "equation",
      rows: ["C=2\\pi r"],
      corpus: ["question-dialect-78"],
      status: "added",
      inserted: ["C=2\\pi r"],
    },
  },
];

export default fixtures;
