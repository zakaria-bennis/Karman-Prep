/*
 * m-circle-equations, continued: the shared equation and point helpers, and tangent lines to a
 * circle (perpendicular to the radius). Split from circle-equations.ts to keep files short;
 * circle-equations.ts lists the template in TEMPLATES.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { m, n, num, pair, paren } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import { ratSlip } from "./_geo2-common";

const SKILL = "m-circle-equations";
export const XY = `${m("xy")}-plane`;

/** (x - 3)^2, (x + 2)^2 or x^2. */
export const sqTerm = (v: string, h: number) =>
  h === 0 ? `${v}^2` : `(${v} ${h > 0 ? "-" : "+"} ${Math.abs(h)})^2`;
export const eqTex = (h: number, k: number, rhs: string) =>
  `${sqTerm("x", h)} + ${sqTerm("y", k)} = ${rhs}`;
/** A point as an answer: its text and a key "a,b". */
export const ptAnswer = (a: Frac | number, b: Frac | number): Answer => ({
  text: m(pair(F(a), F(b))),
  key: `${F(a).toString()},${F(b).toString()}`,
});
export const ptSlip = (a: Frac | number, b: Frac | number, why: string): Slip => ({
  ...ptAnswer(a, b),
  why,
});
export const ptOf = (cand: Answer): [Frac, Frac] | null => {
  if (!cand.key || !cand.key.includes(",")) return null;
  const [a, b] = cand.key.split(",").map((t) => Frac.parse(t));
  return [a, b];
};
/** An equation as an answer: (x - a)^2 + (y - b)^2 = R, keyed "a|b|R". */
export const eqAnswer = (a: number, b: number, R: number): Answer => ({
  text: m(eqTex(a, b, String(R))),
  key: `${a}|${b}|${R}`,
});
export const eqSlip = (a: number, b: number, R: number, why: string): Slip => ({
  ...eqAnswer(a, b, R),
  why,
});

export const tangentLine: Template = {
  id: "ceq.tangent-line",
  skill: SKILL,
  label: "Tangent lines to a circle: perpendicular to the radius",
  difficulty: [4, 6],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const h = rng.int(-9, 9);
    const k = rng.int(-9, 9);
    const u = rng.nonzero(-7, 7);
    const v = rng.nonzero(-7, 7);
    need(Math.abs(u) !== Math.abs(v), "slopes of plus or minus 1 are too easy");
    const P = [h + u, k + v];
    const kind =
      format === "spr"
        ? rng.pick(["slope", "a"] as const)
        : rng.pick(["slope", "point", "a"] as const);
    const line = rng.pick(["t", "k", "m", "q"]);
    const radSlope = F(v, u);
    const tanSlope = F(-u, v);
    const dotOk = (qx: Frac, qy: Frac) => qx.sub(P[0]).mul(u).add(qy.sub(P[1]).mul(v)).isZero();
    const steps = [
      {
        label: "Find the slope of the radius",
        work: m(
          `\\frac{${P[1]} - ${paren(k)}}{${P[0]} - ${paren(h)}} = \\frac{${v}}{${u}}${radSlope.d === Math.abs(u) && radSlope.n === v ? "" : ` = ${num(radSlope)}`}`
        ),
      },
      {
        label: "Take the negative reciprocal",
        work: `A tangent is perpendicular to the radius at the point of tangency, so its slope is the negative reciprocal: ${m(num(tanSlope))}`,
      },
    ];
    const common = {
      tip: "A tangent line is perpendicular to the radius at the point of tangency, so its slope is the negative reciprocal of the radius's slope",
      hint: "Find the slope of the radius to the point of tangency first.",
    };
    if (kind === "slope") {
      return {
        format,
        stem: `A circle in the ${XY} has its center at ${m(pair(h, k))}. Line ${m(line)} is tangent to this circle at the point ${m(pair(P[0], P[1]))}. What is the slope of line ${m(line)}?`,
        answer: numAnswer(tanSlope, m(num(tanSlope))),
        slips: [
          ratSlip(radSlope, "you found the slope of the radius, not of the tangent line"),
          ratSlip(radSlope.neg(), "you changed the sign of the radius's slope but did not flip it"),
          ratSlip(tanSlope.neg(), "you flipped the radius's slope but did not change its sign"),
        ],
        asks: `the slope of the tangent line ${m(line)}`,
        steps,
        check: `The product of the two slopes should be ${m("-1")}: ${m(`${num(radSlope)} \\cdot ${paren(tanSlope)} = -1`)}`,
        ...common,
        difficulty: format === "spr" ? 5 : 4,
        isCorrect: (cand) => {
          const s = cand.value?.asRat();
          return !!s && s.mul(v).add(u).isZero();
        },
      };
    }
    if (kind === "point") {
      const t = rng.pick([1, 2, 3, -1, -2]);
      const ans = ptAnswer(P[0] + t * v, P[1] - t * u);
      return {
        format,
        stem: `A circle in the ${XY} has its center at ${m(pair(h, k))}. Line ${m(line)} is tangent to this circle at the point ${m(pair(P[0], P[1]))}. Which of the following points also lies on line ${m(line)}?`,
        answer: ans,
        slips: [
          ptSlip(
            P[0] + t * u,
            P[1] + t * v,
            "this point lies on the line through the center, along the radius"
          ),
          ptSlip(
            P[0] + t * v,
            P[1] + t * u,
            "this point gives a slope equal to the reciprocal of the radius's slope, without the sign change"
          ),
          ptSlip(
            P[0] - t * v,
            P[1] - t * u,
            "this point gives a slope with the right size but the wrong sign"
          ),
          ptSlip(
            h + t * v,
            k - t * u,
            "this point is on the line through the center with the tangent's slope, not through the point of tangency"
          ),
        ],
        asks: `a second point on the tangent line ${m(line)}`,
        steps: [
          ...steps,
          {
            label: "Step along the tangent",
            work: `From ${m(pair(P[0], P[1]))}, moving ${n(t * v)} in ${m("x")} and ${n(-t * u)} in ${m("y")} keeps the slope ${m(`\\frac{${-t * u}}{${t * v}} = ${num(tanSlope)}`)}, giving ${ans.text}`,
          },
        ],
        check: `The step from the point of tangency to the answer, ${m(`(${t * v}, ${-t * u})`)}, is perpendicular to the radius ${m(`(${u}, ${v})`)}: ${m(`${t * v}(${u}) + ${paren(-t * u)}(${v}) = 0`)}`,
        ...common,
        difficulty: 5,
        isCorrect: (cand) => {
          const p = ptOf(cand);
          return !!p && !(p[0].eq(P[0]) && p[1].eq(P[1])) && dotOk(p[0], p[1]);
        },
      };
    }
    // The slope is given; find the x-coordinate of the point of tangency.
    return {
      format,
      stem: `A circle in the ${XY} has its center at ${m(pair(h, k))}. Line ${m(line)} is tangent to this circle at the point ${m(`(a, ${P[1]})`)}, where ${m("a")} is a constant. The slope of line ${m(line)} is ${m(num(tanSlope))}. What is the value of ${m("a")}?`,
      answer: numAnswer(P[0], m(String(P[0]))),
      slips: [
        ratSlip(h - u, "you used the wrong sign when you solved for the horizontal change"),
        ratSlip(
          F(v, 1).div(tanSlope).add(h),
          `you set the slope of the radius equal to ${m(num(tanSlope))} instead of its negative reciprocal`
        ),
        ratSlip(-h + u, `you used the wrong sign for the center's ${m("x")}-coordinate`),
        ratSlip(u, `you found the horizontal change ${m(`a - ${paren(h)}`)} and stopped`),
      ],
      asks: `the ${m("x")}-coordinate of the point of tangency`,
      steps: [
        {
          label: "Find the slope of the radius",
          work: `The radius is perpendicular to the tangent, so its slope is the negative reciprocal of ${m(num(tanSlope))}: ${m(num(radSlope))}`,
        },
        {
          label: `Solve for ${m("a")}`,
          work: `${m(`\\frac{${P[1]} - ${paren(k)}}{a - ${paren(h)}} = ${num(radSlope)}`)}, so ${m(`a - ${paren(h)} = \\frac{${v}}{${num(radSlope)}} = ${u}`)} and ${m(`a = ${P[0]}`)}`,
        },
      ],
      check: `With ${m(`a = ${P[0]}`)}, the radius has slope ${m(`\\frac{${v}}{${u}}`)}, and ${m(`${num(radSlope)} \\cdot ${paren(tanSlope)} = -1`)}, so the line is perpendicular to the radius`,
      ...common,
      difficulty: 6,
      // The radius from the center to (a, y) must be perpendicular to the direction (1, slope).
      isCorrect: (cand) => {
        const a = cand.value?.asRat();
        return (
          !!a &&
          a
            .sub(h)
            .add(tanSlope.mul(P[1] - k))
            .isZero()
        );
      },
    };
  },
};
