/*
 * m-solving-systems, two more item models: reading the solution from a graph of two lines, and
 * the points on both graphs of a system with infinitely many solutions. Checks substitute each
 * candidate into the original equations.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac, gcd } from "../core/frac";
import { frame, line, plane } from "../core/figures";
import { block, lin, m, n, num, signed } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import {
  eq,
  numSlip,
  pairAns,
  pairSlip,
  parsePair,
  satisfies,
  scaleEq,
  stdTex,
  valueOf,
  type Eq,
} from "./_systems-common";

const SKILL = "m-solving-systems";
const SLOPES = [
  F(-3),
  F(-2),
  F(-1),
  F(1),
  F(2),
  F(3),
  F(0),
  F(1, 2),
  F(-1, 2),
  F(2, 3),
  F(-2, 3),
  F(3, 2),
  F(-3, 2),
];

export const fromGraph: Template = {
  id: "sys.from-graph",
  skill: SKILL,
  label: "Read the solution of a system from its graph",
  difficulty: [1, 2],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const x0 = F(rng.int(-6, 6));
    const y0 = F(rng.int(-6, 6));
    const [m1, m2] = rng.sample(SLOPES, 2);
    const b1 = y0.sub(m1.mul(x0));
    const b2 = y0.sub(m2.mul(x0));
    const fr = frame([-8, 8], [-8, 8], { step: 1, labelStep: 2 });
    // Each line must show at least three grid points inside the frame, so it reads exactly.
    for (const s of [m1, m2]) {
      let count = 0;
      for (let t = -14; t <= 14; t++) {
        const x = x0.add(s.d * t);
        const y = y0.add(s.n * t);
        if (Math.abs(x.toNumber()) <= 7 && Math.abs(y.toNumber()) <= 7) count++;
      }
      need(count >= 3, "readable line");
    }
    const tex1 = `y = ${lin([[m1, "x"]], b1)}`;
    const tex2 = `y = ${lin([[m2, "x"]], b2)}`;
    const figure = plane(fr, [
      line("l1", tex1.replace(/ /g, ""), m1.toNumber(), b1.toNumber(), fr),
      line("l2", tex2.replace(/ /g, ""), m2.toNumber(), b2.toNumber(), fr),
    ]);
    const lead = rng.bool(0.7)
      ? rng.pick([
          `The graphs of the equations ${m(tex1)} and ${m(tex2)} are shown in the ${m("xy")}-plane.`,
          `The lines ${m(tex1)} and ${m(tex2)} are graphed in the ${m("xy")}-plane shown.`,
          `The system ${m(tex1)} and ${m(tex2)} is graphed in the ${m("xy")}-plane shown.`,
        ])
      : rng.pick([
          "The graph of a system of two linear equations is shown.",
          `The two lines shown in the ${m("xy")}-plane are the graphs of a system of linear equations.`,
        ]);
    const ask =
      format === "spr"
        ? rng.pick(["x", "y", "sum", "diff"] as const)
        : rng.pick(["x", "y", "y", "sum", "diff", "pair"] as const);
    let answer: Answer;
    let slips: Slip[];
    let stem: string;
    const xInt = m1.isZero() ? null : b1.neg().div(m1);
    if (ask === "pair") {
      stem = `${lead} What is the solution ${m("(x, y)")} to the system?`;
      answer = pairAns(x0, y0);
      slips = [
        pairSlip(y0, x0, "you swapped the coordinates; the first number is the x-coordinate"),
        pairSlip(0, b1, "this is where one line crosses the y-axis, not where the two lines meet"),
        pairSlip(0, b2, "this is where one line crosses the y-axis, not where the two lines meet"),
        ...(xInt
          ? [
              pairSlip(
                xInt,
                0,
                "this is where one line crosses the x-axis, not where the lines meet"
              ),
            ]
          : []),
        pairSlip(x0.neg(), y0, "you misread the sign of the x-coordinate"),
      ];
    } else {
      const target = ask === "x" ? x0 : ask === "y" ? y0 : ask === "sum" ? x0.add(y0) : x0.sub(y0);
      const what = ask === "sum" ? m("x + y") : ask === "diff" ? m("x - y") : m(ask);
      stem = `${lead} The solution to the system is ${m("(x, y)")}. What is the value of ${what}?`;
      answer = numAnswer(target, m(num(target)));
      slips =
        ask === "sum"
          ? [
              numSlip(x0, `this is ${m("x")} alone; the question asks for ${m("x + y")}`),
              numSlip(y0, `this is ${m("y")} alone; the question asks for ${m("x + y")}`),
              numSlip(x0.sub(y0), "you subtracted the coordinates instead of adding them"),
              numSlip(b1.add(b2), "you added the two y-intercepts"),
            ]
          : ask === "diff"
            ? [
                numSlip(y0.sub(x0), `you found ${m("y - x")} instead of ${m("x - y")}`),
                numSlip(x0.add(y0), "you added the coordinates instead of subtracting them"),
                numSlip(x0, `this is ${m("x")} alone; the question asks for ${m("x - y")}`),
                numSlip(b1.sub(b2), "you subtracted the two y-intercepts"),
              ]
            : [
                numSlip(
                  ask === "x" ? y0 : x0,
                  `this is the ${ask === "x" ? "y" : "x"}-coordinate of the intersection`
                ),
                numSlip(b1, "this is where one line crosses the y-axis, not where the lines meet"),
                numSlip(b2, "this is where one line crosses the y-axis, not where the lines meet"),
                numSlip(target.neg(), "you misread the sign"),
              ];
    }
    const lines: Eq[] = [eq(m1.neg(), 1, b1), eq(m2.neg(), 1, b2)];
    const at = (s: Frac, b: Frac) =>
      s.isZero()
        ? `the line ${m(`y = ${num(b)}`)} has ${m(`y = ${num(b)}`)} at every point`
        : m(`${lin([[s, `(${num(x0)})`]], b)} = ${num(y0)}`);
    return {
      format,
      stem,
      figure,
      answer,
      slips,
      asks: "where the two lines cross: the one point on both graphs",
      steps: [
        {
          label: "Find where the lines cross",
          work: `The lines meet at the grid point ${m(`(${num(x0)}, ${num(y0)})`)}`,
        },
        {
          label: "Answer what is asked",
          work:
            ask === "pair"
              ? `The solution is ${m(`(${num(x0)}, ${num(y0)})`)}`
              : ask === "sum"
                ? m(`x + y = ${num(x0)} ${signed(y0)} = ${num(x0.add(y0))}`)
                : ask === "diff"
                  ? m(`x - y = ${num(x0)} ${signed(y0.neg())} = ${num(x0.sub(y0))}`)
                  : `The ${ask}-coordinate is ${n(ask === "x" ? x0 : y0)}`,
        },
      ],
      check: `${m(`(${num(x0)}, ${num(y0)})`)} is on both lines: ${at(m1, b1)}, and ${at(m2, b2)}`,
      tip: "The solution of a system is the point where the graphs intersect; its first coordinate is x",
      hint: "Find the point where the two lines cross.",
      difficulty: ask === "x" || ask === "y" ? 1 : 2,
      isCorrect: (cand) => {
        if (ask === "pair") {
          const p = parsePair(cand.key);
          return !!p && lines.every((e) => satisfies(e, p[0], p[1]));
        }
        const v = valueOf(cand);
        if (v === null) return false;
        // The one point on both lines: x from setting the two rules equal, then y.
        const x = b2.sub(b1).div(m1.sub(m2));
        const y = m1.mul(x).add(b1);
        return (ask === "x" ? x : ask === "y" ? y : ask === "sum" ? x.add(y) : x.sub(y)).eq(v);
      },
    };
  },
};

/** "-\frac{5r}{8} + \frac{9}{8}": a linear expression in one letter. */
function rTex(coef: Frac, c: Frac, v = "r"): string {
  if (coef.isZero()) return num(c);
  const size = Math.abs(coef.n);
  const head = coef.isInt()
    ? lin([[coef, v]])
    : `${coef.n < 0 ? "-" : ""}\\frac{${size === 1 ? "" : size}${v}}{${coef.d}}`;
  return c.isZero() ? head : `${head} ${signed(c)}`;
}

/** A point (x(r), y(r)) whose coordinates are linear in r. */
function rPoint(xr: Frac, x0: Frac, yr: Frac, y0: Frac, why = ""): Slip {
  return {
    text: m(`\\left(${rTex(xr, x0)}, ${rTex(yr, y0)}\\right)`),
    key: `par:${xr};${x0};${yr};${y0}`,
    why,
  };
}

export const dependentPoints: Template = {
  id: "sys.dependent-points",
  skill: SKILL,
  label: "Points on both graphs of a system with infinitely many solutions",
  difficulty: [6, 7],
  formats: ["mc"],
  make(rng, format): Draft {
    const a = rng.int(2, 9);
    const b = rng.int(2, 9);
    need(a !== b && gcd(a, b) === 1, "distinct coprime");
    const c = rng.int(1, 12);
    const k = rng.int(2, 6);
    const e1 = eq(a, b, c);
    const e2 = scaleEq(e1, k);
    const [A, B, C] = [F(a), F(b), F(c)];
    const yForm = rng.bool(0.6);
    const second = rng.bool(0.5) ? stdTex(e2) : `${k * b}y = ${k * c} - ${k * a}x`;
    const one = F(1);
    const zero = F(0);
    const answer = yForm
      ? rPoint(one, zero, A.div(B).neg(), C.div(B))
      : rPoint(B.div(A).neg(), C.div(A), one, zero);
    const slips: Slip[] = yForm
      ? [
          rPoint(
            one,
            zero,
            A.div(B),
            C.div(B),
            `you moved ${m(`${a}x`)} across the equals sign without changing its sign`
          ),
          rPoint(
            A.div(B).neg(),
            C.div(B),
            one,
            zero,
            `you solved for ${m("y")} but put that expression in the x-position`
          ),
          rPoint(
            one,
            zero,
            A.div(B).neg(),
            C.mul(k).div(B),
            "you used the second equation's constant with the first equation's coefficients"
          ),
          rPoint(
            one,
            zero,
            B.div(A).neg(),
            C.div(A),
            `you divided by ${n(a)}, the x-coefficient, instead of by ${n(b)}`
          ),
        ]
      : [
          rPoint(
            B.div(A),
            C.div(A),
            one,
            zero,
            `you moved ${m(`${b}y`)} across the equals sign without changing its sign`
          ),
          rPoint(
            one,
            zero,
            B.div(A).neg(),
            C.div(A),
            `you solved for ${m("x")} but put that expression in the y-position`
          ),
          rPoint(
            B.div(A).neg(),
            C.mul(k).div(A),
            one,
            zero,
            "you used the second equation's constant with the first equation's coefficients"
          ),
          rPoint(
            A.div(B).neg(),
            C.div(B),
            one,
            zero,
            `you divided by ${n(b)}, the y-coefficient, instead of by ${n(a)}`
          ),
        ];
    const solved = yForm
      ? `y = ${rTex(A.div(B).neg(), C.div(B), "x")}`
      : `x = ${rTex(B.div(A).neg(), C.div(A), "y")}`;
    return {
      format,
      stem: `${block(stdTex(e1))}\n${block(second)}\nWhich of the following points lies on the graphs of both equations in the ${m("xy")}-plane for every real number ${m("r")}?`,
      answer,
      slips,
      asks: `a point, written with ${m("r")}, that satisfies both equations whatever the value of ${m("r")}`,
      steps: [
        {
          label: "Compare the two equations",
          work: `The second equation is ${k} times the first, so both describe the same line and every point on it works`,
        },
        { label: `Solve the first for ${m(yForm ? "y" : "x")}`, work: m(solved) },
        { label: `Let ${m(yForm ? "x" : "y")} be ${m("r")}`, work: `The point is ${answer.text}` },
      ],
      check: yForm
        ? `${m(`${a}(r) + ${b}\\left(${rTex(A.div(B).neg(), C.div(B))}\\right) = ${a}r - ${a}r + ${c} = ${c}`)}, so the first equation holds for every ${m("r")}, and so does ${k} times it`
        : `${m(`${a}\\left(${rTex(B.div(A).neg(), C.div(A))}\\right) + ${b}(r) = -${b}r + ${c} + ${b}r = ${c}`)}, so the first equation holds for every ${m("r")}, and so does ${k} times it`,
      tip: "When one equation is a multiple of the other, the system has infinitely many solutions: every point on that one line",
      hint: "Compare the two equations: how is the second related to the first?",
      difficulty: yForm ? 6 : 7,
      isCorrect: (cand) => {
        if (!cand.key?.startsWith("par:")) return false;
        const [xr, x0, yr, y0] = cand.key
          .slice(4)
          .split(";")
          .map((t) => Frac.parse(t));
        return [0, 1, 2, -3].every((r) => {
          const x = xr.mul(r).add(x0);
          const y = yr.mul(r).add(y0);
          return satisfies(e1, x, y) && satisfies(e2, x, y);
        });
      },
    };
  },
};
