import type { CorpusCase, CorpusSettings } from "../types";

const FILE = "display-complex";
const CX: CorpusSettings = { complex: true };
type Context = Pick<CorpusCase, "rows" | "settings">;
/** A case whose value formatValue shows as `display`. */
const d = (
  n: number,
  rules: string[],
  latex: string,
  display: string,
  context: Context = {}
): CorpusCase => ({ id: `${FILE}-${n}`, rules, input: { latex }, ...context, display });
/** A complex-mode case. */
const c = (n: number, rules: string[], latex: string, display: string): CorpusCase =>
  d(n, rules, latex, display, { settings: CX });

const cases: CorpusCase[] = [
  c(1, ["NM-18"], "\\sqrt{-4}", "2i"),
  c(2, ["NM-18"], "\\frac{1}{i}", "-i"),
  c(3, ["NM-18"], "i^{i}", "0.207879576351"),
  c(4, ["NM-18"], "\\sin(i)", "1.17520119364i"),
  c(5, ["NM-18"], "(1+i)^{2}", "2i"),
  c(6, ["NM-18"], "\\left|3+4i\\right|", "5"),
  c(7, ["NM-18", "FN-60"], "\\ln(-1)", "3.14159265359i"),
  c(8, ["NM-18", "FN-60"], "\\log(-10)", "1+1.36437635384i"),
  // Desmos's branches and principal powers (captured 2026-10-20)
  c(9, ["NM-18", "FN-17"], "\\arcsin(2)", "1.57079632679-1.31695789692i"),
  c(10, ["NM-18", "FN-17"], "\\arccos(2)", "1.31695789692i"),
  c(11, ["NM-19", "FN-17"], "(-8)^{\\frac{1}{3}}", "1+1.73205080757i"),
  c(12, ["NM-19", "FN-17"], "(-8)^{\\frac{1}{2}}", "2.82842712475i"),
  c(13, ["NM-19", "FN-17"], "2+3", "5"),
  d(14, ["NM-6", "NM-17", "NM-19"], "\\sqrt{-4}", "undefined"),
  d(15, ["NM-17", "NM-19"], "2i", "6", { rows: ["i=3"] }),
  c(16, ["NM-20"], "e^{i\\pi}", "-1"),
  c(17, ["NM-20"], "3-4i", "3-4i"),
  c(18, ["NM-20"], "1+i", "1+i"),
  c(19, ["NM-20"], "-i", "-i"),
  c(20, ["NM-20"], "i", "i"),
  c(21, ["NM-22"], "i<2", "undefined"),
  c(22, ["NM-22"], "i\\cdot i<0", "1"),
];
export default cases;
