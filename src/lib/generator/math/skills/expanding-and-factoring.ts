/*
 * m-expanding-and-factoring: rewriting polynomial expressions. Item models after the bank's
 * questions for this skill: expanding products (and a coefficient of the expanded form),
 * greatest common factors, factors of trinomials (one binomial, "I and II", the smallest b),
 * factoring by grouping, and differences of squares (grouping.ts and squares live in
 * _advexpr-factoring.ts). Every "equivalent" check compares the candidate with the original
 * expression at the sample points; every "factor" check divides the original expression.
 */
import { need, numAnswer } from "../core/build";
import { F, gcd } from "../core/frac";
import { m, n, num, paren } from "../core/tex";
import type { Answer, Draft, Format, Template } from "../core/types";
import type { Rng } from "../core/rng";
import {
  MPoly,
  type PolyAnswer,
  factored,
  numSlip,
  polyAns,
  sameExpr,
  valueOf,
} from "./_advexpr-poly";
import { PAIRS, VARS1, productText, ptText } from "./_advexpr-common";
import { GROUPING, SQUARES } from "./_advexpr-factoring";
import { factor } from "./_advexpr-factors";

const SKILL = "m-expanding-and-factoring";
type Part = Omit<Draft, "format" | "isCorrect"> & { isCorrect: Draft["isCorrect"] };

const equivalentTo = (orig: (v: Readonly<Record<string, number>>) => number) => (c: Answer) =>
  !!c.expr && sameExpr(c.expr, orig);

const STEM_EQ = ["Which expression is equivalent to", "Which of the following is equivalent to"];

/* ---------------------------------------------------------------- expanding */

function expandMono(rng: Rng): Part {
  const [x, y] = rng.pick(PAIRS);
  const order = [x, y];
  const c = rng.pick([2, 3, 4, 5, 6, 7, 8, 9]) * (rng.bool(0.25) ? -1 : 1);
  const i = rng.int(1, 3);
  const j = rng.int(0, 2);
  const A = rng.nonzero(-9, 9);
  const B = rng.nonzero(-9, 9);
  const p = rng.int(1, 3);
  const q = rng.int(1, 2);
  need(c + A !== 0 && c + B !== 0 && Math.abs(A) !== 1, "degenerate");
  const M = MPoly.from([[c, { [x]: i, [y]: j }]]);
  const T1 = MPoly.from([[A, { [x]: p }]]);
  const T2 = MPoly.from([[B, { [y]: q }]]);
  const T = T1.add(T2);
  const ans = M.mul(T);
  const multExp = (s: MPoly, t: MPoly) => {
    const [a, b] = [s.terms()[0], t.terms()[0]];
    const e: Record<string, number> = {};
    for (const v of new Set([...Object.keys(a.e), ...Object.keys(b.e)])) {
      e[v] = a.e[v] && b.e[v] ? a.e[v] * b.e[v] : (a.e[v] ?? 0) + (b.e[v] ?? 0);
    }
    return MPoly.from([[a.c.mul(b.c), e]]);
  };
  const addCoef = (s: MPoly, t: MPoly) => {
    const [a, b] = [s.terms()[0], t.terms()[0]];
    return MPoly.from([[a.c.add(b.c), s.mul(t).terms()[0].e]]);
  };
  const mTex = M.tex(order);
  const tTex = T.tex(order);
  const given = `${mTex}(${tTex})`;
  const pt = { [x]: 2, [y]: -1 };
  const orig = (v: Readonly<Record<string, number>>) => M.eval(v) * T.eval(v);
  return {
    stem: `${rng.pick(STEM_EQ)} ${m(given)}?`,
    answer: polyAns(ans, "", order),
    slips: [
      polyAns(M.mul(T1).add(T2), `you multiplied only the first term by ${m(mTex)}`, order),
      polyAns(
        addCoef(M, T1).add(addCoef(M, T2)),
        "you added the coefficients instead of multiplying them",
        order
      ),
      polyAns(
        multExp(M, T1).add(multExp(M, T2)),
        "you multiplied the exponents instead of adding them",
        order
      ),
      polyAns(
        M.mul(T1).add(T2.scale(c)),
        `you multiplied the second term by ${n(c)} but not by its variables`,
        order
      ),
    ],
    asks: `the expanded form of ${m(given)}`,
    steps: [
      {
        label: "Multiply by the first term",
        work: `${m(`(${mTex})(${T1.tex(order)}) = ${M.mul(T1).tex(order)}`)}, because you multiply the coefficients and add the exponents of each variable`,
      },
      {
        label: "Multiply by the second term",
        work: m(`(${mTex})(${T2.tex(order)}) = ${M.mul(T2).tex(order)}`),
      },
      { label: "Write the sum", work: `The expression equals ${m(ans.tex(order))}` },
    ],
    check: `With ${ptText(pt)}, the original is ${m(`${productText(1, [M.at(pt), T.at(pt)])} = ${num(M.at(pt).mul(T.at(pt)))}`)}, and the answer gives ${n(ans.at(pt))} too`,
    tip: "When you multiply powers of the same variable, add the exponents; multiply the coefficients",
    hint: `Multiply ${m(mTex)} by each term inside the brackets.`,
    difficulty: c < 0 || A < 0 || B < 0 ? 2 : 1,
    isCorrect: equivalentTo(orig),
  };
}

function expandBinomials(rng: Rng): Part {
  const x = rng.pick(VARS1);
  const a = rng.pick([1, 1, 2, 3, 4, 5, 6]);
  const c = rng.pick([1, 2, 3, 4, 5, 7]);
  const b = rng.nonzero(-9, 9);
  const d = rng.nonzero(-9, 9);
  need(a * d + b * c !== 0 && a * d !== b * c, "middle term");
  const f1 = MPoly.lin(a, b, x);
  const f2 = MPoly.lin(c, d, x);
  const ans = f1.mul(f2);
  const o = [x];
  const sq = (k: number) => MPoly.v(x, k, 2);
  const lx = (k: number) => MPoly.v(x, k, 1);
  const given = factored(1, [f1, f2], o);
  const pt = { [x]: 2 };
  need(!f1.at(pt).isZero() && !f2.at(pt).isZero(), "zero bracket");
  const slips: PolyAnswer[] = [
    polyAns(sq(a * c).add(b * d), "you multiplied only the first terms and the last terms", o),
    polyAns(
      sq(a * c)
        .add(lx(b * c))
        .add(b * d),
      `you left out the outer product ${m(lx(a * d).tex(o))}`,
      o
    ),
    polyAns(
      sq(a * c)
        .add(lx(a * d))
        .add(b * d),
      `you left out the inner product ${m(lx(b * c).tex(o))}`,
      o
    ),
    polyAns(
      sq(a * c)
        .add(lx(a * d + b * c))
        .add(b + d),
      "you added the constants instead of multiplying them",
      o
    ),
  ];
  if (b * d < 0)
    slips.push(
      polyAns(
        sq(a * c)
          .add(lx(a * d + b * c))
          .sub(b * d),
        "you gave the product of the constants the wrong sign",
        o
      )
    );
  return {
    stem: `${rng.pick(STEM_EQ)} ${m(given)}?`,
    answer: polyAns(ans, "", o),
    slips,
    asks: `the product ${m(given)} written as a single polynomial`,
    steps: [
      {
        label: "Multiply the first terms",
        work: m(`${lx(a).tex(o)} \\cdot ${lx(c).tex(o)} = ${sq(a * c).tex(o)}`),
      },
      {
        label: "Add the outer and inner products",
        work: m(
          `${lx(a * d).tex(o)} ${b * c < 0 ? "-" : "+"} ${lx(Math.abs(b * c)).tex(o)} = ${lx(a * d + b * c).tex(o)}`
        ),
      },
      { label: "Multiply the last terms", work: m(`${num(b)} \\cdot ${paren(d)} = ${num(b * d)}`) },
      { label: "Combine the pieces", work: `The product is ${m(ans.tex(o))}` },
    ],
    check: `With ${ptText(pt)}, the original is ${m(`${productText(1, [f1.at(pt), f2.at(pt)])} = ${num(ans.at(pt))}`)}, and the answer gives ${n(ans.at(pt))} too`,
    tip: "Every term in the first bracket multiplies every term in the second: two terms times two terms make four products",
    hint: "Multiply each term of the first bracket by each term of the second.",
    difficulty: a * c > 1 && (b < 0 || d < 0) ? 2 : 1,
    isCorrect: equivalentTo((v) => f1.eval(v) * f2.eval(v)),
  };
}

function expandSquare(rng: Rng): Part {
  const x = rng.pick(VARS1);
  const a = rng.pick([1, 2, 2, 3, 3, 4, 5]);
  const b = rng.nonzero(-9, 9);
  const o = [x];
  const f = MPoly.lin(a, b, x);
  const ans = f.pow(2);
  const sq = MPoly.v(x, a * a, 2);
  const mid = MPoly.v(x, 2 * a * b);
  const given = factored(1, [[f, 2]], o);
  const slips: PolyAnswer[] = [
    polyAns(
      sq.add(b * b),
      `you squared each term and left out the middle term ${m(mid.tex(o))}`,
      o
    ),
    polyAns(sq.add(MPoly.v(x, a * b)).add(b * b), "you did not double the middle term", o),
    polyAns(sq.sub(mid).add(b * b), "you gave the middle term the wrong sign", o),
  ];
  if (a > 1)
    slips.push(
      polyAns(
        MPoly.v(x, a, 2)
          .add(mid)
          .add(b * b),
        `you did not square the coefficient ${n(a)}`,
        o
      )
    );
  if (b < 0)
    slips.unshift(
      polyAns(
        sq.add(mid).sub(b * b),
        `you made the last term negative, but ${m(`(${num(b)})^2`)} is positive`,
        o
      )
    );
  const pt = { [x]: 2 };
  return {
    stem: `${rng.pick(STEM_EQ)} ${m(given)}?`,
    answer: polyAns(ans, "", o),
    slips,
    asks: `the expanded form of ${m(given)}`,
    steps: [
      { label: "Write the square as a product", work: m(`${given} = (${f.tex(o)})(${f.tex(o)})`) },
      {
        label: "Use the square pattern",
        work: `${m("(A + B)^2 = A^2 + 2AB + B^2")}, with ${m(`A = ${MPoly.v(x, a).tex(o)}`)} and ${m(`B = ${num(b)}`)}`,
      },
      {
        label: "Find each term",
        work: `${m(`A^2 = ${sq.tex(o)}`)}, ${m(`2AB = ${mid.tex(o)}`)}, and ${m(`B^2 = ${num(b * b)}`)}, so the square is ${m(ans.tex(o))}`,
      },
    ],
    check: `With ${ptText(pt)}, the original is ${m(`(${num(f.at(pt))})^2 = ${num(ans.at(pt))}`)}, and the answer gives ${n(ans.at(pt))} too`,
    tip: `Squaring a sum never just squares each term: ${m("(A + B)^2")} always has the middle term ${m("2AB")}`,
    hint: `Write ${m(given)} as the product of two equal brackets.`,
    difficulty: a > 1 && b < 0 ? 3 : 2,
    isCorrect: equivalentTo((v) => f.eval(v) ** 2),
  };
}

function expandHalf(rng: Rng): Part {
  const x = rng.pick(["x", "x", "t", "w"]);
  const k = rng.pick([2, 3, 4, 5]);
  const p = rng.nonzero(-13, 13);
  const q = rng.nonzero(-9, 9);
  need(gcd(Math.abs(p), k) === 1, "fraction must not reduce");
  const o = [x];
  const inner1 = MPoly.lin(1, F(-p, k), x);
  const f2 = MPoly.lin(1, q, x);
  const ans = MPoly.lin(k, -p, x).mul(f2);
  need(!ans.coef({ [x]: 1 }).isZero(), "middle term");
  const frac = `\\left(${inner1.tex(o)}\\right)`;
  const given = `${k}${frac}(${f2.tex(o)})`;
  const pt = { [x]: 2 };
  const one = inner1.mul(f2);
  return {
    stem: `${rng.pick(STEM_EQ)} ${m(given)}?`,
    answer: polyAns(ans, "", o),
    slips: [
      polyAns(
        MPoly.lin(k, -p, x).mul(f2.scale(k)),
        `you multiplied both brackets by ${n(k)}, which multiplies the product by ${n(k)} twice`,
        o
      ),
      polyAns(
        MPoly.v(x, k, 2).add(-p * q),
        "you multiplied only the first terms and the last terms",
        o
      ),
      polyAns(one, `you left out the factor of ${n(k)} in front`, o),
      polyAns(
        MPoly.v(x, k, 2).add(one.sub(MPoly.v(x, 1, 2))),
        `you multiplied only the ${m(`${x}^2`)} term by ${n(k)}`,
        o
      ),
    ],
    asks: `the expanded form of ${m(given)}`,
    steps: [
      {
        label: "Clear the fraction first",
        work: `Multiply ${n(k)} into the first bracket only: ${m(`${k}${frac} = ${MPoly.lin(k, -p, x).tex(o)}`)}`,
      },
      {
        label: "Multiply the two brackets",
        work: m(`(${MPoly.lin(k, -p, x).tex(o)})(${f2.tex(o)}) = ${ans.tex(o)}`),
      },
    ],
    check: `With ${ptText(pt)}, the original is ${m(`${k}\\left(${num(inner1.at(pt))}\\right)(${num(f2.at(pt))}) = ${num(ans.at(pt))}`)}, and the answer gives ${n(ans.at(pt))} too`,
    tip: "A number in front of a product of brackets multiplies only one of the brackets",
    hint: `Multiply the ${n(k)} into the bracket that holds the fraction first.`,
    difficulty: q < 0 ? 4 : 3,
    isCorrect: equivalentTo((v) => k * inner1.eval(v) * f2.eval(v)),
  };
}

function expandTrinomial(rng: Rng): Part {
  const x = rng.pick(VARS1);
  const b = rng.nonzero(-9, 9);
  const c = rng.nonzero(-9, 9);
  const d = rng.nonzero(-12, 12);
  need(b + c !== 0 && b * c + d !== 0, "zero coefficients");
  const o = [x];
  const f1 = MPoly.lin(1, b, x);
  const f2 = MPoly.uni([1, c, d], x);
  const ans = f1.mul(f2);
  const xf = MPoly.v(x).mul(f2);
  const given = factored(1, [f1, f2], o);
  const slips: PolyAnswer[] = [
    polyAns(xf.add(MPoly.v(x, b, 2)), `you multiplied ${n(b)} by only the ${m(`${x}^2`)} term`, o),
    polyAns(
      xf.add(b),
      `you multiplied the trinomial by ${m(x)} and then added ${n(b)} instead of multiplying by it`,
      o
    ),
    polyAns(
      MPoly.v(x, 1, 3).add(b * d),
      "you multiplied only the first terms and the last terms",
      o
    ),
  ];
  if (b < 0)
    slips.push(
      polyAns(
        MPoly.lin(1, -b, x).mul(f2),
        `you treated ${m(f1.tex(o))} as ${m(MPoly.lin(1, -b, x).tex(o))}`,
        o
      )
    );
  const pt = { [x]: 2 };
  need(!f1.at(pt).isZero() && !f2.at(pt).isZero(), "zero bracket");
  return {
    stem: `${rng.pick(STEM_EQ)} ${m(given)}?`,
    answer: polyAns(ans, "", o),
    slips,
    asks: `the product ${m(given)} as one polynomial`,
    steps: [
      { label: `Multiply by ${m(x)}`, work: m(`${x}(${f2.tex(o)}) = ${xf.tex(o)}`) },
      {
        label: `Multiply by ${m(num(b))}`,
        work: m(`${num(b)}(${f2.tex(o)}) = ${f2.scale(b).tex(o)}`),
      },
      { label: "Combine like terms", work: `Add the two results: ${m(ans.tex(o))}` },
    ],
    check: `With ${ptText(pt)}, the original is ${m(`${productText(1, [f1.at(pt), f2.at(pt)])} = ${num(ans.at(pt))}`)}, and the answer gives ${n(ans.at(pt))} too`,
    tip: "Multiply each term of the shorter bracket by the whole longer bracket, then combine like terms",
    hint: `Multiply ${m(x)} by the whole trinomial, then ${n(b)} by the whole trinomial.`,
    difficulty: [b, c, d].filter((t) => t < 0).length >= 2 ? 4 : 3,
    isCorrect: equivalentTo((v) => f1.eval(v) * f2.eval(v)),
  };
}

/** Typed: a coefficient of an expanded product (a + b + c, or b after a subtraction). */
function expandValue(rng: Rng): Part {
  const x = rng.pick(VARS1);
  const o = [x];
  const pt1 = { [x]: 1 };
  const ptm = { [x]: -1 };
  if (rng.bool(0.5)) {
    const a = rng.int(2, 7);
    const b = rng.nonzero(-9, 9);
    const c = rng.int(1, 5);
    const d = rng.nonzero(-9, 9);
    const f1 = MPoly.lin(a, b, x);
    const f2 = MPoly.lin(c, d, x);
    const P = f1.mul(f2);
    const given = factored(1, [f1, f2], o);
    const askSum = rng.bool(0.5);
    const A = a * c;
    const B = a * d + b * c;
    const C = b * d;
    const value = askSum ? A + B + C : B;
    need(value !== 0, "zero");
    // Independent route: a + b + c is the value at x = 1; b is half the difference of the values at 1 and -1.
    const at1 = f1.at(pt1).mul(f2.at(pt1));
    const atm = f1.at(ptm).mul(f2.at(ptm));
    const truth = askSum ? at1 : at1.sub(atm).div(2);
    return {
      stem: `The expression ${m(given)} can be written in the form ${m(`a${x}^2 + b${x} + c`)}, where ${m("a")}, ${m("b")}, and ${m("c")} are constants. What is the value of ${m(askSum ? "a + b + c" : "b")}?`,
      answer: numAnswer(value, m(num(value))),
      slips: askSum
        ? [
            numSlip(A + C, "you left out the middle coefficient"),
            numSlip(B, `you gave only the value of ${m("b")}`),
            numSlip(
              a + b + c + d,
              "you added the numbers in the brackets instead of multiplying the brackets"
            ),
          ]
        : [
            numSlip(a * d, `you kept only the outer product ${m(`${num(a * d)}${x}`)}`),
            numSlip(b * c, `you kept only the inner product ${m(`${num(b * c)}${x}`)}`),
            numSlip(a * d - b * c, "you subtracted the inner product instead of adding it"),
          ],
      asks: askSum
        ? `the sum of the three coefficients of the expanded form of ${m(given)}`
        : `the coefficient of ${m(x)} in the expanded form of ${m(given)}`,
      steps: [
        { label: "Expand the product", work: `${m(`${given} = ${P.tex(o)}`)}` },
        {
          label: "Read the constants",
          work: `${m(`a = ${A}`)}, ${m(`b = ${B}`)}, and ${m(`c = ${C}`)}${askSum ? `, so ${m(`a + b + c = ${num(A + B + C)}`)}` : ""}`,
        },
      ],
      check: askSum
        ? `If you put ${m(`${x} = 1`)} into ${m("a" + x + "^2 + b" + x + " + c")}, you get ${m("a + b + c")}, and ${m(given)} at ${m(`${x} = 1`)} is ${m(`(${num(a + b)})(${num(c + d)}) = ${num(value)}`)}`
        : `The outer and inner products are ${m(`${num(a * d)}${x}`)} and ${m(`${num(b * c)}${x}`)}, and ${m(`${num(a * d)} ${b * c < 0 ? "-" : "+"} ${Math.abs(b * c)} = ${num(B)}`)}`,
      tip: askSum
        ? `For any polynomial, the sum of its coefficients is its value at ${m(`${x} = 1`)}`
        : `The ${m(x)}-coefficient of a product of two binomials is the outer product plus the inner product`,
      hint: "Multiply the brackets out and line the result up with the given form.",
      difficulty: askSum ? 3 : 4,
      isCorrect: (cand) => valueOf(cand)?.eq(truth) ?? false,
    };
  }
  const k = rng.pick([2, 3, 4, 5, 6, 7]);
  const p = rng.int(2, 9);
  const q = rng.nonzero(-15, 15);
  const r = rng.nonzero(-9, 9);
  const s = rng.int(2, 9);
  const t = rng.nonzero(-20, 20);
  const f1 = MPoly.lin(p, q, x);
  const f2 = MPoly.lin(1, r, x);
  const g = MPoly.lin(s, t, x);
  const E = f1.mul(f2).scale(k).sub(g);
  const B = k * (p * r + q) - s;
  need(B !== 0, "zero");
  const given = `${k}(${f1.tex(o)})(${f2.tex(o)}) - (${g.tex(o)})`;
  const val = (pt: Record<string, number>) => f1.at(pt).mul(f2.at(pt)).mul(k).sub(g.at(pt));
  const truth = val(pt1).sub(val(ptm)).div(2);
  return {
    stem: `The expression ${m(given)} can be written in the form ${m(`a${x}^2 + b${x} + c`)}, where ${m("a")}, ${m("b")}, and ${m("c")} are constants. What is the value of ${m("b")}?`,
    answer: numAnswer(B, m(num(B))),
    slips: [
      numSlip(p * r + q - s, `you did not multiply the middle coefficient by ${n(k)}`),
      numSlip(k * (p * r + q) + s, `you added ${m(`${s}${x}`)} instead of subtracting it`),
      numSlip(k * (p * r + q), `you left out the ${m(`-${s}${x}`)}`),
      numSlip(
        k * p * r + q - s,
        `you multiplied only the first term of ${m(`(${f1.tex(o)})`)} by ${n(k)}`
      ),
    ],
    asks: `the coefficient of ${m(x)} after the whole expression is expanded and simplified`,
    steps: [
      {
        label: "Multiply the two brackets",
        work: m(`(${f1.tex(o)})(${f2.tex(o)}) = ${f1.mul(f2).tex(o)}`),
      },
      {
        label: `Multiply by ${n(k)}`,
        work: m(`${k}(${f1.mul(f2).tex(o)}) = ${f1.mul(f2).scale(k).tex(o)}`),
      },
      {
        label: "Subtract the last bracket",
        work: `The minus sign applies to both of its terms: ${m(`${f1.mul(f2).scale(k).tex(o)} - ${s}${x} ${t < 0 ? "+" : "-"} ${Math.abs(t)} = ${E.tex(o)}`)}, so ${m(`b = ${B}`)}`,
      },
    ],
    check: `Only the ${m(x)}-terms matter: ${m(`${k}(${num(p * r)}${x} ${q < 0 ? "-" : "+"} ${Math.abs(q)}${x}) - ${s}${x} = ${num(B)}${x}`)}`,
    tip: "A minus sign in front of brackets changes the sign of every term inside",
    hint: `Expand the product first, then subtract every term of ${m(`(${g.tex(o)})`)}.`,
    difficulty: Math.abs(B) > 60 ? 6 : 5,
    isCorrect: (cand) => valueOf(cand)?.eq(truth) ?? false,
  };
}

export const expand: Template = {
  id: "exp-fac.expand",
  skill: SKILL,
  label: "Expand a product, or find a coefficient of the expanded form",
  difficulty: [1, 6],
  formats: ["mc", "spr"],
  make(rng, format: Format): Draft {
    const part =
      format === "spr"
        ? expandValue(rng)
        : rng.pick([
            expandMono,
            expandMono,
            expandBinomials,
            expandBinomials,
            expandSquare,
            expandHalf,
            expandTrinomial,
            expandValue,
          ])(rng);
    return { format, ...part };
  },
};

export const TEMPLATES: Template[] = [expand, factor, GROUPING, SQUARES];
