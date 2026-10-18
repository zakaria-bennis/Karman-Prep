// Question function names, calls and stem dependencies (TR-18 to TR-21, TR-37): an extra file
// for what no category of c-transfer.md section 14 covers.

import type { TransferFixture } from "./types";

let n = 0;
const id = () => `functions-${++n}`;
const qd = (k: number) => `question-dialect-${k}`;

const DEFINED = "The function $f$ is defined by $f(x)=x^{2}$. Graph $y=f(x)+1$.";

const fixtures: TransferFixture[] = [
  {
    id: id(),
    rules: ["TR-10", "TR-18"],
    source: { kind: "stem", text: DEFINED, segment: 1 },
    expect: { control: false, rule: "TR-10" },
  },
  {
    id: id(),
    rules: ["TR-13", "TR-19"],
    source: { kind: "stem", text: DEFINED, segment: 3 },
    expect: {
      control: true,
      kind: "function",
      rows: ["f(x)=x^{2}"],
      corpus: [qd(64)],
      status: "added",
      inserted: ["f(x)=x^{2}"],
    },
  },
  {
    id: id(),
    rules: ["TR-19", "TR-37"],
    source: { kind: "stem", text: DEFINED, segment: 5 },
    expect: {
      control: true,
      kind: "equation",
      rows: ["y=f(x)+1"],
      dependencies: ["f(x)=x^{2}"],
      corpus: [qd(73)],
      status: "added",
      inserted: ["f(x)=x^{2}", "y=f(x)+1"],
    },
  },
  {
    id: id(),
    rules: ["TR-20"],
    source: { kind: "stem", text: "For the function $f$, graph $y=f(x)$.", segment: 3 },
    expect: { control: false, rule: "TR-20" },
  },
  {
    id: id(),
    rules: ["TR-20"],
    source: { kind: "stem", text: "If $f(x)=2x$ or $f(x)=3x$, graph $y=f(x)$.", segment: 5 },
    expect: { control: false, rule: "TR-20" },
  },
  {
    id: id(),
    rules: ["TR-18", "TR-13"],
    source: { kind: "stem", text: "Graph $y=a(x+3)$.", segment: 1 },
    expect: {
      control: true,
      kind: "equation",
      rows: ["y=a(x+3)"],
      corpus: [qd(72)],
      status: "added",
      inserted: ["y=a(x+3)"],
    },
  },
  {
    id: id(),
    rules: ["TR-19", "TR-37"],
    source: {
      kind: "stem",
      text: "For functions $f$ and $g$, $f(x)=x^{2}$ and $g(x)=f(x)+3$.",
      segment: 7,
    },
    expect: {
      control: true,
      kind: "function",
      rows: ["g(x)=f(x)+3"],
      dependencies: ["f(x)=x^{2}"],
      corpus: [qd(63)],
      status: "added",
      inserted: ["f(x)=x^{2}", "g(x)=f(x)+3"],
    },
  },
  {
    id: id(),
    rules: ["TR-37"],
    source: { kind: "stem", text: "If $k=3$, graph $y=kx+1$.", segment: 3 },
    expect: {
      control: true,
      kind: "equation",
      rows: ["y=kx+1"],
      dependencies: ["k=3"],
      corpus: [qd(70)],
      status: "added",
      inserted: ["k=3", "y=kx+1"],
    },
  },
  {
    id: id(),
    rules: ["TR-37"],
    source: { kind: "stem", text: "If $k=3$ or $k=5$, graph $y=kx+1$.", segment: 5 },
    expect: {
      control: true,
      kind: "equation",
      rows: ["y=kx+1"],
      corpus: [qd(70)],
      status: "added",
      inserted: ["y=kx+1"],
    },
  },
  {
    id: id(),
    rules: ["TR-21"],
    source: { kind: "stem", text: "$f(x)=f(x-1)+1$", segment: 0 },
    expect: { control: false, rule: "TR-21" },
  },
  {
    id: id(),
    rules: ["TR-37", "TR-40"],
    source: {
      kind: "choice",
      letter: "A",
      text: "$y=f(x)+2$",
      stem: "The function $f$ is defined by $f(x)=x^{2}$.",
    },
    expect: {
      control: true,
      kind: "choice",
      rows: ["y=f(x)+2"],
      dependencies: ["f(x)=x^{2}"],
      corpus: [qd(79)],
      status: "added",
      inserted: ["f(x)=x^{2}", "y=f(x)+2"],
    },
  },
  {
    id: id(),
    rules: ["TR-20", "TR-40"],
    source: { kind: "choice", letter: "A", text: "$y=g(x)$", stem: "the function $g$" },
    expect: { control: false, rule: "TR-20" },
  },
  {
    id: id(),
    rules: ["TR-37", "TR-40"],
    source: { kind: "choice", letter: "A", text: "$y=kx$" },
    expect: {
      control: true,
      kind: "choice",
      rows: ["y=kx"],
      corpus: [qd(80)],
      status: "added",
      inserted: ["y=kx"],
    },
  },
];

export default fixtures;
