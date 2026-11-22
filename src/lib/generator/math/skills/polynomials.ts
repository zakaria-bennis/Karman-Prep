/*
 * m-polynomials: zeros, factors and the shape of the graph. Item models after the bank's
 * questions for this skill: what an x-intercept says about f, which factor a zero gives, the
 * intercepts of a factored polynomial, counting x-intercepts, the remainder theorem, the
 * coefficients that zeros fix, and reading a polynomial's graph (in _advexpr-polygraph.ts).
 * Checks use a different route: statements against the given points, sums of zeros by
 * Vieta's rule on the expanded form, remainders by long division.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { block, m, n, num } from "../core/tex";
import type { Rng } from "../core/rng";
import type { Answer, Draft, Format, Slip, Template } from "../core/types";
import { MPoly, factored, numSlip, product, rationalRoots, valueOf } from "./_advexpr-poly";
import { POLY_GRAPH, vieta } from "./_advexpr-polygraph";

const SKILL = "m-polynomials";
type Part = Omit<Draft, "format">;
const NAMES = ["f", "g", "h", "p", "q", "r"];
const keyed = (text: string, key: string, why = ""): Slip => ({ text, key, why });
const pt = (a: number | Frac, b: number | Frac) => `(${num(a)}, ${num(b)})`;
const list = (items: string[]) =>
  items.length === 2
    ? `${items[0]} and ${items[1]}`
    : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;

/** Distinct nonzero whole numbers, none the negative of another. */
function zeros(rng: Rng, k: number, lo = -9, hi = 9): number[] {
  const out: number[] = [];
  for (let guard = 0; out.length < k; guard++) {
    need(guard < 100, "zeros");
    const z = rng.nonzero(lo, hi);
    if (!out.includes(z) && !out.includes(-z)) out.push(z);
  }
  return out;
}

/* ---------------------------------------------------------------- zeros and factors */

function mustBeTrue(rng: Rng): Part {
  const f = rng.pick(NAMES);
  const zs = zeros(rng, rng.bool(0.6) ? 2 : 3);
  const [a, b] = zs;
  const st = (x: number, y: number) => m(`${f}(${num(x)}) = ${num(y)}`);
  const truth = (key: string) => {
    const [x, y] = key.split("|").map(Number);
    return y === 0 && zs.includes(x);
  };
  return {
    stem: `The graph of the polynomial function ${m(f)} in the ${m("xy")}-plane, where ${m(`y = ${f}(x)`)}, has ${m("x")}-intercepts at ${list(zs.map((z) => m(pt(z, 0))))}. Which of the following must be true?`,
    answer: keyed(st(a, 0), `${a}|0`),
    slips: [
      keyed(
        st(0, a),
        `0|${a}`,
        `you swapped the input and the output: ${m(pt(a, 0))} means ${m(`${f}(${a}) = 0`)}`
      ),
      keyed(st(b, a), `${b}|${a}`, "you paired two intercepts as an input and an output"),
      keyed(
        st(a, b),
        `${a}|${b}`,
        `you used the other intercept as the output, but every ${m("x")}-intercept has output $0$`
      ),
      keyed(st(0, b), `0|${b}`, `you swapped the input and the output of ${m(pt(b, 0))}`),
    ],
    asks: `which statement about ${m(f)} follows from the ${m("x")}-intercepts`,
    steps: [
      {
        label: "Read an intercept as a point",
        work: `The point ${m(pt(a, 0))} is on the graph of ${m(`y = ${f}(x)`)}, so when ${m(`x = ${a}`)}, ${m("y = 0")}`,
      },
      { label: "Write it in function notation", work: m(`${f}(${a}) = 0`) },
    ],
    check: `Each ${m("x")}-intercept ${m("(c, 0)")} gives ${m(`${f}(c) = 0`)}; nothing is known about ${m(`${f}(0)`)}, so the other statements need not be true`,
    tip: `An ${m("x")}-intercept ${m("(c, 0)")} of ${m("y = f(x)")} means ${m("f(c) = 0")}: the input is ${m("c")} and the output is $0$`,
    hint: `What is the ${m("y")}-value at an ${m("x")}-intercept?`,
    difficulty: zs.length === 3 ? 2 : 1,
    isCorrect: (c) => !!c.key && truth(c.key),
  };
}

function factorFromPoints(rng: Rng): Part {
  const f = rng.pick(NAMES);
  const zs = zeros(rng, rng.bool(0.5) ? 2 : 3);
  const extra = rng.bool(0.5);
  const ex = rng.int(1, 9);
  const ey = rng.int(2, 15);
  need(
    !zs.includes(ex) && !zs.includes(-ex) && !zs.includes(ey) && !zs.includes(-ey) && ex !== ey,
    "extra point"
  );
  const points = [...zs.map((z) => pt(z, 0)), ...(extra ? [pt(ex, ey)] : [])];
  const a = rng.pick(zs);
  const other = zs.find((z) => z !== a)!;
  const fac = (r: number) => m(MPoly.lin(1, -r).tex());
  const slips: Slip[] = [
    keyed(
      fac(-a),
      String(-a),
      `you kept the sign of the intercept, but a zero at ${m(`x = ${a}`)} gives the factor ${m(MPoly.lin(1, -a).tex())}`
    ),
    keyed(fac(-other), String(-other), `you kept the sign of the intercept ${m(pt(other, 0))}`),
  ];
  if (extra) {
    slips.push(
      keyed(
        fac(ex),
        String(ex),
        `${m(pt(ex, ey))} is not an ${m("x")}-intercept, because its ${m("y")}-value is not $0$`
      )
    );
    slips.push(
      keyed(fac(ey), String(ey), `you used the ${m("y")}-value of ${m(pt(ex, ey))} as a zero`)
    );
  } else
    slips.push(
      keyed(m("x"), "0", `${m("x")} is a factor only when the graph passes through the origin`)
    );
  return {
    stem: `For the polynomial function ${m(f)}, the graph of ${m(`y = ${f}(x)`)} in the ${m("xy")}-plane passes through the points ${list(points.map((p) => m(p)))}. Which of the following must be a factor of ${m(`${f}(x)`)}?`,
    answer: keyed(fac(a), String(a)),
    slips,
    asks: `a factor that the zeros of ${m(f)} guarantee`,
    steps: [
      {
        label: "Find the zeros",
        work: `The points with ${m("y = 0")} are the ${m("x")}-intercepts, so ${list(zs.map((z) => m(`${f}(${z}) = 0`)))}`,
      },
      {
        label: "Turn a zero into a factor",
        work: `If ${m(`${f}(${a}) = 0`)}, then ${m(`x - (${a})`)}, which is ${fac(a)}, is a factor`,
      },
    ],
    check: `${fac(a)} is $0$ exactly when ${m(`x = ${a}`)}, and ${m(`${f}(${a}) = 0`)}`,
    tip: `If ${m("f(c) = 0")}, then ${m("x - c")} is a factor of ${m("f(x)")}; watch the sign`,
    hint: `Which of the points are ${m("x")}-intercepts?`,
    difficulty: extra ? 3 : 2,
    isCorrect: (c) => c.key !== undefined && zs.includes(Number(c.key)),
  };
}

function interceptValue(rng: Rng): Part {
  const f = rng.pick(NAMES);
  const k = rng.pick([2, 3, 4, -2, -3, 5]);
  const rs = zeros(rng, 3, -15, 15);
  const half = rng.bool(0.35);
  const odd = rng.pick([1, 3, 5, 7, 9]) * rng.sign();
  const facs = [
    ...rs.slice(0, half ? 2 : 3).map((r) => MPoly.lin(1, -r)),
    ...(half ? [MPoly.lin(2, -odd)] : []),
  ];
  const roots = [...rs.slice(0, half ? 2 : 3).map((r) => F(r)), ...(half ? [F(odd, 2)] : [])];
  const P = product(k, facs);
  const given = `${f}(x) = ${factored(k, facs)}`;
  const askSum = !half && rng.bool(0.5);
  const sum = roots.reduce((s, r) => s.add(r), F(0));
  const sorted = [...roots].sort((p, q) => p.cmp(q));
  const value = askSum ? sum : sorted[0];
  const fac = list(facs.map((p) => m(`(${p.tex()})`))).replace(" and ", " or ");
  return {
    stem: askSum
      ? `The graph of ${m(`y = ${factored(k, facs)}`)} in the ${m("xy")}-plane has ${m("x")}-intercepts at ${m("(a, 0)")}, ${m("(b, 0)")}, and ${m("(c, 0)")}. What is the value of ${m("a + b + c")}?`
      : `${block(given)}\nIf the given function ${m(f)} is graphed in the ${m("xy")}-plane, where ${m(`y = ${f}(x)`)}, what is the smallest ${m("x")}-coordinate of an ${m("x")}-intercept of the graph?`,
    answer: numAnswer(value, m(num(value))),
    slips: askSum
      ? [
          numSlip(sum.neg(), "you used the numbers in the factors without changing their signs"),
          numSlip(sum.add(k), `you counted the leading coefficient ${n(k)} as an intercept`),
          numSlip(sum.mul(k), `you multiplied the sum by the leading coefficient ${n(k)}`),
        ]
      : [
          numSlip(
            sorted[sorted.length - 1].neg(),
            "you read the numbers in the factors as the intercepts without changing their signs"
          ),
          numSlip(sorted[sorted.length - 1], "you found the largest intercept, not the smallest"),
          numSlip(F(k), "you used the leading coefficient, which does not give an intercept"),
          ...(half
            ? [
                numSlip(
                  F(odd),
                  `you set ${m(`2x ${odd < 0 ? "+" : "-"} ${Math.abs(odd)}`)} to zero but did not divide by $2$`
                ),
              ]
            : []),
        ],
    asks: askSum
      ? `the sum of the ${m("x")}-coordinates of the three ${m("x")}-intercepts`
      : `the least ${m("x")}-value where the graph meets the ${m("x")}-axis`,
    steps: [
      {
        label: "Set each factor to zero",
        work: `The graph meets the ${m("x")}-axis where ${m("y = 0")}, which happens when one of the factors ${fac} is zero`,
      },
      {
        label: "Solve for each zero",
        work: `The ${m("x")}-intercepts are at ${list(roots.map((r) => m(`x = ${num(r)}`)))}`,
      },
      askSum
        ? {
            label: "Add them",
            work: m(
              `${roots.map((r, i) => (i === 0 ? num(r) : r.sign() < 0 ? `- ${num(r.neg())}` : `+ ${num(r)}`)).join(" ")} = ${num(sum)}`
            ),
          }
        : { label: "Pick the smallest", work: `The smallest is ${m(num(value))}` },
    ],
    check: askSum
      ? `Expand the cubic: ${m(P.tex())}. The sum of the zeros of ${m("ax^3 + bx^2 + cx + d")} is ${m("-\\frac{b}{a}")}: ${m(`-\\left(\\frac{${num(P.coef({ x: 2 }))}}{${num(P.coef({ x: 3 }))}}\\right) = ${num(sum)}`)}`
      : `At ${m(`x = ${num(value)}`)}, one factor is $0$, so ${m(`${f}(${num(value)}) = 0`)}`,
    tip: "Each factor of a factored polynomial gives a zero: set the factor equal to $0$ and solve, minding the sign",
    hint: "Set each factor equal to zero.",
    difficulty: half ? 4 : 3,
    isCorrect: (c) => {
      const v = valueOf(c);
      if (!v) return false;
      if (askSum)
        return v.eq(
          P.coef({ x: 2 })
            .neg()
            .div(P.coef({ x: 3 }))
        );
      const rr = rationalRoots(P);
      return rr.length > 0 && rr[0].eq(v);
    },
  };
}

function countIntercepts(rng: Rng): Part {
  const f = rng.pick(NAMES);
  const rs = zeros(rng, rng.int(2, 3), -12, 12);
  const mult = rs.map(() => rng.pick([1, 1, 2, 2, 3]));
  need(mult.reduce((t, k) => t + k, 0) <= 6, "a modest degree");
  const withX = rng.bool(0.5);
  const quad = rng.bool(0.5);
  const qc = rng.int(1, 25);
  const facs: [MPoly, number][] = rs.map((r, i) => [MPoly.lin(1, -r), mult[i]]);
  const lead = withX ? MPoly.v("x", 1, rng.pick([1, 1, 2])) : MPoly.c(1);
  if (quad) facs.push([MPoly.uni([1, 0, qc]), 1]);
  need(mult.some((k) => k > 1) || quad || withX, "a trap");
  const P = product(lead, facs);
  const count = rs.length + (withX ? 1 : 0);
  const realDegree = mult.reduce((s, k) => s + k, 0) + lead.degree();
  return {
    stem: `Exactly how many ${m("x")}-intercepts does the graph of ${m(`${f}(x) = ${factored(lead, facs)}`)} have in the ${m("xy")}-plane, where ${m(`y = ${f}(x)`)}?`,
    answer: numAnswer(count, m(String(count))),
    slips: [
      numSlip(realDegree, "you counted a repeated factor once for each time it repeats"),
      ...(quad
        ? [
            numSlip(
              count + 2,
              `you counted ${m(`x^2 + ${qc}`)} as two intercepts, but it is never $0$`
            ),
          ]
        : []),
      ...(withX
        ? [
            numSlip(
              count - 1,
              `you left out the intercept at the origin, from the factor ${m(lead.tex())}`
            ),
          ]
        : []),
      numSlip(P.degree(), "you used the degree of the polynomial"),
      numSlip(rs.length + (quad ? 1 : 0), "you counted one intercept per bracket"),
      numSlip(count + 1, `you also counted the ${m("y")}-intercept`),
    ],
    asks: `the number of different points where the graph meets the ${m("x")}-axis`,
    steps: [
      {
        label: "Find the real zeros",
        work: `${withX ? `The factor ${m(lead.tex())} gives ${m("x = 0")}; ` : ""}the other brackets give ${list(rs.map((r) => m(`x = ${r}`)))}${quad ? `, and ${m(`x^2 + ${qc}`)} is always positive, so it gives none` : ""}`,
      },
      {
        label: "Count each zero once",
        work: `A repeated factor gives the same intercept again, so there are ${m(String(count))} different ${m("x")}-intercepts`,
      },
    ],
    check: `The ${m("x")}-intercepts are at ${list([...(withX ? [0] : []), ...rs].map((r) => m(pt(r, 0))))}: ${count} points`,
    tip: `Count different zeros, not factors: a squared or cubed factor still gives one ${m("x")}-intercept, and a factor like ${m("x^2 + 4")} gives none`,
    hint: "Find every value of x that makes a factor zero, and count each value once.".replace(
      "x that",
      "$x$ that"
    ),
    difficulty: quad && mult.some((k) => k > 1) ? 3 : 2,
    isCorrect: (c) => {
      // Count the whole-number zeros of the expanded polynomial directly (its zeros are whole numbers).
      let zerosFound = 0;
      for (let t = -30; t <= 30; t++) if (P.eval({ x: t }) === 0) zerosFound++;
      return valueOf(c)?.eq(zerosFound) ?? false;
    },
  };
}

export const zerosFactors: Template = {
  id: "poly.zeros-factors",
  skill: SKILL,
  label: "Zeros, x-intercepts and factors",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format: Format): Draft {
    const part =
      format === "spr"
        ? interceptValue(rng)
        : rng.pick([
            mustBeTrue,
            mustBeTrue,
            factorFromPoints,
            factorFromPoints,
            interceptValue,
            countIntercepts,
          ])(rng);
    return { format, ...part };
  },
};

/* ---------------------------------------------------------------- remainders */

function remainderDivide(P: MPoly, a: Frac): Frac {
  return P.divmod(MPoly.lin(1, a.neg())).r.coef();
}

function remainderValue(rng: Rng): Part {
  const p = rng.pick(NAMES.slice(3));
  const a = rng.nonzero(-4, 4);
  const cs = [rng.pick([1, 2, 3, -1, -2]), rng.int(-9, 9), rng.int(-9, 9), rng.nonzero(-12, 12)];
  const P = MPoly.uni(cs);
  const val = P.at({ x: a });
  const at = (x: number) =>
    cs
      .map((c, i) => [c, 3 - i] as const)
      .filter(([c]) => c !== 0)
      .map(([c, e], j) => {
        const mag = Math.abs(c);
        const body =
          e === 0 ? String(mag) : `${mag === 1 ? "" : mag}(${num(x)})${e > 1 ? `^${e}` : ""}`;
        return j === 0 ? `${c < 0 ? "-" : ""}${body}` : `${c < 0 ? "-" : "+"} ${body}`;
      })
      .join(" ");
  return {
    stem: `${block(`${p}(x) = ${P.tex()}`)}\nWhat is the remainder when ${m(`${p}(x)`)} is divided by ${m(MPoly.lin(1, -a).tex())}?`,
    answer: numAnswer(val, m(num(val))),
    slips: [
      numSlip(
        P.at({ x: -a }),
        `you put in ${m(`x = ${-a}`)}, but the remainder for ${m(MPoly.lin(1, -a).tex())} comes from ${m(`x = ${a}`)}`
      ),
      numSlip(val.sub(cs[3]), "you left out the constant term"),
      numSlip(
        F(cs[3]),
        "you gave the constant term, which is the remainder only for division by x".replace(
          "by x",
          "by $x$"
        )
      ),
    ],
    asks: `the remainder of ${m(`${p}(x) \\div (${MPoly.lin(1, -a).tex()})`)}`,
    steps: [
      {
        label: "Use the remainder theorem",
        work: `The remainder when ${m(`${p}(x)`)} is divided by ${m(MPoly.lin(1, -a).tex())} is ${m(`${p}(${a})`)}`,
      },
      { label: `Evaluate ${m(`${p}(${a})`)}`, work: m(`${p}(${a}) = ${at(a)} = ${num(val)}`) },
    ],
    check: `Divide it out: long division gives ${m(`${p}(x) = (${MPoly.lin(1, -a).tex()})(${P.divmod(MPoly.lin(1, -a)).q.tex()}) ${val.sign() < 0 ? "-" : "+"} ${num(val.abs())}`)}, so the remainder is ${n(val)}`,
    tip: `The remainder when ${m("p(x)")} is divided by ${m("x - c")} is ${m("p(c)")}: put in the number that makes the divisor zero`,
    hint: `What value of ${m("x")} makes ${m(MPoly.lin(1, -a).tex())} equal to zero?`,
    difficulty: a < 0 ? 4 : 3,
    isCorrect: (c) => valueOf(c)?.eq(remainderDivide(P, F(a))) ?? false,
  };
}

function remainderStatement(rng: Rng): Part {
  const p = rng.pick(NAMES.slice(3));
  const a = rng.nonzero(-9, 9);
  const r = rng.bool(0.3) ? 0 : rng.nonzero(-12, 12);
  need(r !== a && r !== -a, "distinct numbers");
  const fac = (t: number) => `${m(MPoly.lin(1, -t).tex())} is a factor of ${m(`${p}(x)`)}`;
  const rem = (t: number, v: number) =>
    `The remainder when ${m(`${p}(x)`)} is divided by ${m(MPoly.lin(1, -t).tex())} is ${n(v)}`;
  const truth = (key: string) => {
    const [kind, t, v] = key.split("|");
    return kind === "f" ? r === 0 && Number(t) === a : Number(t) === a && Number(v) === r;
  };
  const answer: Answer =
    r === 0 ? { text: fac(a), key: `f|${a}` } : { text: rem(a, r), key: `r|${a}|${r}` };
  const slips: Slip[] =
    r === 0
      ? [
          keyed(
            fac(-a),
            `f|${-a}`,
            `you kept the sign of ${n(a)}; the zero ${m(`x = ${a}`)} gives the factor ${m(MPoly.lin(1, -a).tex())}`
          ),
          keyed(
            rem(a, a),
            `r|${a}|${a}`,
            `you used the input ${n(a)} as the remainder, but the remainder is the output, $0$`
          ),
          keyed(
            rem(-a, 0),
            `r|${-a}|0`,
            `you used ${m(`x = ${-a}`)}; dividing by ${m(MPoly.lin(1, a).tex())} gives the remainder ${m(`${p}(${-a})`)}, which is not known`
          ),
        ]
      : [
          keyed(
            fac(a),
            `f|${a}`,
            `${m(MPoly.lin(1, -a).tex())} would be a factor only if ${m(`${p}(${a})`)} were $0$, but it is ${n(r)}`
          ),
          keyed(
            fac(r),
            `f|${r}`,
            `you swapped the input and the output: ${n(r)} is a value of ${m(p)}, not a zero`
          ),
          keyed(rem(r, a), `r|${r}|${a}`, "you swapped the input and the output"),
          keyed(
            rem(-a, r),
            `r|${-a}|${r}`,
            `you used ${m(MPoly.lin(1, a).tex())}, but ${m(`${p}(${a})`)} is the remainder for ${m(MPoly.lin(1, -a).tex())}`
          ),
        ];
  return {
    stem: `For a polynomial function ${m(p)}, ${m(`${p}(${a}) = ${r}`)}. Which of the following must be true?`,
    answer,
    slips,
    asks: `what the value ${m(`${p}(${a}) = ${r}`)} says about dividing ${m(`${p}(x)`)}`,
    steps: [
      {
        label: "Use the remainder theorem",
        work: `The remainder when ${m(`${p}(x)`)} is divided by ${m(MPoly.lin(1, -a).tex())} is ${m(`${p}(${a})`)}`,
      },
      {
        label: "Read the given value",
        work:
          r === 0
            ? `The remainder is $0$, so ${m(MPoly.lin(1, -a).tex())} divides ${m(`${p}(x)`)} exactly: it is a factor`
            : `The remainder is ${n(r)}, so ${m(MPoly.lin(1, -a).tex())} is not a factor`,
      },
    ],
    check: `Write ${m(`${p}(x) = (${MPoly.lin(1, -a).tex()})Q(x) + R`)}, where ${m("Q(x)")} is the quotient; putting in ${m(`x = ${a}`)} gives ${m(`${p}(${a}) = R`)}, so ${m(`R = ${r}`)}`,
    tip: `${m("p(c)")} is the remainder when ${m("p(x)")} is divided by ${m("x - c")}; it is a factor exactly when ${m("p(c) = 0")}`,
    hint: `What does dividing ${m(`${p}(x)`)} by ${m(MPoly.lin(1, -a).tex())} have to do with ${m(`${p}(${a})`)}?`,
    difficulty: r === 0 ? 4 : 5,
    isCorrect: (c) => !!c.key && truth(c.key),
  };
}

function unknownCoefficient(rng: Rng): Part {
  const p = rng.pick(NAMES.slice(3));
  const a = rng.nonzero(-3, 3);
  const k = rng.nonzero(-9, 9);
  const b = rng.int(-9, 9);
  const c = rng.nonzero(-15, 15);
  const withK = (kv: Frac | number) => MPoly.uni([1, kv, b, c]);
  const R = withK(k).at({ x: a });
  const isFactor = R.isZero();
  const shown = `x^3 + kx^2 ${b === 0 ? "" : `${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}x `}${c < 0 ? "-" : "+"} ${Math.abs(c)}`;
  const solveWith = (x: number, rem: Frac) =>
    rem
      .sub(F(x).pow(3))
      .sub(F(b * x))
      .sub(c)
      .div(x * x);
  const divisor = MPoly.lin(1, -a).tex();
  return {
    stem: `${block(`${p}(x) = ${shown}`)}\nIn the given polynomial, ${m("k")} is a constant. ${isFactor ? `If ${m(divisor)} is a factor of ${m(`${p}(x)`)}, what` : `When ${m(`${p}(x)`)} is divided by ${m(divisor)}, the remainder is ${n(R)}. What`} is the value of ${m("k")}?`,
    answer: numAnswer(k, m(num(k))),
    slips: [
      numSlip(solveWith(-a, R), `you put in ${m(`x = ${-a}`)} instead of ${m(`x = ${a}`)}`),
      ...(isFactor
        ? []
        : [
            numSlip(
              solveWith(a, F(0)),
              "you set the expression equal to $0$ instead of to the remainder"
            ),
          ]),
      numSlip(
        solveWith(a, R.neg()),
        `you set ${m(`${p}(${a})`)} equal to ${n(R.neg())} instead of ${n(R)}`
      ),
      numSlip(F(k).neg(), "you moved a term across the equals sign without changing its sign"),
    ],
    asks: `the constant ${m("k")} that gives ${isFactor ? "a remainder of $0$" : `the remainder ${n(R)}`}`,
    steps: [
      {
        label: "Use the remainder theorem",
        work: `The remainder for ${m(divisor)} is ${m(`${p}(${a})`)}, so ${m(`${p}(${a}) = ${num(R)}`)}`,
      },
      {
        label: `Evaluate ${m(`${p}(${a})`)}`,
        work: m(
          `(${a})^3 + k(${a})^2 ${b === 0 ? "" : `${b < 0 ? "-" : "+"} ${Math.abs(b)}(${a}) `}${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${num(a ** 3 + b * a + c)} + ${a * a === 1 ? "" : a * a}k`
        ),
      },
      {
        label: `Solve for ${m("k")}`,
        work: `${m(`${num(a ** 3 + b * a + c)} + ${a * a === 1 ? "" : a * a}k = ${num(R)}`)}, so ${m(`k = ${k}`)}`,
      },
    ],
    check: `With ${m(`k = ${k}`)}, long division by ${m(divisor)} leaves ${m(num(R))}: ${m(`${p}(x) = (${divisor})(${withK(k).divmod(MPoly.lin(1, -a)).q.tex()}) ${R.sign() < 0 ? "-" : "+"} ${num(R.abs())}`.replace(" + 0", ""))}`,
    tip: "When a remainder or a factor is given, put the divisor's zero into the polynomial and solve the equation that results",
    hint: `Put ${m(`x = ${a}`)} into ${m(`${p}(x)`)}.`,
    difficulty: isFactor ? 5 : 6,
    isCorrect: (cand) => {
      const v = valueOf(cand);
      return !!v && remainderDivide(withK(v), F(a)).eq(R);
    },
  };
}

export const remainder: Template = {
  id: "poly.remainder",
  skill: SKILL,
  label: "The remainder theorem and the factor theorem",
  difficulty: [3, 6],
  formats: ["mc", "spr"],
  make(rng, format: Format): Draft {
    const part =
      format === "spr"
        ? rng.pick([remainderValue, unknownCoefficient])(rng)
        : rng.pick([remainderValue, remainderStatement, remainderStatement, unknownCoefficient])(
            rng
          );
    return { format, ...part };
  },
};

export const TEMPLATES: Template[] = [zerosFactors, remainder, vieta, POLY_GRAPH];
