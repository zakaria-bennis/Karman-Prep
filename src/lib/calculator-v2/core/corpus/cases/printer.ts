import type { CorpusCase } from "../types";

const FILE = "printer";
// The expected field is latex: printLatex of the parsed tree (PR-37).
const p = (n: number, latex: string, printed: string, rows?: string[]): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules: ["PR-37"],
  input: { latex },
  ...(rows ? { rows } : {}),
  latex: printed,
});

const cases: CorpusCase[] = [
  p(1, "y=mx+b", "y=m\\cdot x+b"),
  p(2, "\\dfrac{1}{2}", "\\frac{1}{2}"),
  p(3, "2x", "2x"),
  p(4, "-x^{2}", "-x^{2}"),
  p(5, "\\sin2x", "\\sin\\left(2x\\right)"),
  p(6, "\\sin^{2}x", "\\sin\\left(x\\right)^{2}"),
  p(7, "\\log_{2}8", "\\log_{2}\\left(8\\right)"),
  p(8, "|x|-|y|", "\\left|x\\right|-\\left|y\\right|"),
  p(9, "(1,2)", "\\left(1,2\\right)"),
  p(10, "0\\le x<10", "0\\le x<10"),
  p(11, "a-(b-c)", "a-\\left(b-c\\right)"),
  p(12, "(a+b)c", "\\left(a+b\\right)\\cdot c"),
  p(13, "1/2x", "\\frac{1}{2}\\cdot x"),
  p(14, "2\\pi x", "2\\pi\\cdot x"),
  p(15, "x^{2}\\%", "x^{2}\\%"),
  p(16, "30°", "30^{\\circ}"),
  p(17, "e_{3}", "e_{3}"),
  p(18, "\\alpha x", "\\alpha\\cdot x"),
  p(19, "0.0000001", "0.0000001"),
  p(20, "\\operatorname{arccot}(x)", "\\operatorname{arccot}\\left(x\\right)"),
  p(21, "-2x", "-2\\cdot x"),
  p(22, "-(2x)", "-\\left(2x\\right)"),
  p(23, "x-(-y)", "x--y"),
  p(24, "(x^{2})^{3}", "\\left(x^{2}\\right)^{3}"),
  p(25, "f(2)", "f\\left(2\\right)", ["f(x)=x^{2}"]),
  p(26, "\\sqrt[3]{x}", "\\sqrt[3]{x}"),
  p(27, "2(x+1)", "2\\left(x+1\\right)"),
  p(28, "\\frac{a}{b}^{2}", "\\left(\\frac{a}{b}\\right)^{2}"),
  p(29, "\\sin(x)y", "\\sin\\left(x\\right)\\cdot y"),
  p(30, "x\\pi", "x\\cdot\\pi"),
  p(31, "2\\cdot3", "2\\cdot3"),
  p(32, "\\tan^{-1}x", "\\arctan\\left(x\\right)"),
  p(33, "\\ln^{-1}x", "\\ln\\left(x\\right)^{-1}"),
  p(34, "x\\ge-y", "x\\ge-y"),
  p(35, "1000000000000000000000", "1000000000000000000000"),
  {
    id: `${FILE}-36`,
    rules: ["PR-2"],
    input: { latex: "y=\\sqrt{x}+\\frac{3}{4}" },
    tree: "(rel = (id y) (add (root (id x)) (div (num 3) (num 4))))",
  },
];
export default cases;
