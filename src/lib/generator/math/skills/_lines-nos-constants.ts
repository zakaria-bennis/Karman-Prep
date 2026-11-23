/*
 * m-number-of-solutions, part two: the constant that gives infinitely many solutions or none,
 * and the value a constant cannot take when the equation has exactly one solution. Each check
 * puts the candidate back into the equation as printed and counts its solutions (countLinear).
 */
import { need, numAnswer, Retry } from "../core/build";
import { F, Frac, gcd } from "../core/frac";
import type { Rng } from "../core/rng";
import { block, lin, m, n, num, signed, times } from "../core/tex";
import type { Draft, Slip, Step, Template } from "../core/types";
import {
  CONSTANTS,
  countLinear,
  fitsBox,
  gapCheck,
  isValue,
  moveTerm,
  slip,
  sterm,
  weighted,
  type Count,
  type Side,
} from "./_lines-shared";

const SKILL = "m-number-of-solutions";
const F1 = F(1);
const xt = `${m("x")}-terms`;

interface Case {
  tex: string;
  letters: string[];
  /** The letter or expression asked for. */
  target: string;
  want: Count;
  answer: Frac;
  slips: Slip[];
  steps: Step[];
  check: string;
  difficulty: number;
  test: (v: Frac) => boolean;
}

const INF_MEANS = {
  label: "Know what infinitely many means",
  work: `the equation is true for every ${m("x")} only when the two sides are the same expression`,
};
const NONE_MEANS = {
  label: "Know what no solution means",
  work: `a linear equation has no solution when the ${xt} cancel and a false statement is left`,
};

/** ax + b = ax + k: k = b. */
function infSimple(rng: Rng, L: string): Case {
  const a = F(rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 15, -3, -4, -5, -7]));
  const b = F(rng.nonzero(-40, 40));
  const standard = rng.bool(0.6);
  const right = standard ? `${lin([[a, "x"]])} + ${L}` : `${L} ${sterm(a, "x")}`;
  const left = lin([[a, "x"]], b);
  return {
    tex: `${left} = ${right}`,
    letters: [L],
    target: L,
    want: "inf",
    answer: b,
    slips: [
      slip(b.neg(), `you changed the sign of ${n(b)}, as if moving it across the equals sign`),
      slip(a, `you matched the ${m("x")}-coefficient instead of the constant`),
      slip(F(0), `you thought the constant must be ${m("0")} for every ${m("x")} to work`),
      slip(a.add(b), "you added the coefficient and the constant"),
    ],
    steps: [
      INF_MEANS,
      {
        label: "Match the constants",
        work: `the ${xt} already match, so the constants must match too: ${m(`${L} = ${num(b)}`)}`,
      },
    ],
    check: `with ${m(`${L} = ${num(b)}`)} both sides are ${m(left)}; at ${m("x = 1")} both equal ${n(a.add(b))} and at ${m("x = 2")} both equal ${n(a.mul(2).add(b))}`,
    difficulty: b.n > 0 && standard ? 1 : 2,
    test: (v) =>
      countLinear(
        (x) => a.mul(x).add(b),
        (x) => a.mul(x).add(v)
      ) === "inf",
  };
}

/** mx + n = k(x + d): k = m. */
function infBracket(rng: Rng, L: string): Case {
  const k = F(rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, -2, -3, -4, -6]));
  const d = F(rng.nonzero(-30, 30));
  need(Math.abs(d.n) >= 2, "d");
  const c = k.mul(d);
  need(Math.abs(c.n) <= 450, "constant too big");
  return {
    tex: `${lin([[k, "x"]], c)} = ${L}(${lin([[F1, "x"]], d)})`,
    letters: [L],
    target: L,
    want: "inf",
    answer: k,
    slips: [
      slip(d, "you used the number inside the parentheses"),
      slip(c, `you matched ${m(L)} with the constant term`),
      slip(k.neg(), `you lost the sign of the ${m("x")}-coefficient`),
      slip(k.add(d), "you added the coefficient and the number in the parentheses"),
    ],
    steps: [
      {
        label: "Distribute the right side",
        work: `${m(`${L}(${lin([[F1, "x"]], d)}) = ${L}x ${d.n < 0 ? "-" : "+"} ${num(d.abs())}${L}`)}`,
      },
      {
        label: `Match the ${m("x")}-coefficients`,
        work: `for the sides to be the same expression, ${m(`${L} = ${num(k)}`)}`,
      },
      {
        label: "Check the constants",
        work: `${m(`${times(d, k)} = ${num(c)}`)}, the constant on the left, so the sides are identical`,
      },
    ],
    check: `with ${m(`${L} = ${num(k)}`)}, at ${m("x = 0")} both sides equal ${n(c)} and at ${m("x = 1")} both equal ${n(k.add(c))}`,
    difficulty: k.n > 0 && d.n > 0 ? 3 : 4,
    test: (v) =>
      countLinear(
        (x) => k.mul(x).add(c),
        (x) => v.mul(x.add(d))
      ) === "inf",
  };
}

/** (ax + b)/c = (K/d)x + N: find KN (or K). */
function infFraction(rng: Rng): Case {
  const [K, N] = rng.pick([
    ["k", "n"],
    ["a", "b"],
    ["p", "q"],
    ["r", "s"],
  ]);
  const c = rng.int(2, 9);
  const t = rng.pick([2, 3]);
  const d = c * t;
  const a = rng.int(5, 45);
  need(gcd(a, c) === 1, "a/c must not be whole");
  const n0 = rng.nonzero(-9, 9);
  const b = c * n0;
  const [A, B, C, D] = [F(a), F(b), F(c), F(d)];
  const k = F(a * t);
  const askProduct = rng.bool(0.6);
  const left: Side = (x) => A.mul(x).add(B).div(C);
  const steps: Step[] = [
    {
      label: "Split the left side",
      work: `${m(`\\frac{${lin([[A, "x"]], B)}}{${c}} = \\frac{${a}}{${c}}x ${signed(n0)}`)}`,
    },
    {
      label: `Match the ${m("x")}-coefficients`,
      work: `${m(`\\frac{${K}}{${d}} = \\frac{${a}}{${c}}`)}, so ${m(`${K} = \\frac{${a}(${d})}{${c}} = ${num(k)}`)}`,
    },
    { label: "Match the constants", work: `${m(`${N} = ${num(n0)}`)}` },
  ];
  if (askProduct) {
    steps.push({
      label: `Find ${m(K + N)}`,
      work: `${m(`${K}${N} = ${times(k, n0)} = ${num(k.mul(n0))}`)}`,
    });
  }
  const fracMatch = `${m(`\\frac{${K}}{${d}}`)} must equal ${m(`\\frac{${a}}{${c}}`)}`;
  return {
    tex: `\\frac{${lin([[A, "x"]], B)}}{${c}} = \\frac{${K}}{${d}}x + ${N}`,
    letters: [K, N],
    target: askProduct ? `${K}${N}` : K,
    want: "inf",
    answer: askProduct ? k.mul(n0) : k,
    slips: askProduct
      ? [
          slip(A.mul(n0), `you set ${m(`${K} = ${a}`)}, but ${fracMatch}`),
          slip(k.mul(b), `you used ${m(`${N} = ${num(B)}`)} without dividing by ${n(C)}`),
          slip(A.mul(b), `you matched the numerators and did not divide ${n(B)} by ${n(C)}`),
          slip(k, `you found ${m(K)} and did not multiply by ${m(N)}`),
        ]
      : [
          slip(A, `you matched the numerators, but ${fracMatch}`),
          slip(A.mul(D), `you multiplied by ${n(D)} and forgot to divide by ${n(C)}`),
          slip(A.mul(C), `you multiplied by ${n(C)} instead of dividing by it`),
          slip(k.neg(), "you lost a sign"),
        ],
    steps,
    check: `with these values the right side is ${m(`\\frac{${num(k)}}{${d}}x ${signed(n0)} = \\frac{${a}}{${c}}x ${signed(n0)}`)}, the left side split up; at ${m(`x = ${c}`)} both sides equal ${n(A.add(n0))}`,
    difficulty: askProduct ? 5 : 4,
    test: (v) => {
      const s = left(F1)
        .sub(left(F(0)))
        .mul(D);
      return v.eq(askProduct ? s.mul(left(F(0))) : s);
    },
  };
}

/** (px + q + M)/r = K(x + s): find M. */
function infShifted(rng: Rng): Case {
  const [K, M] = rng.pick([
    ["k", "m"],
    ["a", "c"],
    ["p", "n"],
  ]);
  const k = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, -2, -3, -4, -5, -6, -8, -10]);
  const r = rng.int(2, 5);
  const s = rng.nonzero(-9, 9);
  const q = rng.nonzero(-60, 60);
  need(Math.abs(q) >= 10, "q");
  const [P, Q, R, S, Kf] = [F(k * r), F(q), F(r), F(s), F(k)];
  const mm = R.mul(k).mul(s).sub(Q);
  need(!mm.isZero(), "m is zero");
  const left =
    (v: Frac): Side =>
    (x) =>
      P.mul(x).add(Q).add(v).div(R);
  return {
    tex: `\\frac{${lin([[P, "x"]], Q)} + ${M}}{${r}} = ${K}(${lin([[F1, "x"]], S)})`,
    letters: [K, M],
    target: M,
    want: "inf",
    answer: mm,
    slips: [
      slip(Kf, `you found ${m(K)}, but the question asks for ${m(M)}`),
      slip(Kf.mul(s).sub(Q), `you forgot to multiply by ${n(R)}`),
      slip(R.mul(k).mul(s).add(Q), `you moved ${n(Q)} with the wrong sign`),
      slip(R.mul(s).sub(Q), `you used ${m(`${K} = 1`)}`),
    ],
    steps: [
      {
        label: `Match the ${m("x")}-coefficients`,
        work: `the left side has ${m(`\\frac{${k * r}}{${r}}x = ${lin([[Kf, "x"]])}`)}, so ${m(`${K} = ${k}`)}`,
      },
      {
        label: "Match the constants",
        work: `${m(`\\frac{${q} + ${M}}{${r}} = ${times(Kf, S)} = ${num(Kf.mul(s))}`)}`,
      },
      {
        label: `Solve for ${m(M)}`,
        work: `${m(`${q} + ${M} = ${num(R.mul(k).mul(s))}`)}, so ${m(`${M} = ${num(mm)}`)}`,
      },
    ],
    check: gapCheck(left(mm), (x) => Kf.mul(x.add(S)), "inf"),
    difficulty: 6,
    test: (v) => {
      const L = left(v);
      const kHat = L(F1).sub(L(F(0)));
      return countLinear(L, (x) => kHat.mul(x.add(S))) === "inf";
    },
  };
}

/** ax + b = Kx + c with b and c different: K = a. */
function noneSimple(rng: Rng, L: string): Case {
  const a = F(rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, -2, -3, -4, -5, -6, -8]));
  const b = F(rng.nonzero(-30, 30));
  const c = F(rng.nonzero(-30, 30));
  need(!b.eq(c), "constants match");
  return {
    tex: `${lin([[a, "x"]], b)} = ${lin([[F1, `${L}x`]], c)}`,
    letters: [L],
    target: L,
    want: "zero",
    answer: a,
    slips: [
      slip(
        a.neg(),
        `you made the ${m("x")}-coefficients opposites; terms cancel across an equals sign only when they are equal`
      ),
      slip(
        F(0),
        `with ${m(`${L} = 0`)} the equation is ${m(`${lin([[a, "x"]], b)} = ${num(c)}`)}, which still has one solution`
      ),
      slip(c, "you used the constant on the right side"),
      slip(c.sub(b), "you subtracted the constants"),
    ],
    steps: [
      NONE_MEANS,
      {
        label: `Match the ${m("x")}-coefficients`,
        work: `${m(`${L} = ${num(a)}`)}; then ${moveTerm(a, "x")} to get ${m(`${num(b)} = ${num(c)}`)}, which is false`,
      },
    ],
    check: gapCheck(
      (x) => a.mul(x).add(b),
      (x) => a.mul(x).add(c),
      "zero"
    ),
    difficulty: a.n > 0 ? 2 : 3,
    test: (v) =>
      countLinear(
        (x) => a.mul(x).add(b),
        (x) => v.mul(x).add(c)
      ) === "zero",
  };
}

/** ax + bKx = c: K = -a/b. */
function noneCollect(rng: Rng, L: string): Case {
  const a = F(rng.nonzero(-12, 12));
  const b = F(rng.nonzero(-24, 24));
  need(Math.abs(a.n) >= 2 && Math.abs(b.n) >= 2 && Math.abs(a.n) !== Math.abs(b.n), "coefs");
  const c = F(rng.nonzero(-120, 120));
  need(Math.abs(c.n) >= 10, "c");
  const k = a.neg().div(b);
  const sum = lin([
    [a, ""],
    [b, L],
  ]);
  const eqTex = lin([
    [a, "x"],
    [b, `${L}x`],
  ]);
  return {
    tex: `${eqTex} = ${num(c)}`,
    letters: [L],
    target: L,
    want: "zero",
    answer: k,
    slips: [
      slip(k.neg(), "you dropped the negative sign"),
      slip(k.inv(), "you divided the wrong way"),
      slip(c.div(b), `you divided the constant by ${n(b)}`),
      slip(
        F(0),
        `with ${m(`${L} = 0`)}, ${m(`${lin([[a, "x"]])} = ${num(c)}`)} still has one solution`
      ),
      slip(c.div(a), `you divided the constant by ${n(a)}`),
    ],
    steps: [
      { label: `Collect the ${xt}`, work: `${m(`${eqTex} = (${sum})x`)}` },
      {
        label: `Make the ${m("x")}-coefficient zero`,
        work: `no solution needs the equation to read ${m(`0 = ${num(c)}`)}, so ${m(`${sum} = 0`)} and ${m(`${L} = ${num(k)}`)}`,
      },
    ],
    check: `with ${m(`${L} = ${num(k)}`)} the ${xt} are ${m(lin([[a, "x"]]))} and ${m(`${times(b, k)}x = ${lin([[a.neg(), "x"]])}`)}, which cancel and leave ${m(`0 = ${num(c)}`)}, a false statement`,
    difficulty: k.isInt() ? 4 : 5,
    test: (v) =>
      countLinear(
        (x) => a.mul(x).add(b.mul(v).mul(x)),
        () => c
      ) === "zero",
  };
}

/** (pKx + q)/r = sx + t: K = sr/p. */
function noneFraction(rng: Rng, L: string): Case {
  const p = rng.int(2, 12);
  const r = rng.int(2, 9);
  const s = rng.nonzero(-9, 9);
  const q = rng.nonzero(-20, 20);
  const t = rng.nonzero(-12, 12);
  need(q !== r * t, "constants would match");
  const [P, Q, R, S, T] = [F(p), F(q), F(r), F(s), F(t)];
  const k = S.mul(R).div(P);
  return {
    tex: `\\frac{${lin([[P, `${L}x`]], Q)}}{${r}} = ${lin([[S, "x"]], T)}`,
    letters: [L],
    target: L,
    want: "zero",
    answer: k,
    slips: [
      slip(S.div(P), `you forgot that the whole left side is divided by ${n(R)}`),
      slip(k.inv(), "you divided the wrong way"),
      slip(k.neg(), "you lost a sign"),
      slip(S.mul(R), `you multiplied by ${n(R)} and did not divide by ${n(P)}`),
    ],
    steps: [
      {
        label: "Clear the fraction",
        work: `multiply both sides by ${n(R)}: ${m(`${lin([[P, `${L}x`]], Q)} = ${lin([[S.mul(R), "x"]], T.mul(R))}`)}`,
      },
      {
        label: `Match the ${m("x")}-coefficients`,
        work: `${m(`${p}${L} = ${num(S.mul(R))}`)}, so ${m(`${L} = ${num(k)}`)}`,
      },
      {
        label: "Confirm the constants differ",
        work: `${n(Q)} and ${n(T.mul(R))} are different, so a false statement is left: no solution`,
      },
    ],
    check: gapCheck(
      (x) => P.mul(k).mul(x).add(Q).div(R),
      (x) => S.mul(x).add(T),
      "zero"
    ),
    difficulty: k.isInt() ? 5 : 6,
    test: (v) =>
      countLinear(
        (x) => P.mul(v).mul(x).add(Q).div(R),
        (x) => S.mul(x).add(T)
      ) === "zero",
  };
}

const CASES: [number, (rng: Rng, L: string) => Case][] = [
  [1.2, infSimple],
  [1.3, infBracket],
  [1.2, (rng) => infFraction(rng)],
  [0.8, (rng) => infShifted(rng)],
  [1.2, noneSimple],
  [1.3, noneCollect],
  [1, noneFraction],
];

export const findConstant: Template = {
  id: "nos.find-constant",
  skill: SKILL,
  label: "Find the constant that gives infinitely many solutions or no solution",
  difficulty: [1, 6],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = weighted(rng, CASES)(rng, rng.pick(CONSTANTS));
    if (format === "spr" && !fitsBox(c.answer)) throw new Retry("answer does not fit the box");
    const consts =
      c.letters.length === 1
        ? `${m(c.letters[0])} is a constant`
        : `${m(c.letters[0])} and ${m(c.letters[1])} are constants`;
    const cond = c.want === "inf" ? "infinitely many solutions" : "no solution";
    return {
      format,
      stem: `${block(c.tex)}\nIn the given equation, ${consts}. The equation has ${cond}. What is the value of ${m(c.target)}?`,
      answer: numAnswer(c.answer, m(num(c.answer))),
      slips: c.slips,
      asks: `the value of ${m(c.target)} that makes the equation have ${cond}`,
      steps: c.steps,
      check: c.check,
      tip:
        c.want === "inf"
          ? `For infinitely many solutions, make the ${m("x")}-coefficients equal and the constants equal`
          : `For no solution, make the ${m("x")}-coefficients equal while the constants stay different`,
      hint:
        c.want === "inf"
          ? `What must be true of the two sides if every value of ${m("x")} works?`
          : `What has to happen to the ${xt} for no value of ${m("x")} to work?`,
      difficulty: c.difficulty,
      isCorrect: (cand) => isValue(cand, c.test),
    };
  },
};

// ------------------------------------------------------------------ the value it cannot be

interface Bar {
  tex: string;
  intro: string;
  answer: Frac;
  slips: Slip[];
  steps: Step[];
  difficulty: number;
  sides: (v: Frac) => [Side, Side];
}

/** L(p - x) = q - rx: L cannot be r. */
function barBracket(rng: Rng, L: string): Bar {
  const p = rng.int(2, 12);
  const r = rng.int(2, 12);
  need(p !== r, "p and r");
  const identity = rng.bool(0.6);
  const q = identity ? r * p : r * p + rng.pick([-5, -3, -2, 2, 3, 5]);
  const [P, Q, R] = [F(p), F(q), F(r)];
  return {
    tex: `${L}(${p} - x) = ${q} - ${r}x`,
    intro: `In the given equation, ${m(L)} is a constant. The equation has exactly one solution. Which of the following CANNOT be the value of ${m(L)}?`,
    answer: R,
    slips: [
      slip(P, "you used the number inside the parentheses"),
      slip(Q, "you used the constant on the right side"),
      slip(R.neg(), `you matched ${m(`-${L}`)} with ${n(R)} instead of with ${n(R.neg())}`),
      slip(F1, `you thought ${m(`${L} = 1`)} makes the sides match`),
    ],
    steps: [
      { label: "Distribute the left side", work: `${m(`${L}(${p} - x) = ${p}${L} - ${L}x`)}` },
      {
        label: `Find when the ${xt} cancel`,
        work: `the ${xt} are ${m(`-${L}x`)} and ${m(`-${r}x`)}, which cancel when ${m(`${L} = ${r}`)}`,
      },
      {
        label: "See what that value gives",
        work: `with ${m(`${L} = ${r}`)} the constants are ${n(R.mul(p))} and ${n(Q)}, so the equation has ${identity ? "infinitely many solutions" : "no solution"}, not exactly one. Every other value gives exactly one`,
      },
    ],
    difficulty: 6,
    sides: (v) => [(x) => v.mul(P.sub(x)), (x) => Q.sub(R.mul(x))],
  };
}

/** x(L - p) + q = sx + t, L a positive integer: L cannot be s + p. */
function barShift(rng: Rng, L: string): Bar {
  const p = rng.int(2, 15);
  const s = rng.int(2, 25);
  const q = rng.int(1, 20);
  const t = rng.int(1, 40);
  need(q !== t, "constants");
  const [P, Qf, S, T] = [F(p), F(q), F(s), F(t)];
  const ans = S.add(P);
  return {
    tex: `x(${L} - ${p}) + ${q} = ${s}x + ${t}`,
    intro: `In the given equation, ${m(L)} is a positive integer. If the equation has exactly one solution, what CANNOT be the value of ${m(L)}?`,
    answer: ans,
    slips: [
      slip(S, `you set ${m(L)} equal to ${n(S)} and forgot the ${m(`-${p}`)}`),
      ...(s - p > 0 ? [slip(S.sub(P), `you subtracted ${n(P)} instead of adding it`)] : []),
      slip(P, `you made ${m(`${L} - ${p}`)} zero`),
      slip(
        F(Math.abs(t - q)),
        `you worked with the constants instead of the ${m("x")}-coefficients`
      ),
    ],
    steps: [
      {
        label: `Find the left ${m("x")}-coefficient`,
        work: `${m(`x(${L} - ${p})`)} has coefficient ${m(`${L} - ${p}`)}`,
      },
      {
        label: `Find when the ${xt} cancel`,
        work: `${m(`${L} - ${p} = ${s}`)}, so ${m(`${L} = ${num(ans)}`)}`,
      },
      {
        label: "See what that value gives",
        work: `then the ${xt} cancel and leave ${m(`${q} = ${t}`)}, which is false: no solution, not exactly one`,
      },
    ],
    difficulty: 5,
    sides: (v) => [(x) => x.mul(v.sub(P)).add(Qf), (x) => S.mul(x).add(T)],
  };
}

/** Ax + B = L(Cx + D) + Ex: L cannot be (A - E)/C. */
function barSplit(rng: Rng, L: string): Bar {
  const C = rng.int(2, 9);
  const k0 = rng.pick([1, 1, 2, 3, -1, -2]);
  const E = rng.int(2, 12);
  const A = k0 * C + E;
  need(A >= 2 && A !== E, "A");
  const D = rng.int(1, 9);
  const identity = rng.bool(0.6);
  const B = identity ? k0 * D : k0 * D + rng.pick([-3, -2, 2, 3]);
  need(B !== 0, "B");
  const [Af, Bf, Cf, Df, Ef, K] = [F(A), F(B), F(C), F(D), F(E), F(k0)];
  const slips: Slip[] = [];
  if (A % C === 0) {
    slips.push(
      slip(F(A / C), `you divided ${n(Af)} by ${n(Cf)} without first moving ${m(`${E}x`)}`)
    );
  }
  if ((A + E) % C === 0) {
    slips.push(slip(F((A + E) / C), `you added ${m(`${E}x`)} instead of subtracting it`));
  }
  slips.push(
    slip(
      F(0),
      `with ${m(`${L} = 0`)} the equation is ${m(`${lin([[Af, "x"]], Bf)} = ${E}x`)}, which has one solution`
    ),
    slip(K.neg(), "you lost a sign"),
    slip(Cf, `you used the ${m("x")}-coefficient inside the parentheses`),
    slip(Ef, `you used the coefficient of the separate ${m("x")}-term`)
  );
  return {
    tex: `${lin([[Af, "x"]], Bf)} = ${L}(${lin([[Cf, "x"]], Df)}) ${sterm(Ef, "x")}`,
    intro: `In the given equation, ${m(L)} is a constant. The equation has exactly one solution. Which value CANNOT be the value of ${m(L)}?`,
    answer: K,
    slips,
    steps: [
      {
        label: "Expand the right side",
        work: `${m(`${L}(${lin([[Cf, "x"]], Df)}) ${sterm(Ef, "x")} = (${C}${L} + ${E})x + ${D}${L}`)}`,
      },
      {
        label: `Find when the ${xt} cancel`,
        work: `${m(`${C}${L} + ${E} = ${A}`)}, so ${m(`${L} = ${num(K)}`)}`,
      },
      {
        label: "See what that value gives",
        work: `then the constants are ${n(Bf)} and ${n(Df.mul(K))}, so the equation has ${identity ? "infinitely many solutions" : "no solution"}, not exactly one`,
      },
    ],
    difficulty: 7,
    sides: (v) => [(x) => Af.mul(x).add(Bf), (x) => v.mul(Cf.mul(x).add(Df)).add(Ef.mul(x))],
  };
}

export const cannotBe: Template = {
  id: "nos.cannot-be",
  skill: SKILL,
  label: "Exactly one solution: which value can the constant not take?",
  difficulty: [5, 7],
  formats: ["mc"],
  make(rng, format): Draft {
    const L = rng.pick(CONSTANTS);
    const bar = rng.pick([barBracket, barShift, barSplit])(rng, L);
    const [l0, r0] = bar.sides(bar.answer);
    return {
      format,
      stem: `${block(bar.tex)}\n${bar.intro}`,
      answer: numAnswer(bar.answer, m(num(bar.answer))),
      slips: bar.slips,
      asks: `the one value of ${m(L)} that stops the equation from having exactly one solution`,
      steps: bar.steps,
      check: gapCheck(l0, r0, countLinear(l0, r0)),
      tip: `A linear equation has exactly one solution unless its ${xt} cancel, so find the value that makes the ${m("x")}-coefficients equal`,
      hint: `Find the value of ${m(L)} that makes the ${xt} on the two sides match.`,
      difficulty: bar.difficulty,
      isCorrect: (cand) =>
        isValue(cand, (v) => {
          const [Ls, Rs] = bar.sides(v);
          return countLinear(Ls, Rs) !== "one";
        }),
    };
  },
};
