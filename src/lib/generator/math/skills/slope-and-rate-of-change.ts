/*
 * m-slope-and-rate-of-change: finding a slope and saying what it means. Item models after the
 * bank's own questions: the slope from two points, two function values, a table or a graph; the
 * meaning of the slope, the starting value or one point of a linear model in context; and the
 * line with a given slope through a given point. Slope answers are checked by stepping from one
 * given point to the other with the candidate slope; equation answers by testing two points.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { frame, line, plane, point, table } from "../core/figures";
import { block, lin, m, n, num, pair, paren } from "../core/tex";
import type { Draft, Slip, Template } from "../core/types";
import { eqAnswer, eqSlip, eqThrough, fitsBox, isValue, slip, slopeEq } from "./_lines-shared";

const SKILL = "m-slope-and-rate-of-change";
const LINES = ["k", "t", "r", "p", "j", "q"];

const cell = (v: Frac) => `$${num(v)}$`;

// ------------------------------------------------------------------ find the slope

export const findSlope: Template = {
  id: "slope.find-slope",
  skill: SKILL,
  label: "Find a slope from two points, function values, a table or a graph",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    // The figure kinds keep their numbers in the figure, so they are multiple choice only.
    const kind =
      format === "spr"
        ? rng.pick(["points", "function"] as const)
        : rng.pick(["points", "function", "table", "table-n", "graph", "graph"] as const);
    const graph = kind === "graph";
    const runs = graph ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6, 8];
    const run = F(rng.pick(runs) * (graph ? 1 : rng.sign()));
    const rise = F(rng.nonzero(graph ? -6 : -24, graph ? 6 : 30));
    const s = rise.div(run);
    need(!s.isZero(), "flat");
    const x1 = F(rng.int(graph ? -6 : -12, graph ? 4 : 15));
    const y1 = F(rng.int(graph ? -6 : -20, graph ? 6 : 40));
    const x2 = x1.add(run);
    const y2 = y1.add(rise);
    if (graph)
      need(
        [x1, x2, y1, y2].every((v) => Math.abs(v.n) <= 8),
        "off the grid"
      );
    if (format === "spr") need(fitsBox(s), "box");
    const fName = rng.pick(["f", "g", "h"]);
    let stem: string;
    let figure;
    let pts: [Frac, Frac][] = [
      [x1, y1],
      [x2, y2],
    ];
    let difficulty = 1 + (s.isInt() ? 0 : 1) + ([x1, y1, x2, y2].some((v) => v.n < 0) ? 1 : 0);
    if (kind === "points") {
      stem = `A line in the ${m("xy")}-plane passes through the points ${m(pair(x1, y1))} and ${m(pair(x2, y2))}. What is the slope of the line?`;
    } else if (kind === "function") {
      stem = `For the linear function ${m(fName)}, ${m(`${fName}(${num(x1)}) = ${num(y1)}`)} and ${m(`${fName}(${num(x2)}) = ${num(y2)}`)}. What is the slope of the graph of ${m(`y = ${fName}(x)`)} in the ${m("xy")}-plane?`;
      difficulty += 1;
    } else if (kind === "table") {
      const step = run.abs();
      const xs = [0, 1, 2, 3].map((i) => x1.add(step.mul(i)));
      pts = xs.map((x) => [x, y1.add(s.mul(x.sub(x1)))]);
      figure = table(
        ["$x$", "$y$"],
        pts.map(([x, y]) => [cell(x), cell(y)])
      );
      stem = `There is a linear relationship between ${m("x")} and ${m("y")}. The table shows four values of ${m("x")} and their corresponding values of ${m("y")}. What is the slope of the line that represents this relationship in the ${m("xy")}-plane?`;
    } else if (kind === "table-n") {
      const step = F(rng.pick([2, 3, 4, 5, 10]));
      const d = F(rng.nonzero(-60, 90));
      need(!d.div(step).isInt() || rng.bool(0.3), "keep most of these as fractions");
      const sl = d.div(step);
      if (format === "spr") need(fitsBox(sl), "box");
      pts = [0, 1, 2].map((i) => [step.mul(i), d.mul(i)]);
      const yCell = (i: number) =>
        i === 0 ? "$n$" : `$n ${d.n < 0 ? "-" : "+"} ${num(d.mul(i).abs())}$`;
      figure = table(
        ["$x$", "$y$"],
        [0, 1, 2].map((i) => [cell(step.mul(i)), yCell(i)])
      );
      stem = `There is a linear relationship between ${m("x")} and ${m("y")}. The table shows three values of ${m("x")} and their corresponding values of ${m("y")}, where ${m("n")} is a constant. What is the slope of the line that represents this relationship in the ${m("xy")}-plane?`;
      return slopeDraft(format, stem, figure, sl, pts, sl.isInt() ? 3 : 4, true);
    } else {
      const fr = frame([-10, 10], [-10, 10], { step: 1, labelStep: 2 });
      const b = y1.sub(s.mul(x1));
      figure = plane(fr, [
        line("l", `y=${lin([[s, "x"]], b)}`, s.toNumber(), b.toNumber(), fr),
        point("A", x1.toNumber(), y1.toNumber(), ["l"]),
        point("B", x2.toNumber(), y2.toNumber(), ["l"]),
      ]);
      stem = `The line shown in the ${m("xy")}-plane passes through the point ${m(pair(x1, y1))}. What is the slope of the line?`;
      difficulty = s.isInt() ? 1 : 2;
    }
    return slopeDraft(format, stem, figure, s, pts, Math.min(4, difficulty), false);
  },
};

function slopeDraft(
  format: "mc" | "spr",
  stem: string,
  figure: ReturnType<typeof table> | undefined,
  s: Frac,
  pts: [Frac, Frac][],
  difficulty: number,
  withN: boolean
): Draft {
  const [[x1, y1], [x2, y2]] = pts;
  const dy = y2.sub(y1);
  const dx = x2.sub(x1);
  const slips: Slip[] = [
    ...(dy.isZero()
      ? []
      : [
          slip(
            dx.div(dy),
            `you divided the change in ${m("x")} by the change in ${m("y")}; slope is rise over run`
          ),
        ]),
    slip(s.neg(), "you subtracted the coordinates in opposite orders, which flips the sign"),
    ...(dx.eq(1) || dx.eq(-1)
      ? []
      : [
          slip(
            dy,
            `you found the change in ${m("y")} and did not divide by the change in ${m("x")}`
          ),
        ]),
    ...(x2.isZero()
      ? []
      : [
          slip(
            y2.div(x2),
            `you divided one point's ${m("y")}-coordinate by its ${m("x")}-coordinate`
          ),
        ]),
    ...(dx.isZero() || withN
      ? []
      : [
          slip(
            y2.add(y1).div(x2.add(x1).isZero() ? F(1) : x2.add(x1)),
            "you added the coordinates instead of subtracting them"
          ),
        ]),
  ];
  const text = m(num(s));
  return {
    format,
    stem,
    figure,
    answer: numAnswer(s, text),
    slips,
    asks: `the slope: how much ${m("y")} changes for each increase of 1 in ${m("x")}`,
    steps: [
      {
        label: "Pick two points",
        work: withN
          ? `use ${m(`(${num(x1)}, n)`)} and ${m(`(${num(x2)}, n ${dy.n < 0 ? "-" : "+"} ${num(dy.abs())})`)}`
          : `use ${m(pair(x1, y1))} and ${m(pair(x2, y2))}`,
      },
      {
        label: "Find the rise and the run",
        work: withN
          ? `the ${m("y")}-values differ by ${n(dy)} (the ${m("n")} cancels) and the ${m("x")}-values by ${n(dx)}`
          : `the rise is ${m(`${num(y2)} - ${paren(y1)} = ${num(dy)}`)}, and the run is ${m(`${num(x2)} - ${paren(x1)} = ${num(dx)}`)}`,
      },
      {
        label: "Divide rise by run",
        work:
          s.n === dy.n && s.d === dx.n
            ? `${m(`\\frac{${num(dy)}}{${num(dx)}}`)}, already in lowest terms`
            : `${m(`\\frac{${num(dy)}}{${num(dx)}} = ${num(s)}`)}`,
      },
    ],
    check: `start at ${m(withN ? `x = ${num(x1)}` : pair(x1, y1))} and move ${n(dx)} in ${m("x")}: the slope ${n(s)} predicts a change of ${m(`${paren(s)}(${num(dx)}) = ${num(dy)}`)} in ${m("y")}, which matches the other point`,
    tip: `Slope is the change in ${m("y")} divided by the change in ${m("x")}, taken in the same order for both`,
    hint: `Find how much ${m("y")} changes and how much ${m("x")} changes between two points.`,
    difficulty,
    isCorrect: (cand) =>
      isValue(cand, (v) => pts.every(([x, y]) => y1.add(v.mul(x.sub(x1))).eq(y))),
  };
}

// ------------------------------------------------------------------ what the numbers mean

interface Ctx {
  fn: string;
  q: string;
  unit: string;
  x: string;
  xunit: string;
  zero: string;
  after: (a: string) => string;
  down: boolean;
  start: [number, number];
  rate: [number, number];
}

const CONTEXTS: Ctx[] = [
  {
    fn: "T",
    q: "estimated temperature",
    unit: "degrees Fahrenheit",
    x: "the number of hours after 6 p.m. on a winter evening",
    xunit: "hour",
    zero: "At 6 p.m.",
    after: (a) => `${a} hours after 6 p.m.`,
    down: true,
    start: [40, 85],
    rate: [2, 6],
  },
  {
    fn: "h",
    q: "height of the plant",
    unit: "inches",
    x: "the number of months since it was bought",
    xunit: "month",
    zero: "When it was bought",
    after: (a) => `${a} months after it was bought`,
    down: false,
    start: [3, 20],
    rate: [2, 9],
  },
  {
    fn: "p",
    q: "number of sheets of paper left in the printer",
    unit: "sheets",
    x: "the number of days since the printer was filled",
    xunit: "day",
    zero: "When the printer was filled",
    after: (a) => `${a} days after the printer was filled`,
    down: true,
    start: [200, 500],
    rate: [5, 40],
  },
  {
    fn: "s",
    q: "amount in the savings account",
    unit: "dollars",
    x: "the number of weeks since the account was opened",
    xunit: "week",
    zero: "When the account was opened",
    after: (a) => `${a} weeks after the account was opened`,
    down: false,
    start: [50, 400],
    rate: [10, 60],
  },
  {
    fn: "d",
    q: "distance of the flag from the ground",
    unit: "feet",
    x: "the number of seconds since it began to be lowered",
    xunit: "second",
    zero: "Before it began to be lowered",
    after: (a) => `${a} seconds after it began to be lowered`,
    down: true,
    start: [20, 40],
    rate: [2, 4],
  },
  {
    fn: "w",
    q: "amount of water in the pool",
    unit: "gallons",
    x: "the number of minutes since filling began",
    xunit: "minute",
    zero: "When filling began",
    after: (a) => `${a} minutes after filling began`,
    down: false,
    start: [100, 900],
    rate: [15, 60],
  },
];

export const interpret: Template = {
  id: "slope.interpret",
  skill: SKILL,
  label: "Say what the slope, the starting value or a point means in context",
  difficulty: [1, 4],
  formats: ["mc"],
  make(rng, format): Draft {
    const c = rng.pick(CONTEXTS);
    const b = rng.int(c.start[0], c.start[1]);
    const r = rng.int(c.rate[0], c.rate[1]);
    const mm = c.down ? -r : r;
    const [B, M] = [F(b), F(mm)];
    const xl = "x";
    const rhs = rng.bool(0.5)
      ? lin([
          [B, ""],
          [M, xl],
        ])
      : lin([[M, xl]], B);
    const fx = `${c.fn}(x) = ${rhs}`;
    const ask = rng.pick(["rate", "rate", "start", "point"] as const);
    const dir = c.down ? "decreases" : "increases";
    const other = c.down ? "increases" : "decreases";
    const rateS = (v: number, d = dir) => `The ${c.q} ${d} by ${v} ${c.unit} each ${c.xunit}`;
    const startS = (v: number) => `${c.zero}, the ${c.q} is ${v} ${c.unit}`;
    let a = 0;
    let fa = 0;
    if (ask === "point") {
      a = rng.int(2, 9);
      fa = b + mm * a;
      need(fa > 0 && fa !== a && fa !== b, "point");
    }
    const pointS = (u: number, v: number) =>
      `${c.after(String(u)).replace(/^./, (ch) => ch.toUpperCase())}, the ${c.q} is ${v} ${c.unit}`;
    const changedS = (u: number, v: number) =>
      `${c.after(String(u)).replace(/^./, (ch) => ch.toUpperCase())}, the ${c.q} has changed by ${v} ${c.unit}`;
    const opts: Record<string, { text: string; why: string }> = {
      rate: { text: rateS(r), why: "" },
      rateDir: {
        text: rateS(r, other),
        why: `the coefficient of ${m("x")} is ${n(M)}, so the ${c.q} ${dir}, not ${other}`,
      },
      rateB: {
        text: rateS(b),
        why: `${n(B)} is the value when ${m("x = 0")}, not the change each ${c.xunit}`,
      },
      start: { text: startS(b), why: "" },
      startM: {
        text: startS(r),
        why: `${n(r)} is the change each ${c.xunit}, not the value when ${m("x = 0")}`,
      },
      startSum: {
        text: startS(b + mm),
        why: `${n(b + mm)} is the value after one ${c.xunit}, not at the start`,
      },
      point: { text: pointS(a, fa), why: "" },
      pointSwap: {
        text: pointS(fa, a),
        why: `you switched the input and the output: ${m(String(a))} is the number of ${c.xunit}s and ${m(String(fa))} is the ${c.q}`,
      },
      pointChange: {
        text: changedS(a, fa),
        why: `${n(fa)} is the ${c.q} itself, not how much it has changed`,
      },
      pointStart: {
        text: startS(fa),
        why: `${n(fa)} is the value after ${n(a)} ${c.xunit}s, not at the start`,
      },
    };
    const keys =
      ask === "rate"
        ? ["rate", "rateDir", "rateB", "startM"]
        : ask === "start"
          ? ["start", "startM", "rateB", "startSum"]
          : ["point", "pointSwap", "pointChange", "pointStart"];
    const target = keys[0];
    const what =
      ask === "rate" ? m(num(M)) : ask === "start" ? m(num(B)) : m(`${c.fn}(${a}) = ${fa}`);
    const stem = `${block(fx)}\nThe function ${m(c.fn)} gives the ${c.q}, in ${c.unit}, where ${m("x")} is ${c.x}. Which statement is the best interpretation of ${what} in this context?`;
    const steps =
      ask === "rate"
        ? [
            {
              label: "Find the rate in the function",
              work: `${n(M)} multiplies ${m("x")}, so it is the change in ${m(`${c.fn}(x)`)} for each increase of 1 in ${m("x")}`,
            },
            {
              label: "Put it in context",
              work: `each ${c.xunit}, the ${c.q} ${dir} by ${n(r)} ${c.unit}`,
            },
          ]
        : ask === "start"
          ? [
              {
                label: "Find the starting value",
                work: `when ${m("x = 0")}, ${m(`${c.fn}(0) = ${b}`)}, so ${n(B)} is the value at the start`,
              },
              {
                label: "Put it in context",
                work: `${m("x = 0")} means ${c.zero.toLowerCase()}, so the ${c.q} is ${n(B)} ${c.unit} then`,
              },
            ]
          : [
              {
                label: "Read the input and output",
                work: `in ${m(`${c.fn}(${a}) = ${fa}`)}, the input ${m(`x = ${a}`)} is ${c.x.replace("the number of", "a count of")}, and the output ${n(fa)} is the ${c.q}`,
              },
              {
                label: "Put it in context",
                work: `${c.after(String(a))}, the ${c.q} is ${n(fa)} ${c.unit}`,
              },
            ];
    return {
      format,
      stem,
      answer: { text: opts[target].text, key: target },
      slips: keys.slice(1).map((k) => ({ text: opts[k].text, key: k, why: opts[k].why })),
      asks: `what ${what} tells you about the ${c.q}`,
      steps,
      check:
        ask === "point"
          ? `${m(`${c.fn}(${a}) = ${rhs.replace(/x/g, `(${a})`)} = ${fa}`)}, so the point is ${m(pair(a, fa))}: ${m(`x = ${a}`)} ${c.xunit}s and a value of ${n(fa)}`
          : `compare two inputs: ${m(`${c.fn}(0) = ${b}`)} and ${m(`${c.fn}(1) = ${b + mm}`)}, so the value starts at ${n(b)} and changes by ${n(mm)} each ${c.xunit}`,
      tip: `In a linear model, the coefficient of ${m("x")} is the change per unit of ${m("x")}, and the constant is the value when ${m("x")} is ${m("0")}`,
      hint: `Ask what ${m(`${c.fn}(x)`)} and ${m("x")} each stand for before you read the numbers.`,
      difficulty:
        ask === "point"
          ? rhs.startsWith(String(b))
            ? 2
            : 3
          : ask === "start"
            ? 1
            : c.down
              ? 2
              : 1,
      isCorrect: (cand) => cand.key === target,
    };
  },
};

// ------------------------------------------------------------------ the line through a point

const SLOPES = [
  F(2),
  F(3),
  F(4),
  F(5),
  F(-2),
  F(-3),
  F(-4),
  F(6),
  F(-6),
  F(7),
  F(-8),
  F(1, 2),
  F(1, 3),
  F(1, 4),
  F(1, 5),
  F(2, 3),
  F(3, 4),
  F(3, 2),
  F(-1, 2),
  F(-1, 3),
  F(-2, 3),
  F(-3, 4),
  F(-1, 4),
  F(-5, 2),
];

export const lineThroughPoint: Template = {
  id: "slope.line-through-point",
  skill: SKILL,
  label: "Write the line with a given slope through a given point",
  difficulty: [1, 5],
  formats: ["mc"],
  make(rng, format): Draft {
    const s = rng.pick(SLOPES);
    const onAxis = rng.bool(0.25);
    const x0 = onAxis ? F(0) : F(s.d * rng.nonzero(-5, 6));
    const y0 = F(rng.int(-15, 20));
    const b = y0.sub(s.mul(x0));
    const name = rng.pick(LINES);
    const asF = rng.bool(0.4);
    const Y = asF ? "f(x)" : "y";
    const text = (mm: Frac, bb: Frac) => m(`${Y} = ${lin([[mm, "x"]], bb)}`);
    const stem = asF
      ? `For the linear function ${m("f")}, the graph of ${m("y = f(x)")} in the ${m("xy")}-plane has a slope of ${n(s)} and passes through the point ${m(pair(x0, y0))}. Which equation defines ${m("f")}?`
      : `Line ${m(name)} in the ${m("xy")}-plane has a slope of ${n(s)} and passes through the point ${m(pair(x0, y0))}. Which equation defines line ${m(name)}?`;
    const slips: Slip[] = [
      eqSlip(
        text(s, y0),
        slopeEq(s, y0),
        `you used the ${m("y")}-coordinate of the point as the ${m("y")}-intercept, but the point is not on the ${m("y")}-axis`
      ),
      eqSlip(
        text(s, y0.add(s.mul(x0))),
        slopeEq(s, y0.add(s.mul(x0))),
        `you added ${m(`${paren(s)}(${num(x0)})`)} to ${n(y0)} instead of subtracting it`
      ),
      eqSlip(text(b, s), slopeEq(b, s), `you switched the slope and the ${m("y")}-intercept`),
      eqSlip(
        text(x0.isZero() ? s.neg() : x0, y0),
        slopeEq(x0.isZero() ? s.neg() : x0, y0),
        x0.isZero()
          ? "you changed the sign of the slope"
          : `you used the point's ${m("x")}-coordinate as the slope`
      ),
      eqSlip(text(s, b.neg()), slopeEq(s, b.neg()), `you lost the sign of the ${m("y")}-intercept`),
    ];
    if (onAxis) need(!b.isZero(), "through the origin");
    const p2: [Frac, Frac] = [x0.add(s.d), y0.add(s.n)];
    const difficulty = onAxis
      ? 1
      : Math.min(
          5,
          2 + (s.isInt() ? 0 : 1) + (x0.n < 0 || y0.n < 0 ? 1 : 0) + (s.n < 0 && !s.isInt() ? 1 : 0)
        );
    return {
      format,
      stem,
      answer: eqAnswer(text(s, b), slopeEq(s, b)),
      slips,
      asks: `the equation in slope-intercept form of the line with slope ${n(s)} through ${m(pair(x0, y0))}`,
      steps: onAxis
        ? [
            {
              label: `Read the ${m("y")}-intercept`,
              work: `the point ${m(pair(x0, y0))} is on the ${m("y")}-axis, so ${m(`b = ${num(y0)}`)}`,
            },
            {
              label: "Write the equation",
              work: `${m(`y = mx + b`)} with ${m(`m = ${num(s)}`)}: ${text(s, b)}`,
            },
          ]
        : [
            {
              label: "Start from slope-intercept form",
              work: `${m(`y = ${lin([[s, "x"]])} + b`)}`,
            },
            {
              label: `Use the point to find ${m("b")}`,
              work: `${m(`${num(y0)} = ${paren(s)}(${num(x0)}) + b`)}, so ${m(`${num(y0)} = ${num(s.mul(x0))} + b`)} and ${m(`b = ${num(b)}`)}`,
            },
            { label: "Write the equation", work: text(s, b) },
          ],
      check: `the point fits: ${m(`${paren(s)}(${num(x0)}) ${b.n < 0 ? "-" : "+"} ${num(b.abs())} = ${num(y0)}`)}. Moving ${n(s.d)} to the right from it, the equation gives ${n(p2[1])}, a rise of ${n(s.n)}, which is the slope ${n(s)}`,
      tip: `To write a line from a slope and a point, put both into ${m("y = mx + b")} and solve for ${m("b")}`,
      hint: `Put the point's coordinates into ${m(`y = ${lin([[s, "x"]])} + b`)}.`,
      difficulty,
      isCorrect: (cand) => eqThrough(cand, [[x0, y0], p2]),
    };
  },
};

export const TEMPLATES: Template[] = [findSlope, interpret, lineThroughPoint];
