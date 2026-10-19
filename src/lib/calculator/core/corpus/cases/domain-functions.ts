import type { CorpusCase, CorpusSettings } from "../types";

const FILE = "domain-functions";
const DEG: CorpusSettings = { angleMode: "degrees" };
const DEG_CX: CorpusSettings = { angleMode: "degrees", complex: true };
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
/** A degree-mode case. */
const g = (n: number, rules: string[], latex: string, display: string): CorpusCase =>
  d(n, rules, latex, display, { settings: DEG });

const cases: CorpusCase[] = [
  d(1, ["NM-4"], "\\sin\\pi", "0"),
  d(2, ["NM-4"], "\\cos\\frac{\\pi}{2}", "0"),
  d(3, ["NM-4"], "\\tan\\frac{\\pi}{4}", "1"),
  d(4, ["NM-4"], "\\sin(\\pi+0.0000000001)", "-9.99998858094×10^-11"),
  d(5, ["NM-4", "FN-18"], "\\tan\\frac{\\pi}{2}", "undefined"),
  g(6, ["NM-26"], "\\sin(30)", "0.5"),
  g(7, ["NM-26"], "\\cos(90)", "0"),
  g(8, ["NM-26"], "\\sin(180)", "0"),
  g(9, ["NM-26"], "\\tan(45)", "1"),
  g(10, ["NM-26"], "\\cos(60)", "0.5"),
  g(11, ["NM-26"], "\\sin(3630)", "0.5"),
  g(12, ["NM-26", "FN-18"], "\\tan(90)", "undefined"),
  g(13, ["NM-26", "FN-18"], "\\tan(270)", "undefined"),
  d(14, ["FN-19"], "\\cot(\\frac{\\pi}{2})", "0"),
  d(15, ["FN-19"], "\\cot(0)", "undefined"),
  g(16, ["FN-19"], "\\csc(30)", "2"),
  g(17, ["FN-19"], "\\sec(90)", "undefined"),
  d(18, ["NM-27"], "\\sin(30^{\\circ})", "0.5"),
  d(19, ["NM-27"], "30^{\\circ}", "0.523598775598"),
  g(20, ["NM-27"], "\\sin(30^{\\circ})", "0.5"),
  g(21, ["NM-27"], "30^{\\circ}", "30"),
  g(22, ["NM-28"], "\\arcsin(0.5)", "30"),
  g(23, ["NM-28"], "\\arctan(1)", "45"),
  g(24, ["NM-28"], "\\arccos(-1)", "180"),
  g(25, ["NM-28"], "\\operatorname{arccot}(-1)", "135"),
  d(26, ["NM-28", "FN-20"], "\\arcsin(1)", "1.57079632679"),
  d(27, ["NM-28", "FN-20"], "\\arcsin(1.5)", "undefined"),
  g(28, ["FN-20"], "\\arcsin(1)", "90"),
  g(29, ["FN-20"], "\\sin^{-1}(0.5)", "30"),
  d(30, ["FN-21"], "\\operatorname{arccsc}(2)", "0.523598775598"),
  d(31, ["FN-21"], "\\operatorname{arccot}(0)", "1.57079632679"),
  d(32, ["FN-21"], "\\operatorname{arcsec}(0.5)", "undefined"),
  g(33, ["FN-21"], "\\operatorname{arcsec}(2)", "60"),
  d(34, ["FN-22"], "\\arctan(1,-1)", "2.35619449019"),
  d(35, ["FN-22"], "\\arctan(0,0)", "undefined"),
  d(36, ["FN-22"], "\\arctan(0,-1)", "3.14159265359"),
  g(37, ["FN-22"], "\\arctan(1,-1)", "135"),
  d(38, ["FN-60"], "\\exp(1)", "2.71828182846"),
  d(39, ["FN-60"], "\\ln(e)", "1"),
  d(40, ["FN-60"], "\\log(1000)", "3"),
  d(41, ["FN-60"], "\\log_{2}(8)", "3"),
  d(42, ["FN-60"], "\\log_{0}(5)", "undefined"),
  g(43, ["NM-25"], "e^{\\pi}", "23.1406926328"),
  g(44, ["NM-25"], "\\ln(10)", "2.30258509299"),
  d(45, ["NM-25", "FN-18"], "\\sin(i)", "1.17520119364i", { settings: DEG_CX }),
  d(46, ["NM-25"], "e^{i\\pi}", "-1", { settings: DEG_CX }),
  g(47, ["FN-68", "FN-6"], "\\sinh(1)", "1.17520119364"),
  d(48, ["FN-68"], "\\cosh(0)", "1"),
  d(49, ["FN-68"], "\\tanh(0.5)", "0.46211715726"),
  d(50, ["FN-68"], "\\operatorname{csch}(0)", "undefined"),
  d(51, ["FN-68"], "\\coth(0)", "undefined"),
  d(52, ["FN-68"], "\\operatorname{sech}(0)", "1"),
  g(53, ["FN-68", "FN-6"], "\\operatorname{arcsinh}(1)", "0.88137358702"),
  d(54, ["FN-68"], "\\operatorname{arccosh}(0.5)", "undefined"),
  d(55, ["FN-68", "NM-19"], "\\operatorname{arccosh}(0.5)", "1.0471975512i", { settings: CX }),
  d(56, ["FN-68"], "\\operatorname{arctanh}(1)", "undefined"),
  d(57, ["FN-68"], "\\operatorname{arcsech}(2)", "undefined"),
  d(58, ["FN-68"], "\\operatorname{arccoth}(0.5)", "undefined"),
  d(59, ["FN-68"], "\\operatorname{arccsch}(0)", "undefined"),
  d(60, ["PR-26", "FN-68"], "\\sinh^{-1}(1)", "0.88137358702"),
  d(61, ["FN-68", "NM-25"], "\\cosh(i\\pi)", "-1", { settings: DEG_CX }),
];
export default cases;
