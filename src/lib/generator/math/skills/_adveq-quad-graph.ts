/*
 * m-graphs-of-quadratics, continued: a parabola drawn on a small grid, with its vertex and
 * intercepts at grid points. The student reads the vertex, an intercept or the extreme value,
 * or picks the equation that defines the graph. The checks read the drawn points: a right
 * equation must pass through the vertex and both x-intercepts shown.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { curve, frame, plane, point } from "../core/figures";
import { m, n, num, signed } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import { pairAnswer, pairOf, pairSlip, slip, valueOf } from "./_adveq-common";

/** A coefficient before brackets: "" for 1, "-" for -1, 2, \frac{1}{2}. */
export const coefTex = (a: Frac) => (a.eq(1) ? "" : a.eq(-1) ? "-" : num(a));

/** a(x - h)^2 + k, tidy: x^2 when h = 0, no constant when k = 0. */
export function vertexTex(a: Frac, h: Frac, k: Frac, v = "x"): string {
  const sq = h.isZero() ? `${v}^2` : `(${v} ${signed(h.neg())})^2`;
  return `${coefTex(a)}${sq}${k.isZero() ? "" : ` ${signed(k)}`}`;
}

/** a(x - r)(x - s), tidy. */
function factoredTex(a: Frac, r: Frac, s: Frac): string {
  const f = (z: Frac) => (z.isZero() ? "x" : `(x ${signed(z.neg())})`);
  return `${coefTex(a)}${f(r)}${f(s)}`;
}

type Ask = "equation" | "vertex" | "yint" | "zero" | "ext" | "value";

export const readGraph: Template = {
  id: "quad-graph.read-graph",
  skill: "m-graphs-of-quadratics",
  label: "Read a parabola's graph: vertex, intercepts, a value, extreme value, equation",
  difficulty: [2, 5],
  formats: ["mc"],
  make(rng, format): Draft {
    const a = rng.pick([F(1), F(-1), F(2), F(-2), F(3), F(-3), F(1, 2), F(-1, 2)]);
    const half = !a.isInt();
    const h = F(half ? rng.pick([-6, -4, -2, 0, 2, 4, 6]) : rng.int(-6, 6));
    const d = half ? rng.pick([2, 4]) : rng.int(1, 4);
    const crosses = rng.bool(0.55);
    const k = crosses ? a.mul(d * d).neg() : F(rng.nonzero(-8, 8));
    // Two marked points the same distance d from the axis: the x-intercepts when it crosses.
    const r1 = h.sub(d);
    const r2 = h.add(d);
    const fr = (x: Frac) => a.mul(x.sub(h).pow(2)).add(k);
    const py = fr(r2);
    const y0 = fr(F(0));
    need(k.isInt() && py.isInt() && y0.isInt(), "lattice points");
    need(Math.abs(y0.n) <= 14 && Math.abs(py.n) <= 14 && Math.abs(k.n) <= 10, "fits the grid");
    const xs = [r1.n, r2.n, 0];
    const ys = [k.n, y0.n, py.n, 0];
    const xr: [number, number] = [Math.min(...xs) - 2, Math.max(...xs) + 2];
    const yr: [number, number] = [Math.min(...ys) - 2, Math.max(...ys) + 2];
    need(xr[1] - xr[0] <= 20 && yr[1] - yr[0] <= 20, "small frame");
    const fig = frame(xr, yr, { step: 1, labelStep: 2 });
    const latex = `y=${vertexTex(a, h, k)}`;
    const f = (x: number) => a.toNumber() * (x - h.toNumber()) ** 2 + k.toNumber();
    const pts: [string, number, number][] = [
      ["V", h.n, k.n],
      ["A", r1.n, py.n],
      ["B", r2.n, py.n],
      ["C", 0, y0.n],
    ];
    const seen = new Set<string>();
    const parts = [curve("f", latex, f, fig)];
    for (const [id, x, y] of pts) {
      if (seen.has(`${x},${y}`)) continue;
      seen.add(`${x},${y}`);
      parts.push(point(id, x, y, ["f"]));
    }
    const figure = plane(fig, parts);
    const C = rng.pick([r1, r2, F(0), h.add(1)].filter((x) => fr(x).isInt() && !x.isZero()));
    need(C !== undefined, "a value to read");
    const asks: Ask[] = [
      "equation",
      "equation",
      "equation",
      "vertex",
      "vertex",
      "value",
      "value",
      "yint",
      "ext",
      ...(crosses ? (["zero"] as Ask[]) : []),
    ];
    const ask = rng.pick(asks);
    const up = a.sign() > 0;
    const minmax = up ? "minimum" : "maximum";
    const intro = "The graph of the quadratic function $y = f(x)$ is shown.";
    let stem: string;
    let answer: Answer;
    let slips: Slip[];
    let steps: { label: string; work: string }[];
    let check: string;
    let difficulty: number;
    let isCorrect: (c: Answer) => boolean;
    const readV = {
      label: "Read the vertex",
      work: `The ${up ? "lowest" : "highest"} point of the graph is ${m(`(${num(h)}, ${num(k)})`)}`,
    };
    const readX = {
      label: crosses ? "Read the x-intercepts" : "Read two matching points",
      work: crosses
        ? `The graph crosses the x-axis at ${m(`(${num(r1)}, 0)`)} and ${m(`(${num(r2)}, 0)`)}`
        : `The graph passes through ${m(`(${num(r1)}, ${num(py)})`)} and ${m(`(${num(r2)}, ${num(py)})`)}`,
    };

    if (ask === "equation") {
      const vertexForm = !crosses || rng.bool(0.5);
      const choice = (aa: Frac, hh: Frac, kk: Frac, text: string) => ({
        text: m(`y = ${text}`),
        expr: (vars: Readonly<Record<string, number>>) =>
          aa.toNumber() * (vars.x - hh.toNumber()) ** 2 + kk.toNumber(),
      });
      const vChoice = (aa: Frac, hh: Frac, kk: Frac) => choice(aa, hh, kk, vertexTex(aa, hh, kk));
      // a(x - r1)(x - r2) = a(x - h)^2 - a d^2, so a scaled factored form keeps the intercepts.
      const fChoice = (aa: Frac, s1: Frac, s2: Frac) => {
        const hh = s1.add(s2).div(2);
        const dd = s2.sub(s1).div(2);
        return choice(aa, hh, aa.mul(dd).mul(dd).neg(), factoredTex(aa, s1, s2));
      };
      const scale = a.mul(rng.pick([2, 3]));
      answer = vertexForm ? vChoice(a, h, k) : fChoice(a, r1, r2);
      slips = vertexForm
        ? [
            {
              ...vChoice(a, h.neg(), k),
              why: `you put ${n(h)} in the bracket without changing its sign; a vertex at ${m(`x = ${num(h)}`)} needs ${m(`(x ${signed(h.neg())})`)}`,
            },
            {
              ...vChoice(a, h, k.neg()),
              why: `you used the wrong sign for the vertex's y-coordinate, ${n(k)}`,
            },
            {
              ...vChoice(a.neg(), h, k),
              why: `the graph opens ${up ? "up" : "down"}, so the leading coefficient must be ${up ? "positive" : "negative"}`,
            },
            { ...vChoice(a, k, h), why: "you swapped the vertex's coordinates" },
          ]
        : [
            {
              ...fChoice(a, r1.neg(), r2.neg()),
              why: `you used the intercepts' signs in the brackets; an intercept at ${m(`x = ${num(r2)}`)} needs ${m(`(x ${signed(r2.neg())})`)}`,
            },
            {
              ...fChoice(a.neg(), r1, r2),
              why: `the graph opens ${up ? "up" : "down"}, so the leading coefficient must be ${up ? "positive" : "negative"}`,
            },
            {
              ...fChoice(scale, r1, r2),
              why: `this graph has the right x-intercepts, but its vertex is at ${m(`(${num(h)}, ${num(scale.mul(d * d).neg())})`)}, not ${m(`(${num(h)}, ${num(k)})`)}`,
            },
            {
              ...fChoice(a.neg(), r1.neg(), r2.neg()),
              why: "you reversed the signs of the intercepts and the direction the graph opens",
            },
          ];
      stem = `${intro} Which equation defines ${m("f")}?`;
      steps = vertexForm
        ? [
            readV,
            {
              label: "Find the leading coefficient",
              work: `The point ${m(`(${num(r2)}, ${num(py)})`)} is on the graph: ${m(`a${h.isZero() ? `(${num(r2)})` : `(${num(r2)} ${signed(h.neg())})`}^2 ${signed(k)} = ${num(py)}`)}, so ${m(`${d * d}a = ${num(py.sub(k))}`)} and ${m(`a = ${num(a)}`)}`,
            },
            { label: "Write the vertex form", work: m(`y = ${vertexTex(a, h, k)}`) },
          ]
        : [
            readX,
            {
              label: "Find the leading coefficient",
              work: `${m(`y = a${factoredTex(F(1), r1, r2)}`)} must pass through the vertex ${m(`(${num(h)}, ${num(k)})`)}: ${m(`a(${num(h.sub(r1))})(${num(h.sub(r2))}) = ${num(k)}`)}, so ${m(`a = ${num(a)}`)}`,
            },
            { label: "Write the factored form", work: m(`y = ${factoredTex(a, r1, r2)}`) },
          ];
      check = `At ${m(`x = ${num(h)}`)} the equation gives ${m(`y = ${num(k)}`)}, the vertex, and at ${m(`x = ${num(r1)}`)} and ${m(`x = ${num(r2)}`)} it gives ${n(py)}, matching the two marked points`;
      difficulty = half ? 5 : 4;
      isCorrect = (c) => {
        if (!c.expr) return false;
        const at = (x: Frac) => c.expr!({ x: x.toNumber() });
        const close = (u: number, w: number) => Math.abs(u - w) < 1e-9;
        return (
          close(at(h), k.toNumber()) && close(at(r1), py.toNumber()) && close(at(r2), py.toNumber())
        );
      };
    } else if (ask === "vertex") {
      answer = pairAnswer(h, k);
      slips = [
        pairSlip(k, h, "you swapped the coordinates of the vertex"),
        pairSlip(0, y0, "you gave the y-intercept, not the vertex"),
        pairSlip(
          r2,
          py,
          `you gave another point on the graph, ${m(`(${num(r2)}, ${num(py)})`)}, not the vertex`
        ),
        pairSlip(h.neg(), k, "you misread the sign of the vertex's x-coordinate"),
      ];
      stem = `${intro} What are the coordinates of the vertex of the graph?`;
      steps = [readV];
      check = `The graph is symmetric about ${m(`x = ${num(h)}`)}: the points at ${m(`x = ${num(r1)}`)} and ${m(`x = ${num(r2)}`)} have the same height and are both ${n(d)} units from it`;
      difficulty = 2;
      isCorrect = (c) => {
        const pt = pairOf(c);
        if (!pt) return false;
        const [x, y] = pt;
        return fr(x).eq(y) && fr(x.sub(1)).eq(fr(x.add(1)));
      };
    } else {
      const value = ask === "yint" ? y0 : ask === "zero" ? r2 : ask === "value" ? fr(C) : k;
      answer = numAnswer(value, m(num(value)));
      const pool: [Frac, string][] =
        ask === "yint"
          ? [
              [k, "you read the vertex's y-coordinate"],
              [r2, "you read an x-intercept"],
              [y0.neg(), "you misread the sign of the y-intercept"],
              [r1, "you read an x-intercept"],
            ]
          : ask === "value"
            ? [
                [
                  fr(C.neg()),
                  `you read the graph at ${m(`x = ${num(C.neg())}`)} instead of ${m(`x = ${num(C)}`)}`,
                ],
                [C, "you gave the input, not the output"],
                [k, "you gave the vertex's y-coordinate"],
                [y0, "you gave the y-intercept"],
                [C.add(h), "you read the wrong coordinate"],
              ]
            : ask === "zero"
              ? [
                  [r1, "you gave the lesser x-intercept"],
                  [h, "you gave the x-coordinate of the vertex"],
                  [y0, "you gave the y-intercept"],
                  [k, "you gave the vertex's y-coordinate"],
                ]
              : [
                  [h, `you gave the x-coordinate of the vertex, where the ${minmax} happens`],
                  [y0, "you gave the y-intercept"],
                  [r2, "you gave an x-intercept"],
                  [k.neg(), "you misread the sign of the vertex's y-coordinate"],
                ];
      slips = pool.map(([v, why]) => slip(v, why));
      stem =
        ask === "yint"
          ? `${intro} The graph crosses the y-axis at ${m("(0, b)")}. What is the value of ${m("b")}?`
          : ask === "value"
            ? `${intro} What is the value of ${m(`f(${num(C)})`)}?`
            : ask === "zero"
              ? `${intro} What is the greatest value of ${m("x")} for which ${m("f(x) = 0")}?`
              : `${intro} What is the ${minmax} value of ${m("f(x)")}?`;
      steps =
        ask === "yint"
          ? [
              {
                label: "Read the y-intercept",
                work: `The graph crosses the y-axis at ${m(`(0, ${num(y0)})`)}`,
              },
            ]
          : ask === "value"
            ? [
                {
                  label: "Find the point above the input",
                  work: `At ${m(`x = ${num(C)}`)} the graph is at height ${n(fr(C))}, so ${m(`f(${num(C)}) = ${num(fr(C))}`)}`,
                },
              ]
            : ask === "zero"
              ? [
                  readX,
                  {
                    label: "Take the greater one",
                    work: `${m("f(x) = 0")} where the graph meets the x-axis; the greater value is ${n(r2)}`,
                  },
                ]
              : [
                  readV,
                  {
                    label: `Read the ${minmax}`,
                    work: `The ${minmax} value of ${m("f(x)")} is the vertex's y-coordinate, ${n(k)}`,
                  },
                ];
      check =
        ask === "yint"
          ? `The vertex ${m(`(${num(h)}, ${num(k)})`)} and the point ${m(`(${num(r2)}, 0)`)} give ${m(`f(x) = ${vertexTex(a, h, k)}`)}, and ${m(`f(0) = ${num(y0)}`)}`
          : ask === "value"
            ? `The vertex ${m(`(${num(h)}, ${num(k)})`)} and the point ${m(`(${num(r2)}, ${num(py)})`)} give ${m(`f(x) = ${vertexTex(a, h, k)}`)}, and that formula gives ${m(`f(${num(C)}) = ${num(fr(C))}`)}`
            : ask === "zero"
              ? `The x-intercepts ${n(r1)} and ${n(r2)} are the same distance from the vertex's x-coordinate ${n(h)}, as they must be`
              : `The graph is ${up ? "above" : "below"} ${m(`y = ${num(k)}`)} everywhere except at the vertex`;
      difficulty = ask === "yint" || ask === "value" ? 2 : 3;
      isCorrect = (c) => {
        const x = valueOf(c);
        if (!x) return false;
        if (ask === "yint") return x.eq(fr(F(0)));
        if (ask === "value") return x.eq(fr(C));
        if (ask === "zero") return fr(x).isZero() && x.gt(r1.add(r2).div(2));
        const mid = r1.add(r2).div(2);
        return x.eq(fr(mid)) && fr(mid.sub(1)).eq(fr(mid.add(1)));
      };
    }
    const fn = rng.pick(["f", "g", "p", "q"]);
    const rename = (t: string) => t.replace(/\bf\(/g, `${fn}(`).replace(/\$f\$/g, `$${fn}$`);
    steps = steps.map((st) => ({ label: st.label, work: rename(st.work) }));
    return {
      format,
      stem: rename(stem),
      figure,
      answer,
      slips,
      asks:
        ask === "equation"
          ? crosses
            ? "the equation whose graph has this vertex and these x-intercepts"
            : "the equation whose graph has this vertex and passes through the marked points"
          : ask === "vertex"
            ? "the turning point of the parabola"
            : ask === "yint"
              ? "where the graph crosses the y-axis"
              : ask === "value"
                ? `the height of the graph at ${m(`x = ${num(C)}`)}`
                : ask === "zero"
                  ? "the greater x-intercept of the graph"
                  : `the ${minmax} value of the function, the y-coordinate of the vertex`,
      steps,
      check: rename(check),
      tip:
        ask === "equation"
          ? "Read the vertex and two other points from the graph, and check each answer choice against all three points"
          : "On a parabola's graph, the vertex is the turning point, the y-intercept is where x = 0, and the x-intercepts are where y = 0"
              .replace("x = 0", "$x = 0$")
              .replace("y = 0", "$y = 0$"),
      hint:
        ask === "equation"
          ? "Find the vertex and two other points on the graph first."
          : ask === "zero"
            ? "Where is the value of the function 0?".replace("0?", "$0$?")
            : "Look for the turning point and the axis crossings on the graph.",
      difficulty,
      isCorrect,
    };
  },
};
