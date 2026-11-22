/*
 * m-triangles, the triangle inequality: the possible lengths of a third side. The check tests the
 * three inequalities one by one on the candidate (or, for a range, on a grid of lengths).
 */
import { F } from "../core/frac";
import type { Answer, Draft, Template } from "../core/types";
import { type Core, coreDraft, keyAnswer, keySlip, numSlip, UNITS } from "./_geo1-common";

const SKILL = "m-triangles";

// ---------------------------------------------------------------- the triangle inequality

/** Can three lengths form a triangle? Each pair must add to more than the third. */
const forms = (a: number, b: number, c: number) => a + b > c && a + c > b && b + c > a && c > 0;

export const inequality: Template = {
  id: "tri.inequality",
  skill: SKILL,
  label: "The triangle inequality: possible lengths of the third side",
  difficulty: [3, 6],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const a = rng.int(2, 30);
    const b = rng.int(a + 1, a + 30);
    const lo = b - a;
    const hi = a + b;
    const u = rng.pick(UNITS).many;
    const intro = `A triangle has two sides of lengths ${a} ${u} and ${b} ${u}.`;
    const grid = Array.from({ length: (hi + 6) * 4 }, (_, i) => i / 4 + 0.25);
    const mode =
      format === "spr"
        ? rng.pick(["greatest", "least"] as const)
        : rng.pick(["range", "could", "could", "greatest"] as const);
    if (mode === "range") {
      const preds: Record<string, (x: number) => boolean> = {
        both: (x) => x > lo && x < hi,
        upper: (x) => x > 0 && x < hi,
        outside: (x) => x < lo || x > hi,
        lower: (x) => x > 0 && x < lo,
      };
      const isCorrect = (cand: Answer) => {
        const p = cand.key ? preds[cand.key] : undefined;
        return !!p && grid.every((x) => p(x) === forms(a, b, x));
      };
      return {
        format,
        stem: `The triangle inequality theorem states that the sum of the lengths of any two sides of a triangle is greater than the length of the third side. ${intro} Which inequality gives the possible lengths $x$, in ${u}, of the third side?`,
        answer: keyAnswer("both", `$${lo} < x < ${hi}$`),
        slips: [
          keySlip(
            "upper",
            `$x < ${hi}$`,
            `this uses only one inequality; the third side must also be longer than $${b} - ${a}$, or the two shorter sides could not reach`
          ),
          keySlip(
            "outside",
            `$x < ${lo}$ or $x > ${hi}$`,
            "this gives exactly the lengths that cannot form a triangle"
          ),
          keySlip(
            "lower",
            `$0 < x < ${lo}$`,
            `this uses the difference of the sides as the largest length instead of the smallest`
          ),
        ],
        asks: "every length the third side could have",
        steps: [
          { label: "Bound it from above", work: `$${a} + ${b} > x$, so $x < ${hi}$` },
          {
            label: "Bound it from below",
            work: `$${a} + x > ${b}$, so $x > ${lo}$ (and $${b} + x > ${a}$ holds for any positive x)`,
          },
          { label: "Combine the bounds", work: `$${lo} < x < ${hi}$` },
        ],
        check: `A length such as ${lo + 1} works, since $${a} + ${lo + 1} = ${a + lo + 1} > ${b}$; a length of ${hi} fails, since $${a} + ${b} = ${hi}$ is not greater than ${hi}`,
        tip: "The third side of a triangle is longer than the difference of the other two sides and shorter than their sum",
        hint: "Write the inequality for each pair of sides.",
        difficulty: 6,
        isCorrect,
      };
    }
    if (mode === "could") {
      const inside = rng.int(lo + 1, hi - 1);
      const core: Core = {
        stem: `${intro} Which of the following could be the length, in ${u}, of the third side of the triangle?`,
        answer: F(inside),
        slips: [
          numSlip(
            hi,
            `a third side of ${hi} equals the sum of the other two, so the triangle would flatten into a segment`
          ),
          numSlip(lo, `a third side of ${lo} would make $${a} + ${lo}$ equal to ${b}, not greater`),
          numSlip(hi + rng.int(1, 8), "this is longer than the other two sides combined"),
          ...(lo > 1
            ? [
                numSlip(
                  rng.int(1, lo - 1),
                  `this is shorter than $${b} - ${a}$, so the two shorter sides could not reach across ${b}`
                ),
              ]
            : []),
        ],
        asks: "a length that works as the third side",
        steps: [
          {
            label: "Find the largest limit",
            work: `The third side must be less than $${a} + ${b} = ${hi}$`,
          },
          { label: "Find the smallest limit", work: `It must be more than $${b} - ${a} = ${lo}$` },
          { label: "Pick the choice between", work: `Only ${inside} is between ${lo} and ${hi}` },
        ],
        check: `$${a} + ${b} > ${inside}$, $${a} + ${inside} > ${b}$, and $${b} + ${inside} > ${a}$ all hold`,
        tip: "The third side of a triangle is longer than the difference of the other two sides and shorter than their sum",
        hint: "How long can the third side be? How short?",
        difficulty: 3,
        ok: (cand) => cand.isInt() && forms(a, b, cand.n),
      };
      return coreDraft(format, core);
    }
    const greatest = mode === "greatest";
    const ans = greatest ? hi - 1 : lo + 1;
    const core: Core = {
      stem: `${intro} The length of the third side is a whole number of ${u}. What is the ${greatest ? "greatest" : "least"} possible length, in ${u}, of the third side?`,
      answer: F(ans),
      slips: greatest
        ? [
            numSlip(
              hi,
              `a side of ${hi} equals the sum of the other two, which flattens the triangle`
            ),
            numSlip(hi + 1, "you went past the sum of the other two sides"),
            numSlip(b, "you assumed the third side cannot be longer than the longest given side"),
          ]
        : [
            numSlip(lo, `a side of ${lo} would make $${a} + ${lo}$ equal to ${b}, not greater`),
            numSlip(1, "you ignored the lower limit on the third side"),
            numSlip(a, "you assumed the third side cannot be shorter than the shortest given side"),
          ],
      asks: `the ${greatest ? "greatest" : "least"} whole-number length the third side can have`,
      steps: [
        {
          label: "Find the limits",
          work: `The third side x must satisfy $${b} - ${a} < x < ${a} + ${b}$, that is, $${lo} < x < ${hi}$`,
        },
        {
          label: `Take the ${greatest ? "largest" : "smallest"} whole number`,
          work: `The limit itself is not allowed, so $x = ${ans}$`,
        },
      ],
      check: greatest
        ? `$${a} + ${b} = ${hi} > ${ans}$ works, but ${hi} fails because ${hi} is not greater than ${hi}`
        : `$${a} + ${ans} = ${a + ans} > ${b}$ works, but ${lo} fails because $${a} + ${lo} = ${b}$`,
      tip: "The third side of a triangle is longer than the difference of the other two sides and shorter than their sum",
      hint: greatest ? "How long can the third side be?" : "How short can the third side be?",
      difficulty: format === "spr" ? 5 : 4,
      ok: (cand) =>
        cand.isInt() && forms(a, b, cand.n) && !forms(a, b, cand.n + (greatest ? 1 : -1)),
    };
    return coreDraft(format, core);
  },
};
