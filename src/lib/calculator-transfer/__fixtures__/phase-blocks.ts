// Phase 1 polar, parametric, hyperbolic and point blocks (TR-77, c-transfer.md section 14). The
// parity increment enables pairs and `f(2)=5` (classify.pairs.test.ts); the parametric pair
// `(\cos t,\sin t)` holds names, so TR-15 blocks it.

import type { TransferFixture } from "./types";

let n = 0;
const id = () => `phase-blocks-${++n}`;

const BLOCKED: readonly string[] = [
  "2\\pi r",
  "\\sin\\theta=\\frac{3}{5}",
  "\\sinh x",
  "y=\\cosh(x)",
  "\\tanh2",
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
    rules: ["TR-77", "TR-15"],
    source: { kind: "stem", text: "$(\\cos t,\\sin t)$", segment: 0 },
    expect: { control: false, rule: "TR-15" },
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
