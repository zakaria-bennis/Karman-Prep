/*
 * m-number-of-solutions: when a linear equation has no solution, exactly one, or infinitely many.
 * Item models after the bank's own questions: counting the solutions of a given equation (plain,
 * with brackets, the traps that look like identities, an absolute value), finding the constant
 * that gives infinitely many or no solutions, and the value a constant cannot take. Every count is
 * checked again by measuring the gap between the two sides as printed (countLinear), never from
 * the coefficients the template chose.
 */
import { need } from "../core/build";
import { F } from "../core/frac";
import type { Rng } from "../core/rng";
import { block, lin, m, n, num } from "../core/tex";
import type { Draft, Step, Template } from "../core/types";
import { cannotBe, findConstant } from "./_lines-nos-constants";
import {
  COUNT_TEXT,
  countLinear,
  gapCheck,
  moveTerm,
  type Count,
  type Side,
  weighted,
} from "./_lines-shared";

const SKILL = "m-number-of-solutions";

const TWO_WHY =
  "a linear equation has no solution, exactly one or infinitely many, never exactly two";
const xt = `${m("x")}-terms`;

const DEFAULT_WHY: Record<Count, Partial<Record<Count, string>>> = {
  zero: {
    one: `you expected one solution, but the ${xt} cancel and leave a false statement`,
    inf: `the ${xt} match, but the constants do not, so the sides are never equal`,
    two: TWO_WHY,
  },
  inf: {
    zero: `the ${xt} cancel, but so do the constants, which leaves the true statement ${m("0 = 0")}`,
    one: `the two sides are the same expression, so every value of ${m("x")} works, not only one`,
    two: TWO_WHY,
  },
  one: {
    zero: `the ${xt} do not cancel, because their coefficients differ`,
    inf: `the two sides are not the same expression, so only one value of ${m("x")} balances them`,
    two: TWO_WHY,
  },
  two: {},
};

interface Form {
  tex: string;
  /** The count, found again from the equation as printed. */
  count: () => Count;
  steps: Step[];
  check: string;
  difficulty: number;
  whys?: Partial<Record<Count, string>>;
  abs?: boolean;
  brackets?: boolean;
}

const F1 = F(1);
const coefs = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, -2, -3, -4, -5, -6, -7, -8, -9];

/** A linear form: the sides as printed, and the check by testing x = 0 and x = 1. */
function linear(
  tex: string,
  L: Side,
  R: Side,
  steps: Step[],
  difficulty: number,
  whys?: Partial<Record<Count, string>>,
  brackets = false
): Form {
  const count = countLinear(L, R);
  return {
    tex,
    count: () => countLinear(L, R),
    steps,
    check: gapCheck(L, R, count),
    difficulty,
    whys,
    brackets,
  };
}

/** ax + b = ax + c: no solution. */
function sameSlope(rng: Rng): Form {
  const a = F(rng.pick(coefs));
  const b = F(rng.int(-30, 30));
  const c = F(rng.int(-30, 30));
  need(!b.eq(c), "constants match");
  const reorder = rng.bool(0.35);
  const right = reorder
    ? lin([
        [c, ""],
        [a, "x"],
      ])
    : lin([[a, "x"]], c);
  return linear(
    `${lin([[a, "x"]], b)} = ${right}`,
    (x) => a.mul(x).add(b),
    (x) => a.mul(x).add(c),
    [
      {
        label: `Collect the ${xt}`,
        work: `${moveTerm(a, "x")}: ${m(`${num(b)} = ${num(c)}`)}`,
      },
      {
        label: "Read what is left",
        work: `${m(`${num(b)} = ${num(c)}`)} is false for every value of ${m("x")}, so the equation has no solution`,
      },
    ],
    reorder || a.n < 0 ? 2 : 1
  );
}

/** ax + b = b + ax, or b - ax = -ax + b: infinitely many. */
function reordered(rng: Rng): Form {
  const a = F(rng.pick(coefs));
  const b = F(rng.nonzero(-30, 30));
  const flip = rng.bool(0.5);
  const left = flip
    ? lin([
        [b, ""],
        [a, "x"],
      ])
    : lin([[a, "x"]], b);
  const right = flip
    ? lin([[a, "x"]], b)
    : lin([
        [b, ""],
        [a, "x"],
      ]);
  return linear(
    `${left} = ${right}`,
    (x) => b.add(a.mul(x)),
    (x) => a.mul(x).add(b),
    [
      {
        label: "Compare the two sides",
        work: `${m(right)} is ${m(left)} written in a different order, so the two sides are the same expression`,
      },
      {
        label: "Read what is left",
        work: `subtract ${m(left)} from both sides to leave ${m("0 = 0")}, which is true for every ${m("x")}. The equation has infinitely many solutions`,
      },
    ],
    flip || a.n < 0 ? 2 : 1
  );
}

/** ax + b = cx + d with a and c different (c may be 0): exactly one. */
function oneSolution(rng: Rng): Form {
  const a = F(rng.pick(coefs));
  const c = rng.bool(0.35) ? F(0) : F(rng.pick(coefs));
  need(!a.eq(c), "same slope");
  const b = F(rng.nonzero(-25, 25));
  const d = F(rng.int(-30, 30));
  need(!b.eq(d), "constants");
  const k = a.sub(c);
  const X = d.sub(b).div(k);
  const steps: Step[] = [];
  if (!c.isZero()) {
    steps.push({
      label: `Collect the ${xt}`,
      work: `${moveTerm(c, "x")}: ${m(`${lin([[k, "x"]], b)} = ${num(d)}`)}`,
    });
  }
  steps.push({
    label: "Read the result",
    work: `the coefficient of ${m("x")} is ${n(k)}, not zero, so solving gives one value, ${m(`x = ${num(X)}`)}. The equation has exactly one solution`,
  });
  return linear(
    `${lin([[a, "x"]], b)} = ${lin([[c, "x"]], d)}`,
    (x) => a.mul(x).add(b),
    (x) => c.mul(x).add(d),
    steps,
    c.isZero() ? 1 : 2
  );
}

/** ax - b = b - ax: looks symmetric, has exactly one solution. */
function mirrored(rng: Rng): Form {
  const a = F(rng.int(2, 12));
  const b = F(rng.int(2, 30));
  const X = b.div(a);
  return linear(
    `${lin([[a, "x"]], b.neg())} = ${lin([
      [b, ""],
      [a.neg(), "x"],
    ])}`,
    (x) => a.mul(x).sub(b),
    (x) => b.sub(a.mul(x)),
    [
      {
        label: `Collect the ${xt}`,
        work: `add ${m(`${num(a)}x`)} to both sides: ${m(`${lin([[a.mul(2), "x"]], b.neg())} = ${num(b)}`)}`,
      },
      {
        label: `Solve for ${m("x")}`,
        work: `add ${n(b)} to both sides: ${m(`${num(a.mul(2))}x = ${num(b.mul(2))}`)}, so ${m(`x = ${num(X)}`)}. The equation has exactly one solution`,
      },
    ],
    3,
    {
      inf: `the two sides use the same numbers, but ${m(lin([[a, "x"]], b.neg()))} and ${m(
        lin([
          [b, ""],
          [a.neg(), "x"],
        ])
      )} are opposites, not the same expression`,
      zero: `the ${xt} are on opposite sides with opposite signs, so collecting them doubles them instead of canceling them`,
    }
  );
}

/** px = qx + rx: infinitely many when q + r = p, otherwise only x = 0. */
function combine(rng: Rng): Form {
  const p = rng.int(6, 20);
  const q = rng.int(2, p - 2);
  const inf = rng.bool(0.5);
  const r = inf ? p - q : p - q + rng.pick([-2, -1, 1, 2, 3]);
  need(r >= 2 && r !== q, "terms");
  const [P, Q, R] = [F(p), F(q), F(r)];
  const right = `${q}x + ${r}x`;
  const L: Side = (x) => P.mul(x);
  const Rs: Side = (x) => Q.mul(x).add(R.mul(x));
  if (inf) {
    return linear(
      `${p}x = ${right}`,
      L,
      Rs,
      [
        { label: "Combine like terms", work: `${m(`${right} = ${p}x`)}` },
        {
          label: "Read the result",
          work: `both sides are ${m(`${p}x`)}, so every value of ${m("x")} works. The equation has infinitely many solutions`,
        },
      ],
      3,
      {
        zero: `the ${xt} cancel, but what is left is ${m("0 = 0")}, which is true`,
        one: `${m("x = 0")} works, but so does every other value`,
      }
    );
  }
  const s = q + r;
  return linear(
    `${p}x = ${right}`,
    L,
    Rs,
    [
      {
        label: "Combine like terms",
        work: `${m(`${right} = ${s}x`)}, so the equation is ${m(`${p}x = ${s}x`)}`,
      },
      {
        label: `Solve for ${m("x")}`,
        work: `${moveTerm(F(s), "x")}: ${m(`${lin([[F(p - s), "x"]])} = 0`)}, so ${m("x = 0")}. The equation has exactly one solution`,
      },
    ],
    3,
    {
      zero: `${m("x = 0")} counts as a solution: it makes both sides ${m("0")}`,
      inf: `${m(right)} is ${m(`${s}x`)}, not ${m(`${p}x`)}`,
    }
  );
}

/** A(x + B) = C(D + Ex): an identity, or a near miss with no solution or one. */
function brackets(rng: Rng): Form {
  const C = F(rng.pick([2, 3, 4, 5, 6, 7, 8, 9, -2, -3, -4, -5]));
  const E = F(rng.int(2, 9));
  const A = C.mul(E);
  const B = F(rng.nonzero(-12, 12));
  const kind = rng.pick(["inf", "inf", "zero", "one"] as const);
  const D = kind === "zero" ? E.mul(B).add(rng.pick([-3, -2, -1, 1, 2, 3])) : E.mul(B);
  const E2 = kind === "one" ? E.add(rng.pick([-1, 1])) : E;
  need(!E2.isZero() && !E2.eq(1), "coefficient");
  const constFirst = rng.bool(0.5);
  const inner = constFirst
    ? lin([
        [D, ""],
        [E2, "x"],
      ])
    : lin([[E2, "x"]], D);
  const tex = `${num(A)}(${lin([[F1, "x"]], B)}) = ${num(C)}(${inner})`;
  const left = lin([[A, "x"]], A.mul(B));
  const right = lin([[C.mul(E2), "x"]], C.mul(D));
  const verdict =
    kind === "inf"
      ? "they are the same expression, so every value of $x$ works. The equation has infinitely many solutions"
      : kind === "zero"
        ? `the ${xt} match but the constants ${n(A.mul(B))} and ${n(C.mul(D))} do not, so a false statement is left. The equation has no solution`
        : `the ${m("x")}-coefficients ${n(A)} and ${n(C.mul(E2))} differ, so exactly one value of ${m("x")} balances the sides`;
  const difficulty = kind === "inf" ? Math.min(4, (constFirst ? 3 : 2) + (C.n < 0 ? 1 : 0)) : 4;
  return linear(
    tex,
    (x) => A.mul(x.add(B)),
    (x) => C.mul(D.add(E2.mul(x))),
    [
      {
        label: "Distribute on each side",
        work: `the left side is ${m(left)} and the right side is ${m(right)}`,
      },
      { label: "Compare the two sides", work: verdict },
    ],
    difficulty,
    kind === "zero"
      ? {
          inf: `you matched the ${xt} and did not compare the constants ${n(A.mul(B))} and ${n(C.mul(D))}`,
        }
      : kind === "one"
        ? {
            inf: `the constants match, but the ${m("x")}-coefficients ${n(A)} and ${n(C.mul(E2))} do not`,
          }
        : undefined,
    true
  );
}

/** p(x - q) = -q(x + p) or p(x + q) = q(x + p): the constants match, the x-terms do not. */
function constantsMatch(rng: Rng): Form {
  const p = rng.int(3, 20);
  const q = rng.int(3, 20);
  need(p !== q, "same numbers");
  const [P, Q] = [F(p), F(q)];
  const minus = rng.bool(0.5);
  const tex = minus ? `${p}(x - ${q}) = -${q}(x + ${p})` : `${p}(x + ${q}) = ${q}(x + ${p})`;
  const L: Side = (x) => P.mul(minus ? x.sub(Q) : x.add(Q));
  const R: Side = (x) => (minus ? Q.neg() : Q).mul(x.add(P));
  const k = minus ? p + q : p - q;
  const c = minus ? -p * q : p * q;
  const qx = minus ? -q : q;
  return linear(
    tex,
    L,
    R,
    [
      {
        label: "Distribute on each side",
        work: `the left side is ${m(lin([[P, "x"]], F(c)))} and the right side is ${m(lin([[F(qx), "x"]], F(c)))}`,
      },
      {
        label: `Collect the ${xt}`,
        work: `the constants are both ${n(c)}, so they cancel: ${m(`${lin([[F(k), "x"]])} = 0`)}`,
      },
      {
        label: "Read the result",
        work: `${m("x = 0")} is the only solution, so the equation has exactly one solution`,
      },
    ],
    5,
    {
      inf: `the constants match (${n(c)} on each side), but the ${xt} ${m(`${p}x`)} and ${m(lin([[F(qx), "x"]]))} do not`,
      zero: `the ${xt} do not cancel, and ${m("x = 0")} makes both sides equal`,
    },
    true
  );
}

/** |ax - b| = c: two solutions, one, or none. */
function absolute(rng: Rng): Form {
  const a = F(rng.int(2, 9));
  const b = F(rng.nonzero(-20, 20));
  const sign = rng.pick([-1, -1, 0, 1, 1, 1]);
  const c = F(sign === 0 ? 0 : sign * rng.int(1, 20));
  const inside = lin([[a, "x"]], b.neg());
  const tex = `\\left|${inside}\\right| = ${num(c)}`;
  const count = (): Count => {
    if (c.n < 0) return "zero";
    const roots = [b.add(c).div(a), b.sub(c).div(a)].filter((x) => a.mul(x).sub(b).abs().eq(c));
    return roots.length === 2 && !roots[0].eq(roots[1]) ? "two" : roots.length ? "one" : "zero";
  };
  const x1 = b.add(c).div(a);
  const x2 = b.sub(c).div(a);
  let steps: Step[];
  let check: string;
  let whys: Partial<Record<Count, string>>;
  if (c.n < 0) {
    steps = [
      {
        label: "Know what an absolute value can be",
        work: "an absolute value is a distance from zero, so it is never negative",
      },
      {
        label: "Compare with the right side",
        work: `the right side is ${n(c)}, so no value of ${m("x")} works. The equation has no solution`,
      },
    ];
    check = `every value gives at least ${m("0")}; for example ${m("x = 0")} gives ${m(`\\left|${num(b.neg())}\\right| = ${num(b.abs())}`)}, never ${n(c)}`;
    whys = {
      two: `you split it into ${m(`${inside} = ${num(c)}`)} and ${m(`${inside} = ${num(c.neg())}`)} without noticing that an absolute value is never negative`,
      one: `you solved ${m(`${inside} = ${num(c)}`)}, but that value does not check: its absolute value is ${n(c.neg())}`,
      inf: "no value of $x$ works here, let alone every value",
    };
  } else if (c.isZero()) {
    steps = [
      {
        label: "Set the inside to zero",
        work: `an absolute value is ${m("0")} only when the inside is ${m("0")}: ${m(`${inside} = 0`)}`,
      },
      {
        label: `Solve for ${m("x")}`,
        work: `${m(`x = ${num(x1)}`)}, one value. The equation has exactly one solution`,
      },
    ];
    check = `${m(`x = ${num(x1)}`)} makes the inside ${m("0")}, and any other value makes it nonzero, so its absolute value is positive`;
    whys = {
      two: `you split it into two cases, but when the right side is ${m("0")} both cases are the same equation, ${m(`${inside} = 0`)}`,
      zero: `an absolute value can equal ${m("0")}: it does when the inside is ${m("0")}`,
      inf: `only one value makes the inside ${m("0")}`,
    };
  } else {
    steps = [
      {
        label: "Split into two cases",
        work: `the inside is ${n(c)} or ${n(c.neg())}: ${m(`${inside} = ${num(c)}`)} or ${m(`${inside} = ${num(c.neg())}`)}`,
      },
      {
        label: "Solve each case",
        work: `${m(`x = ${num(x1)}`)} or ${m(`x = ${num(x2)}`)}, two different values. The equation has exactly two solutions`,
      },
    ];
    check = `${m(`x = ${num(x1)}`)} makes the inside ${n(c)} and ${m(`x = ${num(x2)}`)} makes it ${n(c.neg())}; both have absolute value ${n(c)}`;
    whys = {
      one: `you solved ${m(`${inside} = ${num(c)}`)} and forgot the case ${m(`${inside} = ${num(c.neg())}`)}`,
      zero: `the right side is positive, so both cases give real solutions`,
      inf: `only these two values make the inside ${n(c)} or ${n(c.neg())}`,
    };
  }
  return {
    tex,
    count,
    steps,
    check,
    difficulty: c.n > 0 ? 3 : 4,
    whys,
    abs: true,
  };
}

const FORMS: [number, (rng: Rng) => Form][] = [
  [3, sameSlope],
  [2, reordered],
  [2, oneSolution],
  [1.5, mirrored],
  [1.5, combine],
  [3, brackets],
  [1.2, constantsMatch],
  [1.2, absolute],
];

export const countSolutions: Template = {
  id: "nos.count",
  skill: SKILL,
  label: "How many solutions does a given equation have?",
  difficulty: [1, 5],
  formats: ["mc"],
  make(rng, format): Draft {
    const form = weighted(rng, FORMS)(rng);
    const answer = form.count();
    const stem = rng.bool(0.5)
      ? `How many solutions does the equation ${m(form.tex)} have?`
      : `${block(form.tex)}\nHow many solutions does the given equation have?`;
    const all: Count[] = ["zero", "one", "two", "inf"];
    return {
      format,
      stem,
      answer: { text: COUNT_TEXT[answer], key: answer },
      slips: all
        .filter((c) => c !== answer)
        .map((c) => ({
          text: COUNT_TEXT[c],
          key: c,
          why: form.whys?.[c] ?? DEFAULT_WHY[answer][c] ?? TWO_WHY,
        })),
      asks: `how many values of ${m("x")} make the given equation true`,
      steps: form.steps,
      check: form.check,
      tip: form.abs
        ? "An absolute value equal to a positive number gives two solutions, equal to 0 gives one, and equal to a negative number gives none"
        : `Rewrite the equation as ${m("px = q")}: if ${m("p \\ne 0")} there is one solution; if ${m("p = 0")} there is none when ${m("q \\ne 0")} and infinitely many when ${m("q = 0")}`,
      hint: form.abs
        ? "Think about which values an absolute value can take."
        : form.brackets
          ? "Distribute first, then compare the two sides term by term."
          : `Move every ${m("x")}-term to one side and see what is left.`,
      difficulty: form.difficulty,
      isCorrect: (cand) => cand.key !== undefined && cand.key === form.count(),
    };
  },
};

export const TEMPLATES: Template[] = [countSolutions, findConstant, cannotBe];
