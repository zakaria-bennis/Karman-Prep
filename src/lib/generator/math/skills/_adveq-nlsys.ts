/*
 * m-nonlinear-systems, continued: how many solutions a parabola and a line have, and the
 * constant or point that makes them meet exactly once (or never). The checks count the
 * solutions of the printed system from the value at the vertex of the combined quadratic
 * (countByVertex), never from the discriminant the work uses.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { block, m, n, num, paren, poly, signed } from "../core/tex";
import type { Count } from "./_adveq-common";
import type { Answer, Draft, Slip, Template } from "../core/types";
import {
  countAnswer,
  countByVertex,
  countOf,
  countSlip,
  slip,
  sqrtRat,
  valueOf,
} from "./_adveq-common";

const system = (e1: string, e2: string) => `${block(e1)}\n${block(e2)}`;

/** y = k, or y + K = 0 the way the SAT sometimes writes it. */
const levelTex = (k: Frac, alt: boolean) =>
  alt && !k.isZero() ? `y ${signed(k.neg())} = 0` : `y = ${num(k)}`;

export const countTangent: Template = {
  id: "nl-sys.count-tangent",
  skill: "m-nonlinear-systems",
  label: "How many times a line meets a parabola, and the constant for exactly one point",
  difficulty: [4, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const variant =
      format === "mc"
        ? rng.pick(["count", "count", "level", "tangent"] as const)
        : rng.pick(["level", "tangent", "least"] as const);

    if (variant === "count") {
      const a = rng.pick([1, 2, 3, 4, 5, 6, -1, -2, -3]);
      const h = rng.nonzero(-8, 8);
      const vy = rng.int(-30, 30);
      const truth = rng.pick([0, 1, 2, 2, 0] as const);
      const gap = rng.int(1, 12);
      // Above the vertex of an upward parabola: two points; below: none.
      const k = truth === 1 ? vy : vy + (truth === 2 ? 1 : -1) * Math.sign(a) * gap;
      const b = -2 * a * h;
      const c = a * h * h + vy;
      const alt = rng.bool(0.5);
      const par = `y = ${poly([a, b, c], "x")}`;
      const up = a > 0;
      const why = (x: Count): string => {
        if (x === 3) return "this line and parabola can meet at most twice, never three times";
        if (truth === 0)
          return x === 2
            ? `you assumed a line always crosses a parabola twice, but ${m(`y = ${k}`)} is ${up ? "below" : "above"} the vertex, the parabola's ${up ? "lowest" : "highest"} point`
            : "you counted the vertex as a meeting point, but the line does not pass through it";
        if (truth === 1)
          return x === 2
            ? "the line touches the parabola only at its vertex, so there is one point, not two"
            : "a line through the vertex still meets the parabola there, once";
        return x === 1
          ? `you counted only one side of the parabola; a line ${up ? "above its lowest" : "below its highest"} point crosses both sides`
          : `you compared ${n(k)} with the vertex's y-coordinate using the wrong sign`;
      };
      const slips: Slip[] = ([0, 1, 2, 3] as Count[])
        .filter((x) => x !== truth)
        .map((x) => countSlip(x, why(x), "sys"));
      const D = b * b - 4 * a * (c - k);
      return {
        format,
        stem: `${system(par, levelTex(F(k), alt))}\nHow many solutions are there to the given system of equations?`,
        answer: countAnswer(truth, "sys"),
        slips,
        asks: "how many points the parabola and the horizontal line have in common",
        steps: [
          {
            label: "Find the vertex",
            work: `${m(`x = -\\frac{b}{2a} = -\\frac{${b}}{2(${a})} = ${h}`)}, and ${m(`y = ${num(vy)}`)} there, so the vertex is ${m(`(${h}, ${vy})`)}`,
          },
          {
            label: "Compare the line with it",
            work: `The parabola opens ${up ? "up" : "down"}, so its ${up ? "lowest" : "highest"} value is ${n(vy)}. The line ${m(`y = ${k}`)} is ${truth === 1 ? "at that height, so it touches once" : truth === 2 ? `${up ? "above" : "below"} it, so it crosses twice` : `${up ? "below" : "above"} it, so it never meets the parabola`}`,
          },
        ],
        check: `Substituting ${m(`y = ${k}`)} gives ${m(`${poly([a, b, c - k], "x")} = 0`)}, whose discriminant is ${m(`${paren(b)}^2 - 4(${a})(${c - k}) = ${D}`)}: ${D > 0 ? "positive, two solutions" : D === 0 ? "zero, one solution" : "negative, no solutions"}`,
        tip: "A horizontal line meets a parabola twice, once (at the vertex), or never; compare its height with the vertex",
        hint: "Find the vertex of the parabola, then compare its y-coordinate with the line.",
        difficulty: alt || Math.abs(a) > 1 ? 6 : 5,
        isCorrect: (cand) => countOf(cand) === countByVertex(a, b, c - k),
      };
    }

    if (variant === "level") {
      const a = rng.pick([1, -1, 1, -1, 2, -2]);
      const b = rng.nonzero(-15, 15);
      const c = rng.nonzero(-120, 120);
      const h = F(-b, 2 * a);
      const vy = F(c).sub(F(b * b, 4 * a));
      need(!vy.isZero() && !h.isInt() === rng.bool(0.6), "a fractional vertex most of the time");
      const fv = (x: Frac) => F(a).mul(x).mul(x).add(F(b).mul(x)).add(c);
      const par = `y = ${poly([a, b, c], "x")}`;
      return {
        format,
        stem: `In the xy-plane, the graph of the equation ${m(par)} intersects the line ${m("y = r")} at exactly one point. What is the value of ${m("r")}?`,
        answer: numAnswer(vy, m(num(vy))),
        slips: [
          slip(h, "you gave the x-coordinate of the vertex"),
          slip(c, "you gave the y-intercept"),
          slip(
            F(c).add(F(b * b, 4 * a)),
            `you added ${m(`\\frac{b^2}{4a}`)} instead of subtracting it`
          ),
          slip(
            fv(h.neg()),
            `you evaluated at ${m(`x = ${num(h.neg())}`)}, a sign slip in ${m("-\\frac{b}{2a}")}`
          ),
        ],
        asks: "the height of the only horizontal line that touches the parabola once, the vertex's y-coordinate",
        steps: [
          {
            label: "Use the vertex",
            work: `The only horizontal line that meets a parabola once passes through its vertex, so ${m("r")} is the vertex's y-coordinate`,
          },
          {
            label: "Find the vertex's x-coordinate",
            work: m(`x = -\\frac{b}{2a} = -\\frac{${b}}{2(${a})} = ${num(h)}`),
          },
          {
            label: "Find its y-coordinate",
            work: m(
              `y = ${num(F(a))}${paren(h).startsWith("(") || paren(h).startsWith("\\left") ? paren(h) : `\\left(${num(h)}\\right)`}^2 ${signed(F(b).mul(h))} ${signed(c)} = ${num(vy)}`
            )
              .replace(/^\$y = 1\\left/, "$y = \\left")
              .replace(/^\$y = -1\\left/, "$y = -\\left"),
          },
        ],
        check: `Setting ${m(`${poly([a, b, c], "x")} = ${num(vy)}`)} gives ${m(`${poly([a, b, 0], "x")} ${signed(F(c).sub(vy))} = 0`)}, whose discriminant ${m(`b^2 - 4ac`)} is $0$: exactly one solution`,
        tip: "A horizontal line touches a parabola at exactly one point only at its vertex",
        hint: "Where can a horizontal line touch a parabola just once?",
        difficulty: h.isInt() ? 6 : 7,
        isCorrect: (cand) => {
          const x = valueOf(cand);
          return x !== null && countByVertex(a, b, F(c).sub(x)) === 1;
        },
      };
    }

    if (variant === "tangent") {
      // y = a x^2 + c1 and y = q x + c2 (q stated positive or negative) meet only at x0.
      const a = rng.pick([1, 2, 3, 4, 5, -1, -2, -3, -4]);
      const x0 = rng.nonzero(-6, 6);
      const q = 2 * a * x0;
      const c1 = rng.nonzero(-50, 50);
      const c2 = c1 - a * x0 * x0;
      need(c2 !== 0, "a constant on the line");
      const sign = q > 0 ? "positive" : "negative";
      const par = `y = ${poly([a, 0, c1], "x")}`;
      const line = `y = qx ${signed(c2)}`;
      const K = c1 - c2;
      return {
        format,
        stem: `${system(par, line)}\nIn the given system of equations, ${m("q")} is a ${sign} constant. The graphs of the equations intersect at exactly one point ${m("(x, y)")} in the xy-plane. What is the value of ${m("x")}?`,
        answer: numAnswer(x0, m(num(x0))),
        slips: [
          slip(
            -x0,
            `you used the ${q > 0 ? "negative" : "positive"} value of ${m("q")}, but ${m("q")} is ${sign}`
          ),
          slip(q, `you gave the value of ${m("q")}, not of ${m("x")}`),
          slip(2 * x0, `you divided ${m("q")} by ${m("a")} instead of by ${m("2a")}`),
          slip(a * x0 * x0 + c1, "you gave the y-coordinate of the point"),
        ],
        asks: `the x-coordinate of the single point the two graphs share`,
        steps: [
          {
            label: "Set the right sides equal",
            work: `${m(`${poly([a, 0, c1], "x")} = qx ${signed(c2)}`)}, so ${m(`${poly([a, 0, 0], "x")} - qx ${signed(K)} = 0`)}`,
          },
          {
            label: "Use exactly one solution",
            work: `The discriminant must be $0$: ${m(`q^2 - 4(${a})(${K}) = 0`)}, so ${m(`q^2 = ${4 * a * K}`)} and, since ${m("q")} is ${sign}, ${m(`q = ${q}`)}`,
          },
          {
            label: "Find the repeated solution",
            work: m(`x = \\frac{q}{2a} = \\frac{${q}}{${2 * a}} = ${x0}`),
          },
        ],
        check: `With ${m(`q = ${q}`)} the combined equation is ${m(`${poly([a, -q, K], "x")} = 0`)}, which is ${m(`${a === 1 ? "" : a === -1 ? "-" : a}(${poly([1, -x0], "x")})^2 = 0`)}, true only at ${m(`x = ${x0}`)}`,
        tip: "For exactly one intersection, combine the equations into one quadratic and set its discriminant equal to 0".replace(
          "to 0",
          "to $0$"
        ),
        hint: "Set the right sides equal and use the discriminant to find $q$.",
        difficulty: 7,
        isCorrect: (cand) => {
          const x = valueOf(cand);
          if (x === null) return false;
          const root = sqrtRat(F(4 * a * K));
          if (root === null) return false;
          const qq = q > 0 ? root : root.neg();
          return (
            countByVertex(a, qq.neg(), K) === 1 && F(a).mul(x).mul(x).sub(qq.mul(x)).add(K).isZero()
          );
        },
      };
    }

    // least: y = d and y = x^2 + b x + a (a a positive integer) have no real solutions.
    const b = rng.pick([2, 4, 6, 8, 10, -2, -4, -6, -8, 3, 5, -3, -5]);
    const d = F(rng.nonzero(-12, 6), rng.pick([1, 2]));
    // No solutions when a - d > b^2 / 4.
    const bound = d.add(F(b * b, 4));
    const least = Math.floor(bound.toNumber()) + 1;
    need(least >= 1, "positive constant");
    const par = `y = ${poly([1, b, 0], "x")} + a`;
    const ans: Answer = numAnswer(least, m(String(least)));
    return {
      format,
      stem: `${system(`y = ${num(d, { decimal: true })}`, par)}\nIn the given system of equations, ${m("a")} is a positive integer constant. The system has no real solutions. What is the least possible value of ${m("a")}?`,
      answer: ans,
      slips: [
        slip(
          least - 1,
          bound.eq(least - 1)
            ? "that value makes the line touch the vertex, one solution"
            : "that value leaves the line above the vertex, two solutions"
        ),
        slip(
          Math.floor(F(b * b, 4).toNumber()) + 1,
          "you ignored the line and compared with $0$ instead"
        ),
        slip(
          Math.floor(
            F(b * b, 4)
              .sub(d)
              .toNumber()
          ) + 1,
          `you moved ${n(d)} with the wrong sign`
        ),
      ],
      asks: `the smallest whole-number ${m("a")} that keeps the parabola entirely above the line`,
      steps: [
        {
          label: "Combine the equations",
          work: `${m(`${poly([1, b, 0], "x")} + a = ${num(d, { decimal: true })}`)}, so ${m(`${poly([1, b, 0], "x")} + (a ${signed(d.neg(), { decimal: true })}) = 0`)}`,
        },
        {
          label: "Make the discriminant negative",
          work: `${m(`${b * b} - 4(a ${signed(d.neg(), { decimal: true })}) < 0`)}, so ${m(`a > ${num(bound, { decimal: true })}`)}`,
        },
        {
          label: "Take the least integer",
          work: `The least integer greater than ${n(bound, { decimal: true })} is ${n(least)}`,
        },
      ],
      check: `With ${m(`a = ${least}`)} the vertex of the parabola is at height ${n(F(least).sub(F(b * b, 4)), { decimal: true })}, above the line ${m(`y = ${num(d, { decimal: true })}`)}; with ${m(`a = ${least - 1}`)} it is at ${n(F(least - 1).sub(F(b * b, 4)), { decimal: true })}, which is not above it`,
      tip: "No real solutions means the combined quadratic's discriminant is negative; then test the integers next to the boundary",
      hint: "Set the two expressions for $y$ equal and look at the discriminant.",
      difficulty: 6,
      isCorrect: (cand) => {
        const x = valueOf(cand);
        if (x === null || !x.isInt()) return false;
        return countByVertex(1, b, x.sub(d)) === 0 && countByVertex(1, b, x.sub(1).sub(d)) > 0;
      },
    };
  },
};
