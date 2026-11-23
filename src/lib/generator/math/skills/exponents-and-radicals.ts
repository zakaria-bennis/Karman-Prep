/*
 * m-exponents-and-radicals: the exponent rules, roots and fractional powers. Item models after
 * the bank's questions for this skill: products, quotients and powers of monomials (with
 * negative exponents), rational exponents and radicals, simplifying square roots, and finding
 * an unknown exponent (the last two live in _advexpr-radicals.ts). Expression checks compare
 * with the original expression at the sample points (positive values where roots appear).
 */
import { need, numAnswer } from "../core/build";
import { F, Frac, gcd } from "../core/frac";
import { m, n, num } from "../core/tex";
import type { Rng } from "../core/rng";
import type { Answer, Draft, Format, Template } from "../core/types";
import { exprAns, numSlip, sameExpr, valueOf } from "./_advexpr-poly";
import { ROOTS, UNKNOWN_EXPONENT } from "./_advexpr-radicals";

const SKILL = "m-exponents-and-radicals";
type Part = Omit<Draft, "format">;
type Vars = Readonly<Record<string, number>>;
type Fn = (v: Vars) => number;
const PAIRS = [
  ["h", "q"],
  ["x", "y"],
  ["a", "b"],
  ["m", "n"],
  ["p", "r"],
  ["s", "t"],
];
const equalTo = (f: Fn) => (c: Answer) => !!c.expr && sameExpr(c.expr, f);
/** A sample value made positive, for expressions with roots. */
const pos = (v: number) => Math.abs(v) + 1.5;

/** A power for LaTeX: x^{12}, x^{-3}, x for 1, nothing for 0. */
const pw = (v: string, e: number | string) =>
  e === 0 || e === "0" ? "" : e === 1 || e === "1" ? v : `${v}^{${e}}`;

/** A monomial c * v1^e1 * v2^e2 in fraction form: negative exponents go to the denominator. */
function mono(c: Frac, parts: [string, number][]): string {
  const top = parts
    .filter(([, e]) => e > 0)
    .map(([v, e]) => pw(v, e))
    .join("");
  const bottom = parts
    .filter(([, e]) => e < 0)
    .map(([v, e]) => pw(v, -e))
    .join("");
  const sign = c.n < 0 ? "-" : "";
  const cn = Math.abs(c.n);
  const head = cn === 1 && top !== "" ? top : `${cn}${top}`;
  const foot = c.d === 1 && bottom === "" ? "" : `${c.d === 1 ? "" : c.d}${bottom}`;
  return foot === "" ? `${sign}${head}` : `${sign}\\frac{${head}}{${foot}}`;
}
const monoFn =
  (c: Frac, parts: [string, number][]): Fn =>
  (v) =>
    parts.reduce((acc, [x, e]) => acc * v[x] ** e, c.toNumber());
const monoAns = (c: Frac, parts: [string, number][], why = "") =>
  exprAns(m(mono(c, parts)), monoFn(c, parts), why);

/* ---------------------------------------------------------------- monomial rules */

function quotientRule(rng: Rng): Part {
  const [h, q] = rng.pick(PAIRS);
  const A = rng.int(6, 20);
  const C = rng.int(2, A - 1);
  const B = rng.int(2, 12);
  const D = rng.int(B + 1, 24);
  const k = rng.pick([1, 1, 2, 3, 4, 5, 6]);
  const g = k * rng.pick([1, 2, 3]);
  const top = mono(F(g), [
    [h, A],
    [q, B],
  ]);
  const bot = mono(F(k), [
    [h, C],
    [q, D],
  ]);
  const orig: Fn = (v) => (g * v[h] ** A * v[q] ** B) / (k * v[h] ** C * v[q] ** D);
  const c = F(g, k);
  const slips = [
    monoAns(
      c,
      [
        [h, A - C],
        [q, D - B],
      ],
      `you put ${m(pw(q, D - B))} on top, but its exponent ${m(`${B} - ${D}`)} is negative, so it belongs below`
    ),
    monoAns(
      c,
      [
        [h, A + C],
        [q, -(B + D)],
      ],
      "you added the exponents instead of subtracting them"
    ),
    monoAns(
      c,
      [
        [h, C - A],
        [q, D - B],
      ],
      "you subtracted the exponents in the wrong order"
    ),
  ];
  if (A % C === 0 && D % B === 0)
    slips.unshift(
      monoAns(
        c,
        [
          [h, A / C],
          [q, -(D / B)],
        ],
        "you divided the exponents instead of subtracting them"
      )
    );
  return {
    stem: `Which expression is equivalent to ${m(`\\frac{${top}}{${bot}}`)}, where ${m(`${h} > 0`)} and ${m(`${q} > 0`)}?`,
    answer: monoAns(c, [
      [h, A - C],
      [q, B - D],
    ]),
    slips,
    asks: "the quotient written with positive exponents",
    steps: [
      ...(k > 1
        ? [{ label: "Divide the coefficients", work: m(`\\frac{${g}}{${k}} = ${num(c)}`) }]
        : []),
      {
        label: `Subtract the exponents of ${m(h)}`,
        work:
          m(`\\frac{${pw(h, A)}}{${pw(h, C)}} = ${pw(h, A - C)}`) +
          `, because dividing powers of the same base subtracts the exponents`,
      },
      {
        label: `Subtract the exponents of ${m(q)}`,
        work: `${m(`\\frac{${pw(q, B)}}{${pw(q, D)}} = ${q}^{${B - D}} = \\frac{1}{${pw(q, D - B)}}`)}`,
      },
    ],
    check: `Multiply back: ${m(
      `${mono(c, [
        [h, A - C],
        [q, B - D],
      ])} \\cdot ${bot} = ${top}`
    )}`,
    tip: "When dividing powers of the same base, subtract the bottom exponent from the top exponent; a negative result means the power belongs in the denominator",
    hint: `Handle ${m(h)} and ${m(q)} separately.`,
    difficulty: k > 1 ? 2 : 1,
    isCorrect: equalTo(orig),
  };
}

function powerRule(rng: Rng): Part {
  const [x, y] = rng.pick(PAIRS);
  const c = rng.pick([2, 3, 4, 5, -2, -3]);
  const p = rng.int(2, c === 2 || c === -2 ? 5 : 3);
  const a = rng.int(2, 8);
  const b = rng.int(1, 6);
  const inner = mono(F(c), [
    [x, a],
    [y, b],
  ]);
  const orig: Fn = (v) => (c * v[x] ** a * v[y] ** b) ** p;
  const cp = F(c).pow(p);
  return {
    stem: `Which expression is equivalent to ${m(`(${inner})^{${p}}`)}?`,
    answer: monoAns(cp, [
      [x, a * p],
      [y, b * p],
    ]),
    slips: [
      monoAns(
        F(c),
        [
          [x, a * p],
          [y, b * p],
        ],
        `you did not raise ${n(c)} to the power ${n(p)}`
      ),
      monoAns(
        F(c * p),
        [
          [x, a * p],
          [y, b * p],
        ],
        `you multiplied ${n(c)} by ${n(p)} instead of raising it to the power ${n(p)}`
      ),
      monoAns(
        cp,
        [
          [x, a + p],
          [y, b + p],
        ],
        "you added the exponents instead of multiplying them"
      ),
      monoAns(
        cp,
        [
          [x, a * p],
          [y, b],
        ],
        `you did not raise ${m(pw(y, b))} to the power ${n(p)}`
      ),
    ],
    asks: `the power ${m(`(${inner})^{${p}}`)} written as one monomial`,
    steps: [
      {
        label: "Raise each factor to the power",
        work: m(
          `(${inner})^{${p}} = ${c < 0 ? `(${c})` : c}^{${p}} (${pw(x, a)})^{${p}} (${pw(y, b)})^{${p}}`
        ),
      },
      {
        label: "Multiply the exponents",
        work: `${m(`(${pw(x, a)})^{${p}} = ${pw(x, a * p)}`)} and ${m(`(${pw(y, b)})^{${p}} = ${pw(y, b * p)}`)}, because a power of a power multiplies the exponents`,
      },
      {
        label: "Find the coefficient",
        work: `${m(`${c < 0 ? `(${c})` : c}^{${p}} = ${num(cp)}`)}, so the result is ${m(
          mono(cp, [
            [x, a * p],
            [y, b * p],
          ])
        )}`,
      },
    ],
    check: `With ${m(`${x} = 1`)} and ${m(`${y} = 1`)}, both sides equal ${n(cp)}; with ${m(`${x} = 2`)}, the power of $2$ is ${m(`2^{${a}\\cdot${p}} = 2^{${a * p}}`)} on both sides`,
    tip: "A power of a product raises every factor, the number included; a power of a power multiplies the exponents",
    hint: `Every factor inside the brackets is raised to the power ${n(p)}.`,
    difficulty: c < 0 || p >= 4 ? 2 : 1,
    isCorrect: equalTo(orig),
  };
}

function productRule(rng: Rng): Part {
  const [x, y] = rng.pick(PAIRS);
  const a = rng.int(2, 9);
  const b = rng.int(2, 9);
  const p = rng.nonzero(-6, 9);
  const q = rng.nonzero(-7, 7);
  const r = rng.nonzero(-7, 7);
  const s = rng.nonzero(-6, 9);
  need(
    (p < 0 || q < 0 || r < 0 || s < 0) && p + r !== 0 && q + s !== 0,
    "a negative exponent, no zero total"
  );
  need(p * r !== p + r && q * s !== q + s, "slips must differ");
  const left = `${a}${pw(x, p)}${pw(y, q)}`;
  const right = `${b}${pw(x, r)}${pw(y, s)}`;
  const orig: Fn = (v) => a * v[x] ** p * v[y] ** q * b * v[x] ** r * v[y] ** s;
  return {
    stem: `Which expression is equivalent to ${m(`(${left})(${right})`)}, where ${m(`${x} \\ne 0`)} and ${m(`${y} \\ne 0`)}?`,
    answer: monoAns(F(a * b), [
      [x, p + r],
      [y, q + s],
    ]),
    slips: [
      monoAns(
        F(a + b),
        [
          [x, p + r],
          [y, q + s],
        ],
        "you added the coefficients instead of multiplying them"
      ),
      monoAns(
        F(a * b),
        [
          [x, p * r],
          [y, q * s],
        ],
        "you multiplied the exponents instead of adding them"
      ),
      monoAns(
        F(a * b),
        [
          [x, p - r],
          [y, q - s],
        ],
        "you subtracted the exponents instead of adding them"
      ),
      monoAns(
        F(a * b),
        [
          [x, -(p + r)],
          [y, -(q + s)],
        ],
        "you flipped the sign of each total exponent"
      ),
    ],
    asks: "the product written as one term with positive exponents",
    steps: [
      { label: "Multiply the coefficients", work: m(`${a} \\cdot ${b} = ${a * b}`) },
      {
        label: "Add the exponents of each base",
        work: `${m(`${pw(x, p)} \\cdot ${pw(x, r)} = ${x}^{${p + r}}`)} and ${m(`${pw(y, q)} \\cdot ${pw(y, s)} = ${y}^{${q + s}}`)}`,
      },
      {
        label: "Move negative powers below",
        work: `${m(
          `${a * b}${x}^{${p + r}}${y}^{${q + s}} = ${mono(F(a * b), [
            [x, p + r],
            [y, q + s],
          ])}`
        )}`,
      },
    ],
    check: `With ${m(`${x} = 2`)} and ${m(`${y} = 1`)}, the product is ${m(`${a * b} \\cdot 2^{${p}} \\cdot 2^{${r}} = ${a * b} \\cdot 2^{${p + r}}`)}, the same as the answer`,
    tip: "Multiplying powers of the same base adds the exponents, negative ones included",
    hint: "Multiply the numbers, then add the exponents of each letter.",
    difficulty: 3,
    isCorrect: equalTo(orig),
  };
}

/** Typed: an unknown exponent from the rules. */
function exponentValue(rng: Rng): Part {
  const x = rng.pick(["x", "x", "y", "n", "t"]);
  if (rng.bool(0.5)) {
    const g = rng.int(2, 9);
    const k = g * rng.int(2, 4);
    const A = rng.int(8, 30);
    const C = rng.int(2, A - 2);
    const b = A - C;
    const e = `\\frac{${g}${x}^{${A}}}{${k}${x}^{${C}}}`;
    return {
      stem: `The expression ${m(e)} is equivalent to ${m(`${num(F(g, k))}${x}^{b}`)}, where ${m("b")} is a constant and ${m(`${x} > 0`)}. What is the value of ${m("b")}?`,
      answer: numAnswer(b, m(num(b))),
      slips: [
        numSlip(A + C, "you added the exponents instead of subtracting them"),
        numSlip(F(A, C), "you divided the exponents instead of subtracting them"),
        numSlip(C - A, "you subtracted the exponents in the wrong order"),
      ],
      asks: `the exponent ${m("b")} after the division`,
      steps: [
        { label: "Divide the coefficients", work: m(`\\frac{${g}}{${k}} = ${num(F(g, k))}`) },
        {
          label: "Subtract the exponents",
          work: `${m(`\\frac{${x}^{${A}}}{${x}^{${C}}} = ${x}^{${A} - ${C}} = ${x}^{${b}}`)}, so ${m(`b = ${b}`)}`,
        },
      ],
      check: `Multiply back: ${m(`${x}^{${b}} \\cdot ${x}^{${C}} = ${x}^{${A}}`)}`,
      tip: "Dividing powers of the same base subtracts the exponents",
      hint: "Treat the numbers and the powers separately.",
      difficulty: 2,
      isCorrect: (cand) => valueOf(cand)?.eq(F(A).sub(C)) ?? false,
    };
  }
  const p = rng.int(2, 7);
  const k = rng.int(2, 9);
  const q = rng.nonzero(-9, 12);
  const r = p * k + q;
  need(r > 0 && q !== 0, "positive total");
  return {
    stem: `If ${m(`(${x}^{${p}})^{k} \\cdot ${x}^{${q}} = ${x}^{${r}}`)} for all positive values of ${m(x)}, what is the value of ${m("k")}?`,
    answer: numAnswer(k, m(num(k))),
    slips: [
      numSlip(r - q - p, `you added ${n(p)} and ${m("k")} instead of multiplying them`),
      numSlip(
        F(r + q, p),
        q > 0
          ? `you added ${n(q)} to both sides instead of subtracting it`
          : `you subtracted ${n(-q)} from both sides instead of adding it`
      ),
      numSlip(F(r, p), `you left out the ${m(`${x}^{${q}}`)}`),
    ],
    asks: `the exponent ${m("k")} that makes the two sides equal`,
    steps: [
      { label: "Use the power rule", work: m(`(${x}^{${p}})^{k} = ${x}^{${p}k}`) },
      {
        label: "Use the product rule",
        work: m(
          `${x}^{${p}k} \\cdot ${x}^{${q}} = ${x}^{${p}k ${q < 0 ? "-" : "+"} ${Math.abs(q)}}`
        ),
      },
      {
        label: "Match the exponents",
        work: `${m(`${p}k ${q < 0 ? "-" : "+"} ${Math.abs(q)} = ${r}`)}, so ${m(`${p}k = ${r - q}`)} and ${m(`k = ${k}`)}`,
      },
    ],
    check: `With ${m(`k = ${k}`)}, the left side is ${m(`${x}^{${p * k}} \\cdot ${x}^{${q}} = ${x}^{${r}}`)}`,
    tip: "Rewrite both sides as one power of the same base, then set the exponents equal",
    hint: "Write the left side as a single power of the same base.",
    difficulty: q < 0 ? 4 : 3,
    isCorrect: (cand) => {
      const v = valueOf(cand);
      return !!v && v.mul(p).add(q).eq(r);
    },
  };
}

export const rules: Template = {
  id: "exp-rad.rules",
  skill: SKILL,
  label: "Products, quotients and powers of monomials",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format: Format): Draft {
    const part =
      format === "spr"
        ? exponentValue(rng)
        : rng.pick([quotientRule, quotientRule, powerRule, powerRule, productRule, exponentValue])(
            rng
          );
    return { format, ...part };
  },
};

/* ---------------------------------------------------------------- rational exponents */

const root = (k: number, inside: string) =>
  k === 2 ? `\\sqrt{${inside}}` : `\\sqrt[${k}]{${inside}}`;
const fe = (a: number, b: number) => (b === 1 ? String(a) : `\\frac{${a}}{${b}}`);

function halfPower(rng: Rng): Part {
  const y = rng.pick(["y", "x", "t", "w"]);
  let c = rng.int(2, 199);
  while (Number.isInteger(Math.sqrt(c))) c += 1;
  const orig: Fn = (v) => (c * pos(v[y])) ** 0.5;
  const e = (text: string, f: (t: number) => number, why = "") =>
    exprAns(m(text), (v) => f(pos(v[y])), why);
  return {
    stem: `Which expression is equivalent to ${m(`(${c}${y})^{\\frac{1}{2}}`)}, where ${m(`${y} > 1`)}?`,
    answer: e(`\\sqrt{${c}${y}}`, (t) => Math.sqrt(c * t)),
    slips: [
      e(
        `${c}\\sqrt{${y}}`,
        (t) => c * Math.sqrt(t),
        `you applied the power only to ${m(y)}, not to ${n(c)}`
      ),
      e(
        `\\sqrt{${c}}\\,${y}`,
        (t) => Math.sqrt(c) * t,
        `you applied the power only to ${n(c)}, not to ${m(y)}`
      ),
      e(
        `\\frac{${c}${y}}{2}`,
        (t) => (c * t) / 2,
        `you multiplied by ${m("\\frac{1}{2}")} instead of taking a square root`
      ),
      e(
        `\\sqrt{(${c}${y})^{2}}`,
        (t) => c * t,
        "you squared the expression inside the root instead of leaving it as it is"
      ),
    ],
    asks: `the radical form of ${m(`(${c}${y})^{\\frac{1}{2}}`)}`,
    steps: [
      {
        label: "Read the exponent",
        work: `An exponent of ${m("\\frac{1}{2}")} means a square root: ${m("a^{\\frac{1}{2}} = \\sqrt{a}")}`,
      },
      {
        label: "Apply it to the whole base",
        work: `The base is all of ${m(`${c}${y}`)}, so ${m(`(${c}${y})^{\\frac{1}{2}} = \\sqrt{${c}${y}}`)}`,
      },
    ],
    check: `Square both forms: ${m(`\\sqrt{${c}${y}}`)} squared is ${m(`${c}${y}`)}, and ${m(`(${c}${y})^{\\frac{1}{2}}`)} squared is ${m(`(${c}${y})^{\\frac{1}{2} \\cdot 2} = ${c}${y}`)} too`,
    tip: `${m("a^{\\frac{1}{n}}")} is the ${m("n")}th root of the whole base ${m("a")}, including any number in the base`,
    hint: `What does an exponent of ${m("\\frac{1}{2}")} mean?`,
    difficulty: c > 99 ? 2 : 1,
    isCorrect: equalTo(orig),
  };
}

function radicalForm(rng: Rng): Part {
  const x = rng.pick(["x", "x", "a", "p", "y"]);
  const k = rng.int(3, 9);
  const mm = rng.int(2, 13);
  need(gcd(mm, k) === 1 && mm !== k + 1, "lowest terms");
  const toRoot = rng.bool(0.5);
  const orig: Fn = (v) => pos(v[x]) ** (mm / k);
  const e = (text: string, f: (t: number) => number, why = "") =>
    exprAns(m(text), (v) => f(pos(v[x])), why);
  if (toRoot) {
    return {
      stem: `Which expression is equivalent to ${m(`${x}^{${fe(mm, k)}}`)}, where ${m(`${x} > 0`)}?`,
      answer: e(root(k, pw(x, mm)), (t) => t ** (mm / k)),
      slips: [
        e(
          root(mm, pw(x, k)),
          (t) => t ** (k / mm),
          "you swapped the root and the power: the denominator of the exponent is the root"
        ),
        e(
          `\\frac{${pw(x, mm)}}{${k}}`,
          (t) => t ** mm / k,
          `you divided by ${n(k)} instead of taking a root`
        ),
        e(
          root(k, pw(x, mm + k)),
          (t) => t ** ((mm + k) / k),
          "you added the root's index to the power"
        ),
      ],
      asks: `the radical form of ${m(`${x}^{${fe(mm, k)}}`)}`,
      steps: [
        {
          label: "Split the exponent",
          work: m(`${x}^{${fe(mm, k)}} = (${pw(x, mm)})^{${fe(1, k)}}`),
        },
        {
          label: "Write the root",
          work: `An exponent of ${m(fe(1, k))} is ${k === 3 ? "a cube" : k === 8 ? "an 8th" : `a ${k}th`} root: ${m(`(${pw(x, mm)})^{${fe(1, k)}} = ${root(k, pw(x, mm))}`)}`,
        },
      ],
      check: `If you raise ${m(root(k, pw(x, mm)))} to the power ${n(k)}, you get ${m(pw(x, mm))}; ${m(`(${x}^{${fe(mm, k)}})^{${k}}`)} gives the same`,
      tip: `In ${m("a^{\\frac{m}{n}}")}, the numerator ${m("m")} is the power and the denominator ${m("n")} is the root`,
      hint: "The denominator of the exponent tells you which root to take.",
      difficulty: 2,
      isCorrect: equalTo(orig),
    };
  }
  return {
    stem: `Which expression is equivalent to ${m(root(k, pw(x, mm)))}, where ${m(`${x} > 0`)}?`,
    answer: e(`${x}^{${fe(mm, k)}}`, (t) => t ** (mm / k)),
    slips: [
      e(
        `${x}^{${fe(k, mm)}}`,
        (t) => t ** (k / mm),
        "you put the root's index on top of the exponent fraction"
      ),
      e(`${x}^{${mm * k}}`, (t) => t ** (mm * k), "you multiplied the power by the root's index"),
      e(pw(x, mm - k), (t) => t ** (mm - k), "you subtracted the root's index from the power"),
    ],
    asks: `the power form of ${m(root(k, pw(x, mm)))}`,
    steps: [
      {
        label: "Write the root as a power",
        work: `${k === 3 ? "A cube" : k === 8 ? "An 8th" : `A ${k}th`} root is the power ${m(fe(1, k))}: ${m(`${root(k, pw(x, mm))} = (${pw(x, mm)})^{${fe(1, k)}}`)}`,
      },
      {
        label: "Multiply the exponents",
        work: m(`(${pw(x, mm)})^{${fe(1, k)}} = ${x}^{${fe(mm, k)}}`),
      },
    ],
    check: `If you raise ${m(`${x}^{${fe(mm, k)}}`)} to the power ${n(k)}, you get ${m(pw(x, mm))}, the expression under the root`,
    tip: `${m("\\sqrt[n]{a^m} = a^{\\frac{m}{n}}")}: the power goes on top, the root's index below`,
    hint: "Write the root as a fractional power.",
    difficulty: 3,
    isCorrect: equalTo(orig),
  };
}

function negativeRoot(rng: Rng): Part {
  const p = rng.pick(["p", "x", "a", "t"]);
  const k = rng.int(3, 9);
  const mm = rng.int(5, 23);
  need(gcd(mm, k) === 1, "lowest terms");
  const orig: Fn = (v) => (pos(v[p]) ** (mm / k)) ** -1;
  const e = (text: string, f: (t: number) => number, why = "") =>
    exprAns(m(text), (v) => f(pos(v[p])), why);
  return {
    stem: `Which expression is equivalent to ${m(`\\left(${root(k, pw(p, mm))}\\right)^{-1}`)}, where ${m(`${p} > 1`)}?`,
    answer: e(`\\frac{1}{${p}^{${fe(mm, k)}}}`, (t) => t ** (-mm / k)),
    slips: [
      e(
        `-${p}^{${fe(mm, k)}}`,
        (t) => -(t ** (mm / k)),
        "you made the expression negative, but a negative exponent means a reciprocal"
      ),
      e(
        `${p}^{-${fe(k, mm)}}`,
        (t) => t ** (-k / mm),
        "you flipped the exponent fraction as well as taking the reciprocal"
      ),
      e(
        `${p}^{${fe(k, mm)}}`,
        (t) => t ** (k / mm),
        "you flipped the exponent fraction instead of taking the reciprocal"
      ),
    ],
    asks: "the expression as a power with the reciprocal shown",
    steps: [
      {
        label: "Write the root as a power",
        work: m(`${root(k, pw(p, mm))} = ${p}^{${fe(mm, k)}}`),
      },
      {
        label: "Apply the negative exponent",
        work: `An exponent of $-1$ gives the reciprocal: ${m(`(${p}^{${fe(mm, k)}})^{-1} = \\frac{1}{${p}^{${fe(mm, k)}}}`)}`,
      },
    ],
    check: `Multiply ${m(`\\frac{1}{${p}^{${fe(mm, k)}}}`)} by ${m(root(k, pw(p, mm)))} and you get $1$, as a reciprocal should`,
    tip: `A negative exponent never makes a value negative: ${m("a^{-1} = \\frac{1}{a}")}`,
    hint: "Rewrite the root as a fractional power first.",
    difficulty: 4,
    isCorrect: equalTo(orig),
  };
}

/** Typed: the index of a root that matches a fractional power. */
function rootIndex(rng: Rng): Part {
  const r = rng.pick(["r", "x", "b", "w"]);
  const p = rng.int(1, 9);
  const q = rng.int(2, 9);
  const t = rng.int(2, 9);
  need(gcd(p, q) === 1 && p !== q, "lowest terms");
  const M = p * t;
  const a = q * t;
  return {
    stem: `For what value of ${m("a")} is ${m(`\\sqrt[a]{${r}^{${M}}}`)} equivalent to ${m(`${r}^{${fe(p, q)}}`)}, where ${m(`${r} > 1`)}?`,
    answer: numAnswer(a, m(num(a))),
    slips: [
      numSlip(
        q,
        `you matched the root to the denominator ${n(q)}, but ${m(`\\frac{${M}}{a}`)} must equal ${m(fe(p, q))}`
      ),
      numSlip(F(M * p, q), "you set the exponents' ratio upside down"),
      numSlip(M, "you gave the power under the root"),
    ],
    asks: `the root index ${m("a")} that makes the two powers of ${m(r)} equal`,
    steps: [
      {
        label: "Write the root as a power",
        work: m(`\\sqrt[a]{${r}^{${M}}} = ${r}^{\\frac{${M}}{a}}`),
      },
      {
        label: "Match the exponents",
        work: `${m(`\\frac{${M}}{a} = ${fe(p, q)}`)}, so ${m(`${p === 1 ? "" : p}a = ${M * q}`)} and ${m(`a = ${a}`)}`,
      },
    ],
    check: `With ${m(`a = ${a}`)}, the exponent is ${m(`\\frac{${M}}{${a}} = ${fe(p, q)}`)}`,
    tip: "Write every root as a fractional power, then compare exponents",
    hint: "Write the root as a power of the same base.",
    difficulty: a > 30 ? 5 : 4,
    isCorrect: (cand) => {
      const v = valueOf(cand);
      return !!v && !v.isZero() && F(M).div(v).eq(F(p, q));
    },
  };
}

export const rationalExponent: Template = {
  id: "exp-rad.rational-exponent",
  skill: SKILL,
  label: "Rational exponents and radicals",
  difficulty: [1, 5],
  formats: ["mc", "spr"],
  make(rng, format: Format): Draft {
    const part =
      format === "spr"
        ? rootIndex(rng)
        : rng.pick([halfPower, halfPower, radicalForm, radicalForm, negativeRoot, rootIndex])(rng);
    return { format, ...part };
  },
};

export const TEMPLATES: Template[] = [rules, rationalExponent, ROOTS, UNKNOWN_EXPONENT];
