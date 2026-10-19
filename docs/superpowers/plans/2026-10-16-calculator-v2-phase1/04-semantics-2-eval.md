# 04 semantics, part 2 of 2: number display, arithmetic, built-ins, evaluation, golden cases and reference values (Tasks 5 to 10)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Part 2 of 2 of package `04-semantics.md`, which holds the package header (IDs, contributions), the Conventions (paths, commands, expected-failure wording, the test helpers `REAL`, `DEG`, `CX`, `P`, `src`, `analyze`, `n`, `codes`, `tree`, `rel`, and the corpus notation) and the Decisions with the contract amendments; they apply to every task here, and "decision N" below refers to that file. Tasks run in number order across both parts; this part starts after Task 4 of `04-semantics-1-analysis.md`.

---

<!-- prettier-ignore-start -->
### Task 5: Values and number display (NM-1, NM-2, NM-3, NM-5, NM-6, NM-8, NM-20)
**Files:** Create `eval/values.ts`, `eval/format.ts`; Test `eval/format.test.ts`.\
**Interfaces.** Produces `Complex`, `Value`, `UNDEFINED`, `formatNumber`, `formatValue`, `formatValueLatex`, `formatAxisLabel` (section 4), and:
```ts
// eval/values.ts
export function numberValue(v: number): Value; // non-finite → UNDEFINED; -0 stays -0
export function complexValue(re: number, im: number): Value; // a non-finite part → UNDEFINED; im === 0 → number
```
- [ ] **Step 1: Write the failing tests** in `eval/format.test.ts`:
```ts
it("NM-1, NM-2, NM-3, NM-6 numbers: 12 significant digits, plain or m×10^n, no snapping, one undefined text", () => {
  const rows: [number, string][] = [[1 / 3, "0.333333333333"], [P, "3.14159265359"], [-0, "0"], [0.1 + 0.2, "0.3"],
    [2 ** 40, "1.09951162778×10^12"], [-(2 ** 40), "-1.09951162778×10^12"], [999999999999, "999999999999"],
    [999999999999.9, "1×10^12"], [1e-6, "0.000001"], [1e-7, "1×10^-7"], [123456.789, "123456.789"], [1e-20, "1×10^-20"],
    [0.1 + 0.2 - 0.3, "5.55111512313×10^-17"], [NaN, "undefined"], [Infinity, "undefined"], [-Infinity, "undefined"]];
  for (const [v, s] of rows) expect(formatNumber(v), String(v)).toBe(s);
  expect([numberValue(Infinity), complexValue(NaN, 1), complexValue(3, 0)]).toEqual([UNDEFINED, UNDEFINED, n(3)]);
  expect(formatValue(UNDEFINED)).toBe("undefined");
});
it("NM-5, NM-20 points show (a, b) and complex values a+bi with negligible parts omitted", () => {
  const points: [[number, number], string][] = [[[1, 2], "(1, 2)"], [[1 / 3, 2 ** 40], "(0.333333333333, 1.09951162778×10^12)"], [[1, NaN], "(1, undefined)"]];
  for (const [value, s] of points) expect(formatValue({ type: "point", value })).toBe(s);
  const complex: [number, number, string][] = [[-1, 1.2246467991473532e-16, "-1"], [0, 1, "i"], [0, -1, "-i"], [3, -4, "3-4i"],
    [1, 1, "1+i"], [0, 2, "2i"], [2.5, 1e-20, "2.5"], [1e-20, 2, "2i"], [1, 1.3643763538418412, "1+1.36437635384i"]];
  for (const [re, im, s] of complex) expect(formatValue({ type: "complex", value: { re, im } }), s).toBe(s);
});
it("NM-2, NM-5, NM-6 formatValueLatex writes the same text with \\times10^{n}", () => {
  expect([formatValueLatex(n(2 ** 40)), formatValueLatex({ type: "point", value: [1, 2] }), formatValueLatex(UNDEFINED)])
    .toEqual(["1.09951162778\\times10^{12}", "\\left(1,2\\right)", "\\mathrm{undefined}"]);
});
it("NM-8 axis labels use the fewest decimals the step needs", () => {
  const rows: [number, number, string][] = [[0.6000000000000001, 0.2, "0.6"], [0.4, 0.2, "0.4"], [-0.4, 0.2, "-0.4"], [5000, 5000, "5000"],
    [10000, 5000, "10000"], [1.5, 0.5, "1.5"], [1, 0.5, "1"], [1e-17, 0.2, "0"], [2e12, 1e12, "2×10^12"], [1.5e12, 5e11, "1.5×10^12"],
    [4e-7, 2e-7, "4×10^-7"], [1e15 + 1e6, 1e6, "1.000000001×10^15"]];
  for (const [v, step, s] of rows) expect(formatAxisLabel(v, step), `${v}/${step}`).toBe(s);
});
```
- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-v2/core/eval/format.test.ts`. Expected: FAIL, `Error: Cannot find module './format' imported from …/eval/format.test.ts` (imports in order: `./format`, then `./values`).
- [ ] **Step 3: Implement.** `formatNumber(v)`: non-finite → `"undefined"`; `r = Number(v.toPrecision(12))`; `r === 0` → `"0"`; `1e-6 ≤ |r| < 1e12` → `String(r)`; else `r.toExponential(11)` with mantissa zeros and a bare `.` trimmed, written `m×10^n` (`×` U+00D7, no `+`). `formatValue`: points `(a, b)`; complex parts by `formatNumber`, a part with `|part| ≤ 1e-14·|other|` omitted, unit imaginary `i`/`-i`, both omitted → `"0"`; lists `[a, b]` until NM-38. `formatValueLatex`: the same with `\times10^{n}`, `\left(a,b\right)`, `\mathrm{undefined}`. `formatAxisLabel(v, step)`: `k = Math.floor(Math.log10(step) + 1e-9)`; `|v| < 1e-6·step` → `"0"`; plain range → `v.toFixed(Math.max(0, -k))`; outside → `n = Math.floor(Math.log10(|v|))`, mantissa `(v / 10 ** n).toFixed(Math.max(0, n - k))` (carry to `n + 1` at 10); trailing zeros trimmed in both forms.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/calculator-v2/core/eval && git commit -m "Format v2 numbers, points, complex values and axis labels"`.
### Task 6: Real powers, roots and complex arithmetic (NM-10, NM-11, NM-13, NM-14, NM-18, NM-19, FN-12, FN-13, FN-14)
**Files:** Create `eval/real-pow.ts`, `eval/complex.ts`, `eval/ops.ts`; Test `eval/ops.test.ts`.\
**Interfaces.** Consumes Task 5; `Node`. Produces:
```ts
// eval/real-pow.ts
export type Rational = { p: number; q: number };
export function ulp(v: number): number; // from the exponent field: 2^(e − 1075); Number.MIN_VALUE for 0 and subnormals
export function rationalFromValue(b: number): Rational | null; // smallest q ≤ 99 with |b − p/q| ≤ 4·ulp(b), p = round(b·q)
export function exponentRational(node: Node): Rational | null; // integer-literal fraction, any neg placement, lowest terms; null when the reduced q > 99 (NM-10)
export function realPow(a: number, b: number, rational: Rational | null): number; // NM-10, NM-13, NM-14
export function realRoot(x: number, n: number): number; // NM-11
// eval/complex.ts
export const C_I: Complex;
export function cadd(a: Complex, b: Complex): Complex;
export function csub(a: Complex, b: Complex): Complex;
export function cmul(a: Complex, b: Complex): Complex;
export function cdiv(a: Complex, b: Complex): Complex; // ÷ 0 → NaN parts
export function cexp(z: Complex): Complex;
export function cln(z: Complex): Complex;
export function csqrt(z: Complex): Complex;
export function csin(z: Complex): Complex;
export function ccos(z: Complex): Complex;
export function ctan(z: Complex): Complex;
export function casin(z: Complex): Complex;
export function cacos(z: Complex): Complex;
export function catan(z: Complex): Complex;
export function cpow(z: Complex, w: Complex): Complex;
// eval/ops.ts
export function addV(a: Value, b: Value): Value;
export function subV(a: Value, b: Value): Value;
export function mulV(a: Value, b: Value): Value;
export function divV(a: Value, b: Value): Value;
export function negV(a: Value): Value;
export function pctV(a: Value): Value; // a / 100
export function absV(a: Value): Value; // |z| for complex
export function degV(a: Value, angleMode: "radians" | "degrees"): Value; // radians: (a * Math.PI) / 180
export function powV(a: Value, b: Value, rational: Rational | null, complex: boolean): Value;
export function rootV(x: Value, n: Value | null, complex: boolean): Value; // n null is the square root
```
- [ ] **Step 1: Write the failing tests** in `eval/ops.test.ts` (`c = (re, im) => ({ re, im })`):
```ts
it("NM-10, FN-12 a negative base has a real power exactly when the exponent is p/q with q odd and q ≤ 99", () => {
  expect([rationalFromValue(0.2), rationalFromValue(0.5), rationalFromValue(P), rationalFromValue(1 / 99), rationalFromValue(1 / 101)])
    .toEqual([{ p: 1, q: 5 }, { p: 1, q: 2 }, null, { p: 1, q: 99 }, null]);
  expect([exponentRational(tree("\\frac{2}{6}")), exponentRational(tree("-\\frac{1}{3}")), exponentRational(tree("\\frac{1}{x}"))])
    .toEqual([{ p: 1, q: 3 }, { p: -1, q: 3 }, null]);
  expect([exponentRational(tree("\\frac{1}{101}")), exponentRational(tree("\\frac{3}{303}")), exponentRational(tree("\\frac{1}{99}"))]).toEqual([null, null, { p: 1, q: 99 }]);
  expect([realPow(-8, 1 / 3, { p: 1, q: 3 }), realPow(-8, -1 / 3, { p: -1, q: 3 }), realPow(-32, 0.2, null)]).toEqual([-2, -0.5, -2]);
  expect(rel(realPow(-8, 2 / 3, { p: 2, q: 3 }), 4)).toBe(true);
  expect([realPow(-8, 0.5, null), realPow(-2, P, null), realPow(-8, 0.5, { p: 1, q: 2 })]).toEqual([NaN, NaN, NaN]);
  expect([realPow(-8, 1 / 101, null), realPow(-8, 1 / 101, { p: 1, q: 101 }), realPow(-1, 1 / 99, { p: 1, q: 99 })]).toEqual([NaN, NaN, -1]);
  expect(powV(n(-8), n(1 / 3), { p: 1, q: 3 }, false)).toEqual(n(-2));
});
it("NM-11, FN-13 odd roots of negatives are real; even, zeroth and other negative-base roots are undefined", () => {
  expect([realRoot(-27, 3), realRoot(-8, -3), realRoot(16, 4), realRoot(-16, 4), realRoot(5, 0)]).toEqual([-3, -0.5, 2, NaN, NaN]);
  expect(rel(realRoot(-8, 1.5), 4)).toBe(true);
  expect([rootV(n(-8), n(3), false), rootV(n(-4), null, false), powV(n(-8), n(P), null, false)]).toEqual([n(-2), UNDEFINED, UNDEFINED]);
});
it("NM-13, NM-14, FN-14 0^0 is 1, division by zero and overflow are undefined, underflow is 0", () => {
  expect([powV(n(0), n(0), null, false), powV(n(10), n(-400), null, false)]).toEqual([n(1), n(0)]);
  for (const v of [powV(n(10), n(400), null, false), mulV(n(1e308), n(10)), divV(n(5), n(0)), divV(n(-5), n(0)), divV(n(0), n(0)),
    powV(n(0), n(-1), null, false), powV(n(2), n(1024), null, false)]) expect(v).toEqual(UNDEFINED);
});
it("NM-18 complex functions use principal branches, with C99 values on the cuts", () => {
  expect([cln(c(-1, 0)), csqrt(c(-4, 0)), csqrt(c(3, 4)), csin(c(0, 1))]).toEqual([c(0, P), c(0, 2), c(2, 1), c(0, Math.sinh(1))]);
  expect(cln(c(-1, -0)).im).toBe(P);
  expect([casin(c(2, 0)), casin(c(-2, 0)), cacos(c(2, 0))]).toEqual([c(P / 2, Math.acosh(2)), c(-P / 2, Math.acosh(2)), c(0, -Math.acosh(2))]);
  expect([catan(c(0, 2)), catan(c(0, -2))]).toEqual([c(P / 2, Math.atanh(0.5)), c(P / 2, -Math.atanh(0.5))]);
  const z = casin(c(0.5, 0.5)), w = cpow(C_I, C_I);
  expect([rel(z.re, 0.45227844715119064), rel(z.im, 0.5306375309525179), rel(w.re, 0.20787957635076193), w.im]).toEqual([true, true, true, 0]);
});
it("NM-19 complex mode keeps every value real mode defines", () => {
  expect([powV(n(-8), n(1 / 3), { p: 1, q: 3 }, true), rootV(n(-4), null, true), powV(n(0), n(-1), null, true)])
    .toEqual([n(-2), { type: "complex", value: c(0, 2) }, UNDEFINED]);
  const half = powV(n(-8), n(0.5), { p: 1, q: 2 }, true);
  expect(half.type === "complex" && rel(half.value.im, Math.sqrt(8))).toBe(true);
});
```
- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-v2/core/eval/ops.test.ts`. Expected: FAIL, `Error: Cannot find module './real-pow' imported from …/eval/ops.test.ts` (imports in order: `./real-pow`, `./complex`, `./ops`, `./values`, `../latex/index`).
- [ ] **Step 3: Implement.** `exponentRational`: strip `neg` wrappers (each flips the sign) down to `(div (num p) (num q))` with integer literals, each of which may itself be a `neg` of an integer literal; `q === 0` or any other shape → `null`; reduce by the gcd with `q > 0`; a reduced `q > 99` → `null` (NM-10's bound applies to the tree path too). `realPow`: NaN in → NaN; `a < 0` with non-integer `b` → `r = rational ?? rationalFromValue(b)`; no `r`, `r.q > 99` or even `r.q` → NaN, else `(r.p odd ? -1 : 1) * Math.pow(-a, b)`; otherwise `Math.pow(a, b)`; non-finite → NaN. `realRoot`: `n` zero or non-finite → NaN; integer `n`: `x < 0` with even `n` → NaN, odd → `-(root of -x)`, the root being `Math.cbrt` for 3, `Math.sqrt` for 2, else `Math.pow(x, 1 / n)`; non-integer `n` → `realPow(x, 1 / n, null)`. `powV`/`rootV`: numbers use the real rule; in complex mode a NaN caused by a negative base (powV) or negative radicand (rootV) falls back to `cpow`/`csqrt`/`cpow(x, 1/n)`; non-real operands always use the complex function; overflow, `0` to a negative power and `÷ 0` stay `UNDEFINED`. Every result passes through `numberValue`/`complexValue`. `cln`: `(Math.log(Math.hypot(re, im)), Math.atan2(im, re))` with an Arg of `−π` returned as `π`; `cln(0)` NaN. `csqrt` (Kahan): `t = √((|re| + |z|)/2)`; `re ≥ 0` → `(t, im/2t)`, else `(|im|/2t, ±t)` with the sign of `im` (`+` for `±0`). `cpow(0, w)`: `w = 0` → 1, `Re w > 0` → 0, else NaN; otherwise `cexp(w·cln z)`. `csin = (sin a cosh b, cos a sinh b)`, `ccos = (cos a cosh b, −sin a sinh b)`, `ctan = csin / ccos`. Inverses:
```ts
// casin(z) = −i·Ln(iz + √(1 − z²)); cacos(z) = π/2 − casin(z); catan(z) = (i/2)(Ln(1 − iz) − Ln(1 + iz)), except on the cuts (zero part read as +0, C99):
//   im === 0 && |re| > 1 → casin(z) = (sign(re)·π/2, acosh|re|);   re === 0 && |im| > 1 → catan(z) = (π/2, atanh(1/im))
```
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/calculator-v2/core/eval && git commit -m "Add v2 real powers, roots and principal-branch complex arithmetic"`.
### Task 7: Phase 1 built-ins with exact angles (NM-4, NM-25, NM-26, NM-28, FN-4, FN-6, FN-18 to FN-22, FN-60)
**Files:** Create `lib/trig.ts`, `lib/builtins.ts`; Test `lib/trig.test.ts`, `lib/builtins.test.ts`.\
**Interfaces.** Consumes `BUILTIN_ARITY` (Task 4); Tasks 5 and 6 (`numberValue`, `complexValue`, `ulp`, complex functions, `formatValue`). Produces:
```ts
// lib/trig.ts
export type CircularName = "sin" | "cos" | "tan" | "csc" | "sec" | "cot";
export type InverseName = "arcsin" | "arccos" | "arctan" | "arccsc" | "arcsec" | "arccot";
export const SIN_15: readonly number[]; // [0, 0.25881904510252074, 0.5, 0.7071067811865476, 0.8660254037844386, 0.9659258262890683, 1]
export const TAN_15: readonly number[]; // [0, 0.2679491924311227, 0.5773502691896257, 1, 1.7320508075688772, 3.732050807568877]
export function snapRadians(x: number): number | null; // NM-4: 15k when |x − (k·π)/12| ≤ 4·ulp((k·π)/12), |k| ≤ 2^20, k = round(12x/π)
export function circular(name: CircularName, x: number, angleMode: "radians" | "degrees"): number;
export function inverseCircular(name: InverseName, x: number, angleMode: "radians" | "degrees"): number;
export function arctan2(y: number, x: number, angleMode: "radians" | "degrees"): number; // FN-22
// lib/builtins.ts
export interface BuiltinFunction {
  name: string;
  arity: readonly number[]; // BUILTIN_ARITY
  angle: "input" | "output" | "none"; // FN-6
  extendsToComplex: boolean; // arcsin, arccos, arccsc, arcsec, ln, log: a real NaN falls back to complex()
  real(args: readonly number[], angleMode: "radians" | "degrees"): number;
  complex(args: readonly Complex[]): Complex; // always radians (NM-25)
}
export const BUILTINS: ReadonlyMap<string, BuiltinFunction>;
export function applyBuiltin(name: string, args: readonly Value[], angleMode: "radians" | "degrees", complex: boolean): Value;
```
- [ ] **Step 1: Write the failing tests**
```ts
// lib/trig.test.ts
type Row = [CircularName | InverseName, number, "radians" | "degrees", number];
const R = "radians", D = "degrees";
const check = (rows: Row[]) => {
  for (const [f, x, u, v] of rows) expect(f.startsWith("arc") ? inverseCircular(f as InverseName, x, u) : circular(f as CircularName, x, u), `${f}(${x}) ${u}`).toBe(v);
};
it("NM-4, FN-18 radian arguments within 4 ulp of kπ/12 are exact degrees, and tan has no value where cos is 0", () => {
  expect([snapRadians(P), snapRadians(P / 2), snapRadians(P + 1e-10), snapRadians(2 ** 21 * P)]).toEqual([180, 90, null, null]);
  check([["sin", P, R, 0], ["cos", P / 2, R, 0], ["tan", P / 4, R, 1], ["tan", P / 2, R, NaN], ["tan", -P / 2, R, NaN],
    ["tan", (3 * P) / 2, R, NaN], ["sin", P + 1e-10, R, Math.sin(P + 1e-10)], ["sin", 30, R, Math.sin(30)]]);
});
it("NM-26, FN-18, FN-19 degree arguments reduce exactly modulo 360", () => check([["sin", 30, D, 0.5], ["cos", 90, D, 0], ["sin", 180, D, 0],
  ["tan", 45, D, 1], ["cos", 60, D, 0.5], ["sin", 3630, D, 0.5], ["tan", 90, D, NaN], ["tan", 270, D, NaN], ["tan", -90, D, NaN], ["tan", -45, D, -1],
  ["tan", 135, D, -1], ["sin", -150, D, -0.5], ["sin", 60, D, 0.8660254037844386], ["tan", 120, D, -1.7320508075688772], ["cot", 45, D, 1], ["cot", 180, D, NaN],
  ["sec", 90, D, NaN], ["csc", -180, D, NaN], ["csc", 30, D, 2], ["sec", 60, D, 2], ["cot", P / 2, R, 0], ["cot", 0, R, NaN], ["csc", P, R, NaN],
  ["tan", 37, D, Math.tan((37 * P) / 180)], ["tan", 127, D, -1 / Math.tan((37 * P) / 180)]]));
it("NM-28, FN-20, FN-21 inverse trig domains, ranges and exact degree multiples of 15", () => check([["arcsin", 0.5, D, 30], ["arctan", 1, D, 45],
  ["arccos", -1, D, 180], ["arccot", -1, D, 135], ["arcsin", 1, D, 90], ["arcsec", 2, D, 60], ["arcsin", 1, R, P / 2], ["arccos", 1, R, 0], ["arccos", -1, R, P],
  ["arccot", -1, R, 2.356194490192345], ["arccot", 0, R, P / 2], ["arcsec", -1, R, P], ["arccsc", -1, R, -P / 2], ["arccsc", 2, R, Math.asin(0.5)],
  ["arcsec", 2, R, Math.acos(0.5)], ["arcsin", 1e-17, D, (1e-17 * 180) / P], ["arcsin", 1.0000000000000002, R, NaN], ["arccos", -1.5, R, NaN],
  ["arccsc", 0.5, R, NaN], ["arcsec", 0, R, NaN], ["arccot", 1e300, R, 1 / 1e300]]));
it("FN-22 two-argument arctan returns the angle of (x, y) in (−π, π]", () =>
  expect([arctan2(1, -1, R), arctan2(1, -1, D), arctan2(-0, -1, R), arctan2(-1, 0, R), arctan2(0, 0, R)]).toEqual([2.356194490192345, 135, P, -P / 2, NaN]));
// lib/builtins.test.ts
const f = (name: string, args: number[], u: "radians" | "degrees" = "radians", cx = false) => applyBuiltin(name, args.map(n), u, cx);
it("FN-60 exp, ln, log and log base b on their domains", () => {
  expect([f("exp", [1]), f("ln", [Math.E]), f("log", [1000]), f("log", [8, 2])]).toEqual([n(Math.E), n(1), n(3), n(3)]);
  for (const a of [[0], [-2], [8, 1], [8, 0], [8, -2], [-8, 2]]) expect(f("log", a), String(a)).toEqual(UNDEFINED);
  expect(f("ln", [-1], "radians", true)).toEqual({ type: "complex", value: { re: 0, im: P } });
});
it("FN-6, NM-25 only circular-trig inputs and inverse-trig outputs depend on the angle unit", () => {
  for (const [name, fn] of BUILTINS) {
    const x = [name === "arcsec" || name === "arccsc" ? 2 : 0.5];
    expect(fn.angle, name).toBe(name.startsWith("arc") ? "output" : ["exp", "ln", "log"].includes(name) ? "none" : "input");
    expect(JSON.stringify(f(name, x)) === JSON.stringify(f(name, x, "degrees")), name).toBe(fn.angle === "none");
  }
  expect([f("sin", [30], "degrees"), f("arctan", [1, -1], "degrees"), f("exp", [P], "degrees")]).toEqual([n(0.5), n(135), n(Math.exp(P))]);
  expect(applyBuiltin("sin", [{ type: "complex", value: { re: 0, im: 1 } }], "degrees", true)).toEqual({ type: "complex", value: { re: 0, im: Math.sinh(1) } });
});
it("FN-4 every built-in returns undefined outside its domain, shows undefined and never throws", () => {
  const outside: [string, number[]][] = [["tan", [P / 2]], ["csc", [0]], ["sec", [P / 2]], ["cot", [0]], ["arcsin", [2]], ["arccos", [-2]],
    ["arccsc", [0.5]], ["arcsec", [0.5]], ["arctan", [0, 0]], ["exp", [1000]], ["ln", [0]], ["log", [-1]], ["log", [5, 1]], ["sin", [1, 2]]];
  for (const [name, args] of outside) expect([f(name, args), formatValue(f(name, args))], name).toEqual([UNDEFINED, "undefined"]);
  for (const name of BUILTINS.keys()) expect(applyBuiltin(name, [UNDEFINED], "radians", false), name).toEqual(UNDEFINED);
  expect(applyBuiltin("sin", [{ type: "point", value: [1, 2] }], "radians", false)).toEqual(UNDEFINED);
});
```
- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-v2/core/lib`. Expected: FAIL, `trig.test.ts` with `Error: Cannot find module './trig' imported from …/lib/trig.test.ts` and `builtins.test.ts` with `Error: Cannot find module './builtins' imported from …/lib/builtins.test.ts` (each file's first import; `builtins.test.ts` then imports `../eval/values` and `../eval/format`).
- [ ] **Step 3: Implement.** Radians: a non-null `snapRadians(x)` takes the degree path; else `Math.sin`, `Math.cos`, `Math.tan`, `1/sin`, `1/cos`, `cos/sin`. Degrees:
```ts
let r = d % 360; // fmod is exact
if (r > 180) r -= 360; else if (r <= -180) r += 360; // r in (−180, 180]
const q = Math.round(r / 90), s = r - 90 * q, j = Math.abs(s) / 15; // s in [−45, 45], exact
// S = sin s, C = cos s: when s % 15 === 0, S = sign(s)·SIN_15[j] and C = SIN_15[6 − j]; else Math.sin/Math.cos(s·π/180).
// By ((q % 4) + 4) % 4: sin = [S, C, −S, −C], cos = [C, −S, −C, S]. tan: q even → T(s); q odd → s === 0 ? NaN : −1/T(s).
// T(s): when s % 15 === 0, T(s) = sign(s)·TAN_15[j] and −1/T(s) = −sign(s)·TAN_15[6 − j] (j ≥ 1 there); when s % 15 !== 0, T(s) = Math.tan((s * Math.PI) / 180)
// and the odd-q result is −1 / T(s), so tan 37° = Math.tan((37 * Math.PI) / 180) and tan 127° = −1 / Math.tan((37 * Math.PI) / 180). j indexes a table only for multiples of 15.
// csc, sec, cot: NaN when the denominator === 0.
```
  Inverses: arcsin and arccos are NaN outside `[−1, 1]`; `arccsc(x) = arcsin(1/x)`, `arcsec(x) = arccos(1/x)`; `arccot` is `π/2` at 0, `Math.atan(1/x)` for `x > 0` and `π + Math.atan(1/x)` for `x < 0` (π/2 − arctan x, accurate for large `|x|`). `arctan2`: `(0, 0)` → NaN, else `Math.atan2` with `−π` returned as `π`. Degree outputs: `v = (r * 180) / Math.PI`, `m = 15 * Math.round(v / 15)`, `|v − m| ≤ 8·ulp(m)` → `m`. `real` for log: one argument `Math.log10(x)`, two arguments `Math.log(x) / Math.log(b)`, NaN unless `x > 0`, `b > 0`, `b ≠ 1`; ln is `Math.log` (NaN for `x ≤ 0`); exp is `Math.exp`. `applyBuiltin`: an undefined, point or list argument, or a count outside `arity` → `UNDEFINED`; all numbers → `real`, then in complex mode a NaN from an `extendsToComplex` function → `complex`; any non-real argument → `complex` (`UNDEFINED` for two-argument arctan). `complex`: trig from Task 6, `csc = 1/csin` (likewise sec, cot), `arccsc(z) = casin(1/z)`, `arcsec(z) = cacos(1/z)`, `arccot(z) = π/2 − catan(z)`, `log(z) = cln(z)/ln 10`, `log(z, b) = cln(z)/cln(b)`.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/calculator-v2/core/lib && git commit -m "Add v2 Phase 1 built-ins with exact degree and radian trig"`.
### Task 8: Closure compiler and row evaluation (NM-9, NM-12, NM-21, NM-22, NM-27, FN-17, G-6)
**Files:** Create `eval/compile.ts`, `eval/compile-real.ts`; Modify `eval/ops.ts`; Test `eval/compile.test.ts`.\
**Interfaces.** Consumes Tasks 2 to 7; `Deadline`, `DeadlineExceeded`, `NO_DEADLINE` (`core/deadline.ts`). Produces `EvalSettings`, `CompileScope`, `Compiled`, `compileExpression`, `compileRealFunction1`, `compileRealFunction2`, `evaluateRows`, `evaluateLatex` (section 4, all in `compile.ts`), and:
```ts
// eval/compile-real.ts (real mode; compileRealFunction1/2 use it when settings.complex is false)
export function compileReal(tree: Node, scope: CompileScope): (x: number, y: number) => number;
// eval/ops.ts, added
export function toPlotNumber(v: Value): number; // NM-21: a number (-0 kept), or Re when |Im| ≤ 1e-12·max(1, |Re|), else NaN
export function relationHolds(values: readonly Value[], ops: readonly RelOp[]): boolean; // NM-22: every operand a finite number
```
- [ ] **Step 1: Write the failing tests** in `eval/compile.test.ts`:
```ts
function setup(rows: string[], settings: EvalSettings = REAL) {
  const analysis = analyzeRows(src(rows), settings), byRow = evaluateRows(analysis, settings, () => NO_DEADLINE), values = new Map<string, Value>();
  for (const r of analysis.rows) { const v = byRow.get(r.id); if (r.kind === "definition" && r.defines && v) values.set(r.defines.name, v); }
  return { analysis, scope: { functions: analysis.functions, values, settings } };
}
const explicitExpr = (g: RowGraph | null) => { if (g?.kind !== "explicit") throw new Error("not explicit"); return g.expr; };
const empty = (settings: EvalSettings): CompileScope => ({ functions: new Map(), values: new Map(), settings });
const value = (latex: string, s: EvalSettings = REAL) => compileExpression(tree(latex), empty(s))({}, NO_DEADLINE);
it("G-6 functions defined in later rows evaluate and graph from earlier rows", () => {
  const rows = ["y=f(x)+g(1,2)", "f(x)=x^{2}", "g(a,b)=a+b"], { analysis, scope } = setup(rows);
  expect(compileRealFunction1(explicitExpr(analysis.rows[0].graph), "x", scope)(3)).toBe(12);
  expect(evaluateLatex("f(2)+g(1,2)", { rows: rows.slice(1) })).toEqual(n(7));
});
it("RC-6, RC-4 y=a after a=2x graphs y=2x, parameters shadow defined names, and a call to a head with an error is undefined", () => {
  const { analysis, scope } = setup(["a=2x", "y=a"]);
  expect(compileRealFunction1(explicitExpr(analysis.rows[1].graph), "x", scope)(2)).toBe(4);
  expect([evaluateLatex("f(2)", { rows: ["a=5", "f(a)=a+1"] }), evaluateLatex("f(2)", { rows: ["f(x,x)=x"] })]).toEqual([n(3), UNDEFINED]);
});
it("RC-9 evaluateRows follows dependency order and skips a row whose deadline expires", () => {
  const a = analyzeRows(src(["c=b+1", "b=a+1", "a=1", "c+1", "y=x", "(c,1)", "k"]), REAL), out = evaluateRows(a, REAL, () => NO_DEADLINE);
  expect([[...out.keys()].sort(), out.get("r3"), out.get("r5")]).toEqual([["r0", "r1", "r2", "r3", "r5"], n(4), { type: "point", value: [3, 1] }]);
  const expire = (id: string): Deadline => (id === "r1" ? { check() { throw new DeadlineExceeded(id); } } : NO_DEADLINE), late = evaluateRows(a, REAL, expire);
  expect([late.has("r1"), late.get("r0"), late.get("r2")]).toEqual([false, UNDEFINED, n(1)]);
});
it("NM-9 later rows and conditions use the full double, not the displayed value", () =>
  expect([evaluateLatex("a-0.3", { rows: ["a=0.1+0.2"] }), value("0.1+0.2>0.3")]).toEqual([n(5.551115123125783e-17), n(1)]));
it("NM-12 division by zero, bad logs, even roots, inverse-trig domains and poles are undefined", () => {
  for (const l of ["\\frac{1}{0}", "\\ln(0)", "\\ln(-1)", "\\log(0)", "\\log_{1}(5)", "\\log_{-2}(4)", "\\sqrt{-1}", "\\sqrt[4]{-16}",
    "\\arcsin(2)", "\\arccos(-1.5)", "\\tan(\\frac{\\pi}{2})", "\\sec(\\frac{\\pi}{2})", "\\csc(0)", "\\cot(0)"]) expect(evaluateLatex(l), l).toEqual(UNDEFINED);
});
it("NM-21 complex-mode curves plot only where the value is real", () => {
  const f = (l: string) => compileRealFunction1(tree(l), "x", empty(CX)), g = compileRealFunction2(tree("x^{2}+iy"), empty(CX));
  expect([f("\\sqrt{x}")(-4), f("\\sqrt{x}")(4), f("e^{i\\pi x}")(1), f("e^{i\\pi x}")(0.5), f("(x+i)(x-i)")(2), g(1, 0), g(1, 1)]).toEqual([NaN, 2, -1, NaN, 5, 1, NaN]);
});
it("NM-22 a relation with a non-real or undefined operand is false, and evaluateLatex shows a constant relation through compileExpression", () => {
  expect([value("2<3"), value("1<2<3"), value("3<2"), value("\\frac{1}{0}<2"), value("i<2", CX), value("i\\cdot i<0", CX)]).toEqual([n(1), n(1), UNDEFINED, UNDEFINED, UNDEFINED, n(1)]);
  expect([evaluateLatex("2<3"), evaluateLatex("i\\cdot i<0", { settings: CX })]).toEqual([n(1), n(1)]);
  expect([evaluateLatex("2=3"), evaluateLatex("y>x"), evaluateLatex("3p+4<19")]).toEqual([UNDEFINED, UNDEFINED, UNDEFINED]);
});
it("NM-27 the degree sign converts, and a degree trig argument is exact in both modes", () => {
  for (const settings of [REAL, DEG])
    expect(["\\sin(30^{\\circ})", "\\cos(60^{\\circ})"].map((l) => evaluateLatex(l, { settings }))).toEqual([n(0.5), n(0.5)]);
  expect([evaluateLatex("30^{\\circ}"), evaluateLatex("30^{\\circ}", { settings: DEG })]).toEqual([n(P / 6), n(30)]);
});
it("FN-17 complex mode uses principal branches, keeps real-mode values and plots only real points", () => {
  expect(["(-8)^{\\frac{1}{3}}", "\\ln(-1)", "2+3"].map((l) => evaluateLatex(l, { settings: CX })))
    .toEqual([n(-2), { type: "complex", value: { re: 0, im: P } }, n(5)]);
  expect(compileRealFunction1(tree("\\ln(x)"), "x", empty(CX))(-1)).toBeNaN();
});
```
- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-v2/core/eval/compile.test.ts`. Expected: FAIL, `Error: Cannot find module './compile' imported from …/eval/compile.test.ts` (imports in order: `./compile`, `../analysis/index`, `./values`, `../deadline`, `../latex/index`).
- [ ] **Step 3: Implement** `compileExpression` as a recursive closure builder: `num`; `const` (`e`, `π`, `2π`); `id`: `vars`, then `i` in complex mode (`C_I`), then `scope.values`, then a zero-parameter entry of `scope.functions` (body compiled once, run with the same `vars`), else `UNDEFINED`; `add`, `sub`, `mul`, `div`, `neg`, `pct`, `abs`, `deg` through `ops.ts`; `pow` with `exponentRational(right)` fixed at compile time, and `pow(const e, B)` as `exp(B)`; `root` through `rootV`; `fact` → `UNDEFINED` until NM-15; `point` → a point of `toPlotNumber` coordinates; `rel` → decision 6 via `relationHolds`; built-in calls → `applyBuiltin`, except that a circular-trig call whose argument node is `deg(A)` with real `A` evaluates `circular(name, A, "degrees")`; user calls bind parameters over the caller's `vars`, call `deadline.check()` and return `UNDEFINED` past 64 nested calls or when the name has no `scope.functions` entry (a head with an error). `compileReal` applies the same rules and the same arithmetic to plain numbers (NaN for undefined, points and lists; `-0` kept) without allocating per node. `compileRealFunction1(tree, v)` is `(t) => g(v === "x" ? t : NaN, v === "y" ? t : NaN)` with `g = compileReal(tree, scope)` in real mode, and `toPlotNumber` of the `Value` closure in complex mode; `compileRealFunction2` likewise. `evaluateRows` follows decision 5: definitions in `valueOrder` (filling a name-to-value map), then `value` and `point` rows in list order.
  `evaluateLatex(latex, context)` gets the case value this way:
  1. Rows: `context.rows` with ids `row-1 … row-n`, then `latex` with id `case`, all `hidden: false`; `settings = { angleMode: "radians", complex: false, ...context.settings }`; `analysis = analyzeRows(rows, settings)`; `byRow = evaluateRows(analysis, settings, () => NO_DEADLINE)`; `c = analysis.byId.get("case")`.
  2. `c` with an error or chips → `UNDEFINED`.
  3. Kind `value`, `definition` or `point` → `byRow.get("case") ?? UNDEFINED` (for `value` and `point` rows this is `compileExpression(c.tree, scope)`'s result; for a `definition` it is the body's value, never the relation's).
  4. Kind `constant-relation` (decision 5 gives it no `evaluateRows` entry) → `compileExpression(c.tree, scope)({}, NO_DEADLINE)`, with `scope = { functions: analysis.functions, values, settings }` and `values` mapping each `definition` row's `defines.name` to its `byRow` entry (the `setup` helper's map). So `2<3` and, in complex mode, `i\cdot i<0` give `n(1)`, and `2=3` gives `UNDEFINED`.
  5. Any other kind (`empty`, curves, lines, `implicit`, `region`, `unsolved-relation`, the definition kinds without values) → `UNDEFINED`.
- [ ] **Step 4: Run** the Step 2 command. Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/calculator-v2/core/eval && git commit -m "Compile and evaluate v2 rows with real plotting functions"`.
### Task 9: Display and domain golden cases (NM-1 to NM-6, NM-8 to NM-14, NM-17 to NM-22, NM-25 to NM-28, NM-43, FN-12 to FN-14, FN-17 to FN-22, FN-60; corpus cases for NM-16, NM-24, NM-29, RC-21)
**Files:** Modify `corpus/semantics.corpus.test.ts`, `eval/compile.test.ts`, `cases/display-numbers.ts`, `cases/display-complex.ts`, `cases/domain-real.ts`, `cases/domain-functions.ts`, `cases/classify-rows.ts`.\
**Interfaces.** Consumes `formatValue` (Task 5); `evaluateLatex`, `compileExpression`, `compileRealFunction1`, `toPlotNumber` (Task 8); `CORPUS_FILES` (`cases/index.ts`). Produces nothing new.
This task has no failing-test step, so it is no ID's owning task (index section 4): NM-8 stays with Task 5 and NM-43 with Task 10. The NM-8, NM-16, NM-24, NM-29, NM-43 and RC-21 cases are the counted cases 15-release-gates' PR-41 coverage test needs (package header, "Contributions made"); the NM-16, NM-24, NM-29 and RC-21 rules are checked for real by 07, 11, 10 and 11.
- [ ] **Step 1: Write the display branch, the agreement test and the cases**
```ts
// corpus/semantics.corpus.test.ts, appended
for (const c of casesFor("display"))
  it(title(c, "display"), () => expect(formatValue(evaluateLatex(latexOf(c), { rows: c.rows, settings: c.settings }))).toBe(c.display));
// eval/compile.test.ts, appended; toBe is Object.is: both paths keep -0 (Conventions), and NaN equals NaN
it("NM-21 the real plotting path agrees with compileExpression on every real-mode display case", () => {
  for (const c of ["display-numbers", "domain-real", "domain-functions"].flatMap((file) => CORPUS_FILES[file])) {
    if (c.rows || c.settings?.complex || !("latex" in c.input)) continue;
    const s: EvalSettings = { angleMode: c.settings?.angleMode ?? "radians", complex: false }, t = tree(c.input.latex);
    expect(compileRealFunction1(t, "x", empty(s))(0), c.id).toBe(toPlotNumber(compileExpression(t, empty(s))({}, NO_DEADLINE)));
  }
});
```
`cases/display-numbers.ts`:
* `\frac{1}{3}` → "0.333333333333" · `\pi` → "3.14159265359" · `-0` → "0" · `1.5\times10^{3}` → "1500" (NM-1)
* `2^{40}` → "1.09951162778×10^12" · `999999999999` → "999999999999" · `10^{12}` → "1×10^12" · `0.000001` → "0.000001" · `0.0000001` → "1×10^-7" (NM-2)
* `0.1+0.2` → "0.3" · `10^{-20}` → "1×10^-20" · `0.1+0.2-0.3` → "5.55111512313×10^-17" (NM-3)
* `(1,2)` → "(1, 2)" · `(\frac{1}{3},2^{40})` → "(0.333333333333, 1.09951162778×10^12)" · `(1,\frac{1}{0})` → "(1, undefined)" (NM-5)
* `\frac{1}{0}` → "undefined" · `\frac{0}{0}` → "undefined" (NM-6)
* `10^{400}` → "undefined" · `10^{-400}` → "0" (NM-6, NM-14)
* `a-0.3` [rows: `a=0.1+0.2`] → "5.55111512313×10^-17" · `A+a` [rows: `A=3`, `a=4`] → "7" (NM-9, RC-1)
* `\frac{1}{0}<2` → "undefined" · `2<3` → "1" (NM-22)
* `2\cdot5000` → "10000" (NM-8, NM-2)
* `\sin(90)` → "0.893996663601" (NM-24)
* {deg} `\cos(60)` → "0.5" (NM-29)
* `\ln\left(2\right)` → "0.69314718056" (NM-43)

The last four bullets have no rows and no complex setting, so they also join the NM-21 agreement test above, the {deg} case included (it skips only rows and complex settings). `sin(90 rad)` formats to "0.893996663601" and `ln 2` to "0.69314718056" (the `ln` entry with `args: [2]` of `elementary.json` at NM-1's 12 digits).

`cases/display-complex.ts`:
* {cx} `\sqrt{-4}` → "2i" · `\frac{1}{i}` → "-i" · `i^{i}` → "0.207879576351" · `\sin(i)` → "1.17520119364i" · `(1+i)^{2}` → "2i" · `|3+4i|` → "5" (NM-18)
* {cx} `\ln(-1)` → "3.14159265359i" · `\log(-10)` → "1+1.36437635384i" (NM-18, FN-60)
* {cx} `\arcsin(2)` → "1.57079632679+1.31695789692i" · `\arccos(2)` → "-1.31695789692i" (NM-18, FN-17)
* {cx} `(-8)^{\frac{1}{3}}` → "-2" · `(-8)^{\frac{1}{2}}` → "2.82842712475i" · `2+3` → "5" (NM-19, FN-17)
* `\sqrt{-4}` → "undefined" (NM-6, NM-17, NM-19)
* `2i` [rows: `i=3`] → "6" (NM-17, NM-19)
* {cx} `e^{i\pi}` → "-1" · `3-4i` → "3-4i" · `1+i` → "1+i" · `-i` → "-i" · `i` → "i" (NM-20)
* {cx} `i<2` → "undefined" · `i\cdot i<0` → "1" (NM-22)

`cases/domain-real.ts`:
* `(-8)^{\frac{1}{3}}` → "-2" · `(-8)^{\frac{2}{3}}` → "4" · `(-32)^{0.2}` → "-2" · `(-8)^{\frac{1}{101}}` → "undefined" (NM-10, FN-12)
* `(-8)^{-\frac{1}{3}}` → "-0.5" · `(-8)^{\frac{2}{6}}` → "-2" · `(-8)^{\frac{3}{6}}` → "undefined" · `(-8)^{a}` [rows: `a=\frac{1}{3}`] → "-2" (NM-10)
* `(-8)^{0.5}` → "undefined" (NM-6, NM-10)
* `(-2)^{\pi}` → "undefined" · `(-8)^{\frac{1}{2}}` → "undefined" · `\sqrt[0]{5}` → "undefined" · `\sqrt[3]{-8}` → "-2" (NM-10, FN-13)
* `\sqrt[3]{-27}` → "-3" · `\sqrt[-3]{-8}` → "-0.5" · `\sqrt[1.5]{-8}` → "4" · `\sqrt[4]{-16}` → "undefined" (NM-11, FN-13)
* `\sqrt{-1}` → "undefined" · `\log_{1}(5)` → "undefined" · `\log_{-2}(4)` → "undefined" (NM-12)
* `\frac{5}{0}` → "undefined" · `\frac{-5}{0}` → "undefined" · `\ln(0)` → "undefined" · `\ln(-2)` → "undefined" · `\log(0)` → "undefined" · `\log(-2)` → "undefined" (NM-12, FN-14)
* `0^{0}` → "1" (NM-13, FN-14)
* `10^{308}\cdot10` → "undefined" · `2^{1024}` → "undefined" · `0^{-1}` → "undefined" (FN-14)

`cases/domain-functions.ts`:
* `\sin\pi` → "0" · `\cos\frac{\pi}{2}` → "0" · `\tan\frac{\pi}{4}` → "1" · `\sin(\pi+0.0000000001)` → "-9.99998858094×10^-11" (NM-4)
* `\tan\frac{\pi}{2}` → "undefined" (NM-4, FN-18)
* {deg} `\sin(30)` → "0.5" · `\cos(90)` → "0" · `\sin(180)` → "0" · `\tan(45)` → "1" · `\cos(60)` → "0.5" · `\sin(3630)` → "0.5" (NM-26)
* {deg} `\tan(90)` → "undefined" · `\tan(270)` → "undefined" (NM-26, FN-18)
* `\cot(\frac{\pi}{2})` → "0" · `\cot(0)` → "undefined" (FN-19)
* {deg} `\csc(30)` → "2" · `\sec(90)` → "undefined" (FN-19)
* `\sin(30^{\circ})` → "0.5" · `30^{\circ}` → "0.523598775598" (NM-27)
* {deg} `\sin(30^{\circ})` → "0.5" · `30^{\circ}` → "30" (NM-27)
* {deg} `\arcsin(0.5)` → "30" · `\arctan(1)` → "45" · `\arccos(-1)` → "180" · `\operatorname{arccot}(-1)` → "135" (NM-28)
* `\arcsin(1)` → "1.57079632679" · `\arcsin(1.5)` → "undefined" (NM-28, FN-20)
* {deg} `\arcsin(1)` → "90" · `\sin^{-1}(0.5)` → "30" (FN-20)
* `\operatorname{arccsc}(2)` → "0.523598775598" · `\operatorname{arccot}(0)` → "1.57079632679" · `\operatorname{arcsec}(0.5)` → "undefined" (FN-21)
* {deg} `\operatorname{arcsec}(2)` → "60" (FN-21)
* `\arctan(1,-1)` → "2.35619449019" · `\arctan(0,0)` → "undefined" · `\arctan(0,-1)` → "3.14159265359" (FN-22)
* {deg} `\arctan(1,-1)` → "135" (FN-22)
* `\exp(1)` → "2.71828182846" · `\ln(e)` → "1" · `\log(1000)` → "3" · `\log_{2}(8)` → "3" · `\log_{0}(5)` → "undefined" (FN-60)
* {deg} `e^{\pi}` → "23.1406926328" · `\ln(10)` → "2.30258509299" (NM-25)
* {deg, cx} `\sin(i)` → "1.17520119364i" (NM-25, FN-18)
* {deg, cx} `e^{i\pi}` → "-1" (NM-25)

`cases/classify-rows.ts`, appended (the row NM-21 plots, whose titled tests in `eval/compile.test.ts` are the real check; then the NM-16 and RC-21 cases above):
* {cx} `y=\sqrt{x}` → curve-y (NM-21)
* `y=x^{2/3}` → curve-y (NM-16)
* `\sqrt{-4}` → value, "undefined" (RC-21, NM-19)

The `\sqrt{-4}` case carries both `kind` and `display`; both route to this package's runner (01 section 2.2), in the empty, radians, real-mode scope a new question starts from.
- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-v2/core/corpus/semantics.corpus.test.ts src/lib/calculator-v2/core/eval/compile.test.ts`. Expected: PASS on first run, as for the gate tasks of index section 2: Tasks 2, 3 and 5 to 8 already implement every rule (Task 8 Step 3 shows constant relations such as `2<3` and `i\cdot i<0`), and these cases move the expectations into the corpus (PR-39). A failing case is a defect in the owning task's code; fix it there, re-run that task's test, and commit the fix with this task.
- [ ] **Step 3: Commit** `git add src/lib/calculator-v2/core && git commit -m "Add v2 display and domain golden cases"`.
### Task 10: Reference values, tolerances and the package gate (NM-43, FN-1, FN-11)
**Files:** Create `scripts/calculator-v2/reference-elementary.mjs`, `lib/tolerance.ts`, `corpus/reference/elementary.json` (written only by the script); Test `lib/elementary.reference.test.ts`.\
**Interfaces.** Consumes `evaluateLatex` (Task 8), `BUILTINS` (Task 7), `BUILTIN_ARITY` (Task 4), `OPERATOR_NAMES` (`core/latex/operator-names.ts`); the existing `mathjs` 15.2.0 (lockfile) and `prettier` 3.8.3 dependencies (script only). Produces:
```ts
// lib/tolerance.ts (FN-11; Phase 2 adds classes)
export type ToleranceClass = "elementary" | "snapped" | "default";
// elementary: |a − e| ≤ 1e-13·|e| (e = 0 needs a = 0); snapped: a === e; default: relative 1e-12, absolute 1e-12 when e = 0
export function withinTolerance(actual: number, expected: number, cls: ToleranceClass): boolean;
// scripts/calculator-v2/reference-elementary.mjs
export const ELEMENTARY_PATH: string; // fileURLToPath(new URL("../../src/lib/calculator-v2/core/corpus/reference/elementary.json", import.meta.url))
export const ELEMENTARY_INPUTS: readonly (readonly [string, ...number[]])[]; // [op, ...args] in Step 3's order; case ids are <op>-<n> per op in this order
export function buildElementaryReference(): { generator: string; library: string; precision: 40; cases: { id: string; op: string; args: number[]; latex: string; expected: string }[] };
export function formatElementaryReference(reference: object): Promise<string>; // prettier.format(JSON.stringify(reference), { ...(await prettier.resolveConfig(ELEMENTARY_PATH)), parser: "json" })
```
- [ ] **Step 1: Write the failing tests** in `lib/elementary.reference.test.ts`, with the imports in this order:
```ts
import reference from "../corpus/reference/elementary.json";
import { buildElementaryReference, ELEMENTARY_PATH, formatElementaryReference } from "../../../../../scripts/calculator-v2/reference-elementary.mjs";
import { withinTolerance } from "./tolerance"; import { BUILTIN_ARITY } from "./arity"; import { BUILTINS } from "./builtins"; import { evaluateLatex } from "../eval/compile"; import { OPERATOR_NAMES } from "../latex/operator-names"; import { readFileSync } from "node:fs";
for (const c of reference.cases)
  it(`NM-43 ${c.id} is within 1e-13 relative error of its 40-digit reference`, () => {
    const v = evaluateLatex(c.latex);
    expect(v.type === "number" && withinTolerance(v.value, Number(c.expected), "elementary"), `${JSON.stringify(v)} vs ${c.expected}`).toBe(true);
  });
it("NM-43 elementary.json is exactly what its generator writes", async () =>
  expect(await formatElementaryReference(buildElementaryReference())).toBe(readFileSync(ELEMENTARY_PATH, "utf8")));
it("FN-1 every Phase 1 built-in and operator has a committed reference case, with the allowlist's arity", () => {
  const shipped = OPERATOR_NAMES.filter((o) => o.phase === 1 && o.category !== null).map((o) => o.name);
  expect(new Set(shipped)).toEqual(new Set(BUILTINS.keys()));
  expect([BUILTIN_ARITY.size, BUILTIN_ARITY.get("sin"), BUILTIN_ARITY.get("arctan"), BUILTIN_ARITY.get("log")]).toEqual([15, [1], [1, 2], [1, 2]]);
  const ops = new Set(reference.cases.map((c) => c.op));
  for (const op of [...shipped, "add", "sub", "mul", "div", "pow", "sqrt", "nthroot", "logBase", "arctan2"]) expect(ops.has(op), op).toBe(true);
});
it("FN-11 tolerance classes compare as the table states", () => {
  expect([withinTolerance(1 + 0.9e-13, 1, "elementary"), withinTolerance(1 + 1.1e-13, 1, "elementary")]).toEqual([true, false]);
  expect([withinTolerance(0.5, 0.5, "snapped"), withinTolerance(0.5 + 2 ** -53, 0.5, "snapped")]).toEqual([true, false]);
  expect([withinTolerance(1 + 0.9e-12, 1, "default"), withinTolerance(1e-12, 0, "default"), withinTolerance(1.1e-12, 0, "default")]).toEqual([true, true, false]);
});
```
- [ ] **Step 2: Run** `n exec 22 npx vitest run src/lib/calculator-v2/core/lib/elementary.reference.test.ts`. Expected: FAIL, `Error: Cannot find module '../corpus/reference/elementary.json' imported from …/lib/elementary.reference.test.ts` (the first import).
- [ ] **Step 3: Implement the script and `tolerance.ts`, then generate** with `n exec 22 node scripts/calculator-v2/reference-elementary.mjs` (`--check` exits 1 when the committed file differs; the CLI runs only when the file is the entry point). `formatElementaryReference` awaits `prettier.resolveConfig(ELEMENTARY_PATH)` (a Promise in Prettier 3; spread unawaited it is `{}` and drops `.prettierrc`'s printWidth 100) and spreads the result before `parser: "json"`. `library` is `` `mathjs ${math.version} (decimal.js BigNumber)` ``; `expected` is `toSignificantDigits(25).toString()`; ids are `<op>-<n>` per op. Every reference uses decimal.js methods on `Big` values, never a JS number operation. Inputs are converted exactly, never through their shortest decimal:
```js
import { all, create } from "mathjs";
const math = create(all, { number: "BigNumber", precision: 40 }); const Big = math.BigNumber; // math.pi is a 40-digit Big
export const ELEMENTARY_INPUTS = [["add", 0.1, 0.2], ["add", 1e16, 3], ["sub", 1, 1e-10], ["sub", 0.3, 0.1], ["mul", 0.1, 3], ["mul", 1.1, 1.1],
  ["div", 1, 3], ["div", 22, 7], ["pow", 2, 0.5], ["pow", 1.5, 10.25], ["pow", 10, -3], ["pow", 0.5, 100], ["sqrt", 2], ["sqrt", 12345.678], ["nthroot", 3, 10],
  ["nthroot", 5, 100], ["exp", 1], ["exp", -2.5], ["exp", 20], ["ln", 2], ["ln", 0.001], ["ln", 1e100], ["log", 2], ["log", 12345], ["logBase", 2, 10],
  ["logBase", 7, 3.5], ["sin", 1], ["sin", -2], ["sin", 100], ["sin", 100000], ["cos", 1], ["cos", 2.5], ["cos", 50], ["tan", 1], ["tan", 1.2], ["tan", -0.3],
  ["csc", 1], ["csc", 2], ["sec", 1], ["sec", 0.4], ["cot", 1], ["cot", 2], ["arcsin", 0.3], ["arcsin", -0.9], ["arccos", 0.3], ["arccos", -0.9], ["arctan", 0.5],
  ["arctan", -3], ["arctan2", 1, 2], ["arctan2", -1, -3], ["arccsc", 2.5], ["arccsc", -1.5], ["arcsec", 2.5], ["arcsec", -3], ["arccot", 0.5], ["arccot", -2]];
function exactBig(x) { // the exact binary value of a finite double, at precision 40
  const view = new DataView(new ArrayBuffer(8)); view.setFloat64(0, x);
  const hi = view.getUint32(0), lo = view.getUint32(4), e = (hi >>> 20) & 0x7ff;
  const mantissa = (hi & 0xfffff) * 2 ** 32 + lo + (e === 0 ? 0 : 2 ** 52); // < 2^53, exact
  return new Big(mantissa).times(new Big(2).pow(e === 0 ? -1074 : e - 1075)).times(hi >>> 31 ? -1 : 1);
}
// LaTeX (numbers as new Big(String(x)).toFixed(), never with an exponent): add `a+b`, sub `a-b`, mul `a\cdot b`, div `\frac{a}{b}`,
// pow `a^{b}`, sqrt `\sqrt{a}`, nthroot (n, a) `\sqrt[n]{a}`, logBase (b, a) `\log_{b}\left(a\right)`, arctan2 (y, x) `\arctan\left(y,x\right)`,
// arccsc, arcsec, arccot `\operatorname{name}\left(a\right)`, every other op `\name\left(a\right)`.
// Reference, with a, b, n, y, x = exactBig(arg): a.plus(b), a.minus(b), a.times(b), a.div(b), a.pow(b), a.sqrt(), nthroot a.pow(new Big(1).div(n)), a.exp(), a.ln(), a.log(10),
// logBase a.ln().div(b.ln()), a.sin(), a.cos(), a.tan(), csc new Big(1).div(a.sin()), sec new Big(1).div(a.cos()), cot new Big(1).div(a.tan()), a.asin(), a.acos(), a.atan(),
// arctan2 Big.atan2(y, x), arccsc new Big(1).div(a).asin(), arcsec new Big(1).div(a).acos(), arccot math.pi.div(2).minus(a.atan()).
```
- [ ] **Step 4: Run** the Step 2 command, `n exec 22 node scripts/calculator-v2/reference-elementary.mjs --check` and `n exec 22 npx prettier --check src/lib/calculator-v2/core/corpus/reference/elementary.json`. Expected: PASS, the check exits 0, and Prettier prints `All matched files use Prettier code style!`.
- [ ] **Step 5: Run the package gate** `n exec 22 npx vitest run src/lib/calculator-v2/core && n exec 22 npx tsc --noEmit && n exec 22 npx eslint src/lib/calculator-v2/core scripts/calculator-v2/reference-elementary.mjs && n exec 22 npx prettier --check src/lib/calculator-v2/core scripts/calculator-v2 && n exec 22 node scripts/check-file-sizes.mjs`.
  Expected: PASS, no lint errors, Prettier clean and no file over the size limit. A failure is a defect in the owning task's file; fix it there and commit the fix with this task.
- [ ] **Step 6: Commit** `git add scripts/calculator-v2/reference-elementary.mjs src/lib/calculator-v2/core && git commit -m "Add v2 elementary reference values and tolerance classes"`.

<!-- prettier-ignore-end -->
