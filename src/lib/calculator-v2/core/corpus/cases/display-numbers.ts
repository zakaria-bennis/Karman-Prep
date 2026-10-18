import type { CorpusCase, CorpusSettings } from "../types";

const FILE = "display-numbers";
const DEG: CorpusSettings = { angleMode: "degrees" };
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
  d(1, ["NM-1"], "\\frac{1}{3}", "0.333333333333"),
  d(2, ["NM-1"], "\\pi", "3.14159265359"),
  d(3, ["NM-1"], "-0", "0"),
  d(4, ["NM-1"], "1.5\\times10^{3}", "1500"),
  d(5, ["NM-2"], "2^{40}", "1.09951162778×10^12"),
  d(6, ["NM-2"], "999999999999", "999999999999"),
  d(7, ["NM-2"], "10^{12}", "1×10^12"),
  d(8, ["NM-2"], "0.000001", "0.000001"),
  d(9, ["NM-2"], "0.0000001", "1×10^-7"),
  d(10, ["NM-3"], "0.1+0.2", "0.3"),
  d(11, ["NM-3"], "10^{-20}", "1×10^-20"),
  d(12, ["NM-3"], "0.1+0.2-0.3", "5.55111512313×10^-17"),
  d(13, ["NM-5"], "(1,2)", "(1, 2)"),
  d(14, ["NM-5"], "(\\frac{1}{3},2^{40})", "(0.333333333333, 1.09951162778×10^12)"),
  d(15, ["NM-5"], "(1,\\frac{1}{0})", "(1, undefined)"),
  d(16, ["NM-6"], "\\frac{1}{0}", "undefined"),
  d(17, ["NM-6"], "\\frac{0}{0}", "undefined"),
  d(18, ["NM-6", "NM-14"], "10^{400}", "undefined"),
  d(19, ["NM-6", "NM-14"], "10^{-400}", "0"),
  d(20, ["NM-9", "RC-1"], "a-0.3", "5.55111512313×10^-17", { rows: ["a=0.1+0.2"] }),
  d(21, ["NM-9", "RC-1"], "A+a", "7", { rows: ["A=3", "a=4"] }),
  d(22, ["NM-22"], "\\frac{1}{0}<2", "undefined"),
  d(23, ["NM-22"], "2<3", "1"),
  d(24, ["NM-8", "NM-2"], "2\\cdot5000", "10000"),
  d(25, ["NM-24"], "\\sin(90)", "0.893996663601"),
  d(26, ["NM-29"], "\\cos(60)", "0.5", { settings: DEG }),
  d(27, ["NM-43"], "\\ln\\left(2\\right)", "0.69314718056"),
];
export default cases;
