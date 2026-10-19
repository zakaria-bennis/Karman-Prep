import type { CorpusCase } from "../types";

const FILE = "domain-real";
type Context = Pick<CorpusCase, "rows" | "settings">;
/** A case whose value formatValue shows as `display`. */
const d = (
  n: number,
  rules: string[],
  latex: string,
  display: string,
  context: Context = {}
): CorpusCase => ({ id: `${FILE}-${n}`, rules, input: { latex }, ...context, display });

const cases: CorpusCase[] = [
  d(1, ["NM-10", "FN-12"], "(-8)^{\\frac{1}{3}}", "-2"),
  d(2, ["NM-10", "FN-12"], "(-8)^{\\frac{2}{3}}", "4"),
  d(3, ["NM-10", "FN-12"], "(-32)^{0.2}", "-2"),
  d(4, ["NM-10", "FN-12"], "(-8)^{\\frac{1}{101}}", "undefined"),
  d(5, ["NM-10"], "(-8)^{-\\frac{1}{3}}", "-0.5"),
  d(6, ["NM-10"], "(-8)^{\\frac{2}{6}}", "-2"),
  d(7, ["NM-10"], "(-8)^{\\frac{3}{6}}", "undefined"),
  d(8, ["NM-10"], "(-8)^{a}", "-2", { rows: ["a=\\frac{1}{3}"] }),
  d(9, ["NM-6", "NM-10"], "(-8)^{0.5}", "undefined"),
  d(10, ["NM-10", "FN-13"], "(-2)^{\\pi}", "undefined"),
  d(11, ["NM-10", "FN-13"], "(-8)^{\\frac{1}{2}}", "undefined"),
  d(12, ["NM-10", "FN-13"], "\\sqrt[0]{5}", "undefined"),
  d(13, ["NM-10", "FN-13"], "\\sqrt[3]{-8}", "-2"),
  d(14, ["NM-11", "FN-13"], "\\sqrt[3]{-27}", "-3"),
  d(15, ["NM-11", "FN-13"], "\\sqrt[-3]{-8}", "-0.5"),
  d(16, ["NM-11", "FN-13"], "\\sqrt[1.5]{-8}", "4"),
  d(17, ["NM-11", "FN-13"], "\\sqrt[4]{-16}", "undefined"),
  d(18, ["NM-12"], "\\sqrt{-1}", "undefined"),
  d(19, ["NM-12"], "\\log_{1}(5)", "undefined"),
  d(20, ["NM-12"], "\\log_{-2}(4)", "undefined"),
  d(21, ["NM-12", "FN-14"], "\\frac{5}{0}", "undefined"),
  d(22, ["NM-12", "FN-14"], "\\frac{-5}{0}", "undefined"),
  d(23, ["NM-12", "FN-14"], "\\ln(0)", "undefined"),
  d(24, ["NM-12", "FN-14"], "\\ln(-2)", "undefined"),
  d(25, ["NM-12", "FN-14"], "\\log(0)", "undefined"),
  d(26, ["NM-12", "FN-14"], "\\log(-2)", "undefined"),
  d(27, ["NM-13", "FN-14"], "0^{0}", "1"),
  d(28, ["FN-14"], "10^{308}\\cdot10", "undefined"),
  d(29, ["FN-14"], "2^{1024}", "undefined"),
  d(30, ["FN-14"], "0^{-1}", "undefined"),
];
export default cases;
