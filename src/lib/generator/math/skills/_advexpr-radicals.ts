/*
 * m-exponents-and-radicals, continued (re-exported by exponents-and-radicals.ts): simplifying
 * square roots exactly (core/sym.ts keeps every root symbolic), and finding an unknown exponent
 * in an equation of roots and powers. Root answers are checked by squaring the candidate or by
 * recomputing the original sum; exponent answers by putting the candidate back into the
 * equation at several bases.
 */
import { need, numAnswer, sprKeyOf } from "../core/build";
import { F, Frac, gcd } from "../core/frac";
import { S, Sym } from "../core/sym";
import { m, n, num, sym } from "../core/tex";
import type { Rng } from "../core/rng";
import type { Answer, Draft, Format, Slip, Template } from "../core/types";
import { numSlip, valueOf } from "./_advexpr-poly";

const SKILL = "m-exponents-and-radicals";
type Part = Omit<Draft, "format">;
const FREE = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23];
const symSlip = (v: Sym, why: string): Slip => ({ text: m(sym(v)), value: v, why });
const symAns = (v: Sym): Answer => numAnswer(v, m(sym(v)));
const root = (k: number, inside: string) =>
  k === 2 ? `\\sqrt{${inside}}` : `\\sqrt[${k}]{${inside}}`;
const fe = (q: Frac) =>
  q.isInt() ? String(q.n) : `${q.n < 0 ? "-" : ""}\\frac{${Math.abs(q.n)}}{${q.d}}`;
const isSquare = (k: number) => Number.isInteger(Math.sqrt(k));

/** Does a typed answer fit the SAT box? */
function fits(q: Frac): boolean {
  try {
    sprKeyOf(Sym.rat(q));
    return true;
  } catch {
    return false;
  }
}

/** Both sides agree, as functions of a positive base, at several bases. */
function agrees(lhs: (b: number) => number, rhs: (b: number) => number): boolean {
  return [1.3, 2.7, 5.1].every((b) => {
    const [l, r] = [lhs(b), rhs(b)];
    return (
      Number.isFinite(l) && Number.isFinite(r) && Math.abs(l - r) <= 1e-9 * Math.max(1, Math.abs(l))
    );
  });
}

/* ---------------------------------------------------------------- square roots */

function simplifyRoot(rng: Rng, format: Format): Part {
  const b = rng.pick(FREE);
  const a = rng.int(2, 15);
  const cc = rng.pick([1, 1, 1, 2, 3, 4, 5]);
  const N = a * a * b;
  need(N <= 3000 && a !== b, "small");
  const value = S.root(N, cc);
  const head = cc === 1 ? "" : String(cc);
  const k = cc * a;
  const common = {
    asks: `${m(`${head}\\sqrt{${N}}`)} with the largest perfect square taken out of the root`,
    steps: [
      {
        label: "Find the largest square factor",
        work: `${m(`${N} = ${a * a} \\cdot ${b}`)}, and ${n(a * a)} is the largest perfect square that divides ${n(N)}`,
      },
      {
        label: "Take its root out",
        work: m(
          `${head}\\sqrt{${N}} = ${head}\\sqrt{${a * a}} \\cdot \\sqrt{${b}} = ${head === "" ? "" : `${head} \\cdot `}${a}\\sqrt{${b}}${cc === 1 ? "" : ` = ${k}\\sqrt{${b}}`}`
        ),
      },
    ],
    check:
      cc === 1
        ? `Square back: ${m(`(${k}\\sqrt{${b}})^2 = ${num(k * k)} \\cdot ${b} = ${num(N)}`)}`
        : `Square back: ${m(`(${k}\\sqrt{${b}})^2 = ${num(k * k)} \\cdot ${b} = ${num(k * k * b)}`)}, and ${m(`(${head}\\sqrt{${N}})^2 = ${cc * cc} \\cdot ${num(N)} = ${num(cc * cc * N)}`)}`,
    tip: "To simplify a square root, split the number into the largest perfect square times what is left, and take the square root of the square",
    hint: `Look for the largest perfect square that divides ${n(N)}.`,
  };
  if (format === "spr") {
    return {
      ...common,
      stem: `If ${m(`${head}\\sqrt{${N}} = k\\sqrt{${b}}`)}, where ${m("k")} is a positive integer, what is the value of ${m("k")}?`,
      answer: numAnswer(k, m(num(k))),
      slips: [
        numSlip(cc * a * a, `you took ${n(a * a)} out of the root without taking its square root`),
        cc > 1
          ? numSlip(cc + a, `you added ${n(cc)} and ${n(a)} instead of multiplying them`)
          : numSlip(a * b, "you multiplied the two factors and dropped the root"),
      ],
      difficulty: N > 200 || cc > 1 ? 3 : 2,
      isCorrect: (c) => {
        const v = valueOf(c);
        return (
          !!v &&
          v.sign() > 0 &&
          v
            .mul(v)
            .mul(b)
            .eq(cc * cc * N)
        );
      },
    };
  }
  const slips: Slip[] = [
    symSlip(
      S.root(b, cc * a * a),
      `you took ${n(a * a)} out of the root without taking its square root`
    ),
    symSlip(S.rat(k * b), "you multiplied the numbers and dropped the root"),
    symSlip(S.root(a, cc * b), "you swapped the number outside the root with the number inside"),
  ];
  if (cc > 1)
    slips.splice(
      1,
      0,
      symSlip(S.root(b, cc + a), `you added ${n(cc)} and ${n(a)} instead of multiplying them`)
    );
  return {
    ...common,
    stem: `Which expression is equivalent to ${m(`${head}\\sqrt{${N}}`)}?`,
    answer: symAns(value),
    slips,
    difficulty: N > 200 || cc > 1 ? 2 : 1,
    isCorrect: (c) => !!c.value && c.value.toNumber() > 0 && c.value.mul(c.value).eq(cc * cc * N),
  };
}

function sumRoots(rng: Rng, format: Format = "mc"): Part {
  const b = rng.pick(FREE);
  const p = rng.int(1, 12);
  const q = rng.int(2, 12);
  const s = rng.bool(0.6) ? 1 : -1;
  need(p !== q && p * p * b <= 1500 && q * q * b <= 1500, "sizes");
  need(s > 0 || p > q, "positive difference");
  const P = p * p * b;
  const Q = q * q * b;
  const op = s > 0 ? "+" : "-";
  const value = S.root(b, p + s * q);
  const slips: Slip[] = [
    symSlip(
      S.root(b, p * q),
      "you multiplied the numbers outside the roots instead of adding them"
    ),
  ];
  if (s > 0) {
    slips.unshift(
      symSlip(S.root(P + Q), "you added the numbers under the roots, but roots do not add that way")
    );
    slips.push(
      symSlip(
        S.root(2 * b, p + q),
        `you added the numbers under the roots too: ${m(`\\sqrt{${b}} + \\sqrt{${b}}`)} is ${m(`2\\sqrt{${b}}`)}, not ${m(`\\sqrt{${2 * b}}`)}`
      )
    );
  } else {
    slips.unshift(
      symSlip(
        S.root(P - Q),
        "you subtracted the numbers under the roots, but roots do not subtract that way"
      )
    );
    slips.push(
      symSlip(S.root(b, p + q), "you added the simplified roots instead of subtracting them")
    );
  }
  const typed = format === "spr";
  return {
    stem: typed
      ? `If ${m(`\\sqrt{${P}} ${op} \\sqrt{${Q}} = k\\sqrt{${b}}`)}, where ${m("k")} is an integer, what is the value of ${m("k")}?`
      : `Which expression is equivalent to ${m(`\\sqrt{${P}} ${op} \\sqrt{${Q}}`)}?`,
    answer: typed ? numAnswer(p + s * q, m(num(p + s * q))) : symAns(value),
    slips: typed
      ? [
          numSlip(p * q, "you multiplied the numbers outside the roots instead of combining them"),
          numSlip(
            p - s * q,
            `you ${s > 0 ? "subtracted" : "added"} instead of ${s > 0 ? "adding" : "subtracting"}`
          ),
        ]
      : slips,
    asks: "the sum as a single multiple of one square root",
    steps: [
      {
        label: "Simplify each root",
        work: `${m(`\\sqrt{${P}} = ${sym(S.root(P))}`)} and ${m(`\\sqrt{${Q}} = ${sym(S.root(Q))}`)}`,
      },
      {
        label: "Combine like roots",
        work: `Both are multiples of ${m(`\\sqrt{${b}}`)}: ${m(`${sym(S.root(P))} ${op} ${sym(S.root(Q))} = ${sym(value)}`)}`,
      },
    ],
    check: `Estimate: ${m(`\\sqrt{${P}} \\approx ${Math.sqrt(P).toFixed(2)}`)} and ${m(`\\sqrt{${Q}} \\approx ${Math.sqrt(Q).toFixed(2)}`)}, which combine to about ${m((Math.sqrt(P) + s * Math.sqrt(Q)).toFixed(2))}, and ${m(sym(value))} is about ${m(value.toNumber().toFixed(2))}`,
    tip: "You can add or subtract square roots only when the numbers under the roots match, so simplify each root first",
    hint: "Simplify each square root first.",
    difficulty: (s > 0 ? 2 : 3) + (typed ? 1 : 0),
    isCorrect: (c) => {
      const target = S.root(P).add(S.root(Q).mul(s));
      if (!typed) return !!c.value && c.value.eq(target);
      const v = valueOf(c);
      return !!v && S.root(b, v).eq(target);
    },
  };
}

function productRoots(rng: Rng): Part {
  const A = rng.int(2, 50);
  const B = rng.int(2, 50);
  need(
    !isSquare(A) &&
      !isSquare(B) &&
      A !== B &&
      !isSquare(A * B) &&
      S.root(A * B).entries()[0][1].n > 1,
    "a product that simplifies"
  );
  const value = S.root(A * B);
  const [[atom, coef]] = value.entries();
  return {
    stem: `Which expression is equivalent to ${m(`\\sqrt{${A}} \\cdot \\sqrt{${B}}`)}?`,
    answer: symAns(value),
    slips: [
      symSlip(S.root(A + B), "you added the numbers under the roots instead of multiplying them"),
      symSlip(S.rat(A * B), "you multiplied the numbers and dropped the root"),
      symSlip(
        S.root(coef.n, atom.rad),
        "you swapped the number outside the root with the number inside"
      ),
    ],
    asks: "the product as one simplified square root",
    steps: [
      {
        label: "Multiply under one root",
        work: m(`\\sqrt{${A}} \\cdot \\sqrt{${B}} = \\sqrt{${A * B}}`),
      },
      {
        label: "Simplify the root",
        work: m(`\\sqrt{${A * B}} = \\sqrt{${coef.n * coef.n} \\cdot ${atom.rad}} = ${sym(value)}`),
      },
    ],
    check: `Square both: ${m(`(\\sqrt{${A}} \\cdot \\sqrt{${B}})^2 = ${A} \\cdot ${B} = ${A * B}`)} and ${m(`(${sym(value)})^2 = ${coef.n * coef.n} \\cdot ${atom.rad} = ${A * B}`)}`,
    tip: `${m("\\sqrt{a} \\cdot \\sqrt{b} = \\sqrt{ab}")}; multiply first, then simplify`,
    hint: "Combine the two roots into one root first.",
    difficulty: 2,
    isCorrect: (c) => !!c.value && c.value.toNumber() > 0 && c.value.mul(c.value).eq(A * B),
  };
}

function rationalize(rng: Rng): Part {
  const b = rng.pick(FREE);
  const k = rng.int(2, 15);
  const d = rng.pick([1, 1, 1, 2, 3, 4]);
  const c = b * k * d;
  need(c <= 600, "small");
  const value = S.root(b, k);
  const den = d === 1 ? `\\sqrt{${b}}` : `${d}\\sqrt{${b}}`;
  return {
    stem: `Which expression is equivalent to ${m(`\\frac{${c}}{${den}}`)}?`,
    answer: symAns(value),
    slips: [
      symSlip(
        S.root(b, F(c, d)),
        `you multiplied the top by ${m(`\\sqrt{${b}}`)} but not the bottom`
      ),
      symSlip(S.rat(k), `you divided ${n(c)} by ${n(b * d)} and dropped the root`),
      symSlip(S.root(k), `you took the square root of ${m(`\\frac{${c}}{${b * d}}`)}`),
      symSlip(S.root(b, F(1, k)), "you flipped the fraction"),
    ],
    asks: "the fraction with no root in the denominator",
    steps: [
      {
        label: "Multiply by a form of 1",
        work: m(
          `\\frac{${c}}{${den}} \\cdot \\frac{\\sqrt{${b}}}{\\sqrt{${b}}} = \\frac{${c}\\sqrt{${b}}}{${b * d}}`
        ),
      },
      {
        label: "Simplify the fraction",
        work: m(`\\frac{${c}\\sqrt{${b}}}{${b * d}} = ${sym(value)}`),
      },
    ],
    check: `Multiply back: ${m(`(${sym(value)})(${den}) = ${k * d} \\cdot ${b} = ${c}`)}`,
    tip: "To clear a square root from a denominator, multiply the top and the bottom by that root",
    hint: `Multiply the top and the bottom by ${m(`\\sqrt{${b}}`)}.`,
    difficulty: c > 30 || d > 1 ? 4 : 3,
    isCorrect: (cand) => !!cand.value && cand.value.mul(S.root(b, d)).eq(c),
  };
}

export const ROOTS: Template = {
  id: "exp-rad.roots",
  skill: SKILL,
  label: "Simplify, combine and rationalize square roots",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format: Format): Draft {
    const part =
      format === "spr"
        ? rng.bool(0.5)
          ? simplifyRoot(rng, "spr")
          : sumRoots(rng, "spr")
        : rng.pick([
            (r: Rng) => simplifyRoot(r, "mc"),
            (r: Rng) => sumRoots(r),
            (r: Rng) => sumRoots(r),
            productRoots,
            rationalize,
          ])(rng);
    return { format, ...part };
  },
};

/* ---------------------------------------------------------------- unknown exponents */

function simpleExponent(rng: Rng): Part {
  const x = rng.pick(["x", "y", "t", "n", "w", "z"]);
  if (rng.bool(0.5)) {
    const q = rng.int(2, 6);
    const s = rng.int(2, 7);
    const p = rng.int(1, 5);
    const r = rng.int(1, 5);
    need(q !== s && gcd(p, q) === 1 && gcd(r, s) === 1, "lowest terms");
    const k = F(p, q).add(F(r, s));
    const show = (a: number, b: number) => (a === 1 ? root(b, x) : `${x}^{\\frac{${a}}{${b}}}`);
    return {
      stem: `If ${m(`${show(p, q)} \\cdot ${show(r, s)} = ${x}^{k}`)} for all positive values of ${m(x)}, what is the value of ${m("k")}?`,
      answer: numAnswer(k, m(fe(k))),
      slips: [
        numSlip(
          F(p + r, q + s),
          "you added the numerators and added the denominators of the exponents"
        ),
        numSlip(F(p * r, q * s), "you multiplied the exponents instead of adding them"),
        numSlip(
          F(p + r, q * s),
          "you added the numerators over the product of the denominators without rewriting the fractions"
        ),
      ],
      asks: `the single exponent ${m("k")} of the product`,
      steps: [
        {
          label: "Write each factor as a power",
          work: `${m(`${show(p, q)} = ${x}^{${fe(F(p, q))}}`)} and ${m(`${show(r, s)} = ${x}^{${fe(F(r, s))}}`)}`,
        },
        {
          label: "Add the exponents",
          work: m(
            `${fe(F(p, q))} + ${fe(F(r, s))} = ${fe(F(p * s, q * s))} + ${fe(F(r * q, q * s))} = ${fe(k)}`
          ),
        },
      ],
      check: `With ${m(`${x} = 2`)}: ${m(`2^{${fe(F(p, q))}} \\approx ${(2 ** (p / q)).toFixed(3)}`)} and ${m(`2^{${fe(F(r, s))}} \\approx ${(2 ** (r / s)).toFixed(3)}`)}, whose product is about ${m((2 ** k.toNumber()).toFixed(3))}, which is ${m(`2^{${fe(k)}}`)}`,
      tip: "Multiplying powers of the same base adds the exponents, fractions included; use a common denominator",
      hint: "Write each root as a fractional power.",
      difficulty: 5,
      isCorrect: (c) => {
        const v = valueOf(c);
        return (
          !!v &&
          agrees(
            (b) => b ** (p / q) * b ** (r / s),
            (b) => b ** v.toNumber()
          )
        );
      },
    };
  }
  const p = rng.int(1, 9);
  const q = rng.int(2, 8);
  const j = rng.int(1, 6);
  need(gcd(p, q) === 1, "lowest terms");
  const k = q * j;
  const t = p * j;
  return {
    stem: `If ${m(`(${x}^{\\frac{${p}}{${q}}})^{k} = ${x}^{${t}}`)} for all positive values of ${m(x)}, what is the value of ${m("k")}?`,
    answer: numAnswer(k, m(num(k))),
    slips: [
      numSlip(F(t).sub(F(p, q)), "you added the exponents instead of multiplying them"),
      numSlip(
        F(t * p, q),
        `you multiplied ${n(t)} by ${m(`\\frac{${p}}{${q}}`)} instead of dividing`
      ),
      numSlip(F(t, p), `you ignored the denominator ${n(q)}`),
    ],
    asks: `the power ${m("k")} that turns ${m(`${x}^{\\frac{${p}}{${q}}}`)} into ${m(`${x}^{${t}}`)}`,
    steps: [
      {
        label: "Use the power of a power",
        work: m(
          `(${x}^{\\frac{${p}}{${q}}})^{k} = ${x}^{\\frac{${p}k}{${q}}}`.replace("{1k}", "{k}")
        ),
      },
      {
        label: "Match the exponents",
        work: `${m(`\\frac{${p}k}{${q}} = ${t}`.replace("{1k}", "{k}"))}, so ${m(`k = ${k}`)}`,
      },
    ],
    check: `With ${m(`k = ${k}`)}, the exponent is ${m(`\\frac{${p}}{${q}} \\cdot ${k} = ${t}`)}`,
    tip: "A power of a power multiplies the exponents",
    hint: "Multiply the exponents on the left.",
    difficulty: 4,
    isCorrect: (c) => {
      const v = valueOf(c);
      return (
        !!v &&
        agrees(
          (b) => (b ** (p / q)) ** v.toNumber(),
          (b) => b ** t
        )
      );
    },
  };
}

function rootProduct(rng: Rng, format: Format): Part {
  const N = rng.int(2, 150);
  const a = rng.int(2, 9);
  const b = rng.int(2, 9);
  const c = rng.int(2, 5);
  need(a !== b && c % b !== 0, "distinct roots");
  const d = rng.pick([1, 1, 2, 3, 5, 6, 10, 12, 15, 30]);
  const E = F(1, a).add(F(c, b));
  const x = E.div(d);
  need(format === "mc" || fits(x), "fits the box");
  const base = `${N}n`;
  const target = d === 1 ? `(${base})^{x}` : `(${base})^{${d}x}`;
  const slips = [
    numSlip(
      F(1 + c, a + b).div(d),
      "you added the numerators and added the denominators of the exponents"
    ),
    numSlip(F(c, a * b).div(d), "you multiplied the exponents instead of adding them"),
    numSlip(F(1, a).add(F(1, b)).mul(c).div(d), `you raised both roots to the power ${n(c)}`),
  ];
  if (d !== 1)
    slips.unshift(numSlip(E, `you found the total exponent but did not divide it by ${n(d)}`));
  return {
    stem: `${m(`${root(a, base)}\\left(${root(b, base)}\\right)^{${c}}`)}\n\nFor what value of ${m("x")} is the given expression equivalent to ${m(target)}, where ${m("n > 1")}?`,
    answer: numAnswer(x, m(fe(x))),
    slips,
    asks: `the value of ${m("x")} that makes the exponents of ${m(base)} match`,
    steps: [
      {
        label: "Write each root as a power",
        work: `${m(`${root(a, base)} = (${base})^{${fe(F(1, a))}}`)} and ${m(`\\left(${root(b, base)}\\right)^{${c}} = (${base})^{${fe(F(c, b))}}`)}`,
      },
      { label: "Add the exponents", work: m(`${fe(F(1, a))} + ${fe(F(c, b))} = ${fe(E)}`) },
      {
        label: `Solve for ${m("x")}`,
        work: d === 1 ? m(`x = ${fe(E)}`) : `${m(`${d}x = ${fe(E)}`)}, so ${m(`x = ${fe(x)}`)}`,
      },
    ],
    check: `With ${m(`x = ${fe(x)}`)}, the exponent on the right is ${m(d === 1 ? fe(x) : `${d} \\cdot ${fe(x)} = ${fe(E)}`)}, which matches the left side`,
    tip: "Write every root as a fractional power of the same base, then add the exponents",
    hint: "Rewrite each root as a fractional power.",
    difficulty: d === 1 ? 6 : 7,
    isCorrect: (cand) => {
      const v = valueOf(cand);
      return (
        !!v &&
        agrees(
          (t) => (N * t) ** (1 / a) * ((N * t) ** (1 / b)) ** c,
          (t) => (N * t) ** (d * v.toNumber())
        )
      );
    },
  };
}

function sqrtOfPower(rng: Rng): Part {
  const [s, mm] = rng.pick([
    [2, 3],
    [2, 5],
    [2, 7],
    [2, 9],
    [3, 3],
    [3, 5],
    [3, 7],
    [4, 3],
    [4, 5],
    [5, 3],
    [5, 5],
    [6, 3],
    [7, 3],
    [10, 3],
  ]);
  const r = rng.int(2, 12);
  const c = s * s;
  const C = s ** mm;
  const k = F(r * mm, 2);
  const y = rng.pick(["y", "x", "w", "t"]);
  return {
    stem: `${m(`\\sqrt{(${c}${y})^{${mm}}} = ${C}\\left(${root(r, y)}\\right)^{k}`)}\n\nIn the given equation, ${m(`${y} > 0`)} and ${m("k")} is a constant. What is the value of ${m("k")}?`,
    answer: numAnswer(k, m(fe(k))),
    slips: [
      numSlip(
        F(mm, 2),
        `you matched the exponents of ${m(y)} but forgot the ${r === 2 ? "square" : r === 3 ? "cube" : `${r}th`} root on the right`
      ),
      numSlip(r * mm, "you forgot the square root on the left"),
      numSlip(F(mm, 2 * r), `you divided by ${n(r)} instead of multiplying`),
    ],
    asks: `the exponent ${m("k")} that makes the powers of ${m(y)} match`,
    steps: [
      {
        label: "Simplify the left side",
        work: m(
          `\\sqrt{(${c}${y})^{${mm}}} = (${c}${y})^{\\frac{${mm}}{2}} = ${c}^{\\frac{${mm}}{2}} \\cdot ${y}^{\\frac{${mm}}{2}} = ${C}${y}^{\\frac{${mm}}{2}}`
        ),
      },
      {
        label: "Simplify the right side",
        work: m(`${C}\\left(${root(r, y)}\\right)^{k} = ${C}${y}^{\\frac{k}{${r}}}`),
      },
      {
        label: "Match the exponents",
        work: `${m(`\\frac{k}{${r}} = \\frac{${mm}}{2}`)}, so ${m(`k = ${fe(k)}`)}`,
      },
    ],
    check: `With ${m(`k = ${fe(k)}`)}, the right side is ${m(`${C}${y}^{${fe(k.div(r))}}`)}, the same as the left`,
    tip: "Turn every root into a fractional power, then compare the exponents of the same base",
    hint: "Rewrite both roots as fractional powers.",
    difficulty: 6,
    isCorrect: (cand) => {
      const v = valueOf(cand);
      return (
        !!v &&
        agrees(
          (t) => Math.sqrt((c * t) ** mm),
          (t) => C * (t ** (1 / r)) ** v.toNumber()
        )
      );
    },
  };
}

function twoRoots(rng: Rng, format: Format): Part {
  const p = rng.int(2, 7);
  const q = rng.int(2, 9);
  const r = rng.int(2, 7);
  const s = rng.int(2, 9);
  need(
    q % p !== 0 && s % r !== 0 && gcd(p, q) === 1 && gcd(r, s) === 1,
    "roots that do not simplify"
  );
  const E = F(q, p).mul(F(r, s));
  need(!E.isInt(), "fractional power");
  const u = rng.pick([2, 3]);
  const w = rng.pick([1, -1]);
  const a = E.sub(w).div(u);
  need(format === "mc" || fits(a), "fits the box");
  const lin = `${u}a ${w < 0 ? "-" : "+"} 1`;
  return {
    stem: `If ${m("n")} and ${m("k")} are numbers greater than $1$ and ${m(root(p, `n^{${q}}`))} is equivalent to ${m(root(r, `k^{${s}}`))}, for what value of ${m("a")} is ${m(`n^{${lin}}`)} equal to ${m("k")}?`,
    answer: numAnswer(a, m(fe(a))),
    slips: [
      numSlip(
        E,
        `you found the power of ${m("n")} that equals ${m("k")} but did not solve for ${m("a")}`
      ),
      numSlip(
        E.add(w).div(u),
        `you ${w > 0 ? "added" : "subtracted"} $1$ instead of ${w > 0 ? "subtracting" : "adding"} it`
      ),
      numSlip(
        F(q, p).mul(F(s, r)).sub(w).div(u),
        `you multiplied by ${m(`\\frac{${s}}{${r}}`)} instead of ${m(`\\frac{${r}}{${s}}`)} when you solved for ${m("k")}`
      ),
    ],
    asks: `the value of ${m("a")} that makes ${m(`n^{${lin}}`)} equal to ${m("k")}`,
    steps: [
      {
        label: "Write both roots as powers",
        work: m(`n^{\\frac{${q}}{${p}}} = k^{\\frac{${s}}{${r}}}`),
      },
      {
        label: `Solve for ${m("k")}`,
        work: `Raise both sides to the power ${m(`\\frac{${r}}{${s}}`)}: ${m(`k = n^{\\frac{${q}}{${p}} \\cdot \\frac{${r}}{${s}}} = n^{${fe(E)}}`)}`,
      },
      {
        label: "Match the exponents",
        work: `${m(`${lin} = ${fe(E)}`)}, so ${m(`${u}a = ${fe(E.sub(w))}`)} and ${m(`a = ${fe(a)}`)}`,
      },
    ],
    check: `With ${m(`a = ${fe(a)}`)}, the exponent is ${m(`${u} \\cdot ${a.sign() < 0 ? `\\left(${fe(a)}\\right)` : fe(a)} ${w < 0 ? "-" : "+"} 1 = ${fe(E)}`)}, the power of ${m("n")} that equals ${m("k")}`,
    tip: "Write both roots as fractional powers, solve for one base in terms of the other, then match exponents",
    hint: `Write both roots as fractional powers and solve for ${m("k")}.`,
    difficulty: 7,
    isCorrect: (cand) => {
      const v = valueOf(cand);
      if (!v) return false;
      const e = v.mul(u).add(w).toNumber();
      return agrees(
        (t) => (t ** q) ** (1 / p),
        (t) => ((t ** e) ** s) ** (1 / r)
      );
    },
  };
}

export const UNKNOWN_EXPONENT: Template = {
  id: "exp-rad.unknown-exponent",
  skill: SKILL,
  label: "Find an unknown exponent in an equation of roots and powers",
  difficulty: [4, 7],
  formats: ["mc", "spr"],
  make(rng, format: Format): Draft {
    const v = rng.pick(["simple", "simple", "product", "sqrt", "two"]);
    const part =
      v === "simple"
        ? simpleExponent(rng)
        : v === "product"
          ? rootProduct(rng, format)
          : v === "sqrt"
            ? sqrtOfPower(rng)
            : twoRoots(rng, format);
    return { format, ...part };
  },
};
