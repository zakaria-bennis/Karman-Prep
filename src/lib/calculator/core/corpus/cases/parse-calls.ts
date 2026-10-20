import type { CorpusCase, RowErrorCode } from "../types";

const FILE = "parse-calls";
const t = (
  n: number,
  rules: string[],
  latex: string,
  tree: string,
  rows?: string[]
): CorpusCase => ({ id: `${FILE}-${n}`, rules, input: { latex }, ...(rows ? { rows } : {}), tree });
const x = (n: number, rules: string[], latex: string, error: RowErrorCode): CorpusCase => ({
  id: `${FILE}-${n}`,
  rules,
  input: { latex },
  error,
});

const cases: CorpusCase[] = [
  t(1, ["PR-13"], "mx", "(mul (id m) (id x))"),
  t(2, ["PR-13"], "sinx", "(call sin (id x))"),
  t(3, ["PR-13"], "2pix", "(mul (mul (num 2) (const pi)) (id x))"),
  t(4, ["PR-13"], "lnx", "(call ln (id x))"),
  t(5, ["PR-13"], "arcsinx", "(call arcsin (id x))"),
  t(6, ["PR-13"], "costheta", "(call cos (id \\theta))"),
  t(7, ["PR-13"], "taux", "(mul (const tau) (id x))"),
  t(8, ["PR-13"], "xy", "(mul (id x) (id y))"),
  t(11, ["PR-13"], "sqrtx", "(root (id x))"),
  t(12, ["PR-13", "FN-68"], "sinhx", "(call sinh (id x))"),
  t(9, ["PR-12", "PR-13"], "3p+4=19", "(rel = (add (mul (num 3) (id p)) (num 4)) (num 19))"),
  t(
    10,
    ["PR-12", "PR-13"],
    "pleft",
    "(mul (mul (mul (mul (id p) (id l)) (const e)) (id f)) (id t))"
  ),
  t(13, ["PR-23"], "f(2)", "(mul (id f) (num 2))"),
  t(14, ["PR-23"], "f(2)", "(call f (num 2))", ["f(x)=x^{2}"]),
  t(19, ["PR-23"], "\\sin(x)", "(call sin (id x))"),
  t(15, ["PR-23"], "a(x-h)^{2}+k", "(add (mul (id a) (pow (sub (id x) (id h)) (num 2))) (id k))"),
  t(16, ["PR-23"], "f(x)=x^{2}", "(rel = (call f (id x)) (pow (id x) (num 2)))"),
  t(17, ["PR-23"], "f_{1}(3)", "(call f_{1} (num 3))", ["f_{1}(t)=t"]),
  t(18, ["PR-23"], "g(1,2)", "(call g (num 1) (num 2))", ["g(a,b)=a+b"]),
  t(20, ["PR-24"], "\\sin2x", "(call sin (mul (num 2) (id x)))"),
  t(21, ["PR-24"], "\\sin x+1", "(add (call sin (id x)) (num 1))"),
  t(23, ["PR-24"], "\\ln x^{2}", "(call ln (pow (id x) (num 2)))"),
  // Desmos: "Use parentheses around the argument of 'sin'." (2026-10-19 review)
  x(22, ["PR-24"], "\\sin x\\cos x", "argument-parentheses"),
  t(24, ["PR-24"], "\\sin2\\pi x", "(call sin (mul (mul (num 2) (const pi)) (id x)))"),
  t(25, ["PR-24"], "\\sin-x", "(call sin (neg (id x)))"),
  t(26, ["PR-24"], "\\sin x\\cdot2", "(mul (call sin (id x)) (num 2))"),
  t(27, ["PR-24"], "\\sin x/2", "(div (call sin (id x)) (num 2))"),
  t(28, ["PR-24"], "2\\sin x", "(mul (num 2) (call sin (id x)))"),
  t(29, ["PR-24"], "\\sin\\cos x", "(call sin (call cos (id x)))"),
  x(30, ["PR-24"], "\\sin", "function-parentheses"),
  t(31, ["PR-24"], "\\sin\\frac{x}{2}", "(call sin (div (id x) (num 2)))"),
  t(52, ["PR-24"], "\\sin|x|", "(call sin (abs (id x)))"),
  t(53, ["PR-24"], "\\sin\\sqrt{x}", "(call sin (root (id x)))"),
  t(32, ["PR-25"], "\\sin(x)y", "(mul (call sin (id x)) (id y))"),
  t(33, ["PR-25"], "\\sin(x)^{2}", "(pow (call sin (id x)) (num 2))"),
  t(34, ["PR-25"], "\\sin\\left(x\\right)", "(call sin (id x))"),
  t(35, ["PR-25"], "\\arctan(1,2)", "(call arctan (num 1) (num 2))"),
  t(36, ["PR-25"], "\\operatorname{arccot}(x)", "(call arccot (id x))"),
  t(37, ["PR-26"], "\\sin^{2}x", "(pow (call sin (id x)) (num 2))"),
  t(38, ["PR-26"], "\\ln^{2}x", "(pow (call ln (id x)) (num 2))"),
  t(39, ["PR-26"], "\\sin^{-1}x", "(call arcsin (id x))"),
  t(40, ["PR-26"], "\\cos^{-1}(0.5)", "(call arccos (num 0.5))"),
  t(41, ["PR-26"], "\\cot^{-1}x", "(call arccot (id x))"),
  x(42, ["PR-26"], "\\ln^{-1}x", "log-power"), // Desmos: "Only ln^2 is supported. Otherwise, use parens."
  t(43, ["PR-26"], "\\sin^{2}(x)", "(pow (call sin (id x)) (num 2))"),
  t(44, ["PR-27"], "\\log x", "(call log (id x))"),
  t(45, ["PR-27"], "\\log_{2}8", "(call log (num 8) (num 2))"),
  t(46, ["PR-27"], "\\log_28", "(call log (num 8) (num 2))"),
  t(49, ["PR-27"], "\\ln x", "(call ln (id x))"),
  t(47, ["PR-27"], "\\log_{b}x", "(call log (id x) (id b))"),
  t(48, ["PR-27"], "\\log_{2}(8)", "(call log (num 8) (num 2))"),
  // exp needs ( in Desmos: "'exp' is a function. Try using parentheses." (2026-10-19 review)
  x(50, ["PR-24", "PR-27"], "\\exp x", "function-parentheses"),
  t(51, ["PR-27"], "cbrtx", "(root (id x) (num 3))"),
  // Hyperbolic trig (FN-68), moved here from parse-errors 30 and 31 when it shipped
  t(54, ["FN-68"], "\\sinh x", "(call sinh (id x))"),
  t(55, ["PR-26", "FN-68"], "\\cosh^{-1}x", "(call arccosh (id x))"),
  t(56, ["PR-26", "FN-68"], "\\operatorname{csch}^{-1}(2)", "(call arccsch (num 2))"),
  t(57, ["PR-26", "FN-68"], "\\tanh^{2}x", "(pow (call tanh (id x)) (num 2))"),
  t(58, ["PR-13", "FN-68"], "arcsinhx", "(call arcsinh (id x))"),
  // ^{-1} on an inverse name is the forward function, as in Desmos (appendix F decision 2)
  t(59, ["PR-26"], "\\arcsin^{-1}(0.5)", "(call sin (num 0.5))"),
  t(60, ["PR-26", "FN-68"], "\\operatorname{arcsinh}^{-1}(2)", "(call sinh (num 2))"),
  // Only trig, hyperbolic, ln and log take the run or a power on the name (Desmos)
  x(61, ["PR-24"], "\\operatorname{floor}2.5", "function-parentheses"),
  x(62, ["PR-24", "PR-26"], "\\operatorname{abs}^{-1}(2)", "function-parentheses"),
  x(63, ["PR-24"], "\\operatorname{floor}", "function-parentheses"),
  x(64, ["PR-24"], "\\sinh", "function-parentheses"),
  // Captured by the 2026-10-19 review (appendix F decision 2)
  x(65, ["PR-24", "PR-26"], "\\exp^{2}(1)", "function-parentheses"),
  x(66, ["PR-24", "FN-68"], "\\sinh 2\\cosh 1", "argument-parentheses"),
  x(67, ["PR-25"], "\\operatorname{nCr}(,2)", "comma-side"),
  x(68, ["PR-25"], "\\operatorname{mod}(1,)", "comma-side"),
  x(69, ["PR-25", "RC-20"], "\\log_{2}()", "arity"),
  // A log base is written only as a subscript (Desmos function catalogue, 2026-10-19)
  x(70, ["PR-27", "RC-20"], "\\log(1,2)", "arity"),
  x(71, ["PR-27", "RC-20"], "\\log_{2}(8,2)", "arity"),
  x(72, ["PR-27"], "\\log_{}(8)", "empty-subscript"),
  x(73, ["PR-26"], "\\log^{3}(8)", "log-power"),
  // Desmos: "'ln' cannot have a subscript." (captured for \ln_{2}(8)); a subscript is checked
  // before anything else on the name, so a power or an empty group does not change it.
  x(74, ["PR-27"], "\\ln_{2}(8)", "name-subscript"),
  x(75, ["PR-27"], "\\ln_{2}8", "name-subscript"),
  x(76, ["PR-27"], "\\ln^{2}_{3}(8)", "name-subscript"),
  x(77, ["PR-27"], "\\ln_{}(8)", "name-subscript"),
  x(78, ["PR-27"], "\\sin_{2}(x)", "name-subscript"), // trig names share ln's rule in Desmos
  // An empty argument list keeps the base, so the call prints back as written.
  t(79, ["PR-27", "RC-20"], "\\log_{2}()", "(call log (num 2))"),
];
export default cases;
