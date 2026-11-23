/*
 * m-solving-quadratics: factoring, the formula, and how many solutions there are. Item models
 * after the bank's own questions for this skill: the zero product property and factoring
 * (one solution, all solutions, the greatest or the positive one), the quadratic formula with
 * exact radical answers, the number of real solutions, and the constant that sets that number
 * (in _adveq-quad-count.ts). Every check solves the printed equation again by another route.
 */
import { need } from "../core/build";
import { F, Frac, gcd } from "../core/frac";
import { Sym } from "../core/sym";
import { block, m, n, num, paren, poly, signed, times } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import {
  SolutionSets,
  factorTex,
  listTex,
  pmTex,
  polyMul,
  productTex,
  quadAt,
  radTex,
  rationalRoots,
  rootParts,
  sameSet,
  slip,
  splitRoot,
  sqrtRat,
  sqrtSym,
  valueOf,
} from "./_adveq-common";
import { constantForCount, countSolutions } from "./_adveq-quad-count";

const SKILL = "m-solving-quadratics";
const VARS = ["x", "x", "x", "x", "t", "n", "w"];

type Kind = "one" | "all" | "greatest" | "least" | "positive" | "negative";

/** The answer a kind picks from a set of solutions, or null when the set has none. */
function pick(kind: Kind, set: readonly Frac[]): Frac | null {
  const sorted = [...set].sort((a, b) => a.cmp(b));
  if (!sorted.length) return null;
  if (kind === "greatest") return sorted[sorted.length - 1];
  if (kind === "least") return sorted[0];
  const pos = sorted.filter((x) => x.sign() > 0);
  const neg = sorted.filter((x) => x.sign() < 0);
  if (kind === "positive") return pos.length === 1 ? pos[0] : null;
  if (kind === "negative") return neg.length === 1 ? neg[0] : null;
  return null;
}

const ASK: Record<Kind, string> = {
  one: "Which of the following is a solution to the given equation?",
  all: "What are all the solutions to the given equation?",
  greatest: "What is the greatest solution to the given equation?",
  least: "What is the least solution to the given equation?",
  positive: "What is the positive solution to the given equation?",
  negative: "What is the negative solution to the given equation?",
};

export const factorSolve: Template = {
  id: "quad.factor-solve",
  skill: SKILL,
  label: "Solve by the zero product property or by factoring",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const v = rng.pick(VARS);
    const form = rng.pick([
      "two",
      "two",
      "lead",
      "three",
      "linear",
      "std",
      "std",
      "moved",
      "common",
    ] as const);
    const zp = ["two", "lead", "three", "linear"].includes(form);
    let roots: Frac[] = [];
    let k = F(1);
    let eq = "";
    let zero: Frac[] = [];
    const wrongSets: { set: Frac[]; why: string }[] = [];
    let factored = "";
    let b = 0;
    let c = 0;
    let g = 1;
    if (zp) {
      const ints = rng.sample(
        Array.from({ length: 35 }, (_, i) => i - 15).filter((x) => x !== 0),
        3
      );
      if (form === "two") roots = ints.slice(0, 2).map((x) => F(x));
      else if (form === "three") roots = ints.map((x) => F(x));
      else if (form === "lead") {
        k = F(rng.pick([2, 3, 4, 5, -2, -3, -4, -5]));
        roots = rng.bool(0.6) ? [F(0), F(ints[0]), F(ints[1])] : ints.map((x) => F(x));
      } else {
        const a = rng.pick([2, 3, 4, 5]);
        const top = rng.nonzero(-9, 9);
        need(gcd(a, top) === 1, "fraction in lowest terms");
        roots = [F(top, a), F(ints[0])];
        wrongSets.push({
          set: [F(top), F(ints[0])],
          why: `you solved ${m(`${factorTex(F(top, a), v)} = 0`)} as ${m(`${v} = ${top}`)} without dividing by ${a}`,
        });
      }
      const factors = roots.map((r) => factorTex(r, v));
      eq = `${productTex(k, factors)} = 0`;
      zero = roots.reduce(
        (acc, r) => polyMul(acc, r.isInt() ? [F(1), r.neg()] : [F(r.d), F(-r.n)]),
        [k]
      );
      const r0 = roots.find((r) => !r.isZero())!;
      wrongSets.push({
        set: roots.map((r) => r.neg()),
        why: `you took each number with the sign printed in its factor; ${m(`${factorTex(r0, v)} = 0`)} gives ${m(`${v} = ${num(r0)}`)}`,
      });
      if (!k.eq(1)) {
        wrongSets.push({
          set: [...roots, k],
          why: `you counted the constant ${n(k)} as a solution, but a nonzero constant is never $0$`,
        });
        if (roots.some((r) => r.isZero()))
          wrongSets.push({
            set: roots.filter((r) => !r.isZero()),
            why: `you left out ${m(`${v} = 0`)}, which comes from the factor ${m(v)}`,
          });
      }
    } else {
      const [r, s] = rng.sample(
        Array.from({ length: 25 }, (_, i) => i - 12).filter((x) => x !== 0),
        2
      );
      roots = [F(r), F(s)];
      b = -(r + s);
      c = r * s;
      need(b !== 0, "middle term");
      factored = productTex(
        1,
        roots.map((x) => factorTex(x, v))
      );
      if (form === "common") g = rng.pick([2, 3, 4, 5, -2, -3]);
      eq =
        form === "moved"
          ? `${poly([1, b, 0], v)} = ${num(-c)}`
          : `${poly([g, g * b, g * c], v)} = 0`;
      zero = [F(g), F(g * b), F(g * c)];
      wrongSets.push({
        set: roots.map((x) => x.neg()),
        why: `you factored with the signs reversed, as ${m(
          productTex(
            1,
            roots.map((x) => factorTex(x.neg(), v))
          )
        )}`,
      });
      // Another factor pair of c whose sum is not b: a real factoring slip.
      const pairs: [number, number][] = [];
      for (let d = 1; d <= Math.abs(c); d++) {
        if (c % d === 0) pairs.push([d, c / d], [-d, -c / d]);
      }
      const wrong = pairs.filter(([u, w]) => u + w !== b && u <= w);
      if (wrong.length) {
        const [u, w] = rng.pick(wrong);
        wrongSets.push({
          set: [F(-u), F(-w)],
          why: `you used ${n(u)} and ${n(w)}, which multiply to ${n(c)} but do not add to ${n(b)}`,
        });
      }
      if (form === "moved")
        wrongSets.push({
          set: [F(0), F(-b)],
          why: `you factored ${m(poly([1, b, 0], v))} and set each factor to $0$ before moving ${n(-c)} to the left side`,
        });
    }
    need(new Set(roots.map((r) => r.toString())).size === roots.length, "distinct roots");
    for (const r0 of roots.filter((r) => !r.isZero()).slice(0, 3)) {
      wrongSets.push({
        set: roots.map((r) => (r === r0 ? r.neg() : r)),
        why: `you read ${m(factorTex(r0, v))} as giving ${m(`${v} = ${num(r0.neg())}`)}; it gives ${m(`${v} = ${num(r0)}`)}`,
      });
    }

    const kinds: Kind[] = (
      format === "spr"
        ? ["greatest", "least", "positive", "negative"]
        : ["one", "one", "all", "all", "greatest", "least", "positive", "negative"]
    ).filter((kd) => kd === "one" || kd === "all" || pick(kd as Kind, roots) !== null) as Kind[];
    const kind = rng.pick(kinds);
    const sets = new SolutionSets();
    let answer: Answer;
    const slips: Slip[] = [];
    if (kind === "all") {
      answer = sets.answer(roots, listTex(roots));
      for (const w of wrongSets) slips.push(sets.slip(w.set, listTex(w.set), w.why));
    } else if (kind === "one") {
      const ans = rng.pick(roots);
      answer = { text: m(num(ans)), value: Sym.rat(ans) };
      for (const w of wrongSets) for (const x of w.set) slips.push(slip(x, w.why));
      if (roots.length === 2) {
        const [r, t] = roots;
        slips.push(
          slip(r.add(t), "you added the two solutions; a solution must make a factor equal $0$"),
          slip(
            r.mul(t),
            "you multiplied the two solutions, which gives the constant term after expanding, not a solution"
          )
        );
      }
    } else {
      const ans = pick(kind, roots)!;
      answer = { text: m(num(ans)), value: Sym.rat(ans) };
      const other = kind === "greatest" ? "least" : kind === "least" ? "greatest" : null;
      for (const w of wrongSets) {
        const x = pick(kind, w.set);
        if (x) slips.push(slip(x, w.why));
      }
      if (other) slips.push(slip(pick(other, roots)!, `you gave the ${other} solution`));
      if (kind === "positive" || kind === "negative") {
        const opp = kind === "positive" ? "negative" : "positive";
        slips.push(
          slip(ans.neg(), `you lost the sign: ${m(`${v} = ${num(ans)}`)} is the solution`)
        );
        for (const r of roots.filter((x) => x.sign() === -ans.sign()))
          slips.push(slip(r, `you gave a ${opp} solution, not the ${kind} one`));
      }
    }

    const listing = roots
      .map((r) => `${m(`${factorTex(r, v)} = 0`)} gives ${m(`${v} = ${num(r)}`)}`)
      .join("; ");
    const steps = zp
      ? [
          {
            label: "Find where each factor is zero",
            work: `A product is $0$ only when one of its factors is $0$: ${listing}${k.eq(1) ? "" : `. The constant ${n(k)} is never $0$`}`,
          },
        ]
      : [
          ...(form === "moved"
            ? [
                {
                  label: "Get $0$ on one side",
                  work: `${c < 0 ? `Subtract ${n(-c)} from` : `Add ${n(c)} to`} both sides: ${m(`${poly([1, b, c], v)} = 0`)}`,
                },
              ]
            : form === "common"
              ? [
                  {
                    label: "Divide out the common factor",
                    work: `Every coefficient is a multiple of ${n(g)}, so divide both sides by ${n(g)}: ${m(`${poly([1, b, c], v)} = 0`)}`,
                  },
                ]
              : []),
          {
            label: "Factor the quadratic",
            work: `${m(`${poly([1, b, c], v)} = ${factored}`)}, because ${n(roots[0].neg())} and ${n(roots[1].neg())} multiply to ${n(c)} and add to ${n(b)}`,
          },
          { label: "Find where each factor is zero", work: listing },
        ];
    if (kind !== "all")
      steps.push({
        label: kind === "one" ? "Match a choice" : `Choose the ${kind} solution`,
        work:
          kind === "one"
            ? `Of these, only ${m(answer.text.slice(1, -1))} is among the choices`
            : `The ${kind} solution is ${answer.text}`,
      });
    else steps.push({ label: "List every solution", work: `The solutions are ${listTex(roots)}` });

    const shown = kind === "all" ? roots[0] : valueOf(answer)!;
    const check = zp
      ? `With ${m(`${v} = ${num(shown)}`)}, the factor ${m(factorTex(shown, v))} is $0$, so the whole product is $0$${kind === "all" ? "; each other value zeroes its own factor the same way" : ""}`
      : `${m(`${times(1, shown)}^2 ${b < 0 ? "-" : "+"} ${times(Math.abs(b), shown)} ${signed(c)} = ${num(shown.mul(shown))} ${signed(shown.mul(b))} ${signed(c)} = 0`)}, so ${m(`${v} = ${num(shown)}`)} makes ${m(`${poly([1, b, c], v)}`)} zero`;

    const truth = () => rationalRoots(zero);
    const difficulty = { two: 1, lead: 2, three: 2, linear: 3, std: 2, moved: 3, common: 3 }[form];
    return {
      format,
      stem: `${block(eq)}\n${ASK[kind]}`,
      answer,
      slips,
      asks:
        kind === "all"
          ? "every value that makes the equation true"
          : kind === "one"
            ? "one value that makes the equation true"
            : `the ${kind} of the values that make the equation true`,
      steps,
      check,
      tip: zp
        ? `Set each factor equal to $0$ and solve; a factor such as ${m(`${v} - 5`)} gives ${m(`${v} = 5`)}, not ${m(`${v} = -5`)}`
        : "Get $0$ on one side first, then factor and set each factor equal to $0$",
      hint: zp
        ? "A product equals $0$ only when one of its factors equals $0$."
        : form === "moved"
          ? "Move every term to one side so the equation equals $0$, then factor."
          : `Look for two numbers that multiply to ${n(c)} and add to ${n(b)}.`,
      difficulty,
      isCorrect: (cand) => {
        const all = truth();
        if (kind === "all") {
          const vals = sets.values(cand);
          return (
            vals !== null &&
            sameSet(
              vals,
              all.map((x) => Sym.rat(x))
            )
          );
        }
        const x = valueOf(cand);
        if (!x) return false;
        if (kind === "one") return all.some((r) => r.eq(x));
        const want = pick(kind, all);
        return want !== null && want.eq(x);
      },
    };
  },
};

/** Two exact values (B +/- sqrt(M)) / den as a solution set and its text, or null. */
function pmSet(B: Frac, M: Frac, den: Frac): { vals: Sym[]; text: string } | null {
  if (M.n < 0 || den.isZero()) return null;
  const mid = Sym.rat(B.div(den));
  const half = sqrtSym(M).divRat(den.abs());
  const vals = half.isZero() ? [mid] : [mid.sub(half), mid.add(half)];
  const h = half.asRat();
  if (h !== null) return { vals, text: listTex(vals.map((x) => x.asRat()!)) };
  const sr = splitRoot(half)!;
  return { vals, text: m(pmTex(B.div(den), sr.q, sr.r)) };
}

/** The SAT form of one exact root. */
function rootText(x: Sym): string {
  const q = x.asRat();
  if (q) return m(num(q));
  const sr = splitRoot(x)!;
  return m(radTex(sr.p, sr.q, sr.r));
}

export const formula: Template = {
  id: "quad.formula",
  skill: SKILL,
  label: "Solve with the quadratic formula (exact radical answers)",
  difficulty: [4, 6],
  formats: ["mc"],
  make(rng, format): Draft {
    const v = rng.pick(VARS);
    const form = rng.pick(["std", "std", "moved", "product"] as const);
    let a: number;
    let b: number;
    let c: number;
    let eq: string;
    if (form === "product") {
      const p = rng.pick([2, 3, 4, 5]);
      const q = rng.nonzero(-9, 9);
      const rhs = rng.nonzero(-20, 20);
      [a, b, c] = [p, p * q, -rhs];
      eq = `${p}${v}(${poly([1, q], v)}) = ${rhs}`;
    } else {
      a = rng.pick([1, 1, 1, 2, 3]);
      b = rng.nonzero(-12, 12);
      c = rng.nonzero(-20, 20);
      eq = form === "moved" ? `${poly([a, b, 0], v)} = ${num(-c)}` : `${poly([a, b, c], v)} = 0`;
    }
    const A = F(a);
    const B = F(b);
    const C = F(c);
    const D = B.mul(B).sub(A.mul(C).mul(4));
    need(D.n > 0 && sqrtRat(D) === null, "irrational roots");
    need(D.n <= 600, "discriminant size");
    const two = A.mul(2);
    const right = pmSet(B.neg(), D, two)!;
    const { out, inside } = rootParts(D.n);
    const sets = new SolutionSets();
    const kind = rng.bool(0.7) ? "all" : "greater";

    const wrong: { s: ReturnType<typeof pmSet>; why: string }[] = [
      {
        s: pmSet(B.neg(), D, A),
        why:
          a === 1
            ? "you left out the denominator $2a = 2$"
            : `you divided by ${m(`a = ${a}`)} instead of ${m(`2a = ${2 * a}`)}`,
      },
      {
        s: pmSet(B, D, two),
        why: `you started the formula with ${m(`b = ${b}`)} instead of ${m(`-b = ${-b}`)}`,
      },
      {
        s: pmSet(B.neg(), B.mul(B).add(A.mul(C).mul(4)), two),
        why:
          form === "std"
            ? "you used $b^2 + 4ac$ under the root instead of $b^2 - 4ac$"
            : `you used ${m(`c = ${-c}`)} before moving that term to the left side, where it becomes ${m(num(c))}`,
      },
    ];
    if (out > 1 || a > 1) {
      const midOnly = Sym.rat(B.neg().div(two));
      const rootFull = sqrtSym(D);
      wrong.push({
        s: {
          vals: [midOnly.sub(rootFull), midOnly.add(rootFull)],
          text: m(pmTex(B.neg().div(two), F(out), inside)),
        },
        why: `you divided only ${m(num(-b))} by ${m(String(2 * a))}, not the square root as well`,
      });
      const rootPart = rootFull.divRat(two);
      wrong.push({
        s: {
          vals: [Sym.rat(B.neg()).sub(rootPart), Sym.rat(B.neg()).add(rootPart)],
          text: m(pmTex(B.neg(), F(out, 2 * a), inside)),
        },
        why: `you divided only the square root by ${m(String(2 * a))}, not ${m(num(-b))} as well`,
      });
    }

    let answer: Answer;
    const slips: Slip[] = [];
    const greater = right.vals[1];
    if (kind === "all") {
      answer = sets.answer(right.vals, right.text);
      for (const w of wrong) if (w.s) slips.push(sets.slip(w.s.vals, w.s.text, w.why));
    } else {
      answer = { text: rootText(greater), value: greater };
      slips.push({
        text: rootText(right.vals[0]),
        value: right.vals[0],
        why: "you used the minus sign, which gives the lesser solution",
      });
      for (const w of wrong) {
        if (!w.s) continue;
        const top = w.s.vals[w.s.vals.length - 1];
        slips.push({ text: rootText(top), value: top, why: w.why });
      }
    }

    const sr = splitRoot(greater)!;
    const sum = sr.p.mul(2);
    const prod = sr.p.mul(sr.p).sub(sr.q.mul(sr.q).mul(sr.r));
    const std = `${poly([a, b, c], v)} = 0`;
    const steps = [
      {
        label: "Put it in standard form",
        work: `${form === "std" ? "It is already in that form" : `Expand and move every term to the left side: ${m(std)}`}, so ${m(`a = ${a}`)}, ${m(`b = ${b}`)} and ${m(`c = ${c}`)}`,
      },
      {
        label: "Find the discriminant",
        work: m(
          `b^2 - 4ac = ${paren(B)}^2 - 4(${a})(${c}) = ${num(B.mul(B))} ${signed(A.mul(C).mul(-4))} = ${num(D)}`
        ),
      },
      {
        label: "Use the quadratic formula",
        work: `${m(`${v} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} = \\frac{${-b} \\pm \\sqrt{${D.n}}}{${2 * a}}`)}${out > 1 ? `. Since ${m(`\\sqrt{${D.n}} = ${out}\\sqrt{${inside}}`)}, divide every term of the numerator by ${m(String(2 * a))}` : ""}: ${m(`${v} = ${right.text.slice(1, -1)}`)}`,
      },
    ];
    if (kind === "greater")
      steps.push({
        label: "Take the greater solution",
        work: `The plus sign gives the greater value: ${answer.text}`,
      });
    return {
      format,
      stem: `${block(eq)}\n${kind === "all" ? "What are all the solutions to the given equation?" : "What is the greater of the two solutions to the given equation?"}`,
      answer,
      slips,
      asks:
        kind === "all"
          ? "both solutions of the equation, written exactly"
          : "the larger of the two solutions, written exactly",
      steps,
      check: `The two solutions add to ${n(sum)} and multiply to ${n(prod)}. For ${m(std)} the solutions must add to ${m(`-\\frac{b}{a} = ${num(B.neg().div(A))}`)} and multiply to ${m(`\\frac{c}{a} = ${num(C.div(A))}`)}, and they do`,
      tip: "Write the equation as $ax^2 + bx + c = 0$ before you read off $a$, $b$ and $c$, and divide the whole numerator by $2a$",
      hint:
        form === "std"
          ? "This does not factor nicely. Try the quadratic formula."
          : "Move every term to one side first, then use the quadratic formula.",
      difficulty: Math.min(6, 4 + (form === "std" ? 0 : 1) + (a > 1 ? 1 : 0)),
      isCorrect: (cand) => {
        const vals = kind === "all" ? sets.values(cand) : cand.value ? [cand.value] : null;
        if (!vals || vals.length !== (kind === "all" ? 2 : 1)) return false;
        if (!vals.every((x) => quadAt(A, B, C, x).isZero())) return false;
        if (kind === "all") return !vals[0].eq(vals[1]);
        return vals[0].toNumber() > B.neg().div(two).toNumber();
      },
    };
  },
};

export const TEMPLATES: Template[] = [factorSolve, formula, countSolutions, constantForCount];
