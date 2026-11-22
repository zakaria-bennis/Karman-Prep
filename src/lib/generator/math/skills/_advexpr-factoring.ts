/*
 * m-expanding-and-factoring, continued: factoring by grouping and differences of squares
 * (re-exported by expanding-and-factoring.ts). Factor checks divide the original expression;
 * "equivalent" checks compare with it at the sample points.
 */
import { need } from "../core/build";
import { gcd } from "../core/frac";
import { m, n, num, pow } from "../core/tex";
import type { Rng } from "../core/rng";
import type { Answer, Draft, Format, Template } from "../core/types";
import { MPoly, type PolyAnswer, factored, polyAns, product, sameExpr } from "./_advexpr-poly";
import {
  PAIRS,
  VARS1,
  primitive,
  productText,
  ptText,
  rootOf,
  wrongBinomials,
} from "./_advexpr-common";

const SKILL = "m-expanding-and-factoring";
type Part = Omit<Draft, "format">;
const isFactorOf = (P: MPoly) => (c: Answer) => (c as PolyAnswer).poly?.dividesOverZ(P) ?? false;
const sgn = (v: number) => (v < 0 ? "-" : "+");

/* ---------------------------------------------------------------- grouping */

function groupCubic(rng: Rng): Part {
  const x = rng.pick(VARS1);
  const o = [x];
  const p = rng.pick([1, 1, 1, 2, 3, 4]);
  const r = rng.pick([1, 1, 2, 3, 5]);
  const q = rng.nonzero(-9, 12);
  const s = rng.nonzero(-9, 12);
  need(primitive(p, q) && Math.abs(q) !== Math.abs(s) && Math.abs(s) > 1, "distinct constants");
  const sq = (k: number, c: number) => MPoly.v(x, k, 2).add(c);
  const f1 = MPoly.lin(p, q, x);
  const f2 = sq(r, s);
  const P = f1.mul(f2);
  const ch = (a: MPoly, b: MPoly, why: string) =>
    polyAns(a.mul(b), why, o, m(factored(1, [a, b], o)));
  const slips: PolyAnswer[] = [
    ch(MPoly.lin(p, s, x), sq(r, q), `you swapped the constants ${n(q)} and ${n(s)}`),
    ch(f1, sq(r, -s), `you took out ${n(-s)} instead of ${n(s)} from the last two terms`),
  ];
  if (p !== r)
    slips.push(
      ch(MPoly.lin(r, q, x), sq(p, s), `you swapped the coefficients ${n(p)} and ${n(r)}`)
    );
  if (p === 1 && r === 1)
    slips.push(
      ch(
        MPoly.lin(1, 1, x),
        sq(1, q * s),
        `you split the constant ${n(q * s)} as ${m(`1 \\cdot ${num(q * s)}`)} without checking the middle terms`
      )
    );
  slips.push(
    ch(MPoly.lin(p, q * s, x), sq(r, 1), `you put the whole constant ${n(q * s)} into one factor`)
  );
  const pair1 = MPoly.v(x, p * r, 3).add(MPoly.v(x, q * r, 2));
  const pt = { [x]: 2 };
  need(!f1.at(pt).isZero(), "zero bracket");
  return {
    stem: `Which expression is equivalent to ${m(P.tex(o))}?`,
    answer: ch(f1, f2, ""),
    slips,
    asks: `the factored form of ${m(P.tex(o))}`,
    steps: [
      {
        label: "Group the terms in pairs",
        work: m(`(${pair1.tex(o)}) + (${MPoly.lin(p * s, q * s, x).tex(o)})`),
      },
      {
        label: "Factor each pair",
        work: `${m(`${MPoly.v(x, r, 2).tex(o)}(${f1.tex(o)}) ${sgn(s)} ${Math.abs(s)}(${f1.tex(o)})`)}: both pairs share ${m(`(${f1.tex(o)})`)}`,
      },
      {
        label: "Take out the common bracket",
        work: m(`${P.tex(o)} = ${factored(1, [f1, f2], o)}`),
      },
    ],
    check: `With ${ptText(pt)}, the original is ${n(P.at(pt))} and the factored form is ${m(`${productText(1, [f1.at(pt), f2.at(pt)])} = ${num(P.at(pt))}`)}`,
    tip: "With four terms, try grouping them in pairs and factoring each pair; the brackets left over should match",
    hint: "Group the first two terms and the last two terms.",
    difficulty: (p > 1 || r > 1 ? 1 : 0) + (q < 0 || s < 0 ? 1 : 0) + 2,
    isCorrect: (c) => !!c.expr && sameExpr(c.expr, (v) => P.eval(v)),
  };
}

function groupTwoVar(rng: Rng): Part {
  const [x, y] = rng.pick(PAIRS);
  const o = [x, y];
  const a = rng.int(1, 9);
  const b = rng.int(1, 12);
  const c = rng.nonzero(-12, 12);
  need(Math.abs(c) > 1 && a !== b && b !== Math.abs(c) && a !== Math.abs(c), "distinct numbers");
  const XY = (k: number, i: number, j: number) => MPoly.from([[k, { [x]: i, [y]: j }]]);
  const f1 = XY(a, 2, 0).add(XY(b, 0, 2));
  const f2 = XY(1, 1, 0).add(XY(c, 0, 1));
  const P = f1.mul(f2);
  const ch = (u: MPoly, v: MPoly, why: string) =>
    polyAns(u.mul(v), why, o, m(factored(1, [u, v], o)));
  return {
    stem: `Which expression is equivalent to ${m(P.tex(o))}?`,
    answer: ch(f1, f2, ""),
    slips: [
      ch(
        XY(a, 2, 0).add(XY(c, 0, 1)),
        XY(1, 1, 0).add(XY(b, 0, 2)),
        `you put ${n(a)} and ${n(c)} in the same factor`
      ),
      ch(
        XY(a, 3, 0).add(XY(b, 0, 2)),
        XY(1, 2, 0).add(XY(c, 0, 3)),
        "you kept the original powers inside the factors"
      ),
      ch(
        XY(a, 2, 0).add(XY(c, 0, 2)),
        XY(1, 1, 0).add(XY(b, 0, 1)),
        `you swapped ${n(b)} and ${n(c)}`
      ),
      ch(
        XY(a, 2, 0).sub(XY(b, 0, 2)),
        f2,
        `you took out ${m(XY(-b, 0, 2).tex(o))} instead of ${m(XY(b, 0, 2).tex(o))} from the last two terms`
      ),
    ],
    asks: `the factored form of ${m(P.tex(o))}`,
    steps: [
      {
        label: "Group the terms in pairs",
        work: m(
          `(${XY(a, 3, 0)
            .add(XY(a * c, 2, 1))
            .tex(o)}) + (${XY(b, 1, 2)
            .add(XY(b * c, 0, 3))
            .tex(o)})`
        ),
      },
      {
        label: "Factor each pair",
        work: `${m(`${XY(a, 2, 0).tex(o)}(${f2.tex(o)}) + ${XY(b, 0, 2).tex(o)}(${f2.tex(o)})`)}: both pairs share ${m(`(${f2.tex(o)})`)}`,
      },
      {
        label: "Take out the common bracket",
        work: m(`${P.tex(o)} = ${factored(1, [f1, f2], o)}`),
      },
    ],
    check: `Multiply back: ${m(`(${XY(a, 2, 0).tex(o)})(${x}) = ${XY(a, 3, 0).tex(o)}`)} and ${m(`(${XY(b, 0, 2).tex(o)})(${XY(c, 0, 1).tex(o)}) = ${XY(b * c, 0, 3).tex(o)}`)}, the first and last terms`,
    tip: "Factor by grouping: take out what each pair shares, then the matching brackets become one factor",
    hint: "Group the first two terms and the last two terms, and factor each pair.",
    difficulty: c < 0 ? 5 : 4,
    isCorrect: (cand) => !!cand.expr && sameExpr(cand.expr, (v) => P.eval(v)),
  };
}

function groupSplit(rng: Rng): Part {
  const x = rng.pick(VARS1);
  const o = [x];
  const p = rng.pick([1, 1, 2, 3, 5, 7]);
  const r = rng.pick([1, 2, 3, 4, 7]);
  const q = rng.nonzero(-12, 12);
  const s = rng.nonzero(-12, 12);
  need(primitive(p, q) && primitive(r, s) && p * s + q * r !== 0 && p * s !== q * r, "factors");
  const f1 = MPoly.lin(p, q, x);
  const f2 = MPoly.lin(r, s, x);
  const P = f1.mul(f2);
  const shown = `${MPoly.v(x, p * r, 2).tex(o)} ${sgn(p * s)} ${MPoly.v(x, Math.abs(p * s)).tex(o)} ${sgn(q * r)} ${MPoly.v(x, Math.abs(q * r)).tex(o)} ${sgn(q * s)} ${Math.abs(q * s)}`;
  const askCommon = rng.bool(0.5);
  const fa = askCommon ? f2 : f1;
  const other = askCommon ? f1 : f2;
  const root = askCommon ? rootOf(r, s) : rootOf(p, q);
  const truth: [number, number][] = [
    [p, q],
    [r, s],
  ];
  return {
    stem: `Which expression is a factor of ${m(shown)}?`,
    answer: polyAns(fa, "", o),
    slips: rng.shuffle(wrongBinomials(P, truth, x).filter((w) => !w.poly!.eq(other))),
    asks: `a binomial that divides ${m(shown)} with no remainder`,
    steps: [
      {
        label: "Factor each pair",
        work: `${m(`${MPoly.v(x, p).tex(o)}(${f2.tex(o)}) ${sgn(q)} ${Math.abs(q) === 1 ? "" : Math.abs(q)}(${f2.tex(o)})`)}: the first two terms share ${m(MPoly.v(x, p).tex(o))} and the last two share ${n(q)}`,
      },
      { label: "Take out the common bracket", work: m(`${shown} = ${factored(1, [f1, f2], o)}`) },
    ],
    check: `At ${m(`${x} = ${num(root)}`)}, where ${m(fa.tex(o))} is zero, the expression equals $0$`,
    tip: "A four-term expression whose middle terms are written separately is usually set up for grouping",
    hint: "Factor the first two terms together and the last two terms together.",
    difficulty: p > 1 && r > 1 ? 4 : 3,
    isCorrect: isFactorOf(P),
  };
}

function groupPowers(rng: Rng): Part {
  const [x, y] = rng.pick(PAIRS);
  const o = [x, y];
  const a = rng.int(2, 6);
  const b = rng.int(2, 9);
  const c = rng.int(1, 5);
  need(a !== b, "distinct powers");
  const xa = MPoly.v(x, 1, a);
  const yb = MPoly.v(y, 1, b);
  const f1 = xa.add(yb);
  const f2 = MPoly.v(x).add(MPoly.v(y, c));
  const P = f1.mul(f2);
  return {
    stem: `Which expression is a factor of ${m(P.tex(o))}?`,
    answer: polyAns(f1, "", o),
    slips: [
      polyAns(
        MPoly.v(x, 1, a + 1).add(MPoly.v(y, c, b + 1)),
        "you added the first and last terms, which is not a factor",
        o
      ),
      polyAns(
        xa.add(MPoly.v(y, c, b)),
        `you kept ${n(c)} with ${m(pow(y, b))}, but ${n(c)} belongs to the other factor`,
        o
      ),
      polyAns(
        MPoly.v(x, 1, a + 1).add(yb),
        `you took out ${m(pow(x, a))} from the first pair but kept ${m(pow(x, a + 1))}`,
        o
      ),
      polyAns(
        xa.add(MPoly.v(y, 1, b + 1)),
        `you took out ${m(pow(y, b))} from the last pair but kept ${m(pow(y, b + 1))}`,
        o
      ),
    ],
    asks: `an expression that divides ${m(P.tex(o))} with no remainder`,
    steps: [
      {
        label: "Factor each pair",
        work: `${m(`${pow(x, a)}(${f2.tex(o)}) + ${pow(y, b)}(${f2.tex(o)})`)}: the first pair shares ${m(pow(x, a))}, the second ${m(pow(y, b))}`,
      },
      {
        label: "Take out the common bracket",
        work: m(`${P.tex(o)} = (${f1.tex(o)})(${f2.tex(o)})`),
      },
    ],
    check: `Multiply back: ${m(`(${f1.tex(o)})(${f2.tex(o)})`)} gives the four terms ${m(P.tex(o))}`,
    tip: "Look for a pair of terms that shares a power of one variable and a pair that shares a power of the other",
    hint: "Group the first two terms and the last two terms.",
    difficulty: 5,
    isCorrect: isFactorOf(P),
  };
}

export const GROUPING: Template = {
  id: "exp-fac.grouping",
  skill: SKILL,
  label: "Factor a four-term polynomial by grouping",
  difficulty: [2, 5],
  formats: ["mc"],
  make(rng, format: Format): Draft {
    const part = rng.pick([groupCubic, groupCubic, groupTwoVar, groupSplit, groupPowers])(rng);
    return { format, ...part };
  },
};

/* ---------------------------------------------------------------- squares */

function squarePowers(rng: Rng): Part {
  const v = rng.pick(["p", "x", "t", "w", "z"]);
  const o = [v];
  const k = rng.int(2, 9);
  const l = rng.int(2, 12);
  const e = rng.int(2, 19);
  need(gcd(k, l) === 1, "coprime");
  const s = rng.bool(0.5) ? 1 : -1;
  const P = MPoly.v(v, k * k, e + 2).sub(MPoly.v(v, l * l, e));
  const diff = MPoly.uni([k * k, 0, -l * l], v);
  const lo = MPoly.lin(k, -l, v);
  const hi = MPoly.lin(k, l, v);
  return {
    stem: `Which expression is a factor of ${m(P.tex(o))}?`,
    answer: polyAns(MPoly.lin(k, s * l, v), "", o),
    slips: [
      polyAns(
        MPoly.uni([k * k, 0, l * l], v),
        "you wrote a sum of squares; a difference of squares factors into a difference times a sum",
        o
      ),
      polyAns(MPoly.lin(l, s * k, v), `you swapped the square roots ${n(k)} and ${n(l)}`, o),
      polyAns(
        MPoly.v(v, k * k - l * l, e + 2),
        "you combined the two terms as if they were like terms",
        o
      ),
      polyAns(
        MPoly.uni([k, 0, s * l], v),
        `you took the square root of ${n(k * k)} but not of ${m(pow(v, 2))}`,
        o
      ),
    ],
    asks: `an expression that divides ${m(P.tex(o))} with no remainder`,
    steps: [
      { label: "Take out the common power", work: m(`${P.tex(o)} = ${pow(v, e)}(${diff.tex(o)})`) },
      {
        label: "Spot a difference of squares",
        work: m(`${diff.tex(o)} = (${k}${v})^2 - ${l}^2 = (${lo.tex(o)})(${hi.tex(o)})`),
      },
      {
        label: "List the factors",
        work: m(`${P.tex(o)} = ${pow(v, e)}(${lo.tex(o)})(${hi.tex(o)})`),
      },
    ],
    check: `At ${m(`${v} = ${num(rootOf(k, s * l))}`)}, ${m(`${k * k}${v}^2 = ${l * l}`)}, so ${m(diff.tex(o))} is $0$ and so is the whole expression`,
    tip: `${m("A^2 - B^2 = (A - B)(A + B)")}; take out any common factor first so the squares show`,
    hint: "Take out the power of the variable that both terms share.",
    difficulty: k * l > 40 ? 6 : 5,
    isCorrect: isFactorOf(P),
  };
}

function squareGrouped(rng: Rng): Part {
  const a = rng.pick(["a", "b", "c", "k"]);
  const o = ["x", a];
  const k = rng.int(2, 9);
  const l = rng.int(2, 12);
  const s = rng.bool(0.5) ? 1 : -1;
  const x2 = MPoly.v("x", 1, 2);
  const inner = x2.add(MPoly.v(a, k));
  const P = inner.pow(2).sub(l * l);
  return {
    stem: `Which expression is a factor of ${m(P.tex(o))}, where ${m(a)} is a positive constant?`,
    answer: polyAns(inner.add(s * l), "", o),
    slips: [
      polyAns(
        x2.sub(MPoly.v(a, k)).add(s * l),
        `you gave ${m(MPoly.v(a, k).tex(o))} the wrong sign`,
        o
      ),
      polyAns(x2.add(MPoly.v(a, 2 * k)), `you used the middle coefficient ${n(2 * k)}`, o),
      polyAns(x2.add(MPoly.v(a, s * l)), `you attached ${n(l)} to ${m(a)}`, o),
      polyAns(inner.add(s * l * l), `you did not take the square root of ${n(l * l)}`, o),
    ],
    asks: `an expression that divides ${m(P.tex(o))} with no remainder`,
    steps: [
      {
        label: "Spot the perfect square",
        work: `${m(`${inner.pow(2).tex(o)} = (${inner.tex(o)})^2`)}, because ${m(`2 \\cdot x^2 \\cdot ${k}${a} = ${2 * k}${a}x^2`)}`,
      },
      {
        label: "Use the difference of squares",
        work: m(`(${inner.tex(o)})^2 - ${l}^2 = (${inner.sub(l).tex(o)})(${inner.add(l).tex(o)})`),
      },
    ],
    check: `Multiply back: ${m(`(${inner.sub(l).tex(o)})(${inner.add(l).tex(o)}) = (${inner.tex(o)})^2 - ${l * l}`)}, which expands to the given expression`,
    tip: "When three of the terms form a perfect square and the last is a negative square, use the difference of squares",
    hint: "Look for a perfect square among the first three terms.",
    difficulty: k >= 6 || l >= 9 ? 7 : 6,
    isCorrect: isFactorOf(P),
  };
}

function squareBinomial(rng: Rng): Part {
  const o = ["y", "x"];
  const h = rng.int(2, 12);
  const k = rng.int(2, 7);
  need(h !== k, "distinct");
  const s = rng.bool(0.6) ? 1 : -1;
  const xh = MPoly.lin(1, -h, "x");
  const y = MPoly.v("y");
  const P = y
    .pow(2)
    .mul(xh)
    .sub(xh.pow(3).scale(k * k));
  const ans = y.add(xh.scale(s * k));
  const kxh = MPoly.lin(k, -k * h, "x");
  const shown = `y^2(x - ${h}) - ${k * k}(x - ${h})^3`;
  return {
    stem: `Which expression is a factor of ${m(shown)}?`,
    answer: polyAns(ans, "", o),
    slips: [
      polyAns(
        y.mul(xh),
        `you took out ${m("y")} with ${m(`x - ${h}`)}, but the second term has no ${m("y")}`,
        o,
        m(`y(x - ${h})`)
      ),
      polyAns(
        xh.mul(MPoly.lin(1, -k, "x")),
        `you subtracted the square root ${n(k)} from ${m("x")} instead of multiplying it by ${m(`(x - ${h})`)}`,
        o,
        m(`(x - ${h})(x - ${k})`)
      ),
      polyAns(
        y.add(xh.scale(s)),
        `you took the square root of ${m(`${k * k}(x - ${h})^2`)} as ${m(`x - ${h}`)}, leaving out the ${n(k)}`,
        o
      ),
      polyAns(
        y.add(MPoly.lin(s * k, -s * h, "x")),
        `you multiplied only the ${m("x")} by ${n(k)}`,
        o
      ),
    ],
    asks: `an expression that divides ${m(shown)} with no remainder`,
    steps: [
      {
        label: "Take out the common bracket",
        work: m(`${shown} = (x - ${h})[y^2 - ${k * k}(x - ${h})^2]`),
      },
      {
        label: "Write both parts as squares",
        work: m(`${k * k}(x - ${h})^2 = [${k}(x - ${h})]^2 = (${kxh.tex(o)})^2`),
      },
      {
        label: "Use the difference of squares",
        work: m(`y^2 - (${kxh.tex(o)})^2 = (${y.sub(kxh).tex(o)})(${y.add(kxh).tex(o)})`),
      },
    ],
    check: `Multiply back: ${m(`(${y.sub(kxh).tex(o)})(${y.add(kxh).tex(o)}) = y^2 - ${k * k}(x - ${h})^2`)}, and times ${m(`(x - ${h})`)} that is the given expression`,
    tip: "Take out the common bracket first, then look for a difference of squares in what is left",
    hint: `Both terms share ${m(`(x - ${h})`)}. Take it out first.`,
    difficulty: k >= 4 ? 7 : 6,
    isCorrect: isFactorOf(P),
  };
}

function squareNotFactor(rng: Rng): Part {
  const x = rng.pick(VARS1);
  const o = [x];
  const a = rng.int(2, 4);
  const b = rng.int(2, 6);
  const g = rng.int(2, 15);
  need(gcd(a, b) === 1, "coprime");
  const P = MPoly.uni([g * a ** 4, 0, 0, 0, -g * b ** 4], x);
  const quart = MPoly.uni([a ** 4, 0, 0, 0, -(b ** 4)], x);
  const s2 = MPoly.uni([a * a, 0, b * b], x);
  const d2 = MPoly.uni([a * a, 0, -b * b], x);
  const lo = MPoly.lin(a, -b, x);
  const hi = MPoly.lin(a, b, x);
  const full = `${P.tex(o)} = ${g}(${s2.tex(o)})(${lo.tex(o)})(${hi.tex(o)})`;
  const why = `it is a factor, since ${m(full)}`;
  const answer = polyAns(MPoly.uni([a, 0, rng.bool(0.5) ? -b : b], x), "", o);
  return {
    stem: `Which expression is NOT a factor of ${m(P.tex(o))}?`,
    answer,
    slips: rng.shuffle([
      polyAns(s2, why, o),
      polyAns(lo, why, o),
      polyAns(hi, why, o),
      polyAns(MPoly.c(g), `it is a factor, since ${m(`${P.tex(o)} = ${g}(${quart.tex(o)})`)}`, o),
      polyAns(
        d2,
        `it is a factor, since ${m(`${P.tex(o)} = ${g}(${s2.tex(o)})(${d2.tex(o)})`)}`,
        o
      ),
    ]),
    asks: `the one choice that does not divide ${m(P.tex(o))}`,
    steps: [
      { label: "Take out the common number", work: m(`${P.tex(o)} = ${g}(${quart.tex(o)})`) },
      {
        label: "Factor the difference of squares",
        work: `${m(`${quart.tex(o)} = (${s2.tex(o)})(${d2.tex(o)})`)}, since ${m(`${a ** 4}${x}^4 = (${a * a}${x}^2)^2`)} and ${m(`${b ** 4} = ${b * b}^2`)}`,
      },
      {
        label: "Factor again",
        work: `${m(`${d2.tex(o)} = (${lo.tex(o)})(${hi.tex(o)})`)}, so ${m(full)}`,
      },
      {
        label: "Compare with the choices",
        work: `${m(answer.poly!.tex(o))} is not one of these factors or a product of them`,
      },
    ],
    check: `Multiply the factors back to get ${m(P.tex(o))}; dividing ${m(P.tex(o))} by ${m(answer.poly!.tex(o))} leaves a remainder`,
    tip: "Factor completely first; a choice that is not one of your factors, or a product of them, is not a factor",
    hint: "Take out the common number, then look for a difference of squares, twice.",
    difficulty: 7,
    isCorrect: (c) => !((c as PolyAnswer).poly?.dividesOverZ(P) ?? true),
  };
}

function squareTrinomial(rng: Rng): Part {
  const [x, y] = rng.pick(PAIRS);
  const o = [x, y];
  const a = rng.int(2, 7);
  const b = rng.nonzero(-9, 9);
  need(gcd(a, Math.abs(b)) === 1 && a !== Math.abs(b), "primitive");
  const L = (p: number, q: number) => MPoly.v(x, p).add(MPoly.v(y, q));
  const f = L(a, b);
  const P = f.pow(2);
  const ch = (fs: (MPoly | readonly [MPoly, number])[], why: string) =>
    polyAns(product(1, fs), why, o, m(factored(1, fs, o)));
  const mid = MPoly.from([[2 * a * b, { [x]: 1, [y]: 1 }]]);
  return {
    stem: `Which expression is equivalent to ${m(P.tex(o))}?`,
    answer: ch([[f, 2]], ""),
    slips: [
      ch(
        [[L(a, -b), 2]],
        `you used the wrong sign; the middle term ${m(mid.tex(o))} needs ${m(f.tex(o))}`
      ),
      ch(
        [[L(a * a, b * b * Math.sign(b)), 2]],
        `you used ${n(a * a)} and ${n(b * b)} instead of their square roots`
      ),
      ch(
        [L(a, -b), f],
        `you factored it as a difference of squares, which has no ${m(`${x}${y}`)}-term`
      ),
      ch(
        [L(a * a, b), L(1, b)],
        `you split ${n(a * a)} as ${m(`${a * a} \\cdot 1`)} instead of ${m(`${a} \\cdot ${a}`)}`
      ),
    ],
    asks: `the factored form of ${m(P.tex(o))}`,
    steps: [
      {
        label: "Check the first and last terms",
        work: `${m(`${a * a}${pow(x, 2)} = (${a}${x})^2`)} and ${m(`${MPoly.v(y, b * b, 2).tex(o)} = (${MPoly.v(y, Math.abs(b)).tex(o)})^2`)}`,
      },
      {
        label: "Check the middle term",
        work: m(`2(${a}${x})(${MPoly.v(y, b).tex(o)}) = ${mid.tex(o)}`),
      },
      { label: "Write the square", work: m(`${P.tex(o)} = (${f.tex(o)})^2`) },
    ],
    check: `Expand: ${m(`(${f.tex(o)})^2 = ${P.tex(o)}`)}`,
    tip: `A trinomial whose first and last terms are squares may be ${m("(A + B)^2")}; check that the middle term is ${m("2AB")}`,
    hint: "Are the first and last terms perfect squares?",
    difficulty: 4,
    isCorrect: (c) => !!c.expr && sameExpr(c.expr, (v) => P.eval(v)),
  };
}

export const SQUARES: Template = {
  id: "exp-fac.squares",
  skill: SKILL,
  label: "Differences of squares and perfect squares, including hidden ones",
  difficulty: [4, 7],
  formats: ["mc"],
  make(rng, format: Format): Draft {
    const part = rng.pick([
      squarePowers,
      squarePowers,
      squareGrouped,
      squareBinomial,
      squareNotFactor,
      squareTrinomial,
    ])(rng);
    return { format, ...part };
  },
};
