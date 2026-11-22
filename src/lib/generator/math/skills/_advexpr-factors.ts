/*
 * m-expanding-and-factoring, continued (re-exported by expanding-and-factoring.ts): greatest
 * common factors, binomial factors of trinomials ("which is a factor", "I and II"), and the
 * typed "value of r" and "smallest b" questions. Factor checks divide the original expression.
 */
import { need, numAnswer } from "../core/build";
import { gcd } from "../core/frac";
import { m, n, num, pow, times } from "../core/tex";
import type { Answer, Draft, Format, Template } from "../core/types";
import type { Rng } from "../core/rng";
import {
  MPoly,
  type PolyAnswer,
  factored,
  numSlip,
  polyAns,
  rationalRoots,
  romanChoices,
  romanKey,
  sameExpr,
  valueOf,
  type RomanKey,
} from "./_advexpr-poly";
import { PAIRS, VARS1, primitive, rootOf, wrongBinomials } from "./_advexpr-common";

const SKILL = "m-expanding-and-factoring";
type Part = Omit<Draft, "format" | "isCorrect"> & { isCorrect: Draft["isCorrect"] };

const equivalentTo = (orig: (v: Readonly<Record<string, number>>) => number) => (c: Answer) =>
  !!c.expr && sameExpr(c.expr, orig);

const STEM_EQ = ["Which expression is equivalent to", "Which of the following is equivalent to"];

/* ---------------------------------------------------------------- factors */

function gcfFactor(rng: Rng): Part {
  const x = rng.pick(VARS1);
  const o = [x];
  const g = rng.int(2, 9);
  const a = rng.int(1, 9);
  const b = rng.nonzero(-12, 15);
  const c = rng.nonzero(-12, 15);
  need(gcd(gcd(a, Math.abs(b)), Math.abs(c)) === 1 && Math.abs(c) !== 1, "inner must be primitive");
  const inner = MPoly.uni([a, b, c], x);
  const P = inner.scale(g);
  const g2 = gcd(g * a, Math.abs(g * b));
  const slips: PolyAnswer[] = [
    polyAns(
      MPoly.v(x, g * a, 2),
      `you picked the first term; a factor must divide every term, and ${m(`${g * a}${x}^2`)} does not divide ${n(g * c)}`,
      o
    ),
    polyAns(
      MPoly.v(x, g * b),
      "you picked a term of the expression, but a factor must divide every term",
      o
    ),
    polyAns(
      MPoly.v(x, g),
      `you also took out ${x === "x" || x === "n" ? "an" : "a"} ${m(x)}, but the constant term ${n(g * c)} has no ${m(x)}`,
      o
    ),
  ];
  if (g2 !== g)
    slips.push(
      polyAns(
        MPoly.c(g2),
        "you found the greatest common factor of the first two coefficients only",
        o
      )
    );
  slips.push(
    polyAns(
      MPoly.c(Math.abs(g * c)),
      "you picked the constant term, which does not divide the other coefficients",
      o
    )
  );
  return {
    stem: `${rng.pick(["Which expression is a factor of", "Which of the following is a factor of"])} ${m(P.tex(o))}?`,
    answer: polyAns(MPoly.c(g), "", o),
    slips,
    asks: `an expression that divides every term of ${m(P.tex(o))}`,
    steps: [
      {
        label: "Find what the coefficients share",
        work: `The greatest common factor of ${n(g * a)}, ${n(g * b)}, and ${n(g * c)} is ${n(g)}`,
      },
      {
        label: "Check for a common variable",
        work: `The constant term has no ${m(x)}, so ${m(x)} is not a common factor`,
      },
      {
        label: "Factor it out",
        work: `${m(`${P.tex(o)} = ${g}(${inner.tex(o)})`)}, so ${n(g)} is a factor`,
      },
    ],
    check: `Multiply back: ${m(`${g}(${inner.tex(o)}) = ${P.tex(o)}`)}`,
    tip: "A factor of an expression must divide every one of its terms, so look for what all the terms share",
    hint: "Look for a number that divides every coefficient.",
    difficulty: b < 0 || c < 0 ? 2 : 1,
    isCorrect: (cand) => (cand as PolyAnswer).poly?.dividesOverZ(P) ?? false,
  };
}

function gcfEquivalent(rng: Rng): Part {
  if (rng.bool(0.4)) {
    const [t, u] = rng.pick(PAIRS);
    const o = [t, u];
    const g = rng.int(2, 9);
    const k = rng.int(1, 3);
    const a = rng.int(2, 60);
    const b = rng.nonzero(-40, 40);
    need(gcd(a, Math.abs(b)) === 1 && Math.abs(b) > 1, "primitive");
    const inner = MPoly.from([
      [a, { [t]: 1 }],
      [b, { [u]: 1 }],
    ]);
    const lead = MPoly.from([[g, { [t]: k }]]);
    const P = lead.mul(inner);
    const choice = (L: MPoly, I: MPoly, why: string) =>
      polyAns(L.mul(I), why, o, m(factored(L, [I], o)));
    return {
      stem: `${rng.pick(STEM_EQ)} ${m(P.tex(o))}?`,
      answer: choice(lead, inner, ""),
      slips: [
        choice(
          lead.mul(MPoly.v(u)),
          MPoly.from([
            [a, { [t]: 1 }],
            [b, {}],
          ]),
          `you included ${m(u)} in the common factor, but the first term has no ${m(u)}`
        ),
        polyAns(
          MPoly.from([[g, { [t]: k + 1 }]]).mul(
            MPoly.from([
              [a, {}],
              [b, { [u]: 1 }],
            ])
          ),
          `you took out ${m(pow(t, k + 1))}, more than the second term has`,
          o,
          m(
            `${MPoly.from([[g, { [t]: k + 1 }]]).tex(o)}(${a} ${b < 0 ? "-" : "+"} ${MPoly.v(u, Math.abs(b)).tex(o)})`
          )
        ),
        choice(
          MPoly.from([[1, { [t]: k }]]),
          inner,
          `you divided the coefficients by ${n(g)} but did not write ${n(g)} in front`
        ),
        choice(
          lead,
          MPoly.from([
            [a, { [t]: 1 }],
            [g * b, { [u]: 1 }],
          ]),
          `you did not divide the second coefficient by ${n(g)}`
        ),
      ],
      asks: `the expression with the greatest common factor of ${m(P.tex(o))} taken out`,
      steps: [
        {
          label: "Find the common number",
          work: `The greatest common factor of ${n(g * a)} and ${n(g * b)} is ${n(g)}`,
        },
        {
          label: "Find the common variables",
          work: `Both terms have at least ${m(pow(t, k))}; only the second term has ${m(u)}`,
        },
        { label: "Divide each term", work: `${m(`${P.tex(o)} = ${factored(lead, [inner], o)}`)}` },
      ],
      check: `Multiply back: ${m(`(${lead.tex(o)})(${a}${t}) = ${lead.mul(MPoly.v(t, a)).tex(o)}`)} and ${m(`(${lead.tex(o)})(${MPoly.v(u, b).tex(o)}) = ${lead.mul(MPoly.v(u, b)).tex(o)}`)}`,
      tip: "Take out the lowest power of each variable that appears in every term, and leave out a variable that some term lacks",
      hint: "Find the largest number and the highest power of each variable that divide both terms.",
      difficulty: k >= 3 || b < 0 ? 3 : 2,
      isCorrect: equivalentTo((v) => P.eval(v)),
    };
  }
  const x = rng.pick(VARS1);
  const o = [x];
  const g = rng.int(2, 9);
  const k = rng.int(1, 4);
  const a = rng.int(1, 9);
  const b = rng.nonzero(-12, 12);
  const c = rng.pick([1, 1, -1, rng.nonzero(-12, 12)]);
  need(gcd(gcd(a, Math.abs(b)), Math.abs(c)) === 1, "primitive");
  const lead = MPoly.v(x, g, k);
  const inner = MPoly.uni([a, b, c], x);
  const P = lead.mul(inner);
  const choice = (L: MPoly, I: MPoly, why: string) =>
    polyAns(L.mul(I), why, o, m(factored(L, [I], o)));
  const slips = [
    choice(lead, MPoly.uni([a, b, g * c], x), `you did not divide the last coefficient by ${n(g)}`),
    choice(
      MPoly.v(x, g, k + 1),
      MPoly.uni([a, b], x),
      `you took out ${m(pow(x, k + 1))} and dropped the term that has only ${m(pow(x, k))}`
    ),
    choice(
      MPoly.v(x, 1, k),
      inner,
      `you divided every coefficient by ${n(g)} but did not write ${n(g)} in front`
    ),
  ];
  if (Math.abs(c) === 1)
    slips.unshift(
      choice(
        lead,
        MPoly.uni([a, b, 0], x),
        `you dropped the ${n(c)} left when ${m(lead.scale(c).tex(o))} is divided by ${m(lead.tex(o))}`
      )
    );
  if (b < 0)
    slips.push(
      choice(lead, MPoly.uni([a, -b, c], x), "you dropped the negative sign of the middle term")
    );
  return {
    stem: `${rng.pick(STEM_EQ)} ${m(P.tex(o))}?`,
    answer: choice(lead, inner, ""),
    slips,
    asks: `the expression with the greatest common factor of ${m(P.tex(o))} taken out`,
    steps: [
      {
        label: "Find the common number",
        work: `The greatest common factor of the coefficients is ${n(g)}`,
      },
      {
        label: "Find the common power",
        work: `The lowest power of ${m(x)} in the terms is ${m(pow(x, k))}, so ${m(lead.tex(o))} divides every term`,
      },
      { label: "Divide each term", work: m(`${P.tex(o)} = ${factored(lead, [inner], o)}`) },
    ],
    check: `Multiply ${m(lead.tex(o))} by each term of ${m(inner.tex(o))} to get back ${m(P.tex(o))}`,
    tip: "Take out the greatest common number and the lowest power of the variable, then divide every term, including any term that leaves 1",
    hint: "Find the largest number and the highest power of the variable that divide every term.",
    difficulty: Math.abs(c) === 1 || k >= 3 ? 3 : 2,
    isCorrect: equivalentTo((v) => P.eval(v)),
  };
}

function factorBinomial(rng: Rng, asRoman: boolean): Part {
  const x = rng.pick(VARS1);
  const o = [x];
  const p = rng.pick([1, 1, 2, 3, 4, 5]);
  const r = rng.pick([1, 2, 3, 4, 5, 6]);
  const q = rng.nonzero(-12, 12);
  const s = rng.nonzero(-12, 12);
  need(primitive(p, q) && primitive(r, s) && p * s + q * r !== 0, "primitive factors");
  need(p * s !== q * r, "repeated factor");
  const f1 = MPoly.lin(p, q, x);
  const f2 = MPoly.lin(r, s, x);
  const P = f1.mul(f2);
  const PT = P.tex(o);
  const split = `${MPoly.v(x, p * r, 2).tex(o)} ${p * s < 0 ? "-" : "+"} ${MPoly.v(x, Math.abs(p * s)).tex(o)} ${q * r < 0 ? "-" : "+"} ${MPoly.v(x, Math.abs(q * r)).tex(o)} ${q * s < 0 ? "-" : "+"} ${Math.abs(q * s)}`;
  const steps = [
    {
      label: "Split the middle term",
      work: `Find two numbers with product ${m(`${times(p * r, q * s)} = ${num(p * r * q * s)}`)} and sum ${n(p * s + q * r)}: ${n(p * s)} and ${n(q * r)}. So ${m(`${PT} = ${split}`)}`,
    },
    {
      label: "Factor each pair",
      work: m(
        `${MPoly.v(x, p).tex(o)}(${f2.tex(o)}) ${q < 0 ? "-" : "+"} ${Math.abs(q) === 1 ? "" : Math.abs(q)}(${f2.tex(o)})`
      ),
    },
    { label: "Take out the common bracket", work: m(`${PT} = ${factored(1, [f1, f2], o)}`) },
  ];
  const wrong = wrongBinomials(
    P,
    [
      [p, q],
      [r, s],
    ],
    x
  );
  if (!asRoman) {
    const pickFirst = rng.bool(0.5);
    const [A, B] = pickFirst
      ? [
          [p, q],
          [r, s],
        ]
      : [
          [r, s],
          [p, q],
        ];
    const fa = MPoly.lin(A[0], A[1], x);
    const root = rootOf(A[0], A[1]);
    return {
      stem: `${rng.pick(["Which expression is a factor of", "Which of the following is a factor of"])} ${m(PT)}?`,
      answer: polyAns(fa, "", o),
      slips: rng.shuffle(wrong.filter((w) => !w.poly!.eq(MPoly.lin(B[0], B[1], x)))),
      asks: `a binomial that divides ${m(PT)} with no remainder`,
      steps,
      check: `At ${m(`${x} = ${num(root)}`)}, where ${m(fa.tex(o))} is zero, ${m(PT)} equals $0$, so ${m(fa.tex(o))} is a factor`,
      tip: `${m(`a${x} + b`)} is a factor of a polynomial exactly when the polynomial is $0$ at ${m(`${x} = -\\frac{b}{a}`)}`,
      hint: "Factor the trinomial into two binomials, or test where each choice is zero.",
      difficulty: p === 1 && r === 1 ? 3 : 4,
      isCorrect: (cand) => (cand as PolyAnswer).poly?.dividesOverZ(P) ?? false,
    };
  }
  // Two statements: each a true factor or a slip (a flipped sign or swapped numbers).
  const want = rng.pick<RomanKey>(["i", "ii", "both", "neither", "i", "ii"]);
  const trueOnes = rng.shuffle([f1, f2]);
  const falseOnes = rng.shuffle(wrong.map((w) => w.poly!));
  need(falseOnes.length >= 2, "not enough slips");
  const one = want === "i" || want === "both" ? trueOnes[0] : falseOnes[0];
  const two = want === "ii" || want === "both" ? trueOnes[1] : falseOnes[1];
  const st = [one, two];
  const zeroAt = (b: MPoly) =>
    b
      .coef({})
      .neg()
      .div(b.coef({ [x]: 1 }));
  const truthOf = (b: MPoly) => P.at({ [x]: zeroAt(b) }).isZero();
  const right = romanKey(truthOf(one), truthOf(two));
  const names = ["I", "II"];
  const { answer, slips } = romanChoices(right, (k) => {
    const claim = [k === "i" || k === "both", k === "ii" || k === "both"];
    return st
      .map((b, j) => {
        if (claim[j] === truthOf(b)) return "";
        const r0 = zeroAt(b);
        return claim[j]
          ? `you accepted ${names[j]}, but at ${m(`${x} = ${num(r0)}`)} the expression is ${m(num(P.at({ [x]: r0 })))}, not $0$`
          : `you rejected ${names[j]}, but the expression is $0$ at ${m(`${x} = ${num(r0)}`)}`;
      })
      .filter(Boolean)
      .join(", and ");
  });
  return {
    stem: `Which of the following expressions is a factor of ${m(PT)}?\n\nI. ${m(one.tex(o))}\nII. ${m(two.tex(o))}`,
    answer,
    slips,
    asks: `which of the two binomials divide ${m(PT)} with no remainder`,
    steps: [
      ...steps.slice(0, 1),
      { label: "Factor completely", work: m(`${PT} = ${factored(1, [f1, f2], o)}`) },
      {
        label: "Compare with the statements",
        work: `I is ${truthOf(one) ? "" : "not "}one of these factors, and II is ${truthOf(two) ? "" : "not "}one of them`,
      },
    ],
    check: `Put each binomial's zero into the trinomial: at ${m(`${x} = ${num(zeroAt(one))}`)} it is ${m(num(P.at({ [x]: zeroAt(one) })))}, and at ${m(`${x} = ${num(zeroAt(two))}`)} it is ${m(num(P.at({ [x]: zeroAt(two) })))}`,
    tip: `A binomial is a factor exactly when the polynomial is $0$ where the binomial is $0$`,
    hint: "Factor the trinomial into two binomials, then compare.",
    difficulty: p > 1 && r > 1 ? 6 : 5,
    isCorrect: (cand) => cand.key === right,
  };
}

function gcfValue(rng: Rng): Part {
  const x = rng.pick(VARS1);
  const o = [x];
  const r = rng.int(2, 9);
  const h = rng.int(2, 4);
  const k = rng.int(2, 6);
  const a = rng.int(1, 9);
  const b = rng.nonzero(-9, 9);
  need(gcd(a, Math.abs(b)) === 1, "primitive");
  const g = r * h;
  const P = MPoly.v(x, g, k).mul(MPoly.lin(a, b, x));
  const bracket = MPoly.lin(h * a, h * b, x);
  const shown = `r${x}^{${k}}(${bracket.tex(o)})`;
  return {
    stem: `The expression ${m(P.tex(o))} is equivalent to ${m(shown)}, where ${m("r")} is a constant. What is the value of ${m("r")}?`,
    answer: numAnswer(r, m(num(r))),
    slips: [
      numSlip(
        g,
        `you used the greatest common factor ${n(g)}, but the bracket ${m(`(${bracket.tex(o)})`)} still holds a factor of ${n(h)}`
      ),
      numSlip(h, "you gave the number left inside the bracket, not the one in front"),
      numSlip(g * h, `you multiplied by ${n(h)} instead of dividing`),
    ],
    asks: `the number ${m("r")} that makes ${m(shown)} equal to ${m(P.tex(o))}`,
    steps: [
      {
        label: "Match the leading terms",
        work: `${m(`r${x}^{${k}} \\cdot ${h * a}${x} = ${h * a}r${x}^{${k + 1}}`)} must equal ${m(MPoly.v(x, g * a, k + 1).tex(o))}`,
      },
      { label: `Solve for ${m("r")}`, work: m(`${h * a}r = ${g * a}`) + `, so ${m(`r = ${r}`)}` },
    ],
    check: `The other term matches too: ${m(`${r}${x}^{${k}} \\cdot ${num(h * b)} = ${MPoly.v(x, r * h * b, k).tex(o)}`)}`,
    tip: "When a bracket in the target form is not fully factored, match one term of each side instead of taking out the greatest common factor",
    hint: "Multiply the target form out and match the first terms.",
    difficulty: 3,
    isCorrect: (cand) => {
      const v = valueOf(cand);
      return (
        !!v &&
        sameExpr(
          (pt) => v.toNumber() * pt[x] ** k * bracket.eval(pt),
          (pt) => P.eval(pt)
        )
      );
    },
  };
}

function smallestB(rng: Rng): Part {
  const x = rng.pick(VARS1);
  const o = [x];
  const k = rng.int(2, 4);
  const mm = rng.int(1, 12);
  const nn = rng.int(2, 15);
  need(mm < nn, "order");
  const P = MPoly.v(x, k)
    .mul(MPoly.lin(1, mm, x))
    .mul(MPoly.lin(1, nn, x));
  const least = rng.bool(0.65);
  const value = least ? mm : nn;
  return {
    stem: `One of the factors of ${m(P.tex(o))} is ${m(`${x} + b`)}, where ${m("b")} is a positive constant. What is the ${least ? "smallest" : "greatest"} possible value of ${m("b")}?`,
    answer: numAnswer(value, m(num(value))),
    slips: [
      numSlip(
        least ? nn : mm,
        `you found the ${least ? "greatest" : "smallest"} value, not the ${least ? "smallest" : "greatest"}`
      ),
      numSlip(k, `you gave the common factor ${n(k)}, which is a number, not a binomial`),
      numSlip(
        mm + nn,
        `you used the sum ${m(`${mm} + ${nn}`)}, which is a coefficient, not a factor`
      ),
    ],
    asks: `the ${least ? "smaller" : "larger"} positive ${m("b")} for which ${m(`${x} + b`)} divides ${m(P.tex(o))}`,
    steps: [
      {
        label: "Take out the common factor",
        work: m(`${P.tex(o)} = ${k}${x}(${P.divmod(MPoly.v(x, k)).q.tex(o)})`),
      },
      {
        label: "Factor the trinomial",
        work: `Two numbers with product ${n(mm * nn)} and sum ${n(mm + nn)} are ${n(mm)} and ${n(nn)}: ${m(`${P.tex(o)} = ${k}${x}(${x} + ${mm})(${x} + ${nn})`)}`,
      },
      {
        label: "Read the possible values",
        work: `${m("b")} can be ${n(mm)} or ${n(nn)}, so the ${least ? "smallest" : "greatest"} is ${n(value)}`,
      },
    ],
    check: `At ${m(`${x} = -${value}`)}, the bracket ${m(`${x} + ${value}`)} is zero and ${m(P.tex(o))} equals $0$, as a factor requires`,
    tip: "Take out the greatest common factor first; the trinomial left over is much easier to factor",
    hint: "Start by factoring out what every term shares.",
    difficulty: k >= 3 ? 5 : 4,
    isCorrect: (cand) => {
      const v = valueOf(cand);
      if (!v || v.sign() <= 0 || !P.at({ [x]: v.neg() }).isZero()) return false;
      const bs = rationalRoots(P, x)
        .map((t) => t.neg())
        .filter((t) => t.sign() > 0);
      return bs.every((t) => (least ? t.cmp(v) >= 0 : t.cmp(v) <= 0));
    },
  };
}

export const factor: Template = {
  id: "exp-fac.factor",
  skill: SKILL,
  label: "Find a factor: greatest common factor, a binomial factor, or I and II",
  difficulty: [1, 6],
  formats: ["mc", "spr"],
  make(rng, format: Format): Draft {
    let part: Part;
    if (format === "spr") part = rng.bool(0.5) ? gcfValue(rng) : smallestB(rng);
    else {
      const v = rng.pick(["gcf", "gcfEq", "gcfEq", "bin", "bin", "roman", "roman"]);
      part =
        v === "gcf"
          ? gcfFactor(rng)
          : v === "gcfEq"
            ? gcfEquivalent(rng)
            : factorBinomial(rng, v === "roman");
    }
    return { format, ...part };
  },
};
