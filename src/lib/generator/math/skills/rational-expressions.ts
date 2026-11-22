/*
 * m-rational-expressions: simplifying, adding and dividing fractions with variables. Item
 * models after the bank's questions for this skill: cancelling a common factor, a value that a
 * rational expression always equals, adding and subtracting fractions with variable
 * denominators (including the bank's pi form), and rearranging formulas with fractions and
 * squares. "Equivalent" checks compare with the original expression at the sample points;
 * rearranged formulas are checked by putting the candidate back into the original equation.
 */
import { need, numAnswer } from "../core/build";
import { F, gcd } from "../core/frac";
import { m, n, num } from "../core/tex";
import type { Rng } from "../core/rng";
import type { Answer, Draft, Format, Template } from "../core/types";
import { MPoly, exprAns, factored, numSlip, sameExpr, valueOf } from "./_advexpr-poly";
import { SOLVE_FOR } from "./_advexpr-formulas";

const SKILL = "m-rational-expressions";
type Part = Omit<Draft, "format">;
type Fn = (v: Readonly<Record<string, number>>) => number;
const frac = (top: string, bottom: string) => `\\frac{${top}}{${bottom}}`;
const VARS = ["x", "x", "x", "t", "n", "w", "z"];
const equalTo = (f: Fn) => (c: Answer) => !!c.expr && sameExpr(c.expr, f);

/* ---------------------------------------------------------------- simplify */

function cancelFactor(rng: Rng): Part {
  const x = rng.pick(VARS);
  const o = [x];
  const a = rng.pick([1, 1, 1, 2, 3]);
  const b = rng.nonzero(-12, 12);
  const c = rng.nonzero(-12, 12);
  const w = rng.nonzero(-12, 12);
  need(
    gcd(a, Math.abs(b)) === 1 && c !== w && a * c !== b && a * w !== b && c !== -w,
    "distinct factors"
  );
  need(b !== a * w && Math.abs(b) !== Math.abs(a * w), "no further cancelling");
  const top = MPoly.lin(a, b, x);
  const common = MPoly.lin(1, c, x);
  const rest = MPoly.lin(1, w, x);
  const N = top.mul(common);
  const D = rest.mul(common);
  const bound = Math.max(-c, -w);
  const orig: Fn = (v) => N.eval(v) / D.eval(v);
  const ans = (t: MPoly, d: MPoly, why: string) =>
    exprAns(m(frac(t.tex(o), d.tex(o))), (v) => t.eval(v) / d.eval(v), why);
  const Nx = N.sub(MPoly.v(x, a, 2));
  const Dx = D.sub(MPoly.v(x, 1, 2));
  const slips = [
    ans(
      MPoly.lin(a, -b, x),
      MPoly.lin(1, -w, x),
      "you factored with the wrong signs: each root is the opposite of the number in its factor"
    ),
    ans(
      MPoly.lin(a, b, x),
      MPoly.lin(1, -w, x),
      `you gave the factor ${m(rest.tex(o))} the wrong sign`
    ),
    exprAns(
      m(frac(Nx.tex(o), Dx.tex(o))),
      (v) => Nx.eval(v) / Dx.eval(v),
      `you cancelled the ${m(`${x}^2`)} terms, but only common factors cancel, not terms`
    ),
  ];
  if (a === 1)
    slips.push(
      exprAns(
        m(num(F(b, w))),
        () => b / w,
        `you cancelled the ${m(x)} in ${m(`${frac(top.tex(o), rest.tex(o))}`)}, but ${m(x)} is a term there, not a factor`
      )
    );
  return {
    stem: `Which expression is equivalent to ${m(frac(N.tex(o), D.tex(o)))}, where ${m(`${x} > ${bound}`)}?`,
    answer: ans(top, rest, ""),
    slips,
    asks: `the simplest form of ${m(frac(N.tex(o), D.tex(o)))}`,
    steps: [
      { label: "Factor the numerator", work: m(`${N.tex(o)} = ${factored(1, [top, common], o)}`) },
      {
        label: "Factor the denominator",
        work: m(`${D.tex(o)} = ${factored(1, [rest, common], o)}`),
      },
      {
        label: "Cancel the common factor",
        work: `Both share ${m(`(${common.tex(o)})`)}, which is not zero when ${m(`${x} > ${bound}`)}: ${m(`${frac(factored(1, [top, common], o), factored(1, [rest, common], o))} = ${frac(top.tex(o), rest.tex(o))}`)}`,
      },
    ],
    check: `With ${m(`${x} = ${bound + 3}`)}, the original is ${m(`${frac(num(N.at({ [x]: bound + 3 })), num(D.at({ [x]: bound + 3 })))} = ${num(N.at({ [x]: bound + 3 }).div(D.at({ [x]: bound + 3 })))}`)}, and so is ${m(frac(top.tex(o), rest.tex(o)))}`,
    tip: "Factor the top and the bottom completely first; you may cancel only a factor that multiplies the whole top and the whole bottom",
    hint: "Factor both quadratics and look for a factor they share.",
    difficulty: a > 1 ? 5 : 4,
    isCorrect: equalTo(orig),
  };
}

function divideMonomial(rng: Rng): Part {
  const x = rng.pick(VARS);
  const o = [x];
  const g = rng.int(2, 9);
  const k = rng.int(1, 4);
  const A = rng.int(1, 9);
  const B = rng.nonzero(-9, 9);
  const C = rng.nonzero(-9, 9);
  need(Math.abs(C) !== 1 || rng.bool(0.5), "variety");
  const N = MPoly.uni([g * A, g * B, g * C], x).mul(MPoly.v(x, 1, k));
  const Dm = MPoly.v(x, g, k);
  const ans = MPoly.uni([A, B, C], x);
  const orig: Fn = (v) => N.eval(v) / Dm.eval(v);
  const p = (q: MPoly, why: string) => exprAns(m(q.tex(o)), (v) => q.eval(v), why);
  return {
    stem: `Which expression is equivalent to ${m(frac(N.tex(o), Dm.tex(o)))}, where ${m(`${x} > 0`)}?`,
    answer: p(ans, ""),
    slips: [
      p(
        MPoly.v(x, A, 2).add(N.sub(MPoly.v(x, g * A, k + 2))),
        `you divided only the first term by ${m(Dm.tex(o))}`
      ),
      p(
        MPoly.uni([A, B, C, 0], x),
        `you divided by ${m(MPoly.v(x, g, k - 1).tex(o))}, one power of ${m(x)} short`
      ),
      p(MPoly.uni([A, B, g * C], x), `you did not divide the last coefficient by ${n(g)}`),
      p(
        ans.mul(MPoly.v(x, 1, k)),
        `you divided the coefficients by ${n(g)} but kept every power of ${m(x)}`
      ),
    ],
    asks: `the result of dividing each term of the numerator by ${m(Dm.tex(o))}`,
    steps: [
      { label: "Split the fraction", work: `Divide each term of the numerator by ${m(Dm.tex(o))}` },
      {
        label: "Divide coefficients and powers",
        work: `Divide each coefficient by ${n(g)} and subtract ${n(k)} from each exponent of ${m(x)}: ${m(`${frac(N.tex(o), Dm.tex(o))} = ${ans.tex(o)}`)}`,
      },
    ],
    check: `Multiply back: ${m(`${Dm.tex(o)}(${ans.tex(o)}) = ${N.tex(o)}`)}`,
    tip: "A fraction with one term on the bottom splits into one fraction per term on top; divide every term",
    hint: `Divide each term on top by ${m(Dm.tex(o))}.`,
    difficulty: B < 0 || C < 0 ? 3 : 2,
    isCorrect: equalTo(orig),
  };
}

/** Typed: the constant that a rational expression always equals. */
function constantValue(rng: Rng): Part {
  const x = rng.pick(["x", "k", "t", "n", "p"]);
  const o = [x];
  const b = rng.int(2, 9);
  const c = rng.int(2, 12);
  const h = rng.nonzero(-12, 12);
  const a = b * c;
  const expanded = rng.bool(0.5);
  const top = expanded ? MPoly.lin(a, a * h, x).tex(o) : `${a}(${MPoly.lin(1, h, x).tex(o)})`;
  const bottom = expanded ? MPoly.lin(b, b * h, x).tex(o) : `${b}(${MPoly.lin(1, h, x).tex(o)})`;
  return {
    stem: `${m(`${frac(top, bottom)}`)}\n\nThe given expression is equivalent to ${m("c")}, where ${m("c")} is a constant and ${m(`${x} > ${-h}`)}. What is the value of ${m("c")}?`,
    answer: numAnswer(c, m(num(c))),
    slips: [
      numSlip(
        2 * c,
        "you divided term by term and added the two quotients, but the terms of a sum do not divide separately"
      ),
      numSlip(F(b, a), "you divided the bottom by the top"),
      numSlip(a - b, "you subtracted the coefficients instead of dividing"),
    ],
    asks: `the one number the fraction equals for every allowed value of ${m(x)}`,
    steps: [
      ...(expanded
        ? [
            {
              label: "Factor the top and the bottom",
              work: m(
                `${frac(top, bottom)} = ${frac(`${a}(${MPoly.lin(1, h, x).tex(o)})`, `${b}(${MPoly.lin(1, h, x).tex(o)})`)}`
              ),
            },
          ]
        : []),
      {
        label: "Cancel the common factor",
        work: `${m(`(${MPoly.lin(1, h, x).tex(o)})`)} is not zero when ${m(`${x} > ${-h}`)}, so it cancels: ${m(`${frac(String(a), String(b))} = ${c}`)}`,
      },
    ],
    check: `With ${m(`${x} = ${-h + 1}`)}, the fraction is ${m(`${frac(String(a), String(b))} = ${c}`)}; with ${m(`${x} = ${-h + 2}`)}, it is ${m(`${frac(String(2 * a), String(2 * b))} = ${c}`)} again`,
    tip: "If a fraction with variables equals a constant, factor the top and bottom and cancel the common factor",
    hint: "Look for a factor the top and the bottom share.",
    difficulty: expanded ? 3 : 2,
    isCorrect: (cand) => {
      const v = valueOf(cand);
      return (
        !!v &&
        [1, 2, 5].every((t) => {
          const val = F(-h + t);
          return F(a)
            .mul(val.add(h))
            .div(F(b).mul(val.add(h)))
            .eq(v);
        })
      );
    },
  };
}

export const simplify: Template = {
  id: "rat-expr.simplify",
  skill: SKILL,
  label: "Simplify a rational expression by factoring and cancelling",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format: Format): Draft {
    const part =
      format === "spr"
        ? constantValue(rng)
        : rng.pick([cancelFactor, cancelFactor, divideMonomial, constantValue])(rng);
    return { format, ...part };
  },
};

/* ---------------------------------------------------------------- add and subtract */

function powerDenominators(rng: Rng): Part {
  const x = rng.pick(VARS);
  const o = [x];
  const h = rng.nonzero(-12, 12);
  const a = rng.int(2, 9);
  const b = rng.nonzero(-9, 9);
  need(b - a * h !== 0 && b - h !== b - a * h && b !== a * h, "numerator");
  const L = MPoly.lin(1, -h, x);
  const Lt = L.tex(o);
  const sq = `(${Lt})^2`;
  const orig: Fn = (v) => a / L.eval(v) + b / L.eval(v) ** 2;
  const over = (top: MPoly, why: string) =>
    exprAns(m(frac(top.tex(o), sq)), (v) => top.eval(v) / L.eval(v) ** 2, why);
  const top = MPoly.lin(a, b - a * h, x);
  return {
    stem: `Which expression is equivalent to ${m(`${frac(String(a), Lt)} ${b < 0 ? "-" : "+"} ${frac(String(Math.abs(b)), sq)}`)}, where ${m(`${x} > ${h}`)}?`,
    answer: over(top, ""),
    slips: [
      exprAns(
        m(frac(num(a + b), sq)),
        (v) => (a + b) / L.eval(v) ** 2,
        `you added the numerators without first rewriting ${m(frac(String(a), Lt))} over ${m(sq)}`
      ),
      over(
        MPoly.lin(a, -a * h - b, x),
        b > 0
          ? `you subtracted ${n(b)} instead of adding it`
          : `you added ${n(-b)} instead of subtracting it`
      ),
      over(MPoly.lin(a, b - h, x), `you multiplied only the ${m(x)} by ${n(a)}, not the ${n(-h)}`),
      exprAns(
        m(frac(num(a + b), `(${Lt}) + ${sq}`)),
        (v) => (a + b) / (L.eval(v) + L.eval(v) ** 2),
        "you added the numerators and added the denominators"
      ),
    ],
    asks: `the two fractions combined into one`,
    steps: [
      {
        label: "Find the common denominator",
        work: `${m(sq)} is a multiple of ${m(Lt)}, so rewrite ${m(`${frac(String(a), Lt)} = ${frac(`${a}(${Lt})`, sq)}`)}`,
      },
      {
        label: "Add the numerators",
        work:
          m(`${a}(${Lt}) ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${top.tex(o)}`) +
          `, so the sum is ${m(frac(top.tex(o), sq))}`,
      },
    ],
    check: `With ${m(`${x} = ${h + 1}`)}, both denominators are $1$, so the original is ${m(`${a} ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${a + b}`)}; the answer's numerator is ${m(`${a}(1) ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${a + b}`)} over $1$ as well`,
    tip: "To add fractions, first rewrite them over a common denominator; only then add the numerators",
    hint: `Rewrite the first fraction so its denominator is ${m(sq)}.`,
    difficulty: b < 0 || h < 0 ? 5 : 4,
    isCorrect: equalTo(orig),
  };
}

function twoDenominators(rng: Rng): Part {
  const x = rng.pick(VARS);
  const o = [x];
  const p = rng.nonzero(-9, 9);
  const q = rng.nonzero(-9, 9);
  const a = rng.int(1, 9);
  const b = rng.int(1, 9);
  const s = rng.bool(0.5) ? 1 : -1;
  need(p !== q && a + s * b !== 0, "distinct");
  const P = MPoly.lin(1, p, x);
  const Q = MPoly.lin(1, q, x);
  const den = factored(1, [P, Q], o);
  const N = Q.scale(a).add(P.scale(s * b));
  const op = s > 0 ? "+" : "-";
  const orig: Fn = (v) => a / P.eval(v) + (s * b) / Q.eval(v);
  const over = (top: MPoly, why: string) =>
    exprAns(m(frac(top.tex(o), den)), (v) => top.eval(v) / (P.eval(v) * Q.eval(v)), why);
  const bound = Math.max(-p, -q);
  const slips = [
    exprAns(
      m(frac(num(a + s * b), MPoly.lin(2, p + q, x).tex(o))),
      (v) => (a + s * b) / (2 * v[x] + p + q),
      `you ${s > 0 ? "added" : "subtracted"} the numerators and added the denominators`
    ),
    exprAns(
      m(frac(num(a + s * b), den)),
      (v) => (a + s * b) / (P.eval(v) * Q.eval(v)),
      "you combined the numerators without multiplying each by the other denominator"
    ),
    over(
      P.scale(a).add(Q.scale(s * b)),
      "you multiplied each numerator by its own denominator instead of the other one"
    ),
  ];
  if (s < 0)
    slips.unshift(
      over(
        Q.scale(a)
          .sub(MPoly.v(x, b))
          .add(b * p),
        `you subtracted only the first term of ${m(`${b}(${P.tex(o)})`)}`
      )
    );
  return {
    stem: `Which expression is equivalent to ${m(`${frac(String(a), P.tex(o))} ${op} ${frac(String(b), Q.tex(o))}`)}, where ${m(`${x} > ${bound}`)}?`,
    answer: over(N, ""),
    slips,
    asks: "the two fractions combined over one denominator",
    steps: [
      { label: "Use the product of the denominators", work: `The common denominator is ${m(den)}` },
      {
        label: "Rewrite each fraction",
        work: m(`${frac(`${a}(${Q.tex(o)})`, den)} ${op} ${frac(`${b}(${P.tex(o)})`, den)}`),
      },
      {
        label: `${s > 0 ? "Add" : "Subtract"} the numerators`,
        work: `${m(`${a}(${Q.tex(o)}) ${op} ${b}(${P.tex(o)}) = ${N.tex(o)}`)}${s < 0 ? ", where the minus sign applies to both terms of the second product" : ""}`,
      },
    ],
    check: `With ${m(`${x} = ${bound + 1}`)}, the original is ${m(
      `${frac(String(a), num(P.at({ [x]: bound + 1 })))} ${op} ${frac(String(b), num(Q.at({ [x]: bound + 1 })))} = ${num(
        F(a)
          .div(P.at({ [x]: bound + 1 }))
          .add(F(s * b).div(Q.at({ [x]: bound + 1 })))
      )}`
    ).replace(/\\frac\{(\d+)\}\{1\}/g, "$1")}, and the answer gives the same value`,
    tip: "Multiply each numerator by the denominator it is missing, then combine the numerators",
    hint: `Use ${m(den)} as the common denominator.`,
    difficulty: s < 0 ? (p < 0 && q < 0 ? 5 : 4) : 3,
    isCorrect: equalTo(orig),
  };
}

function piForm(rng: Rng): Part {
  const usePi = rng.bool(0.5);
  const c = usePi ? Math.PI : rng.int(2, 9);
  const k = rng.int(2, 60);
  const ct = usePi ? "\\pi" : String(c);
  const c2 = usePi ? "\\pi^2" : String(c * c);
  const kc2 = usePi ? `${k}\\pi^2` : String(k * c * c);
  const kc = usePi ? `${k}\\pi` : String(k * c);
  const kcx = usePi ? `${k}\\pi x` : `${k * c}x`;
  const D1 = `${c2} - x^2`;
  const orig: Fn = (v) => (k * c * c) / (c * c - v.x ** 2) - (k * c) / (v.x + c);
  const over = (top: string, f: Fn, why: string) =>
    exprAns(m(frac(top, D1)), (v) => f(v) / (c * c - v.x ** 2), why);
  return {
    stem: `Which expression is equivalent to ${m(`${frac(kc2, D1)} - ${frac(kc, `x + ${ct}`)}`)}, where ${m(`x > ${ct}`)}?`,
    answer: over(kcx, (v) => k * c * v.x, ""),
    slips: [
      over(
        `-${kcx}`,
        (v) => -k * c * v.x,
        `you lost a sign: ${m(`-${kc}(${ct} - x) = -${kc2} + ${kcx}`)}`
      ),
      over(
        `${kc2} - ${kc}`,
        () => k * c * c - k * c,
        `you subtracted the numerators without first rewriting the second fraction over ${m(D1)}`
      ),
      over(
        usePi ? `${2 * k}\\pi^2 - ${kcx}` : `${2 * k * c * c} - ${kcx}`,
        (v) => 2 * k * c * c - k * c * v.x,
        "you added the second fraction instead of subtracting it"
      ),
      exprAns(
        m(frac(`${kc2} - ${kc}`, `${D1} - x - ${ct}`)),
        (v) => (k * c * c - k * c) / (c * c - v.x ** 2 - v.x - c),
        "you subtracted the numerators and subtracted the denominators"
      ),
    ],
    asks: "the difference of the two fractions as a single fraction",
    steps: [
      { label: "Factor the first denominator", work: m(`${D1} = (${ct} - x)(${ct} + x)`) },
      {
        label: "Rewrite the second fraction",
        work: `Multiply its top and bottom by ${m(`(${ct} - x)`)}: ${m(`${frac(kc, `x + ${ct}`)} = ${frac(`${kc}(${ct} - x)`, D1)}`)}`,
      },
      {
        label: "Subtract the numerators",
        work:
          m(`${kc2} - ${kc}(${ct} - x) = ${kc2} - ${kc2} + ${kcx} = ${kcx}`) +
          `, so the difference is ${m(frac(kcx, D1))}`,
      },
    ],
    check: `Over the common denominator the original top is ${m(`${kc2} - ${kc}(${ct} - x)`)}, which simplifies to ${m(kcx)}, the top of the answer`,
    tip: `Factor every denominator first; a difference of squares such as ${m("a^2 - x^2")} often contains the other denominator`,
    hint: `Factor ${m(D1)} and compare it with ${m(`x + ${ct}`)}.`,
    difficulty: usePi ? 7 : 6,
    isCorrect: equalTo(orig),
  };
}

export const addSubtract: Template = {
  id: "rat-expr.add-subtract",
  skill: SKILL,
  label: "Add or subtract fractions with variable denominators",
  difficulty: [3, 7],
  formats: ["mc"],
  make(rng, format: Format): Draft {
    const part = rng.pick([powerDenominators, twoDenominators, twoDenominators, piForm])(rng);
    return { format, ...part };
  },
};

export const TEMPLATES: Template[] = [simplify, addSubtract, SOLVE_FOR];
