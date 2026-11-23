/*
 * m-radical-and-rational-equations, continued: rational equations. A fraction is zero only when
 * its numerator is zero and its denominator is not, and clearing denominators can add a value
 * that makes a denominator zero. The check substitutes each candidate into the original
 * equation with exact fractions and refuses any value that makes a denominator zero.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { Sym } from "../core/sym";
import { block, lin, m, n, num, poly } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import {
  SolutionSets,
  factorTex,
  listTex,
  polyMul,
  rationalRoots,
  sameSet,
  slip,
  valueOf,
} from "./_adveq-common";

const VARS = ["x", "x", "x", "w", "n", "t"];
const ints = (lo: number, hi: number) =>
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((x) => x !== 0);

type Variant = "zero" | "cancel" | "cross";

export const rationalEq: Template = {
  id: "rad-rat.rational",
  skill: "m-radical-and-rational-equations",
  label: "Rational equations: zero numerators and false solutions from denominators",
  difficulty: [3, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const v = rng.pick(VARS);
    const variant = rng.pick(["zero", "zero", "cancel", "cross", "cross"] as Variant[]);
    const sets = new SolutionSets();
    const noneText = "There is no solution";
    // f(x) = 0 is the original equation moved to one side; null when a denominator is zero.
    let f: (x: Frac) => Frac | null;
    let cleared: Frac[];
    let eq: string;
    let stem: string;
    let answer: Answer;
    let slips: Slip[];
    let steps: { label: string; work: string }[];
    let check: string;
    let asks: string;
    let difficulty: number;
    let kind: "sum" | "single" | "all";

    if (variant === "zero") {
      const [p, q, r] = rng.sample(ints(-12, 12), 3);
      const num0 = polyMul([F(1), F(-p)], [F(1), F(-q)]);
      cleared = num0;
      f = (x) => (x.eq(r) ? null : x.sub(p).mul(x.sub(q)).div(x.sub(r)));
      eq =
        `\\frac{${factorTex(F(p), v)})(${factorTex(F(q), v)}}{${factorTex(F(r), v)}} = 0`.replace(
          "\\frac{",
          "\\frac{("
        );
      eq = eq.replace("}{", ")}{");
      kind = "sum";
      stem = `${block(eq)}\nWhat is the sum of the solutions to the given equation?`;
      answer = numAnswer(p + q, m(num(p + q)));
      slips = [
        slip(p + q + r, `you also counted ${m(`${v} = ${r}`)}, which makes the denominator $0$`),
        slip(-(p + q), "you took the numbers with the signs printed in the factors"),
        slip(p * q, "you multiplied the solutions instead of adding them"),
        slip(p + q - r, `you subtracted the denominator's ${n(r)}`),
      ];
      asks = "the sum of every value that makes the equation true";
      steps = [
        {
          label: "Set the numerator to zero",
          work: `The fraction is $0$ only when its numerator is $0$: ${m(`${v} = ${p}`)} or ${m(`${v} = ${q}`)}`,
        },
        {
          label: "Check the denominator",
          work: `Neither value makes ${m(factorTex(F(r), v))} zero, so both are solutions. The denominator only rules out ${m(`${v} = ${r}`)}`,
        },
        {
          label: "Add the solutions",
          work: m(`${p} ${p + q - p < 0 ? "-" : "+"} ${Math.abs(q)} = ${p + q}`),
        },
      ];
      check = `At ${m(`${v} = ${p}`)} the numerator is $0$ and the denominator is ${n(p - r)}, so the fraction is $0$; the same holds at ${m(`${v} = ${q}`)}, where the denominator is ${n(q - r)}`;
      difficulty = 3;
    } else if (variant === "cancel") {
      const [r, t] = rng.sample(ints(-12, 12), 2);
      cleared = polyMul([F(1), F(-r)], [F(1), F(-t)]);
      const [, b, c] = cleared;
      need(!b.isZero(), "middle term");
      f = (x) => (x.eq(r) ? null : x.mul(x).add(b.mul(x)).add(c).div(x.sub(r)));
      eq = `\\frac{${poly(cleared, v)}}{${factorTex(F(r), v)}} = 0`;
      kind = format === "spr" ? "single" : rng.pick(["single", "all"]);
      stem = `${block(eq)}\n${kind === "all" ? "What are all the solutions to the given equation?" : "What is the solution to the given equation?"}`;
      const R = F(r);
      const T = F(t);
      if (kind === "all") {
        answer = sets.answer([T], listTex([T]));
        slips = [
          sets.slip(
            [R, T],
            listTex([R, T]),
            `you kept ${m(`${v} = ${r}`)}, which makes the denominator $0$`
          ),
          sets.slip(
            [R],
            listTex([R]),
            `you kept only ${m(`${v} = ${r}`)}, the value that makes the denominator $0$`
          ),
          sets.slip(
            [],
            noneText,
            `${m(`${v} = ${t}`)} works: the numerator is $0$ and the denominator is ${n(t - r)}`
          ),
          sets.slip(
            [R.neg(), T.neg()],
            listTex([R.neg(), T.neg()]),
            "you factored the numerator with the signs reversed"
          ),
        ];
      } else {
        answer = numAnswer(T, m(num(T)));
        slips = [
          slip(R, `${m(`${v} = ${r}`)} makes the denominator $0$, so it cannot be a solution`),
          slip(T.neg(), "you factored the numerator with the signs reversed"),
          slip(R.neg(), "you used the wrong sign and the wrong factor"),
          slip(T.add(R), "you added the zeros of the numerator"),
        ];
      }
      asks = "every value that makes the numerator zero without making the denominator zero";
      steps = [
        {
          label: "Factor the numerator",
          work: m(`${poly(cleared, v)} = (${factorTex(R, v)})(${factorTex(T, v)})`),
        },
        {
          label: "Set the numerator to zero",
          work: `${m(`${v} = ${r}`)} or ${m(`${v} = ${t}`)}`,
        },
        {
          label: "Throw out a zero denominator",
          work: `${m(`${v} = ${r}`)} makes ${m(factorTex(R, v))} zero, and division by zero is not allowed, so the only solution is ${m(`${v} = ${t}`)}`,
        },
      ];
      check = `At ${m(`${v} = ${t}`)} the numerator is $0$ and the denominator is ${n(t - r)}, so the fraction is $0$`;
      difficulty = 5;
    } else {
      // v/(v + p) + q/(v - r) = (s v + u)/((v + p)(v - r)), cleared: v^2 + (q - r - s) v + (qp - u) = 0
      // with roots t (true) and r (false: it makes a denominator zero).
      const [p, r, t] = rng.sample(ints(-9, 9), 3);
      const q = rng.nonzero(-9, 9);
      need(t !== -p && r !== -p, "distinct denominators");
      const s = t + q;
      const u = q * p - t * r;
      need(s !== 0 || u !== 0, "a numerator");
      need(t !== 0, "nonzero solution");
      cleared = [F(1), F(q - r - s), F(q * p - u)];
      f = (x) => {
        const d1 = x.add(p);
        const d2 = x.sub(r);
        if (d1.isZero() || d2.isZero()) return null;
        return x
          .div(d1)
          .add(F(q).div(d2))
          .sub(F(s).mul(x).add(u).div(d1.mul(d2)));
      };
      const d1 = lin([[1, v]], p);
      const d2 = lin([[1, v]], -r);
      eq = `\\frac{${v}}{${d1}} ${q < 0 ? "-" : "+"} \\frac{${Math.abs(q)}}{${d2}} = \\frac{${lin([[s, v]], u)}}{(${d1})(${d2})}`;
      kind = format === "spr" ? "single" : rng.pick(["single", "all", "all"]);
      stem = `${block(eq)}\n${kind === "all" ? "What are all the solutions to the given equation?" : "What is the solution to the given equation?"}`;
      const R = F(r);
      const T = F(t);
      if (kind === "all") {
        answer = sets.answer([T], listTex([T]));
        slips = [
          sets.slip(
            [R, T],
            listTex([R, T]),
            `you kept ${m(`${v} = ${r}`)}, which makes a denominator $0$`
          ),
          sets.slip(
            [R],
            listTex([R]),
            `you kept ${m(`${v} = ${r}`)}, which makes a denominator $0$, and threw out the true solution`
          ),
          sets.slip([], noneText, `${m(`${v} = ${t}`)} works: no denominator is $0$ there`),
          sets.slip(
            [R.neg(), T.neg()],
            listTex([R.neg(), T.neg()]),
            "you factored the cleared equation with the signs reversed"
          ),
        ];
      } else {
        answer = numAnswer(T, m(num(T)));
        slips = [
          slip(R, `${m(`${v} = ${r}`)} makes ${m(d2)} zero, so it cannot be a solution`),
          slip(T.neg(), "you factored the cleared equation with the signs reversed"),
          slip(R.neg(), "you factored with the signs reversed and kept the false solution"),
          slip(F(-p), `you used the value that makes ${m(d1)} zero`),
        ];
      }
      asks =
        "every value that makes the original equation true, after any value that makes a denominator zero is thrown out";
      steps = [
        {
          label: "Clear the denominators",
          work: `Multiply every term by ${m(`(${d1})(${d2})`)}: ${m(`${v}(${d2}) ${q < 0 ? "-" : "+"} ${Math.abs(q) === 1 ? "" : Math.abs(q)}(${d1}) = ${lin([[s, v]], u)}`)}`,
        },
        {
          label: "Solve the quadratic",
          work: `${m(`${poly(cleared, v)} = 0`)}, which is ${m(`(${factorTex(T, v)})(${factorTex(R, v)}) = 0`)}, so ${m(`${v} = ${t}`)} or ${m(`${v} = ${r}`)}`,
        },
        {
          label: "Throw out a zero denominator",
          work: `${m(`${v} = ${r}`)} makes ${m(d2)} zero, so it is not a solution. ${m(`${v} = ${t}`)} makes neither denominator zero`,
        },
      ];
      const first = F(t, t + p);
      const second = F(q, t - r);
      check = `At ${m(`${v} = ${t}`)} the two fractions on the left are ${n(first)} and ${n(second)}, which add to ${n(first.add(second))}, and the right side is ${n(F(s * t + u, (t + p) * (t - r)))}, the same value`;
      difficulty = kind === "all" ? 6 : 7;
    }
    const truth = (): Sym[] =>
      rationalRoots(cleared)
        .filter((x) => {
          const val = f(x);
          return val !== null && val.isZero();
        })
        .map((x) => Sym.rat(x));
    return {
      format,
      stem,
      answer,
      slips,
      asks,
      steps,
      check,
      tip: "A value that makes any denominator zero can never be a solution, so check every candidate in the original equation",
      hint:
        variant === "zero"
          ? "When is a fraction equal to $0$?"
          : variant === "cancel"
            ? "Factor the numerator, then look at the denominator."
            : "Multiply every term by the common denominator, then check your answers.",
      difficulty,
      isCorrect: (cand) => {
        const all = truth();
        if (kind === "all") {
          const vals = sets.values(cand);
          return vals !== null && sameSet(vals, all);
        }
        const x = valueOf(cand);
        if (x === null) return false;
        if (kind === "sum")
          return all.length > 0 && all.reduce((acc, y) => acc.add(y), Sym.rat(0)).eq(x);
        const val = f(x);
        return all.length === 1 && val !== null && val.isZero();
      },
    };
  },
};
