/*
 * m-graphs-of-lines: intercepts and the forms of a line's equation. Item models after the bank's
 * own questions: the equation of a graphed line (slope-intercept or standard form), the
 * intercepts of a line given in standard form or by its slope, and a value on the line through
 * two given points (its y-intercept, its x-intercept, or its y-value at a fractional x), from a
 * table or from the points in words. Every answer is checked by putting a point back into the
 * equation or by testing that three points are collinear.
 */
import { need, numAnswer, Retry } from "../core/build";
import { F, Frac } from "../core/frac";
import { frame, line, plane, point, table } from "../core/figures";
import type { Rng } from "../core/rng";
import { lin, m, n, num, pair, paren } from "../core/tex";
import type { Draft, Slip, Step, Template } from "../core/types";
import {
  eqAnswer,
  eqSlip,
  eqThrough,
  fitsBox,
  isValue,
  slip,
  slopeEq,
  weighted,
  type Eq2,
} from "./_lines-shared";

const SKILL = "m-graphs-of-lines";
const cell = (v: Frac) => `$${num(v)}$`;
/** A factor in brackets, as a product needs it: (3), (-3), (1/2 as a fraction). */
const br = (v: Frac) => `(${num(v)})`;

// ------------------------------------------------------------------ the equation of a graph

export const equationFromGraph: Template = {
  id: "gl.equation-from-graph",
  skill: SKILL,
  label: "Choose the equation of a graphed line",
  difficulty: [2, 4],
  formats: ["mc"],
  make(rng, format): Draft {
    const q = rng.pick([1, 1, 2, 3]);
    const p = rng.nonzero(-4, 4);
    const s = F(p, q);
    need(s.d === q, "keep the run as drawn");
    const b = F(rng.nonzero(-6, 6));
    const p2: [Frac, Frac] = [F(q), b.add(p)];
    const p3: [Frac, Frac] = [F(-q), b.sub(p)];
    need(
      [p2[1], p3[1]].every((v) => Math.abs(v.n) <= 9),
      "off the grid"
    );
    const fr = frame([-10, 10], [-10, 10], { step: 1, labelStep: 2 });
    const figure = plane(fr, [
      line("l", `y=${lin([[s, "x"]], b)}`, s.toNumber(), b.toNumber(), fr),
      point("A", 0, b.toNumber(), ["l"]),
      point("B", q, p2[1].toNumber(), ["l"]),
    ]);
    const standard = rng.bool(0.35);
    const xint = b.neg().div(s);
    let answerText: string;
    let slips: Slip[];
    const yText = (mm: Frac, bb: Frac) => m(`y = ${lin([[mm, "x"]], bb)}`);
    if (!standard) {
      answerText = yText(s, b);
      slips = [
        eqSlip(
          yText(s.neg(), b),
          slopeEq(s.neg(), b),
          "you read the slope with the wrong sign: the line " +
            (s.n > 0 ? "rises" : "falls") +
            " from left to right"
        ),
        ...(s.abs().eq(1)
          ? []
          : [
              eqSlip(
                yText(s.inv(), b),
                slopeEq(s.inv(), b),
                "you used run over rise for the slope"
              ),
            ]),
        eqSlip(
          yText(s, b.neg()),
          slopeEq(s, b.neg()),
          `you lost the sign of the ${m("y")}-intercept`
        ),
        eqSlip(yText(s, xint), slopeEq(s, xint), `you used the ${m("x")}-intercept as ${m("b")}`),
        eqSlip(yText(b, s), slopeEq(b, s), `you switched the slope and the ${m("y")}-intercept`),
      ];
    } else {
      // q*y = p*x + q*b, written with a positive x-coefficient.
      const sg = p > 0 ? 1 : -1;
      const A = F(p * sg);
      const B = F(-q * sg);
      const C = b.mul(-q * sg);
      const text = (a: Frac, bb: Frac, c: Frac) =>
        m(
          `${lin([
            [a, "x"],
            [bb, "y"],
          ])} = ${num(c)}`
        );
      const e = (a: Frac, bb: Frac, c: Frac): Eq2 => ({ A: a, B: bb, C: c });
      answerText = text(A, B, C);
      slips = [
        eqSlip(
          text(A, B.neg(), C),
          e(A, B.neg(), C),
          `you gave the ${m("y")}-term the wrong sign, which flips the slope`
        ),
        eqSlip(
          text(A, B, C.neg()),
          e(A, B, C.neg()),
          `you lost the sign of the constant, which moves the ${m("y")}-intercept`
        ),
        ...(A.eq(B.abs())
          ? []
          : [
              eqSlip(
                text(B.abs(), A.neg(), C),
                e(B.abs(), A.neg(), C),
                `you switched the coefficients of ${m("x")} and ${m("y")}`
              ),
            ]),
        eqSlip(
          text(A, B, b),
          e(A, B, b),
          `you used the ${m("y")}-intercept itself as the constant`
        ),
      ];
    }
    const eq = standard ? null : slopeEq(s, b);
    const steps: Step[] = [
      {
        label: `Read the ${m("y")}-intercept`,
        work: `the line crosses the ${m("y")}-axis at ${m(pair(0, b))}, so ${m(`b = ${num(b)}`)}`,
      },
      {
        label: "Find the slope",
        work: `from ${m(pair(0, b))} to ${m(pair(p2[0], p2[1]))} the line rises ${n(F(p))} over a run of ${n(F(q))}, so the slope is ${n(s)}`,
      },
      {
        label: "Write the equation",
        work: standard
          ? `${yText(s, b)}; multiply by ${n(F(q))} and move the ${m("x")}-term: ${answerText}`
          : yText(s, b),
      },
    ];
    return {
      format,
      stem: standard
        ? `The graph of a line is shown in the ${m("xy")}-plane. Which equation could represent this line?`
        : `What is an equation of the line shown in the ${m("xy")}-plane?`,
      figure,
      answer: eq ? eqAnswer(answerText, eq) : eqAnswer(answerText, slopeEq(s, b)),
      slips,
      asks: "the equation whose graph is the line shown",
      steps,
      check: `the grid point ${m(pair(p3[0], p3[1]))} is also on the line, and it fits: ${m(`${paren(s)}(${num(p3[0])}) ${b.n < 0 ? "-" : "+"} ${num(b.abs())} = ${num(p3[1])}`)}`,
      tip: `Read the ${m("y")}-intercept where the line crosses the ${m("y")}-axis, then count rise over run between two grid points`,
      hint: `Where does the line cross the ${m("y")}-axis, and which way does it tilt?`,
      difficulty: standard ? 4 : s.isInt() ? 2 : 3,
      isCorrect: (cand) => eqThrough(cand, [[F(0), b], p2]),
    };
  },
};

// ------------------------------------------------------------------ intercepts

interface Ask {
  stem: string;
  answer: Frac;
  slips: Slip[];
  steps: Step[];
  check: string;
  test: (v: Frac) => boolean;
  difficulty: number;
  hint: string;
}

/** ax + by = c; `whole` makes c a multiple of that coefficient most of the time, for a whole answer. */
function standardForm(
  rng: Rng,
  whole?: "a" | "b"
): { a: Frac; b: Frac; c: Frac; tex: string; decimal: boolean } {
  const decimal = rng.bool(0.2);
  const a = F(rng.nonzero(-12, 12));
  const b = decimal ? F(rng.nonzero(-30, 30), 10) : F(rng.nonzero(-12, 12));
  need(Math.abs(a.n) >= 2 && !b.abs().eq(1), "coefficients");
  const c =
    whole && !decimal && rng.bool(0.65)
      ? (whole === "a" ? a : b).mul(rng.nonzero(-9, 9))
      : F(rng.nonzero(-60, 60) * (decimal ? 3 : 1));
  const tex = `${lin(
    [
      [a, "x"],
      [b, "y"],
    ],
    0,
    { decimal: true }
  )} = ${num(c)}`;
  return { a, b, c, tex, decimal };
}

function yIntercept(rng: Rng): Ask {
  const { a, b, c, tex, decimal } = standardForm(rng, "b");
  const k = c.div(b);
  return {
    stem: `The ${m("y")}-intercept of the graph of ${m(tex)} in the ${m("xy")}-plane is ${m("(0, k)")}. What is the value of ${m("k")}?`,
    answer: k,
    slips: [
      slip(
        c.div(a),
        `you divided by the ${m("x")}-coefficient; that gives the ${m("x")}-intercept`
      ),
      slip(k.neg(), "you lost a sign when dividing"),
      slip(c, `you forgot to divide by the ${m("y")}-coefficient`),
      slip(a.neg().div(b), "you found the slope, not the intercept"),
    ],
    steps: [
      {
        label: `Set ${m("x")} to zero`,
        work: `the ${m("y")}-intercept has ${m("x = 0")}: ${m(`${num(b, { decimal: true })}k = ${num(c)}`)}`,
      },
      {
        label: `Solve for ${m("k")}`,
        work: `${m(`k = \\frac{${num(c)}}{${num(b, { decimal: true })}} = ${num(k)}`)}`,
      },
    ],
    check: `${m(`${num(a)}(0) + ${num(b, { decimal: true })}${br(k)} = ${num(c)}`)}, so ${m(pair(0, k))} is on the line`,
    test: (v) => a.mul(0).add(b.mul(v)).eq(c),
    difficulty: k.isInt() && !decimal ? 2 : 3,
    hint: `What is ${m("x")} at the point where a graph crosses the ${m("y")}-axis?`,
  };
}

function xIntercept(rng: Rng): Ask {
  const { a, b, c, tex, decimal } = standardForm(rng, "a");
  const r = c.div(a);
  return {
    stem: `The graph of ${m(tex)} in the ${m("xy")}-plane crosses the ${m("x")}-axis at ${m("(r, 0)")}. What is the value of ${m("r")}?`,
    answer: r,
    slips: [
      slip(
        c.div(b),
        `you divided by the ${m("y")}-coefficient; that gives the ${m("y")}-intercept`
      ),
      slip(r.neg(), "you lost a sign when dividing"),
      slip(c, `you forgot to divide by the ${m("x")}-coefficient`),
      slip(a.neg().div(b), "you found the slope, not the intercept"),
    ],
    steps: [
      {
        label: `Set ${m("y")} to zero`,
        work: `the ${m("x")}-intercept has ${m("y = 0")}: ${m(`${num(a)}r = ${num(c)}`)}`,
      },
      {
        label: `Solve for ${m("r")}`,
        work: `${m(`r = \\frac{${num(c)}}{${num(a)}} = ${num(r)}`)}`,
      },
    ],
    check: `${m(`${num(a)}${br(r)} + ${num(b, { decimal: true })}(0) = ${num(c)}`)}, so ${m(pair(r, 0))} is on the line`,
    test: (v) => a.mul(v).eq(c),
    difficulty: r.isInt() && !decimal ? 2 : 3,
    hint: `What is ${m("y")} at the point where a graph crosses the ${m("x")}-axis?`,
  };
}

function interceptProduct(rng: Rng): Ask {
  const { a, b, c, tex, decimal } = standardForm(rng);
  const X = c.div(a);
  const Y = c.div(b);
  const v = X.mul(Y);
  return {
    stem: `The graph of ${m(tex)} in the ${m("xy")}-plane has intercepts at ${m("(a, 0)")} and ${m("(0, b)")}. What is the value of ${m("ab")}?`,
    answer: v,
    slips: [
      slip(v.neg(), "you lost the sign of one intercept"),
      slip(X.add(Y), "you added the intercepts instead of multiplying them"),
      slip(a.mul(b), `you multiplied the coefficients of ${m("x")} and ${m("y")}`),
      slip(c.div(a.mul(b)), `you divided the constant by the product of the coefficients`),
    ],
    steps: [
      {
        label: `Find the ${m("x")}-intercept`,
        work: `set ${m("y = 0")}: ${m(`${num(a)}a = ${num(c)}`)}, so ${m(`a = ${num(X)}`)}`,
      },
      {
        label: `Find the ${m("y")}-intercept`,
        work: `set ${m("x = 0")}: ${m(`${num(b, { decimal: true })}b = ${num(c)}`)}, so ${m(`b = ${num(Y)}`)}`,
      },
      { label: "Multiply", work: `${m(`ab = ${br(X)}${br(Y)} = ${num(v)}`)}` },
    ],
    check: `both points satisfy the equation: ${m(`${num(a)}${br(X)} = ${num(c)}`)} and ${m(`${num(b, { decimal: true })}${br(Y)} = ${num(c)}`)}`,
    test: (u) => {
      // The intercepts found again by substitution into the equation as printed.
      const xi = c.sub(b.mul(0)).div(a);
      const yi = c.sub(a.mul(0)).div(b);
      return u.eq(xi.mul(yi));
    },
    difficulty: decimal ? 5 : 4,
    hint: "Find each intercept by setting the other variable to zero.",
  };
}

function fromSlope(rng: Rng): Ask {
  const name = rng.pick(["k", "t", "r", "p", "s"]);
  const sl = rng.pick([
    F(2),
    F(3),
    F(4),
    F(6),
    F(-2),
    F(-3),
    F(-5),
    F(1, 2),
    F(2, 3),
    F(-3, 4),
    F(4, 3),
    F(-6, 13),
    F(5, 2),
  ]);
  if (rng.bool(0.5)) {
    const bb = F(rng.nonzero(-60, 60));
    const r = bb.neg().div(sl);
    return {
      stem: `Line ${m(name)} has a slope of ${n(sl)} and a ${m("y")}-intercept of ${m(pair(0, bb))}. What is the ${m("x")}-coordinate of the ${m("x")}-intercept of line ${m(name)}?`,
      answer: r,
      slips: [
        slip(
          r.neg(),
          `you solved ${m(`${lin([[sl, "x"]])} = ${num(bb)}`)} instead of ${m(`${lin([[sl, "x"]], bb)} = 0`)}`
        ),
        slip(bb.mul(sl).neg(), "you multiplied by the slope instead of dividing"),
        slip(bb, `you gave the ${m("y")}-intercept`),
        slip(sl.neg().div(bb), "you divided the slope by the intercept"),
      ],
      steps: [
        { label: "Write the equation", work: `${m(`y = ${lin([[sl, "x"]], bb)}`)}` },
        {
          label: `Set ${m("y")} to zero`,
          work: `${m(`0 = ${lin([[sl, "x"]], bb)}`)}, so ${m(`x = ${num(r)}`)}`,
        },
      ],
      check: `${m(`${paren(sl)}${br(r)} ${bb.n < 0 ? "-" : "+"} ${num(bb.abs())} = 0`)}, so the line crosses the ${m("x")}-axis there`,
      test: (v) => sl.mul(v).add(bb).isZero(),
      difficulty: r.isInt() ? 3 : 4,
      hint: `Write the equation of the line, then find ${m("x")} when ${m("y = 0")}.`,
    };
  }
  const r = F(rng.nonzero(-12, 12));
  const p = sl.mul(r).neg();
  return {
    stem: `In the ${m("xy")}-plane, line ${m(name)} has a slope of ${n(sl)}, an ${m("x")}-intercept of ${m(pair(r, 0))}, and a ${m("y")}-intercept of ${m("(0, p)")}. What is the value of ${m("p")}?`,
    answer: p,
    slips: [
      slip(p.neg(), "you subtracted in opposite orders, which flips the sign"),
      slip(r.neg().div(sl), "you divided by the slope instead of multiplying"),
      slip(r, `you gave the ${m("x")}-coordinate of the ${m("x")}-intercept`),
      slip(sl.mul(r), "you used the slope with the run in the wrong direction"),
    ],
    steps: [
      {
        label: "Use the slope between intercepts",
        work: `from ${m(pair(r, 0))} to ${m("(0, p)")} the run is ${n(r.neg())}, so ${m(`\\frac{p - 0}{0 - ${paren(r)}} = ${num(sl)}`)}`,
      },
      { label: `Solve for ${m("p")}`, work: `${m(`p = ${paren(sl)}${br(r.neg())} = ${num(p)}`)}` },
    ],
    check: `the line ${m(`y = ${lin([[sl, "x"]], p)}`)} gives ${m(`${paren(sl)}${br(r)} ${p.n < 0 ? "-" : "+"} ${num(p.abs())} = 0`)} at ${m(`x = ${num(r)}`)}`,
    test: (v) => v.sub(0).div(F(0).sub(r)).eq(sl),
    difficulty: p.isInt() ? 4 : 5,
    hint: "Use the slope formula with the two intercepts as the points.",
  };
}

export const intercepts: Template = {
  id: "gl.intercepts",
  skill: SKILL,
  label: "Find intercepts from standard form or from the slope",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const a = weighted(rng, [
      [1.2, yIntercept],
      [1, xIntercept],
      [0.9, interceptProduct],
      [1.2, fromSlope],
    ] as const)(rng);
    if (format === "spr" && !fitsBox(a.answer)) throw new Retry("box");
    return {
      format,
      stem: a.stem,
      answer: numAnswer(a.answer, m(num(a.answer))),
      slips: a.slips,
      asks: "a coordinate where the line crosses an axis",
      steps: a.steps,
      check: a.check,
      tip: `On the ${m("x")}-axis ${m("y = 0")}, and on the ${m("y")}-axis ${m("x = 0")}: set one variable to zero and solve for the other`,
      hint: a.hint,
      difficulty: a.difficulty,
      isCorrect: (cand) => isValue(cand, a.test),
    };
  },
};

// ------------------------------------------------------------------ a value on the line

export const valueOnLine: Template = {
  id: "gl.value-on-line",
  skill: SKILL,
  label: "Find the y-intercept, x-intercept or a value of the line through two points",
  difficulty: [3, 6],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const x1 = F(rng.nonzero(-16, 12));
    const dx = F(rng.int(2, 21));
    const x2 = x1.add(dx);
    need(!x2.isZero(), "a point on the y-axis makes it trivial");
    const sl = F(rng.nonzero(-9, 9), rng.pick([1, 1, 2, 3, 4]));
    const y1 = F(rng.int(-40, 40));
    const y2 = y1.add(sl.mul(dx));
    need(y2.isInt(), "whole table values");
    const b0 = y1.sub(sl.mul(x1));
    const ask = rng.pick(["yint", "value", "value", "xint"] as const);
    const asTable = format === "mc" && ask !== "xint" && rng.bool(0.5);
    const xs = ask === "value" ? rng.pick([F(1, 3), F(1, 6), F(1, 2), F(1, 4), F(2, 3)]) : F(0);
    const target = ask === "xint" ? b0.neg().div(sl) : sl.mul(xs).add(b0);
    need(!(ask === "xint" && b0.isZero()), "x-intercept is the origin");
    if (format === "spr") need(fitsBox(target), "box");
    const P = (x: Frac, y: Frac) => m(pair(x, y));
    const pts = `${P(x1, y1)} and ${P(x2, y2)}`;
    let stem: string;
    let figure;
    if (asTable) {
      figure = table(
        ["$x$", "$y$"],
        [
          [cell(x1), cell(y1)],
          [cell(x2), cell(y2)],
        ]
      );
      stem =
        ask === "yint"
          ? `The table shows two values of ${m("x")} and their corresponding values of ${m("y")}. There is a linear relationship between ${m("x")} and ${m("y")}. What is the ${m("y")}-coordinate of the ${m("y")}-intercept of the line that represents this relationship in the ${m("xy")}-plane?`
          : `The table shows two values of ${m("x")} and their corresponding values of ${m("y")}. In the ${m("xy")}-plane, the graph of the linear equation representing this relationship passes through the point ${m(`\\left(${num(xs)}, a\\right)`)}. What is the value of ${m("a")}?`;
    } else {
      stem =
        ask === "yint"
          ? `In the ${m("xy")}-plane, a line passes through the points ${pts} and is defined by the equation ${m("y = mx + b")}. What is the value of ${m("b")}?`
          : ask === "value"
            ? `A line in the ${m("xy")}-plane passes through the points ${pts}, and ${m(`\\left(${num(xs)}, a\\right)`)}. What is the value of ${m("a")}?`
            : `A line in the ${m("xy")}-plane passes through the points ${P(x1, y1)}, ${P(x2, y2)}, and ${m("(c, 0)")}. What is the value of ${m("c")}?`;
    }
    const slips: Slip[] =
      ask === "xint"
        ? [
            slip(b0.div(sl), `you lost a sign when solving for the ${m("x")}-intercept`),
            slip(b0.mul(sl).neg(), "you multiplied by the slope instead of dividing"),
            slip(b0, `you gave the ${m("y")}-intercept`),
            slip(sl, "you gave the slope"),
          ]
        : [
            slip(
              y1.add(sl.mul(x1)).add(sl.mul(xs)),
              `you added ${m(`${paren(sl)}(${num(x1)})`)} to ${n(y1)} instead of subtracting it`
            ),
            slip(
              sl.mul(xs).add(y1),
              `you used ${n(y1)}, a ${m("y")}-value from the table, as the ${m("y")}-intercept`
            ),
            ...(xs.isZero()
              ? [slip(sl, "you gave the slope")]
              : [
                  slip(sl.mul(xs), `you left out the ${m("y")}-intercept`),
                  slip(
                    b0,
                    `you gave the ${m("y")}-intercept, not the value at ${m(`x = ${num(xs)}`)}`
                  ),
                ]),
            slip(
              sl
                .inv()
                .mul(xs)
                .add(y1.sub(sl.inv().mul(x1))),
              "you used run over rise for the slope"
            ),
          ];
    const steps: Step[] = [
      {
        label: "Find the slope",
        work: `${m(`\\frac{${num(y2)} - ${paren(y1)}}{${num(x2)} - ${paren(x1)}} = \\frac{${num(y2.sub(y1))}}{${num(dx)}} = ${num(sl)}`)}`,
      },
      {
        label: `Find the ${m("y")}-intercept`,
        work: `${m(`${num(y1)} = ${paren(sl)}(${num(x1)}) + b`)}, so ${m(`b = ${num(y1)} ${sl.mul(x1).n <= 0 ? "+" : "-"} ${num(sl.mul(x1).abs())} = ${num(b0)}`)}`,
      },
    ];
    if (ask === "value") {
      steps.push({
        label: `Put in ${m(`x = ${num(xs)}`)}`,
        work: `${m(`a = ${paren(sl)}\\left(${num(xs)}\\right) ${b0.n < 0 ? "-" : "+"} ${num(b0.abs())} = ${num(target)}`)}`,
      });
    } else if (ask === "xint") {
      steps.push({
        label: `Set ${m("y")} to zero`,
        work: `${m(`0 = ${lin([[sl, "c"]], b0)}`)}, so ${m(`c = ${num(target)}`)}`,
      });
    }
    const tx = ask === "xint" ? target : xs;
    const ty = ask === "xint" ? F(0) : target;
    return {
      format,
      stem,
      figure,
      answer: numAnswer(target, m(num(target))),
      slips,
      asks:
        ask === "xint"
          ? `the ${m("x")}-coordinate where the line through the two points meets the ${m("x")}-axis`
          : ask === "yint"
            ? `the ${m("y")}-intercept of the line through the two points`
            : `the ${m("y")}-value of the line at ${m(`x = ${num(xs)}`)}`,
      steps,
      check: `the slope from ${m(pair(x1, y1))} to ${m(pair(tx, ty))} is ${m(`\\frac{${num(ty.sub(y1))}}{${num(tx.sub(x1))}} = ${num(sl)}`)}, the same as between the two given points, so all three points are on one line`,
      tip: `Find the slope from two points first, then use either point to find the ${m("y")}-intercept`,
      hint: `Start with the slope of the line through the two points.`,
      difficulty: Math.min(
        6,
        (ask === "yint" ? 3 : ask === "value" ? 4 : 5) + (sl.isInt() ? 0 : 1)
      ),
      isCorrect: (cand) =>
        isValue(cand, (v) => {
          const [px, py] = ask === "xint" ? [v, F(0)] : [xs, v];
          return py
            .sub(y1)
            .mul(dx)
            .eq(y2.sub(y1).mul(px.sub(x1)));
        }),
    };
  },
};

export const TEMPLATES: Template[] = [equationFromGraph, intercepts, valueOnLine];
