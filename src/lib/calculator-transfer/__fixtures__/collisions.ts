// Collisions (c-transfer.md section 14): an existing x_{1}, a second f, repeat transfers, used
// dependency names, a blank last row (OI-22) and a core-check rejection (TR-35 to TR-37, TR-73).

import type { TransferFixture } from "./types";

let n = 0;
const id = () => `collisions-${++n}`;
const qd = (k: number) => `question-dialect-${k}`;
const at0 = (text: string) => ({ kind: "stem" as const, text, segment: 0 });

const fixtures: TransferFixture[] = [
  {
    id: id(),
    rules: ["TR-36"],
    calculator: ["x_{1}=4"],
    source: at0("$x_{1}=2$"),
    expect: {
      control: true,
      kind: "equation",
      rows: ["x_{1}=2"],
      corpus: [qd(74)],
      status: "renamed",
      inserted: ["x_{1}=4", "x_{2}=2"],
    },
  },
  {
    id: id(),
    rules: ["TR-36"],
    calculator: ["f(x)=3x"],
    source: at0("$f(x)=x^{2}$"),
    expect: {
      control: true,
      kind: "function",
      rows: ["f(x)=x^{2}"],
      corpus: [qd(64)],
      status: "renamed",
      inserted: ["f(x)=3x", "f_{2}(x)=x^{2}"],
    },
  },
  {
    id: id(),
    rules: ["TR-37"],
    calculator: ["f(x)=3x"],
    source: {
      kind: "stem",
      text: "The function $f$ is defined by $f(x)=x^{2}$. Graph $y=f(x)+1$.",
      segment: 5,
    },
    expect: {
      control: true,
      kind: "equation",
      rows: ["y=f(x)+1"],
      dependencies: ["f(x)=x^{2}"],
      corpus: [qd(73)],
      status: "added",
      inserted: ["f(x)=3x", "y=f(x)+1"],
    },
  },
  {
    id: id(),
    rules: ["TR-35"],
    calculator: ["y=2x+3"],
    source: at0("$y=2x+3$"),
    expect: {
      control: true,
      kind: "equation",
      rows: ["y=2x+3"],
      corpus: [qd(45)],
      status: "already-present",
      inserted: ["y=2x+3"],
    },
  },
  {
    id: id(),
    rules: ["TR-35", "TR-36"],
    calculator: ["f(x)=3x", "f_{2}(x)=x^{2}"],
    source: at0("$f(x)=x^{2}$"),
    expect: {
      control: true,
      kind: "function",
      rows: ["f(x)=x^{2}"],
      corpus: [qd(64)],
      status: "already-present",
      inserted: ["f(x)=3x", "f_{2}(x)=x^{2}"],
    },
  },
  {
    id: id(),
    rules: ["TR-37"],
    calculator: ["y=kx"],
    source: { kind: "stem", text: "If $k=3$, graph $y=kx+1$.", segment: 3 },
    expect: {
      control: true,
      kind: "equation",
      rows: ["y=kx+1"],
      dependencies: ["k=3"],
      corpus: [qd(70)],
      status: "added",
      inserted: ["y=kx", "y=kx+1"],
    },
  },
  {
    id: id(),
    rules: ["TR-35"], // OI-22: the blank last row is reused
    calculator: ["y=x", ""],
    source: at0("$y=2x+3$"),
    expect: {
      control: true,
      kind: "equation",
      rows: ["y=2x+3"],
      corpus: [qd(45)],
      status: "added",
      inserted: ["y=x", "y=2x+3"],
    },
  },
  {
    id: id(),
    rules: ["TR-73", "TR-40"],
    calculator: ["a=b"],
    source: { kind: "choice", letter: "B", text: "$b=a$" },
    expect: {
      control: true,
      kind: "choice",
      rows: ["b=a"],
      corpus: [],
      status: "rejected",
      inserted: ["a=b"],
    },
  },
  {
    id: id(),
    rules: ["TR-9"],
    source: at0("$x_{1}\\ne2$"),
    expect: { control: false, rule: "TR-9" },
  },
];

export default fixtures;
