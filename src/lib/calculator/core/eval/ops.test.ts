import { expect, it } from "vitest";
import { exponentRational, rationalFromValue, realPow, realRoot } from "./real-pow";
import { C_I, cacos, casin, catan, cexp, cln, cpow, csin, csqrt } from "./complex";
import { divV, mulV, powV, rootV } from "./ops";
import { numberValue, UNDEFINED } from "./values";
import { parseLatex } from "../latex/index";

const P = Math.PI;
const n = numberValue;
const c = (re: number, im: number) => ({ re, im });
const rel = (a: number, b: number) => Math.abs(a - b) <= 1e-13 * Math.abs(b);

/** The parseLatex tree of `latex`; throws on a parse error. */
function tree(latex: string, userFunctions?: ReadonlySet<string>) {
  const parsed = parseLatex(latex, { userFunctions });
  if (!parsed.ok) throw new Error(`${latex}: ${parsed.error.code}`);
  return parsed.tree;
}

it("NM-10, FN-12 a negative base has a real power exactly when the exponent is p/q with q odd and q ≤ 99", () => {
  expect([
    rationalFromValue(0.2),
    rationalFromValue(0.5),
    rationalFromValue(P),
    rationalFromValue(1 / 99),
    rationalFromValue(1 / 101),
  ]).toEqual([{ p: 1, q: 5 }, { p: 1, q: 2 }, null, { p: 1, q: 99 }, null]);
  expect([
    exponentRational(tree("\\frac{2}{6}")),
    exponentRational(tree("-\\frac{1}{3}")),
    exponentRational(tree("\\frac{1}{x}")),
  ]).toEqual([{ p: 1, q: 3 }, { p: -1, q: 3 }, null]);
  expect([
    exponentRational(tree("\\frac{1}{101}")),
    exponentRational(tree("\\frac{3}{303}")),
    exponentRational(tree("\\frac{1}{99}")),
  ]).toEqual([null, null, { p: 1, q: 99 }]);
  expect([
    realPow(-8, 1 / 3, { p: 1, q: 3 }),
    realPow(-8, -1 / 3, { p: -1, q: 3 }),
    realPow(-32, 0.2, null),
  ]).toEqual([-2, -0.5, -2]);
  expect(rel(realPow(-8, 2 / 3, { p: 2, q: 3 }), 4)).toBe(true);
  expect([realPow(-8, 0.5, null), realPow(-2, P, null), realPow(-8, 0.5, { p: 1, q: 2 })]).toEqual([
    NaN,
    NaN,
    NaN,
  ]);
  expect([
    realPow(-8, 1 / 101, null),
    realPow(-8, 1 / 101, { p: 1, q: 101 }),
    realPow(-1, 1 / 99, { p: 1, q: 99 }),
  ]).toEqual([NaN, NaN, -1]);
  expect(powV(n(-8), n(1 / 3), { p: 1, q: 3 }, false)).toEqual(n(-2));
});
it("NM-11, FN-13 odd roots of negatives are real; even, zeroth and other negative-base roots are undefined", () => {
  expect([
    realRoot(-27, 3),
    realRoot(-8, -3),
    realRoot(16, 4),
    realRoot(-16, 4),
    realRoot(5, 0),
  ]).toEqual([-3, -0.5, 2, NaN, NaN]);
  expect(rel(realRoot(-8, 1.5), 4)).toBe(true);
  expect([
    rootV(n(-8), n(3), false),
    rootV(n(-4), null, false),
    powV(n(-8), n(P), null, false),
  ]).toEqual([n(-2), UNDEFINED, UNDEFINED]);
});
it("NM-13, NM-14, FN-14 0^0 is 1, division by zero and overflow are undefined, underflow is 0", () => {
  expect([powV(n(0), n(0), null, false), powV(n(10), n(-400), null, false)]).toEqual([n(1), n(0)]);
  for (const v of [
    powV(n(10), n(400), null, false),
    mulV(n(1e308), n(10)),
    divV(n(5), n(0)),
    divV(n(-5), n(0)),
    divV(n(0), n(0)),
    powV(n(0), n(-1), null, false),
    powV(n(2), n(1024), null, false),
  ])
    expect(v).toEqual(UNDEFINED);
});
it("NM-18 complex functions use principal branches, with C99 values on the cuts", () => {
  expect([cln(c(-1, 0)), csqrt(c(-4, 0)), csqrt(c(3, 4)), csin(c(0, 1))]).toEqual([
    c(0, P),
    c(0, 2),
    c(2, 1),
    c(0, Math.sinh(1)),
  ]);
  expect(cln(c(-1, -0)).im).toBe(P);
  expect([casin(c(2, 0)), casin(c(-2, 0)), cacos(c(2, 0))]).toEqual([
    c(P / 2, Math.acosh(2)),
    c(-P / 2, Math.acosh(2)),
    c(0, -Math.acosh(2)),
  ]);
  expect([catan(c(0, 2)), catan(c(0, -2))]).toEqual([
    c(P / 2, Math.atanh(0.5)),
    c(P / 2, -Math.atanh(0.5)),
  ]);
  const z = casin(c(0.5, 0.5)),
    w = cpow(C_I, C_I);
  expect([
    rel(z.re, 0.45227844715119064),
    rel(z.im, 0.5306375309525179),
    rel(w.re, 0.20787957635076193),
    w.im,
  ]).toEqual([true, true, true, 0]);
});
it("NM-18 e^z has an exact zero part at whole multiples of π/2, as in Desmos", () => {
  expect([cexp(c(0, P)), cexp(c(0, P / 2)), cexp(c(0, -2 * P)), cexp(c(1, 3 * P))]).toEqual([
    c(-1, 0),
    c(0, 1),
    c(1, 0),
    c(-Math.E, 0),
  ]);
  expect(cpow(cln(c(-1, 0)), c(2, 0)).im).toBe(0); // [complex] \ln(-1)^{2} is −π² + 0i
  expect(cexp(c(0, 1)).im).toBe(Math.sin(1));
});
it("NM-19 complex mode keeps every value real mode defines", () => {
  expect([
    powV(n(-8), n(1 / 3), { p: 1, q: 3 }, true),
    rootV(n(-4), null, true),
    powV(n(0), n(-1), null, true),
  ]).toEqual([n(-2), { type: "complex", value: c(0, 2) }, UNDEFINED]);
  const half = powV(n(-8), n(0.5), { p: 1, q: 2 }, true);
  expect(half.type === "complex" && rel(half.value.im, Math.sqrt(8))).toBe(true);
});
