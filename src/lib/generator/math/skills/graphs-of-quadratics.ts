/*
 * m-graphs-of-quadratics: vertex, intercepts and the three forms. Item models after the bank's
 * own questions for this skill: the y-intercept, a value of the function, the vertex and the
 * minimum or maximum from standard, vertex or factored form; a graph to read (in
 * _adveq-quad-graph.ts); and height or revenue models (the meaning of the vertex, the starting
 * value, the maximum, and a model built from its vertex). Every check evaluates the printed
 * function itself, or locates the vertex by symmetry, not by the form the work reads.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { block, m, n, num, paren, poly, signed, times } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import { pairAnswer, pairOf, pairSlip, polyMul, slip, valueOf } from "./_adveq-common";
import { coefTex, vertexTex } from "./_adveq-quad-graph";
import { readGraph } from "./_adveq-quad-graph";
import { context } from "./_adveq-quad-context";

const SKILL = "m-graphs-of-quadratics";

type Form = "std" | "vertex" | "factored";
type Ask = "yint" | "value" | "vx" | "ext" | "vertex";

/** A polynomial (highest power first) at a rational x. */
function polyAtFrac(coeffs: readonly Frac[], x: Frac): Frac {
  return coeffs.reduce((acc, c) => acc.mul(x).add(c), F(0));
}

/** b times a bracketed value, signed, for a substitution: "+ 3(-2)", "- 4(5)". */
const signedTimes = (b: Frac, x: Frac) =>
  b.isZero() ? "" : `${b.sign() < 0 ? "-" : "+"} ${times(b.abs(), x)}`;

export const features: Template = {
  id: "quad-graph.features",
  skill: SKILL,
  label: "Intercept, value, vertex and extreme value from an equation",
  difficulty: [1, 6],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const fn = rng.pick(["f", "g", "p"]);
    const form = rng.pick(["std", "std", "vertex", "factored"] as Form[]);
    const options: Record<Form, Ask[]> = {
      std: ["yint", "yint", "value", "value", "vx", "ext", "vertex"],
      vertex: ["yint", "ext", "vertex", "value"],
      factored: ["yint", "ext", "ext", "vx"],
    };
    const ask = rng.pick(options[form].filter((a) => !(format === "spr" && a === "vertex")));
    let a: Frac;
    let h: Frac;
    let k: Frac;
    let p = F(0);
    let q = F(0);
    let rhs: string;
    if (form === "factored") {
      a = F(rng.pick([1, 1, 2, 3, 4, 9, -1, -2]));
      const roots = rng.sample(
        Array.from({ length: 31 }, (_, i) => i - 15).filter((x) => x !== 0),
        2
      );
      need((roots[0] + roots[1]) % 2 === 0, "integer vertex");
      [p, q] = roots.map((x) => F(x));
      h = p.add(q).div(2);
      k = a.mul(h.sub(p)).mul(h.sub(q));
      const c = a.eq(4) ? 2 : a.eq(9) ? 3 : 1;
      rhs =
        c > 1
          ? `(${poly([c, -c * p.n], "x")})(${poly([c, -c * q.n], "x")})`
          : `${coefTex(a)}(${poly([1, -p.n], "x")})(${poly([1, -q.n], "x")})`;
    } else {
      a = F(rng.pick([1, 1, 2, 3, 4, 5, -1, -2, -3]));
      h = F(rng.nonzero(-9, 9));
      k = F(rng.nonzero(-40, 40));
      rhs =
        form === "vertex"
          ? vertexTex(a, h, k)
          : poly([a, a.mul(h).mul(-2), a.mul(h).mul(h).add(k)], "x");
    }
    const coeffs =
      form === "factored"
        ? polyMul([a], polyMul([F(1), p.neg()], [F(1), q.neg()]))
        : [a, a.mul(h).mul(-2), a.mul(h).mul(h).add(k)];
    const [A, B, C] = coeffs;
    need(!C.isZero(), "y-intercept at the origin");
    const fx = (x: Frac): Frac =>
      form === "factored"
        ? a.mul(x.sub(p)).mul(x.sub(q))
        : form === "vertex"
          ? a.mul(x.sub(h).pow(2)).add(k)
          : polyAtFrac(coeffs, x);
    const def = `${fn}(x) = ${rhs}`;
    const minmax = a.sign() > 0 ? "minimum" : "maximum";
    const K = F(rng.nonzero(-6, 7));
    let stem: string;
    let answer: Answer;
    let slips: Slip[];
    let steps: { label: string; work: string }[];
    let check: string;
    let asks: string;
    let difficulty: number;
    let isCorrect: (cand: Answer) => boolean;
    const sub = (x: Frac) =>
      form === "std"
        ? `${times(A, x)}^2 ${signedTimes(B, x)} ${signed(C)}`
        : form === "vertex"
          ? `${coefTex(a)}(${num(x)} ${signed(h.neg())})^2 ${signed(k)}`
          : `${coefTex(a)}(${num(x)} ${signed(p.neg())})(${num(x)} ${signed(q.neg())})`;
    const vxWork =
      form === "factored"
        ? `The graph crosses the x-axis at ${m(`x = ${num(p)}`)} and ${m(`x = ${num(q)}`)}. The vertex is halfway between them: ${m(`x = \\frac{${num(p)} ${signed(q)}}{2} = ${num(h)}`)}`
        : m(`x = -\\frac{b}{2a} = -\\frac{${num(B)}}{2(${num(A)})} = ${num(h)}`);
    const symCheck = `${m(`${fn}(${num(h.sub(1))}) = ${num(fx(h.sub(1)))}`)} and ${m(`${fn}(${num(h.add(1))}) = ${num(fx(h.add(1)))}`)} are equal, so the graph is symmetric about ${m(`x = ${num(h)}`)}, and both are ${a.sign() > 0 ? "greater" : "less"} than ${m(`${fn}(${num(h)}) = ${num(k)}`)}`;

    if (ask === "yint") {
      const y = fx(F(0));
      asks = `the point where the graph of ${m(`y = ${fn}(x)`)} crosses the y-axis`;
      const wrong: [Frac, string][] =
        form === "std"
          ? [
              [A, "you took the coefficient of $x^2$"],
              [B, "you took the coefficient of $x$"],
              [A.add(B).add(C), "you substituted $x = 1$ instead of $x = 0$"],
            ]
          : form === "vertex"
            ? [
                [k, "you read the vertex's y-coordinate as the y-intercept"],
                [
                  h.mul(h).add(k),
                  `you forgot to multiply ${m(`(0 ${signed(h.neg())})^2`)} by ${n(a)}`,
                ],
                [
                  k.sub(a.mul(h).mul(h)),
                  `you treated ${m(`(0 ${signed(h.neg())})^2`)} as negative`,
                ],
                [k.sub(a.mul(h)), `you did not square ${m(`0 ${signed(h.neg())}`)}`],
              ]
            : [
                [p.mul(q), `you forgot the leading factor ${n(a)}`],
                [
                  y.neg(),
                  `you made a sign slip: ${m(`(0 ${signed(p.neg())})(0 ${signed(q.neg())})`)} is ${n(p.mul(q))}`,
                ],
                [
                  a.mul(p.add(q).neg()),
                  "you added the numbers in the factors instead of multiplying them",
                ],
              ];
      if (format === "mc") {
        answer = pairAnswer(0, y);
        slips = [
          ...wrong.map(([w, why]) => pairSlip(0, w, why)),
          pairSlip(y, 0, "you swapped the coordinates; the y-intercept has x-coordinate $0$"),
        ];
        stem = `What is the y-intercept of the graph of ${m(`y = ${rhs}`)} in the xy-plane?`;
      } else {
        answer = numAnswer(y, m(num(y)));
        slips = wrong.map(([w, why]) => slip(w, why));
        stem = rng.bool(0.5)
          ? `The function ${m(fn)} is defined by ${m(def)}. The graph of ${m(`y = ${fn}(x)`)} in the xy-plane crosses the y-axis at ${m("(0, b)")}. What is the value of ${m("b")}?`
          : `The y-intercept of the graph of ${m(`y = ${rhs}`)} in the xy-plane is ${m("(0, b)")}. What is the value of ${m("b")}?`;
      }
      steps = [
        {
          label: "Set x equal to 0",
          work: `The graph crosses the y-axis where ${m("x = 0")}: ${m(`y = ${sub(F(0))} = ${num(y)}`)}`,
        },
        { label: "Write the y-intercept", work: `The y-intercept is ${m(`(0, ${num(y)})`)}` },
      ];
      check =
        form === "std"
          ? `Every term with ${m("x")} is $0$ when ${m("x = 0")}, so only the constant ${n(C)} is left`
          : `Expanded, the function is ${m(poly(coeffs, "x"))}, whose constant term is ${n(y)}`;
      difficulty = form === "std" ? 1 : form === "factored" ? 2 : a.eq(1) ? 2 : 3;
      isCorrect = (cand) => {
        const truth = polyAtFrac(coeffs, F(0));
        if (format === "mc") {
          const pt = pairOf(cand);
          return pt !== null && pt[0].isZero() && pt[1].eq(truth);
        }
        const x = valueOf(cand);
        return x !== null && x.eq(truth);
      };
    } else if (ask === "value") {
      const val = fx(K);
      asks = `the output of ${m(fn)} when the input is ${n(K)}`;
      stem = `The function ${m(fn)} is defined by ${m(def)}. What is the value of ${m(`${fn}(${num(K)})`)}?`;
      answer = numAnswer(val, m(num(val)));
      slips = [
        slip(
          A.mul(K).pow(2).add(B.mul(K)).add(C),
          `you squared ${m(`${num(A)}${paren(K).startsWith("(") ? paren(K) : `(${num(K)})`}`)} instead of only ${n(K)}`
        ),
        slip(A.mul(K).mul(2).add(B.mul(K)).add(C), `you doubled ${n(K)} instead of squaring it`),
        slip(fx(K.neg()), `you substituted ${n(K.neg())} instead of ${n(K)}`),
        slip(
          A.mul(K).mul(K).neg().add(B.mul(K)).add(C),
          `you wrote ${m(`${paren(K)}^2`)} as ${n(K.mul(K).neg())}`
        ),
      ];
      steps = [
        {
          label: "Substitute the input",
          work: m(`${fn}(${num(K)}) = ${sub(K)}`),
        },
        {
          label: "Square first, then multiply",
          work:
            form === "vertex"
              ? m(`${coefTex(a)}${paren(K.sub(h))}^2 ${signed(k)} = ${num(val)}`)
              : m(`${num(A)}(${num(K.mul(K))}) ${signed(B.mul(K))} ${signed(C)} = ${num(val)}`),
        },
      ];
      check =
        form === "vertex"
          ? `Expanded, ${m(`${fn}(x) = ${poly(coeffs, "x")}`)}, and ${m(`${num(A)}(${num(K.mul(K))}) ${signed(B.mul(K))} ${signed(C)} = ${num(val)}`)}`
          : `In vertex form ${m(`${fn}(x) = ${vertexTex(a, h, k)}`)}, so ${m(`${fn}(${num(K)}) = ${coefTex(a)}${paren(K.sub(h))}^2 ${signed(k)} = ${num(val)}`)}`;
      difficulty = K.sign() < 0 || form === "vertex" ? 2 : 1;
      isCorrect = (cand) => {
        const x = valueOf(cand);
        return x !== null && x.eq(polyAtFrac(coeffs, K));
      };
    } else if (ask === "vx") {
      asks = `the x-coordinate of the vertex of the graph of ${m(`y = ${fn}(x)`)}`;
      stem = `The function ${m(fn)} is defined by ${m(def)}. In the xy-plane, the graph of ${m(`y = ${fn}(x)`)} is a parabola. What is the x-coordinate of its vertex?`;
      answer = numAnswer(h, m(num(h)));
      slips = [
        slip(
          h.neg(),
          form === "factored"
            ? "you averaged the numbers as printed in the factors, which flips their signs"
            : "you dropped the minus sign in $-\\frac{b}{2a}$"
        ),
        ...(form === "factored"
          ? [
              slip(p, `you gave an x-intercept, ${m(`x = ${num(p)}`)}, not the vertex`),
              slip(p.add(q), "you added the x-intercepts and forgot to divide by 2"),
            ]
          : [
              slip(h.mul(2), "you divided by $a$ instead of $2a$"),
              slip(C, "you gave the y-intercept"),
            ]),
        slip(k, "you gave the y-coordinate of the vertex"),
      ];
      steps = [{ label: "Locate the axis of symmetry", work: vxWork }];
      check = symCheck;
      difficulty = form === "factored" ? 4 : 3;
      isCorrect = (cand) => {
        const x = valueOf(cand);
        return x !== null && fx(x.sub(1)).eq(fx(x.add(1)));
      };
    } else {
      if (ask === "vertex") {
        asks = `the vertex of the graph of ${m(`y = ${fn}(x)`)}`;
        stem = `The function ${m(fn)} is defined by ${m(def)}. What are the coordinates of the vertex of the graph of ${m(`y = ${fn}(x)`)} in the xy-plane?`;
        answer = pairAnswer(h, k);
        slips = [
          pairSlip(
            h.neg(),
            k,
            form === "vertex"
              ? `you read ${m(`(x ${signed(h.neg())})`)} as ${m(`x = ${num(h.neg())}`)}`
              : "you dropped the minus sign in $-\\frac{b}{2a}$"
          ),
          pairSlip(k, h, "you swapped the coordinates of the vertex"),
          pairSlip(h, k.neg(), `you changed the sign of ${n(k)}`),
          pairSlip(h, C, "you used the y-intercept's y-value, not the vertex's"),
        ];
      } else {
        asks = `the ${minmax} value of ${m(fn)}, which is the y-coordinate of the vertex`;
        stem = rng.bool(0.5)
          ? `${block(def)}\nWhat is the ${minmax} value of the given function?`
          : `The function ${m(fn)} is defined by ${m(def)}. What is the ${minmax} value of ${m(`${fn}(x)`)}?`;
        answer = numAnswer(k, m(num(k)));
        slips = [
          slip(h, `you gave the x-coordinate of the vertex, where the ${minmax} happens`),
          slip(C, "you gave the y-intercept"),
          slip(
            fx(h.neg()),
            `you evaluated ${m(fn)} at ${m(`x = ${num(h.neg())}`)}, a sign slip in the x-coordinate of the vertex`
          ),
          slip(k.neg(), `you changed the sign of ${n(k)}`),
        ];
      }
      steps =
        form === "vertex"
          ? [
              {
                label: "Read the vertex form",
                work: `${m("a(x - h)^2 + k")} has its vertex at ${m("(h, k)")}, so the vertex is ${m(`(${num(h)}, ${num(k)})`)}`,
              },
              {
                label: "Decide maximum or minimum",
                work: `${m(`a = ${num(a)}`)} is ${a.sign() > 0 ? "positive, so the graph opens up and the vertex is the lowest point" : "negative, so the graph opens down and the vertex is the highest point"}`,
              },
            ]
          : [
              { label: "Find the x-coordinate of the vertex", work: vxWork },
              {
                label: "Find the y-coordinate",
                work: m(`${fn}(${num(h)}) = ${sub(h)} = ${num(k)}`),
              },
            ];
      if (ask === "ext")
        steps.push({
          label: `Read the ${minmax}`,
          work: `The ${minmax} value is the y-coordinate of the vertex, ${n(k)}`,
        });
      check = symCheck;
      difficulty =
        form === "vertex" ? 2 : form === "std" ? (ask === "vertex" ? 4 : 3) : a.eq(1) ? 5 : 6;
      isCorrect = (cand) => {
        // The vertex by symmetry of the printed function, then its value there.
        const X = B.neg().div(A.mul(2));
        if (!fx(X.sub(1)).eq(fx(X.add(1)))) return false;
        if (ask === "vertex") {
          const pt = pairOf(cand);
          return pt !== null && pt[0].eq(X) && pt[1].eq(fx(X));
        }
        const x = valueOf(cand);
        return x !== null && x.eq(fx(X));
      };
    }
    return {
      format,
      stem,
      answer,
      slips,
      asks,
      steps,
      check,
      tip:
        ask === "yint"
          ? "The y-intercept is the value of the function at $x = 0$"
          : ask === "value"
            ? "Substitute in brackets and square before you multiply by the coefficient"
            : "The vertex lies on the axis of symmetry, halfway between the x-intercepts; in standard form that is $x = -\\frac{b}{2a}$",
      hint:
        ask === "yint"
          ? "Where does a graph cross the y-axis?"
          : ask === "value"
            ? `Replace each ${m("x")} with ${m(`(${num(K)})`)}.`
            : form === "vertex"
              ? "Vertex form shows the vertex directly."
              : form === "factored"
                ? "The vertex is halfway between the x-intercepts."
                : "Find the x-coordinate of the vertex first.",
      difficulty,
      isCorrect,
    };
  },
};

export const TEMPLATES: Template[] = [features, readGraph, context];
