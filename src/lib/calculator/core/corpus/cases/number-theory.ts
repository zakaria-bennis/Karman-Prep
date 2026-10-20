import type { CorpusCase, CorpusSettings, RowErrorCode } from "../types";

// FN-76 to FN-78 and abs, with Desmos's behaviour where it differs from the spec text (appendix F
// decision 2): round sends halves toward +∞, and nCr and nPr follow Γ off the whole numbers.
const FILE = "number-theory";
const CX: CorpusSettings = { complex: true };
const d = (
  n: number,
  rules: string[],
  latex: string,
  display: string,
  settings?: CorpusSettings
): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { latex },
  ...(settings ? { settings } : {}),
  display,
});
const x = (n: number, rules: string[], latex: string, error: RowErrorCode): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { latex },
  error,
});

const cases: CorpusCase[] = [
  d(1, ["FN-77"], "\\operatorname{floor}(-2.5)", "-3"),
  d(2, ["FN-77"], "\\operatorname{ceil}(2.1)", "3"),
  d(3, ["FN-77"], "\\operatorname{round}(2.5)", "3"),
  d(4, ["FN-77"], "\\operatorname{round}(-2.5)", "-2"),
  d(5, ["FN-77"], "\\operatorname{round}(1234,-2)", "1200"),
  d(6, ["FN-77"], "\\operatorname{round}(3.14159,2)", "3.14"),
  d(7, ["FN-77"], "\\operatorname{sign}(0)", "0"),
  d(8, ["FN-77"], "\\operatorname{sign}(-3)", "-1"),
  d(9, ["FN-76"], "\\operatorname{mod}(-7,3)", "2"),
  d(10, ["FN-76"], "\\operatorname{mod}(7,-3)", "-2"),
  d(11, ["FN-76"], "\\operatorname{mod}(5,0)", "undefined"),
  d(12, ["FN-78"], "\\operatorname{nCr}(52,5)", "2598960"),
  d(13, ["FN-78"], "\\operatorname{nCr}(5.5,2)", "12.375"),
  d(14, ["FN-78"], "\\operatorname{nCr}(5,2.5)", "10.8649774484"),
  d(15, ["FN-78"], "\\operatorname{nCr}(-1,2)", "1"),
  d(16, ["FN-78"], "\\operatorname{nPr}(5,2)", "20"),
  d(17, ["FN-78"], "\\operatorname{nPr}(5,6)", "0"),
  d(18, ["FN-4"], "\\operatorname{abs}(-3)", "3"),
  d(19, ["FN-4", "NM-18"], "\\operatorname{abs}(3+4i)", "5", CX),
  d(20, ["PR-13", "FN-77"], "floor(2.5)", "2"),
  d(21, ["FN-77", "NM-18"], "\\operatorname{floor}(i)", "undefined", CX),
  x(22, ["RC-20"], "\\operatorname{floor}(2.7,1)", "arity"),
  x(23, ["RC-20"], "\\operatorname{nCr}(5)", "arity"),
  // FN-75 gcd and lcm, rounding non-integers first, and their aliases (Desmos values, 2026-10-19)
  d(24, ["FN-75"], "\\operatorname{gcd}(12,18)", "6"),
  d(25, ["FN-75"], "\\gcd(12,18,8)", "2"),
  d(26, ["FN-75"], "\\operatorname{lcm}(1.5,3)", "6"),
  d(27, ["FN-75"], "\\operatorname{gcd}([12,18],4)", "[4, 2]"),
  d(28, ["FN-75"], "\\operatorname{mcm}(4,6)", "12"),
  d(29, ["FN-75", "NM-18"], "\\operatorname{gcd}(3+i,1+i)", "1+i", CX),
  x(30, ["FN-75"], "\\operatorname{gcd}()", "reducer-arguments"),
];
export default cases;
