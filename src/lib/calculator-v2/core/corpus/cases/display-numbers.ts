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
  d(12, ["NM-3"], "0.1+0.2-0.3", "0"), // exact constants (NM-3 amendment, MATHS-CORE-1)
  d(13, ["NM-5"], "(1,2)", "(1, 2)"),
  d(14, ["NM-5"], "(\\frac{1}{3},2^{40})", "(0.333333333333, 1.09951162778×10^12)"),
  d(15, ["NM-5"], "(1,\\frac{1}{0})", "(1, undefined)"),
  d(16, ["NM-6"], "\\frac{1}{0}", "undefined"),
  d(17, ["NM-6"], "\\frac{0}{0}", "undefined"),
  d(18, ["NM-6", "NM-14"], "10^{400}", "undefined"),
  d(19, ["NM-6", "NM-14"], "10^{-400}", "0"),
  d(20, ["NM-9", "RC-1"], "a-0.3", "0", { rows: ["a=0.1+0.2"] }),
  d(21, ["NM-9", "RC-1"], "A+a", "7", { rows: ["A=3", "a=4"] }),
  d(22, ["NM-22"], "\\frac{1}{0}<2", "undefined"),
  d(23, ["NM-22"], "2<3", "1"),
  d(24, ["NM-8", "NM-2"], "2\\cdot5000", "10000"),
  d(25, ["NM-24"], "\\sin(90)", "0.893996663601"),
  d(26, ["NM-29"], "\\cos(60)", "0.5", { settings: DEG }),
  d(27, ["NM-43"], "\\ln\\left(2\\right)", "0.69314718056"),
  // NM-3 amendment (MATHS-CORE-1, 2, 61; appendix F decision 2): constants are exact rationals.
  d(28, ["NM-3"], "b+0.2-0.3", "0", { rows: ["b=0.1"] }),
  d(29, ["NM-3", "FN-77"], "\\operatorname{round}(1.005,2)", "1.01"),
  d(30, ["NM-3", "FN-77"], "\\operatorname{round}(0.285,2)", "0.29"),
  d(31, ["NM-3", "FN-77"], "\\operatorname{round}(2.675,2)", "2.68"), // passes on doubles too
  d(32, ["NM-3", "FN-76"], "\\operatorname{mod}(0.3,0.1)", "0"),
  d(33, ["NM-3"], "\\sqrt{0.04}-0.2", "0"),
  d(34, ["NM-3", "FN-77"], "\\operatorname{round}(\\sqrt{1.010025},2)", "1.01"),
  d(35, ["NM-3"], "\\pi-\\pi+0.1+0.2-0.3", "0"),
  d(36, ["NM-3"], "\\pi+0.1+0.2-0.3-\\pi", "4.4408920985×10^-16"),
  d(37, ["NM-3"], "2^{0.5}\\cdot2^{0.5}", "2"),
  d(38, ["NM-3"], "\\sqrt{2}^{2}", "2"),
  d(39, ["NM-3", "FN-77"], "f(a)", "1.01", {
    rows: ["f(x)=\\operatorname{round}(x,2)", "a=1.005"],
  }),
  d(40, ["NM-3"], "\\left|-0.1\\right|+0.2-0.3", "0"),
  d(41, ["NM-3"], "\\sqrt{2}\\cdot0+0.1+0.2-0.3", "0"),
];
export default cases;
