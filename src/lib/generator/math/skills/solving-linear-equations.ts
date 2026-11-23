/*
 * m-solving-linear-equations: one variable, including fractions and brackets. Item models
 * after the bank's own questions for this skill (two-step equations, variables on both sides,
 * brackets, fractions, "what is the value of 2x - 5", and solving for a repeated chunk).
 * Every equation is built backward from a chosen solution, and the check substitutes each
 * candidate into the original equation.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { Sym } from "../core/sym";
import { block, lin, m, n, num, signed, times } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";

const SKILL = "m-solving-linear-equations";

/** A candidate's rational value, or null when it is not a number. */
const valueOf = (a: Answer): Frac | null => a.value?.asRat() ?? null;

function slip(value: Frac, why: string): Slip {
  return { text: m(num(value)), value: Sym.rat(value), why };
}

/** "Subtract 7 from both sides" or "Add 7 to both sides", for removing +b. */
function undoAdd(b: Frac): string {
  return b.n >= 0 ? `Subtract ${num(b)} from both sides` : `Add ${num(b.neg())} to both sides`;
}

const mm = (latex: string) => m(latex);

export const twoStep: Template = {
  id: "lin-eq.two-step",
  skill: SKILL,
  label: "Solve ax + b = c",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const a = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, -2, -3, -4, -5]);
    const x = rng.nonzero(-12, 15);
    const b = rng.nonzero(-20, 25);
    const c = a * x + b;
    const A = F(a);
    const B = F(b);
    const C = F(c);
    const X = F(x);
    need(c !== 0 && c !== b, "trivial constants");
    const eq = `${lin([[A, "x"]], B)} = ${num(C)}`;
    const difficulty = a < 0 || x < 0 ? 2 : 1;
    const plain = rng.bool(0.5);
    const stem = plain
      ? `${block(eq)}\nWhat value of ${mm("x")} is the solution to the given equation?`
      : `If ${mm(eq)}, what is the value of ${mm("x")}?`;
    const sat = (v: Frac) => A.mul(v).add(B).eq(C);
    return {
      format,
      stem,
      answer: numAnswer(X, mm(num(X))),
      slips: [
        slip(
          C.add(B).div(A),
          B.n >= 0
            ? `you added ${num(B)} to both sides instead of subtracting it`
            : `you subtracted ${num(B.neg())} from both sides instead of adding it`
        ),
        slip(
          C.sub(B),
          `you stopped at ${mm(`${num(A)}x = ${num(C.sub(B))}`)} without dividing by ${n(A)}`
        ),
        slip(C.sub(B).mul(A), `you multiplied by ${n(A)} instead of dividing`),
        slip(C.div(A).sub(B), `you divided by ${n(A)} before moving the ${n(B.abs())}`),
        slip(X.neg(), "you lost a negative sign along the way"),
      ],
      asks: `the value of ${mm("x")} that makes ${mm(eq)} true`,
      steps: [
        {
          label: `Get the ${mm("x")}-term alone`,
          work: `${undoAdd(B)}, so ${mm(`${num(A)}x = ${num(C.sub(B))}`)}`,
        },
        {
          label: `Find ${mm("x")}`,
          work: `Divide both sides by ${n(A)}, because ${mm("x")} is multiplied by ${n(A)}: ${mm(`x = ${num(X)}`)}`,
        },
      ],
      check: `${mm(`${times(A, X)} ${signed(B)} = ${num(A.mul(X))} ${signed(B)} = ${num(C)}`)}, which matches the right side`,
      tip: `Undo the operations in reverse order: first the number added to the ${mm("x")}-term, then the number multiplying ${mm("x")}`,
      hint: `Start by getting ${mm(`${num(A)}x`)} by itself on one side.`,
      difficulty: format === "spr" ? Math.min(3, difficulty + 1) : difficulty,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && sat(v);
      },
    };
  },
};

export const bothSides: Template = {
  id: "lin-eq.both-sides",
  skill: SKILL,
  label: "Solve ax + b = cx + d",
  difficulty: [2, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const a = rng.nonzero(-9, 12);
    const c = rng.nonzero(-9, 12);
    need(a !== c && a !== -c, "x-terms cancel or mirror");
    const x = rng.nonzero(-10, 12);
    const b = rng.nonzero(-25, 25);
    const d = a * x + b - c * x;
    need(d !== 0 && d !== b, "constants");
    const [A, B, C, D, X] = [F(a), F(b), F(c), F(d), F(x)];
    const left = lin([[A, "x"]], B);
    const right = lin([[C, "x"]], D);
    const eq = `${left} = ${right}`;
    const k = A.sub(C);
    const rhs = D.sub(B);
    const sat = (v: Frac) => A.mul(v).add(B).eq(C.mul(v).add(D));
    const difficulty = (a < 0 || c < 0 ? 1 : 0) + (x < 0 ? 1 : 0) + 2;
    const stem = rng.bool(0.5)
      ? `${block(eq)}\nWhat is the solution to the given equation?`
      : `What value of ${mm("x")} satisfies the equation ${mm(eq)}?`;
    return {
      format,
      stem,
      answer: numAnswer(X, mm(num(X))),
      slips: [
        ...(A.add(C).isZero()
          ? []
          : [
              slip(
                rhs.div(A.add(C)),
                `you added the ${mm("x")}-terms instead of subtracting ${mm(lin([[C, "x"]]))} from both sides`
              ),
            ]),
        slip(
          D.add(B).div(k),
          `you moved ${mm(num(B))} to the right side without changing its sign`
        ),
        slip(X.neg(), "you subtracted the sides in opposite orders, which flips the sign"),
        slip(rhs.div(A), `you left ${mm(lin([[C, "x"]]))} on the right side when you divided`),
        slip(rhs, `you stopped at ${mm(`${lin([[k, "x"]])} = ${num(rhs)}`)} without dividing`),
      ],
      asks: `the value of ${mm("x")} that makes both sides of ${mm(eq)} equal`,
      steps: [
        {
          label: `Collect the ${mm("x")}-terms on one side`,
          work: `${C.n >= 0 ? `Subtract ${mm(lin([[C, "x"]]))} from` : `Add ${mm(lin([[C.neg(), "x"]]))} to`} both sides: ${mm(`${lin([[k, "x"]], B)} = ${num(D)}`)}`,
        },
        {
          label: "Move the constant",
          work: `${undoAdd(B)}: ${mm(`${lin([[k, "x"]])} = ${num(rhs)}`)}`,
        },
        {
          label: `Find ${mm("x")}`,
          work: k.eq(1)
            ? `The equation already reads ${mm(`x = ${num(X)}`)}`
            : `Divide both sides by ${n(k)}: ${mm(`x = ${num(X)}`)}`,
        },
      ],
      check: `The left side is ${mm(`${times(A, X)} ${signed(B)} = ${num(A.mul(X).add(B))}`)} and the right side is ${mm(`${times(C, X)} ${signed(D)} = ${num(C.mul(X).add(D))}`)}. They match`,
      tip: `Move every ${mm("x")}-term to one side and every number to the other, changing the sign of whatever crosses the equals sign`,
      hint: `Get all the ${mm("x")}-terms on the same side first.`,
      difficulty: Math.min(4, difficulty + (format === "spr" ? 1 : 0)),
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && sat(v);
      },
    };
  },
};

export const brackets: Template = {
  id: "lin-eq.brackets",
  skill: SKILL,
  label: "Solve a(x + b) + c = d",
  difficulty: [3, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const a = rng.pick([2, 3, 4, 5, 6, -2, -3, -4]);
    const b = rng.nonzero(-9, 9);
    const c = rng.nonzero(-15, 15);
    const x = rng.nonzero(-9, 12);
    const d = a * (x + b) + c;
    need(d !== 0, "zero right side");
    const [A, B, Cc, D, X] = [F(a), F(b), F(c), F(d), F(x)];
    const inside = lin([[1, "x"]], B);
    const eq = `${num(A)}(${inside}) ${signed(Cc)} = ${num(D)}`;
    const expanded = lin([[A, "x"]], A.mul(B).add(Cc));
    const sat = (v: Frac) => A.mul(v.add(B)).add(Cc).eq(D);
    const stem = `${block(eq)}\nWhat value of ${mm("x")} is the solution to the given equation?`;
    return {
      format,
      stem,
      answer: numAnswer(X, mm(num(X))),
      slips: [
        slip(
          D.sub(Cc).sub(B).div(A),
          `you multiplied only the ${mm("x")} by ${n(A)}, not the ${n(B)} inside the brackets`
        ),
        slip(D.sub(Cc).div(A).add(B), `you undid the ${mm(num(B))} with the wrong sign`),
        slip(D.add(Cc).div(A).sub(B), `you moved ${mm(num(Cc))} without changing its sign`),
        slip(X.neg(), "you lost a negative sign while distributing"),
        slip(D.sub(Cc).div(A), `you found ${mm(inside)} and forgot to solve for ${mm("x")}`),
      ],
      asks: `the value of ${mm("x")} that makes ${mm(eq)} true`,
      steps: [
        {
          label: "Clear the brackets",
          work: `Multiply ${n(A)} by each term inside: ${mm(`${lin([[A, "x"]], A.mul(B))} ${signed(Cc)} = ${num(D)}`)}, which is ${mm(`${expanded} = ${num(D)}`)}`,
        },
        {
          label: `Get the ${mm("x")}-term alone`,
          work: `${undoAdd(A.mul(B).add(Cc))}: ${mm(`${num(A)}x = ${num(D.sub(A.mul(B)).sub(Cc))}`)}`,
        },
        {
          label: `Find ${mm("x")}`,
          work: `Divide both sides by ${n(A)}: ${mm(`x = ${num(X)}`)}`,
        },
      ],
      check: `${mm(`${num(A)}(${num(X)} ${signed(B)}) ${signed(Cc)} = ${times(A, X.add(B))} ${signed(Cc)} = ${num(D)}`)}, which matches`,
      tip: "When a number multiplies brackets, it multiplies every term inside, not only the first one",
      hint: `Distribute the ${n(A)} to both terms inside the brackets first.`,
      difficulty: format === "spr" || a < 0 ? 4 : 3,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && sat(v);
      },
    };
  },
};

export const expressionValue: Template = {
  id: "lin-eq.expression-value",
  skill: SKILL,
  label: "Given ax + b = c, find the value of kx + m",
  difficulty: [2, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const a = rng.pick([1, 1, 2, 3, 4, 5]);
    const x = rng.nonzero(-9, 9);
    const b = rng.nonzero(-12, 12);
    const c = a * x + b;
    const k = rng.pick([2, 3, 4, 5, -2, -3]);
    const mm0 = rng.nonzero(-30, 30);
    const [A, B, Cc, X, K, M] = [F(a), F(b), F(c), F(x), F(k), F(mm0)];
    const value = K.mul(X).add(M);
    need(!value.eq(X) && !value.isZero(), "value equals x");
    const given = `${lin([[A, "x"]], B)} = ${num(Cc)}`;
    const target = lin([[K, "x"]], M);
    // Independent route: the x that gives this value of the expression must satisfy the given equation.
    const sat = (v: Frac) => A.mul(v.sub(M).div(K)).add(B).eq(Cc);
    return {
      format,
      stem: `If ${mm(given)}, what is the value of ${mm(target)}?`,
      answer: numAnswer(value, mm(num(value))),
      slips: [
        slip(X, `you found ${mm("x")} and stopped; the question asks for ${mm(target)}`),
        slip(K.mul(X), `you found ${mm(lin([[K, "x"]]))} and left out the ${mm(num(M))}`),
        slip(
          K.mul(X.neg()).add(M),
          `you used ${mm(`x = ${num(X.neg())}`)}, a sign slip when solving`
        ),
        slip(
          K.mul(X).sub(M),
          `you subtracted ${mm(num(M.abs()))} instead of ${M.n < 0 ? "subtracting" : "adding"} it`
        ),
      ],
      asks: `the value of the expression ${mm(target)}, not the value of ${mm("x")}`,
      steps: [
        {
          label: `Find ${mm("x")} from the given equation`,
          work:
            a === 1
              ? `${undoAdd(B)}: ${mm(`x = ${num(X)}`)}`
              : `${undoAdd(B)} to get ${mm(`${num(A)}x = ${num(Cc.sub(B))}`)}, then divide by ${n(A)}: ${mm(`x = ${num(X)}`)}`,
        },
        {
          label: "Put that value into the expression",
          work: `${mm(`${times(K, X)} ${signed(M)} = ${num(K.mul(X))} ${signed(M)} = ${num(value)}`)}`,
        },
      ],
      check: `With ${mm(`x = ${num(X)}`)}, the given equation reads ${mm(`${a === 1 ? `(${num(X)})` : times(A, X)} ${signed(B)} = ${num(Cc)}`)}, which is true`,
      tip: `Read the last line of the question again before you answer: it often asks for an expression, not for ${mm("x")}`,
      hint: `Solve ${mm(given)} for ${mm("x")} first, then read what the question asks for.`,
      difficulty: format === "spr" ? 3 : a === 1 ? 2 : 3,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && sat(v);
      },
    };
  },
};

export const chunk: Template = {
  id: "lin-eq.chunk",
  skill: SKILL,
  label: "Solve for a repeated chunk such as x - h",
  difficulty: [5, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const h = rng.nonzero(-30, 30);
    const p = rng.nonzero(-6, 6);
    const r = rng.pick([2, 3, 4, 5, 6]);
    const u = rng.nonzero(-12, 12);
    const P = F(p);
    // p u + q = u / r  =>  q = u/r - p u; choose u so q is an integer.
    const Q = F(u, r).sub(P.mul(u));
    need(Q.isInt() && !Q.isZero(), "constant must be a whole number");
    need(Math.abs(Q.n) <= 120, "constant too large");
    const U = F(u);
    const H = F(h);
    const chunkTex = lin([[1, "x"]], H.neg());
    const eq = `${num(P)}(${chunkTex}) ${signed(Q)} = \\frac{${chunkTex}}{${r}}`;
    const X = U.add(H);
    const sat = (v: Frac) => P.mul(v).add(Q).eq(v.div(r));
    return {
      format,
      stem: `${block(eq)}\nIn the given equation, what is the value of ${mm(chunkTex)}?`,
      answer: numAnswer(U, mm(num(U))),
      slips: [
        slip(X, `you solved for ${mm("x")} itself; the question asks for ${mm(chunkTex)}`),
        slip(U.neg(), "you moved a term across the equals sign without changing its sign"),
        slip(
          Q.div(F(1).sub(P.mul(r))),
          `you multiplied the ${mm("u")}-terms by ${r} but not the constant ${mm(num(Q))}`
        ),
        ...(F(1).add(P.mul(r)).isZero()
          ? []
          : [
              slip(
                Q.mul(r).div(F(1).add(P.mul(r))),
                `you combined ${mm(`${num(P.mul(r))}u`)} and ${mm("u")} with the wrong sign`
              ),
            ]),
      ],
      asks: `the value of the chunk ${mm(chunkTex)}, which appears on both sides`,
      steps: [
        {
          label: "Treat the chunk as one unknown",
          work: `Let ${mm(`u = ${chunkTex}`)}. The equation becomes ${mm(`${num(P)}u ${signed(Q)} = \\frac{u}{${r}}`)}`,
        },
        {
          label: "Clear the fraction",
          work: `Multiply every term by ${r}: ${mm(`${num(P.mul(r))}u ${signed(Q.mul(r))} = u`)}`,
        },
        {
          label: `Collect the ${mm("u")}-terms`,
          work: `${mm(`${num(Q.mul(r))} = ${lin([[F(1).sub(P.mul(r)), "u"]])}`)}, so ${mm(`u = ${num(U)}`)}`,
        },
      ],
      check: `The left side is ${mm(`${times(P, U)} ${signed(Q)} = ${num(P.mul(U).add(Q))}`)} and the right side is ${mm(`\\frac{${num(U)}}{${r}} = ${num(U.div(r))}`)}. They match`,
      tip: `When the same group of terms appears more than once, solve for the group directly; you rarely need ${mm("x")} itself`,
      hint: `Notice that ${mm(chunkTex)} appears on both sides. Call it one letter.`,
      difficulty: format === "spr" ? 6 : rng.pick([5, 6]),
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && sat(v);
      },
    };
  },
};

export const TEMPLATES: Template[] = [twoStep, bothSides, brackets, expressionValue, chunk];
