/*
 * m-functions-and-transformations, part two: reading values from a graph made of straight
 * pieces with integer corners and slopes, so every integer input reads exactly.
 */
import { need } from "../core/build";
import { frame, plane } from "../core/figures";
import { F, Frac } from "../core/frac";
import { m, num, paren } from "../core/tex";
import type { Draft, Template } from "../core/types";
import { ans, byValue, fitsBox, keep, pickW, sv } from "./_funcpct-common";

const SKILL = "m-functions-and-transformations";
const nn = (v: Frac) => num(v);

/** A piecewise-linear graph with integer vertices and integer slopes, so every integer x reads cleanly. */
function zigzag(rng: Parameters<Template["make"]>[0]): [number, number][] {
  for (let tries = 0; tries < 50; tries++) {
    const x0 = rng.int(-7, -5);
    const pts: [number, number][] = [[x0, rng.int(-4, 5)]];
    while (pts[pts.length - 1][0] < 5) {
      const [x, y] = pts[pts.length - 1];
      const len = rng.int(1, 4);
      const slope = rng.pick([-2, -1, 0, 1, 2, 1, -1]);
      const nx = Math.min(x + len, rng.int(5, 7));
      if (nx <= x) break;
      pts.push([nx, y + slope * (nx - x)]);
    }
    const ok = pts.every(([, y]) => y >= -6 && y <= 6) && pts.length >= 4;
    const slopes = pts.slice(1).map(([x, y], i) => (y - pts[i][1]) / (x - pts[i][0]));
    const turns = slopes.slice(1).every((s, i) => s !== slopes[i]);
    if (ok && turns) return pts;
  }
  throw new RangeError("no graph");
}

function valueAt(pts: [number, number][], x: number): number | null {
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    if (x >= x1 && x <= x2) return y1 + ((y2 - y1) * (x - x1)) / (x2 - x1);
  }
  return null;
}

export const graphRead: Template = {
  id: "func.graph-read",
  skill: SKILL,
  label: "Read values of a function from its graph",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const pts = zigzag(rng);
    const fn = rng.pick(["f", "g", "h", "p", "q", "r", "s"]);
    const fr = frame([-8, 8], [-8, 8]);
    const lo = pts[0][0];
    const hi = pts[pts.length - 1][0];
    const figure = plane(fr, [
      {
        kind: "function",
        id: "f",
        latex: `y=${fn}(x)`,
        domain: [lo, hi],
        samples: [pts.map(([x, y]) => [x, y] as [number, number])],
      },
    ]);
    const xsInt = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
    const at = (x: number) => valueAt(pts, x)!;
    const form = pickW(rng, [
      ["value", 3],
      ["sum", 2],
      ["max", 1],
    ] as const);
    const intro = rng.pick([
      `The graph of ${m(`y = ${fn}(x)`)} is shown in the ${m("xy")}-plane.`,
      `The graph of the function ${m(fn)} is shown, where ${m(`y = ${fn}(x)`)}.`,
      `The function ${m(fn)} is graphed in the ${m("xy")}-plane, where ${m(`y = ${fn}(x)`)}.`,
    ]);
    if (form === "max") {
      const ys = xsInt.map(at);
      const top = Math.max(...ys);
      need(ys.filter((y) => y === top).length === 1, "one highest point");
      const xTop = xsInt[ys.indexOf(top)];
      need(xTop !== top, "distinct");
      const target = F(top);
      return {
        format,
        stem: `${intro} What is the maximum value of ${m(`${fn}(x)`)} for ${m(`${lo} \\le x \\le ${hi}`)}?`,
        figure,
        answer: ans(target, nn),
        slips: keep(
          sv(
            F(xTop),
            "you gave the x-coordinate of the highest point instead of its y-coordinate",
            nn
          ),
          sv(F(Math.min(...ys)), "you found the minimum value", nn),
          sv(F(at(0)), `you read the ${m("y")}-intercept`, nn),
          sv(F(at(hi)), "you read the value at the right end of the graph", nn)
        ),
        asks: `the greatest ${m("y")}-value the graph reaches`,
        steps: [
          {
            label: "Find the highest point",
            work: `The highest point of the graph is ${m(`(${xTop}, ${top})`)}`,
          },
          {
            label: "Read its y-coordinate",
            work: `The maximum value of ${m(`${fn}(x)`)} is the ${m("y")}-coordinate, ${m(`${top}`)}`,
          },
        ],
        check: `every other point of the graph lies below the horizontal line ${m(`y = ${top}`)}`,
        tip: "A function's value is a y-coordinate; the maximum value is the y-coordinate of the highest point",
        hint: "Look for the highest point of the graph.",
        difficulty: 2,
        isCorrect: byValue((y) => y.eq(Math.max(...pts.map(([, py]) => py)))),
      };
    }
    if (form === "sum") {
      const [p, q] = rng.sample(
        xsInt.filter((x) => x !== 0),
        2
      );
      const sum = at(p) + at(q);
      const twice = rng.bool(0.4);
      const val = twice ? 2 * at(p) - at(q) : sum;
      const expr = twice ? `2${fn}(${p}) - ${fn}(${q})` : `${fn}(${p}) + ${fn}(${q})`;
      const target = F(val);
      if (format === "spr") need(fitsBox(target), "fits");
      const pq = twice ? 2 * p - q : p + q;
      return {
        format,
        stem: `${intro} What is the value of ${m(expr)}?`,
        figure,
        answer: ans(target, nn),
        slips: keep(
          xsInt.includes(pq)
            ? sv(F(at(pq)), `you combined the inputs first and found ${m(`${fn}(${pq})`)}`, nn)
            : null,
          sv(F(twice ? 2 * p - q : p + q), "you combined the inputs instead of the outputs", nn),
          sv(
            F(twice ? at(p) - at(q) : at(p) - at(q)),
            twice ? `you did not double ${m(`${fn}(${p})`)}` : "you subtracted the two values",
            nn
          ),
          sv(
            F(twice ? 2 * at(p) + at(q) : at(p) * at(q)),
            twice
              ? `you added ${m(`${fn}(${q})`)} instead of subtracting it`
              : "you multiplied the two values",
            nn
          )
        ),
        asks: `a combination of two outputs read from the graph`,
        steps: [
          {
            label: "Read the two values",
            work: `The graph passes through ${m(`(${p}, ${at(p)})`)} and ${m(`(${q}, ${at(q)})`)}, so ${m(`${fn}(${p}) = ${at(p)}`)} and ${m(`${fn}(${q}) = ${at(q)}`)}`,
          },
          {
            label: "Combine them",
            work: m(
              `${twice ? `2${paren(at(p))} - ${paren(at(q))}` : `${at(p)} + ${paren(at(q))}`} = ${val}`
            ),
          },
        ],
        check: `both points sit on grid crossings of the graph, so the readings are exact`,
        tip: "f(k) is the y-coordinate of the point on the graph with x-coordinate k",
        hint: `Find the point on the graph with ${m(`x = ${p}`)}.`,
        difficulty: twice ? 4 : 3,
        isCorrect: byValue((y) =>
          y.eq(
            twice ? 2 * valueAt(pts, p)! - valueAt(pts, q)! : valueAt(pts, p)! + valueAt(pts, q)!
          )
        ),
      };
    }
    const k = rng.pick(xsInt.filter((x) => x !== 0 && at(x) !== x));
    const val = at(k);
    const target = F(val);
    const inverse = xsInt.filter((x) => at(x) === k);
    return {
      format,
      stem: `${intro} What is the value of ${m(`${fn}(${k})`)}?`,
      figure,
      answer: ans(target, nn),
      slips: keep(
        inverse.length === 1
          ? sv(
              F(inverse[0]),
              `you found the ${m("x")}-value where ${m(`y = ${k}`)}; ${m(`${fn}(${k})`)} is the ${m("y")}-value where ${m(`x = ${k}`)}`,
              nn
            )
          : null,
        xsInt.includes(-k) ? sv(F(at(-k)), `you read the graph at ${m(`x = ${-k}`)}`, nn) : null,
        sv(F(at(0)), `you read the ${m("y")}-intercept, ${m(`${fn}(0)`)}`, nn),
        sv(F(k), "you gave the input itself", nn),
        sv(F(-val), "you read the sign of the y-value wrong", nn)
      ),
      asks: `the ${m("y")}-coordinate of the point on the graph where ${m(`x = ${k}`)}`,
      steps: [
        {
          label: `Find ${m(`x = ${k}`)} on the graph`,
          work:
            val === 0
              ? `Go to ${m(`${k}`)} on the ${m("x")}-axis; the graph meets the axis there`
              : `Go to ${m(`${k}`)} on the ${m("x")}-axis and move ${val > 0 ? "up" : "down"} to the graph`,
        },
        {
          label: "Read the y-coordinate",
          work: `The graph passes through ${m(`(${k}, ${val})`)}, so ${m(`${fn}(${k}) = ${val}`)}`,
        },
      ],
      check: `the point ${m(`(${k}, ${val})`)} is where the graph crosses the vertical grid line ${m(`x = ${k}`)}`,
      tip: "f(k) is the y-coordinate of the point on the graph with x-coordinate k",
      hint: `Find the point on the graph whose ${m("x")}-coordinate is ${m(`${k}`)}.`,
      difficulty: val < 0 || k < 0 ? 2 : 1,
      isCorrect: byValue((y) => y.eq(valueAt(pts, k)!)),
    };
  },
};
