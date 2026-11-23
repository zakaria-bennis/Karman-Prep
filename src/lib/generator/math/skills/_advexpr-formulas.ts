/*
 * m-rational-expressions, continued: rearranging a formula with fractions or a square for one
 * of its variables (re-exported by rational-expressions.ts). Every variable is positive, so
 * the check maps each sample point to positive values, puts the candidate back into the
 * original equation, and asks that both sides agree at every point.
 */
import { EXPR_POINTS, need } from "../core/build";
import { gcd } from "../core/frac";
import { block, m } from "../core/tex";
import type { Rng } from "../core/rng";
import type { Answer, Draft, Format, Slip, Template } from "../core/types";

const SKILL = "m-rational-expressions";
type Part = Omit<Draft, "format">;
type Get = (name: string) => number;
type Vars = Readonly<Record<string, number>>;

const frac = (top: string, bottom: string) => `\\frac{${top}}{${bottom}}`;
/** Display names that are not sample-point keys. */
const KEY: Record<string, string> = { K: "k", R_1: "r", R_2: "s" };
const getter =
  (v: Vars): Get =>
  (name) =>
    Math.abs(v[KEY[name] ?? name]) + 0.5;
const TRIPLES = [
  ["y", "h", "k"],
  ["p", "q", "r"],
  ["m", "n", "t"],
  ["w", "u", "v"],
  ["a", "b", "c"],
  ["z", "x", "y"],
];

function formula(solved: string, text: string, f: (g: Get) => number, why = ""): Slip {
  return { text: m(`${solved} = ${text}`), expr: (v) => f(getter(v)), why };
}

/** The candidate, put back into the equation, makes both sides agree at every point. */
function satisfies(residual: (g: Get, value: number) => number) {
  return (c: Answer) =>
    !!c.expr &&
    EXPR_POINTS.every((pt) => {
      const value = c.expr!(pt);
      const r = residual(getter(pt), value);
      return (
        Number.isFinite(value) &&
        Number.isFinite(r) &&
        Math.abs(r) <= 1e-9 * Math.max(1, Math.abs(value))
      );
    });
}

const relates = (names: string[], solved: string) => {
  const others = names.filter((x) => x !== solved);
  return `The given equation relates the positive numbers ${names
    .map((x) => m(x))
    .join(", ")
    .replace(
      /, ([^,]*)$/,
      ", and $1"
    )}. Which equation correctly expresses ${m(solved)} in terms of ${others.map((x) => m(x)).join(" and ")}?`;
};

function productOverConstant(rng: Rng): Part {
  const [L, P, Q] = rng.pick(TRIPLES);
  const C = rng.int(6, 99);
  const eq = `${L} = ${frac(`${P}${Q}`, String(C))}`;
  return {
    stem: `${block(eq)}\n${relates([L, P, Q], Q)}`,
    answer: formula(Q, frac(`${C}${L}`, P), (g) => (C * g(L)) / g(P)),
    slips: [
      formula(
        Q,
        frac(`${L}${P}`, String(C)),
        (g) => (g(L) * g(P)) / C,
        `you multiplied by ${m(P)} and divided by ${m(String(C))}, the reverse of what is needed`
      ),
      formula(
        Q,
        frac(`${L} + ${C}`, P),
        (g) => (g(L) + C) / g(P),
        `you added ${m(String(C))} instead of multiplying by it`
      ),
      formula(
        Q,
        `${C}${L} - ${P}`,
        (g) => C * g(L) - g(P),
        `you subtracted ${m(P)} instead of dividing by it`
      ),
      formula(Q, frac(P, `${C}${L}`), (g) => g(P) / (C * g(L)), "you flipped the fraction"),
    ],
    asks: `the equation solved for ${m(Q)}`,
    steps: [
      {
        label: "Clear the fraction",
        work: `Multiply both sides by ${m(String(C))}: ${m(`${C}${L} = ${P}${Q}`)}`,
      },
      {
        label: `Get ${m(Q)} alone`,
        work: `Divide both sides by ${m(P)}: ${m(`${Q} = ${frac(`${C}${L}`, P)}`)}`,
      },
    ],
    check: `Put it back: ${m(`${frac(`${P} \\cdot ${frac(`${C}${L}`, P)}`, String(C))} = ${frac(`${C}${L}`, String(C))} = ${L}`)}, the left side`,
    tip: "Undo the operations on the variable you want, in reverse order, doing the same thing to both sides",
    hint: `Multiply both sides by ${m(String(C))} first.`,
    difficulty: C > 40 ? 2 : 1,
    isCorrect: satisfies((g, q) => g(L) - (g(P) * q) / C),
  };
}

function negativeQuotient(rng: Rng): Part {
  const [L, Q, P] = rng.pick(TRIPLES);
  const C = rng.int(6, 150);
  const eq = `${L} = -${frac(Q, `${C}${P}`)}`;
  return {
    stem: `${block(eq)}\nThe given equation relates the nonzero numbers ${m(L)}, ${m(Q)}, and ${m(P)}. Which equation correctly expresses ${m(Q)} in terms of ${m(L)} and ${m(P)}?`,
    answer: formula(Q, `-${C}${L}${P}`, (g) => -C * g(L) * g(P)),
    slips: [
      formula(
        Q,
        `-${frac(`${C}${L}`, P)}`,
        (g) => (-C * g(L)) / g(P),
        `you divided by ${m(P)} instead of multiplying by it`
      ),
      formula(Q, `-${frac(P, `${C}${L}`)}`, (g) => -g(P) / (C * g(L)), "you flipped the fraction"),
      formula(Q, `${C}${L}${P}`, (g) => C * g(L) * g(P), "you dropped the negative sign"),
      formula(
        Q,
        `-${frac(`${L}${P}`, String(C))}`,
        (g) => (-g(L) * g(P)) / C,
        `you divided by ${m(String(C))} instead of multiplying by it`
      ),
    ],
    asks: `the equation solved for ${m(Q)}`,
    steps: [
      {
        label: "Clear the fraction",
        work: `Multiply both sides by ${m(`${C}${P}`)}: ${m(`${C}${L}${P} = -${Q}`)}`,
      },
      {
        label: `Get ${m(Q)} alone`,
        work: `Multiply both sides by $-1$: ${m(`${Q} = -${C}${L}${P}`)}`,
      },
    ],
    check: `Put it back: ${m(`-${frac(`-${C}${L}${P}`, `${C}${P}`)} = ${L}`)}, the left side`,
    tip: "Multiply both sides by the whole denominator to clear a fraction, and carry a negative sign along",
    hint: `Multiply both sides by ${m(`${C}${P}`)}.`,
    difficulty: 2,
    isCorrect: satisfies((g, q) => g(L) + q / (C * g(P))),
  };
}

function quotientMinus(rng: Rng): Part {
  const [Q, P, L] = rng.pick(TRIPLES);
  const C = rng.int(2, 60);
  const D = rng.int(2, 9);
  const eq = `${frac(Q, P)} - ${C} = ${D}${L}`;
  return {
    stem: `${block(eq)}\n${relates([Q, P, L], Q)}`,
    answer: formula(Q, `${P}(${D}${L} + ${C})`, (g) => g(P) * (D * g(L) + C)),
    slips: [
      formula(
        Q,
        `${frac(`${D}${L}`, P)} + ${C}`,
        (g) => (D * g(L)) / g(P) + C,
        `you divided by ${m(P)} instead of multiplying by it`
      ),
      formula(
        Q,
        frac(`${D}${L} + ${C}`, P),
        (g) => (D * g(L) + C) / g(P),
        `you added ${m(String(C))}, then divided by ${m(P)} instead of multiplying`
      ),
      formula(
        Q,
        `${D}${L}${P} + ${C}`,
        (g) => D * g(L) * g(P) + C,
        `you multiplied only ${m(`${D}${L}`)} by ${m(P)}, not the ${m(String(C))}`
      ),
      formula(
        Q,
        `${P}(${D}${L} - ${C})`,
        (g) => g(P) * (D * g(L) - C),
        `you subtracted ${m(String(C))} instead of adding it`
      ),
    ],
    asks: `the equation solved for ${m(Q)}`,
    steps: [
      {
        label: "Move the constant",
        work: `Add ${m(String(C))} to both sides: ${m(`${frac(Q, P)} = ${D}${L} + ${C}`)}`,
      },
      {
        label: "Clear the fraction",
        work: `Multiply both sides by ${m(P)}: ${m(`${Q} = ${P}(${D}${L} + ${C})`)}`,
      },
    ],
    check: `Put it back: ${m(`${frac(`${P}(${D}${L} + ${C})`, P)} - ${C} = ${D}${L} + ${C} - ${C} = ${D}${L}`)}`,
    tip: "Undo addition and subtraction before you undo multiplication and division",
    hint: `Add ${m(String(C))} to both sides first.`,
    difficulty: 3,
    isCorrect: satisfies((g, q) => q / g(P) - C - D * g(L)),
  };
}

function squareDenominator(rng: Rng): Part {
  const physics = rng.bool(0.5);
  const [B, T] = physics
    ? ["K", "v"]
    : rng.pick([
        ["b", "c"],
        ["q", "r"],
        ["n", "t"],
        ["h", "w"],
      ]);
  const k = physics ? 2 : rng.pick([2, 3, 5, 7]);
  const C = physics ? rng.int(40, 95) : rng.int(3, 30);
  const eq = `${C} = ${frac(`${k}${B}`, `${T}^2`)}`;
  const stem = physics
    ? `${block(eq)}\nFor an object with a mass of ${m(String(C))} kilograms, the given equation relates the kinetic energy ${m("K")}, in joules, of the object to the object's speed ${m("v")}, in meters per second, where ${m("K")} and ${m("v")} are positive. Which equation correctly expresses the object's speed in terms of its kinetic energy?`
    : `${block(eq)}\nThe given equation relates the positive numbers ${m(B)} and ${m(T)}. Which equation correctly expresses ${m(T)} in terms of ${m(B)}?`;
  return {
    stem,
    answer: formula(T, `\\sqrt{${frac(`${k}${B}`, String(C))}}`, (g) => Math.sqrt((k * g(B)) / C)),
    slips: [
      formula(
        T,
        frac(`${k}${B}`, String(C)),
        (g) => (k * g(B)) / C,
        "you did not take the square root at the end"
      ),
      formula(
        T,
        `\\sqrt{${frac(String(C), `${k}${B}`)}}`,
        (g) => Math.sqrt(C / (k * g(B))),
        "you flipped the fraction"
      ),
      formula(
        T,
        frac(`${k}${B}`, `${C}^2`),
        (g) => (k * g(B)) / (C * C),
        `you squared ${m(String(C))} instead of taking the square root of the whole side`
      ),
      formula(
        T,
        `\\sqrt{${C * k}${B}}`,
        (g) => Math.sqrt(C * k * g(B)),
        `you multiplied by ${m(String(C))} instead of dividing by it`
      ),
    ],
    asks: `the equation solved for ${m(T)}`,
    steps: [
      {
        label: "Clear the fraction",
        work: `Multiply both sides by ${m(`${T}^2`)}: ${m(`${C}${T}^2 = ${k}${B}`)}`,
      },
      {
        label: `Get ${m(`${T}^2`)} alone`,
        work: `Divide both sides by ${m(String(C))}: ${m(`${T}^2 = ${frac(`${k}${B}`, String(C))}`)}`,
      },
      {
        label: "Undo the square",
        work: `${m(T)} is positive, so take the positive square root: ${m(`${T} = \\sqrt{${frac(`${k}${B}`, String(C))}}`)}`,
      },
    ],
    check: `Put it back: ${m(`${T}^2 = ${frac(`${k}${B}`, String(C))}`)}, so ${m(`${frac(`${k}${B}`, `${T}^2`)} = ${k}${B} \\cdot ${frac(String(C), `${k}${B}`)} = ${C}`)}`,
    tip: "Get the squared variable alone first, then take the square root of the whole other side",
    hint: `Multiply both sides by ${m(`${T}^2`)}.`,
    difficulty: physics ? 4 : 3,
    isCorrect: satisfies((g, t) => C - (k * g(B)) / (t * t)),
  };
}

function reciprocals(rng: Rng): Part {
  if (rng.bool(0.5)) {
    const C = rng.int(5, 99);
    const eq = `${frac("1", String(C))} = ${frac("1", "R_1")} + ${frac("1", "R_2")}`;
    const R = "R_1";
    return {
      stem: `${block(eq)}\nThe given equation relates the resistances ${m("R_1")} and ${m("R_2")}, in ohms, of two resistors arranged in parallel in a circuit with a total resistance of ${m(String(C))} ohms, where ${m("R_1")} and ${m("R_2")} are positive. Which equation correctly expresses ${m("R_1")} in terms of ${m("R_2")}?`,
      answer: formula(R, frac(`${C}R_2`, `R_2 - ${C}`), (g) => (C * g("R_2")) / (g("R_2") - C)),
      slips: [
        formula(
          R,
          `${C} - R_2`,
          (g) => C - g("R_2"),
          "you flipped each fraction separately, but the reciprocal of a sum is not the sum of the reciprocals"
        ),
        formula(
          R,
          frac(`${C}R_2`, `R_2 + ${C}`),
          (g) => (C * g("R_2")) / (g("R_2") + C),
          `you added ${m(frac("1", "R_2"))} to both sides instead of subtracting it`
        ),
        formula(
          R,
          frac(`R_2 - ${C}`, `${C}R_2`),
          (g) => (g("R_2") - C) / (C * g("R_2")),
          `you found ${m(frac("1", "R_1"))} but did not flip it`
        ),
        formula(
          R,
          `${C} + R_2`,
          (g) => C + g("R_2"),
          "you treated the reciprocals as if they were the resistances"
        ),
      ],
      asks: `the equation solved for ${m("R_1")}`,
      steps: [
        {
          label: `Get ${m(frac("1", "R_1"))} alone`,
          work: m(`${frac("1", "R_1")} = ${frac("1", String(C))} - ${frac("1", "R_2")}`),
        },
        {
          label: "Combine the fractions",
          work: m(
            `${frac("1", String(C))} - ${frac("1", "R_2")} = ${frac(`R_2 - ${C}`, `${C}R_2`)}`
          ),
        },
        { label: "Flip both sides", work: m(`R_1 = ${frac(`${C}R_2`, `R_2 - ${C}`)}`) },
      ],
      check: `Put it back: ${m(`${frac(`R_2 - ${C}`, `${C}R_2`)} + ${frac("1", "R_2")} = ${frac(`R_2 - ${C} + ${C}`, `${C}R_2`)} = ${frac("1", String(C))}`)}`,
      tip: "With reciprocals, get the one reciprocal you want alone, combine the other side into one fraction, then flip both sides",
      hint: `Subtract ${m(frac("1", "R_2"))} from both sides first.`,
      difficulty: 6,
      isCorrect: satisfies((g, r1) => 1 / C - 1 / r1 - 1 / g("R_2")),
    };
  }
  const [p, q, r] = rng.pick(TRIPLES);
  const C = rng.int(2, 60);
  const eq = `${frac(String(C), p)} = ${frac(String(C), q)} + ${frac(String(C), r)}`;
  return {
    stem: `${block(eq)}\n${relates([p, q, r], q)}`,
    answer: formula(q, frac(`${p}${r}`, `${r} - ${p}`), (g) => (g(p) * g(r)) / (g(r) - g(p))),
    slips: [
      formula(
        q,
        `${p} - ${r}`,
        (g) => g(p) - g(r),
        "you flipped each fraction separately, but the reciprocal of a difference is not the difference of the reciprocals"
      ),
      formula(
        q,
        frac(`${p}${r}`, `${p} - ${r}`),
        (g) => (g(p) * g(r)) / (g(p) - g(r)),
        "you subtracted in the wrong order when you combined the fractions"
      ),
      formula(
        q,
        frac(`${r} - ${p}`, `${p}${r}`),
        (g) => (g(r) - g(p)) / (g(p) * g(r)),
        `you found ${m(frac("1", q))} but did not flip it`
      ),
      formula(
        q,
        frac(`${C}${p}${r}`, `${r} - ${p}`),
        (g) => (C * g(p) * g(r)) / (g(r) - g(p)),
        `you kept the ${m(String(C))} after dividing it out`
      ),
    ],
    asks: `the equation solved for ${m(q)}`,
    steps: [
      {
        label: `Divide out the ${m(String(C))}`,
        work: `Divide every term by ${m(String(C))}: ${m(`${frac("1", p)} = ${frac("1", q)} + ${frac("1", r)}`)}`,
      },
      {
        label: `Get ${m(frac("1", q))} alone`,
        work: m(
          `${frac("1", q)} = ${frac("1", p)} - ${frac("1", r)} = ${frac(`${r} - ${p}`, `${p}${r}`)}`
        ),
      },
      { label: "Flip both sides", work: m(`${q} = ${frac(`${p}${r}`, `${r} - ${p}`)}`) },
    ],
    check: `Put it back: ${m(`${frac("1", q)} + ${frac("1", r)} = ${frac(`${r} - ${p}`, `${p}${r}`)} + ${frac(p, `${p}${r}`)} = ${frac(r, `${p}${r}`)} = ${frac("1", p)}`)}`,
    tip: "With reciprocals, get the one reciprocal you want alone, combine the other side into one fraction, then flip both sides",
    hint: `Divide every term by ${m(String(C))}, then get ${m(frac("1", q))} alone.`,
    difficulty: 7,
    isCorrect: satisfies((g, qv) => C / g(p) - C / qv - C / g(r)),
  };
}

function fractionCoefficient(rng: Rng): Part {
  const [A, B] = rng.pick([
    ["a", "b"],
    ["y", "x"],
    ["p", "q"],
    ["m", "n"],
    ["s", "t"],
  ]);
  const P = rng.int(2, 7);
  const Q = rng.int(2, 9);
  const j = rng.int(1, 6);
  need(gcd(P, Q) === 1, "lowest terms");
  const c = P * j;
  const eq = `${A} = ${frac(String(P), String(Q))}${B} + ${c}`;
  return {
    stem: `${block(eq)}\nThe given equation relates the positive numbers ${m(A)} and ${m(B)}. Which equation correctly expresses ${m(B)} in terms of ${m(A)}?`,
    answer: formula(
      B,
      `${frac(String(Q), String(P))}${A} - ${Q * j}`,
      (g) => (Q / P) * g(A) - Q * j
    ),
    slips: [
      formula(
        B,
        `${frac(String(Q), String(P))}${A} - ${c}`,
        (g) => (Q / P) * g(A) - c,
        `you multiplied only ${m(A)} by ${m(frac(String(Q), String(P)))}, not the ${m(String(c))}`
      ),
      formula(
        B,
        `${frac(String(P), String(Q))}${A} - ${c}`,
        (g) => (P / Q) * g(A) - c,
        `you kept ${m(frac(String(P), String(Q)))} instead of multiplying by its reciprocal`
      ),
      formula(
        B,
        `${frac(String(Q), String(P))}${A} + ${Q * j}`,
        (g) => (Q / P) * g(A) + Q * j,
        `you added ${m(String(c))} instead of subtracting it`
      ),
    ],
    asks: `the equation solved for ${m(B)}`,
    steps: [
      {
        label: "Move the constant",
        work: `Subtract ${m(String(c))} from both sides: ${m(`${A} - ${c} = ${frac(String(P), String(Q))}${B}`)}`,
      },
      {
        label: "Undo the fraction",
        work: `Multiply both sides by ${m(frac(String(Q), String(P)))}: ${m(`${B} = ${frac(String(Q), String(P))}(${A} - ${c}) = ${frac(String(Q), String(P))}${A} - ${Q * j}`)}`,
      },
    ],
    check: `Put it back: ${m(`${frac(String(P), String(Q))}\\left(${frac(String(Q), String(P))}${A} - ${Q * j}\\right) + ${c} = ${A} - ${c} + ${c} = ${A}`)}`,
    tip: "To undo multiplying by a fraction, multiply both sides by its reciprocal, and multiply every term",
    hint: `Subtract ${m(String(c))} from both sides first.`,
    difficulty: 3,
    isCorrect: satisfies((g, b) => g(A) - (P / Q) * b - c),
  };
}

export const SOLVE_FOR: Template = {
  id: "rat-expr.solve-for",
  skill: SKILL,
  label: "Rearrange a formula with fractions for one of its variables",
  difficulty: [1, 7],
  formats: ["mc"],
  make(rng, format: Format): Draft {
    const part = rng.pick([
      productOverConstant,
      negativeQuotient,
      quotientMinus,
      squareDenominator,
      reciprocals,
      reciprocals,
      fractionCoefficient,
    ])(rng);
    return { format, ...part };
  },
};
