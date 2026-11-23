/*
 * m-equations-from-words: writing a linear equation for a situation. Item models after the
 * bank's own questions: the equation for two quantities that make a total (points, tickets,
 * speeds, densities, deposits), the equation for a starting amount and a rate (including "the
 * first day costs more"), and a one-unknown story solved by writing the equation. Equation
 * choices are lines (_lines-shared.ts), so a choice is right exactly when it holds for every
 * combination the story allows; the check finds those combinations from the story itself.
 */
import { need } from "../core/build";
import { F, Frac } from "../core/frac";
import type { Rng } from "../core/rng";
import { lin, m, money, n, num, term, times } from "../core/tex";
import type { Draft, Slip, Step, Template } from "../core/types";
import { NAMES, solveStory } from "./_lines-efw-solve";
import { eqAnswer, eqSlip, eqThrough, weighted, type Eq2 } from "./_lines-shared";

const SKILL = "m-equations-from-words";

const D = { decimal: true };
const lineEq = (a: Frac, b: Frac, T: Frac): Eq2 => ({ A: a, B: b, C: T });

// ------------------------------------------------------------------ two quantities, one total

interface Story {
  stem: string;
  X: string;
  Y: string;
  a: Frac;
  b: Frac;
  T: Frac;
  /** One combination the story allows, with whole numbers. */
  x0: number;
  y0: number;
  parts: [string, string];
  unit: string;
  slips: Slip[];
  difficulty: number;
  hint: string;
}

const rightText = (s: { X: string; Y: string; a: Frac; b: Frac; T: Frac }) =>
  m(
    `${lin(
      [
        [s.a, s.X],
        [s.b, s.Y],
      ],
      0,
      D
    )} = ${num(s.T, D)}`
  );

function common(X: string, Y: string, a: Frac, b: Frac, T: Frac): Slip[] {
  return [
    eqSlip(
      m(
        `${lin(
          [
            [b, X],
            [a, Y],
          ],
          0,
          D
        )} = ${num(T, D)}`
      ),
      lineEq(b, a, T),
      `you paired each rate with the other quantity`
    ),
    eqSlip(
      m(`${num(a.add(b), D)}(${X} + ${Y}) = ${num(T, D)}`),
      lineEq(a.add(b), a.add(b), T),
      "you added the two rates and multiplied by the total count, as if every item were worth both"
    ),
    eqSlip(
      m(
        `${lin(
          [
            [a, X],
            [b.neg(), Y],
          ],
          0,
          D
        )} = ${num(T, D)}`
      ),
      lineEq(a, b.neg(), T),
      "you subtracted the second part instead of adding it"
    ),
  ];
}

function points(rng: Rng): Story {
  const [a, b] = rng.sample([1, 2, 3, 4, 5, 6, 8, 10], 2).map((v) => F(v));
  const x0 = rng.int(2, 15);
  const y0 = rng.int(2, 15);
  const T = a.mul(x0).add(b.mul(y0));
  const what = rng.pick(["quiz", "test", "worksheet", "puzzle hunt"]);
  return {
    stem: `A teacher is writing a ${what} worth ${n(T)} points in all. It will have questions worth ${n(a)} ${a.eq(1) ? "point" : "points"} each and questions worth ${n(b)} points each. Which equation represents this situation, where ${m("x")} is the number of ${num(a)}-point questions and ${m("y")} is the number of ${num(b)}-point questions?`,
    X: "x",
    Y: "y",
    a,
    b,
    T,
    x0,
    y0,
    parts: [`the ${num(a)}-point questions give`, `the ${num(b)}-point questions give`],
    unit: "points",
    slips: common("x", "y", a, b, T),
    difficulty: 1,
    hint: "Write the points from each kind of question, then add them.",
  };
}

function tickets(rng: Rng): Story {
  const [pa, pb] = rng.sample([4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 18, 20], 2).sort((u, v) => v - u);
  const [a, b] = [F(pa), F(pb)];
  const x0 = rng.int(20, 90);
  const y0 = rng.int(20, 90);
  const T = a.mul(x0).add(b.mul(y0));
  const [place, A, B] = rng.pick([
    ["A school play", "adult", "student"],
    ["A county fair", "adult", "child"],
    ["A science museum", "adult", "youth"],
    ["A choir concert", "general", "senior"],
  ]);
  const [X, Y] = rng.pick([
    ["x", "y"],
    ["a", "s"],
    ["p", "q"],
  ]);
  return {
    stem: `${place} sold ${A} tickets for ${m(money(a))} each and ${B} tickets for ${m(money(b))} each. Ticket sales came to ${m(money(T))}. Which equation represents this situation, where ${m(X)} is the number of ${A} tickets sold and ${m(Y)} is the number of ${B} tickets sold?`,
    X,
    Y,
    a,
    b,
    T,
    x0,
    y0,
    parts: [`the ${A} tickets bring in`, `the ${B} tickets bring in`],
    unit: "dollars",
    slips: common(X, Y, a, b, T),
    difficulty: 2,
    hint: "Find the money from each kind of ticket, then add.",
  };
}

function speeds(rng: Rng): Story {
  const [sa, sb] = rng.sample([2, 3, 4, 5, 6, 8, 10, 12], 2).sort((u, v) => u - v);
  const [a, b] = [F(sa), F(sb)];
  const x0 = rng.int(1, 4);
  const y0 = rng.int(1, 4);
  const T = a.mul(x0).add(b.mul(y0));
  const name = rng.pick(NAMES);
  const [slow, fast, X, Y] = rng.pick([
    ["walks", "runs", "w", "r"],
    ["paddles", "motors", "p", "m"],
    ["hikes", "bikes", "h", "b"],
  ]);
  const slips = common(X, Y, a, b, T);
  slips.splice(
    1,
    0,
    eqSlip(
      m(`\\frac{${X}}{${sa}} + \\frac{${Y}}{${sb}} = ${num(T)}`),
      lineEq(F(1, sa), F(1, sb), T),
      "you divided the hours by the speeds; distance is speed times time"
    )
  );
  return {
    stem: `${name} ${slow} at a speed of ${n(a)} miles per hour and ${fast} at a speed of ${n(b)} miles per hour. ${name} ${slow} for ${m(X)} hours and ${fast} for ${m(Y)} hours, covering ${n(T)} miles in all. Which equation represents this situation?`,
    X,
    Y,
    a,
    b,
    T,
    x0,
    y0,
    parts: [
      `${m(X)} hours at ${n(a)} miles per hour covers`,
      `${m(Y)} hours at ${n(b)} miles per hour covers`,
    ],
    unit: "miles",
    slips,
    difficulty: 3,
    hint: "Distance is speed times time. Write the distance for each part.",
  };
}

function density(rng: Rng): Story {
  const a = F(rng.int(30, 140) * 10);
  const b = F(rng.int(20, 90) * 5);
  need(!a.eq(b), "densities");
  const x0 = rng.int(3, 25);
  const y0 = rng.int(3, 25);
  const T = a.mul(x0).add(b.mul(y0));
  const [A, B] = rng.pick([
    ["A city", "the suburb next to it"],
    ["A county", "the county next to it"],
    ["An island", "a nearby island"],
  ]);
  return {
    stem: `${A} has an area of ${m("x")} square miles and a population density of ${n(a)} people per square mile. ${B.charAt(0).toUpperCase() + B.slice(1)} has an area of ${m("y")} square miles and a population density of ${n(b)} people per square mile. The two have a combined population of ${n(T)} people. Which equation represents this situation?`,
    X: "x",
    Y: "y",
    a,
    b,
    T,
    x0,
    y0,
    parts: ["the first area holds", "the second area holds"],
    unit: "people",
    slips: [
      eqSlip(
        m(`${lin([[a, "x"]], b)} = ${num(T)}y`),
        { A: a, B: T.neg(), C: b.neg() },
        `you multiplied the total by ${m("y")} instead of multiplying the second density by ${m("y")}`
      ),
      eqSlip(
        m(
          `${lin([
            [a, "x"],
            [b, "y"],
          ])} = ${num(a.add(b))}`
        ),
        lineEq(a, b, a.add(b)),
        "you set the sum equal to the two densities added, not to the total population"
      ),
      ...common("x", "y", a, b, T),
    ],
    difficulty: 3,
    hint: "People = density times area. Write the people in each place.",
  };
}

function deposits(rng: Rng): Story {
  const x0 = rng.int(4, 30) * 10;
  const y0 = rng.int(4, 30) * 5;
  const [a, b] = [F(12), F(24)];
  const T = a.mul(x0).add(b.mul(y0));
  const name = rng.pick(NAMES);
  const what = rng.pick(["two savings accounts", "two college funds", "two travel funds"]);
  return {
    stem: `Last year, ${name} put a total of ${m(money(T))} into ${what}: ${m("x")} dollars once each month into one, and ${m("y")} dollars twice each month into the other. Which equation represents this situation?`,
    X: "x",
    Y: "y",
    a,
    b,
    T,
    x0,
    y0,
    parts: [
      `${m("x")} dollars once a month for ${m("12")} months is`,
      `${m("y")} dollars twice a month is ${m("24")} deposits, or`,
    ],
    unit: "dollars",
    slips: [
      eqSlip(
        m(`${num(T)} = 12x + 12y`),
        lineEq(a, a, T),
        "you counted the twice-a-month deposits only once a month"
      ),
      eqSlip(
        m(`${num(T)} = 24x + 12y`),
        lineEq(b, a, T),
        "you switched which account gets two deposits a month"
      ),
      eqSlip(
        m(`${num(T)} = 24x + 24y`),
        lineEq(b, b, T),
        "you counted both accounts twice a month"
      ),
    ],
    difficulty: 3,
    hint: "Count how many deposits each account gets in a year.",
  };
}

const STORIES: [number, (rng: Rng) => Story][] = [
  [1.2, points],
  [1.3, tickets],
  [1, speeds],
  [0.9, density],
  [0.7, deposits],
];

export const twoQuantities: Template = {
  id: "efw.two-quantities",
  skill: SKILL,
  label: "Write ax + by = c for two quantities that make a total",
  difficulty: [1, 4],
  formats: ["mc"],
  make(rng, format): Draft {
    const s = weighted(rng, STORIES)(rng);
    const eq = lineEq(s.a, s.b, s.T);
    const deposit = s.a.eq(12) && s.b.eq(24);
    const text = deposit ? m(`${num(s.T)} = 12x + 24y`) : rightText(s);
    // Two combinations the story allows, found from the story's own total.
    const total = (x: Frac, y: Frac) => s.a.mul(x).add(s.b.mul(y));
    const p1: [Frac, Frac] = [F(s.x0), F(s.y0)];
    const x2 = F(s.x0 + 2);
    const p2: [Frac, Frac] = [x2, s.T.sub(total(x2, F(0))).div(total(F(0), F(1)))];
    const steps: Step[] = [
      {
        label: "Write each part as a product",
        work: `${s.parts[0]} ${m(term(s.a, s.X, D))} ${s.unit}, and ${s.parts[1]} ${m(term(s.b, s.Y, D))} ${s.unit}`,
      },
      {
        label: "Add the parts to make the total",
        work: `the two parts add up to ${n(s.T)} ${s.unit}: ${text}`,
      },
    ];
    return {
      format,
      stem: s.stem,
      answer: eqAnswer(text, eq),
      slips: s.slips,
      asks: `the equation that ties ${m(s.X)} and ${m(s.Y)} to the total of ${n(s.T)} ${s.unit}`,
      steps,
      check: `try a combination that fits the story: ${m(`${s.X} = ${s.x0}`)} and ${m(`${s.Y} = ${s.y0}`)} give ${m(`${times(s.a, s.x0)} + ${times(s.b, s.y0)} = ${num(s.T)}`)}, so the equation holds`,
      tip: "Multiply each count by its amount per item, add the products, and set the sum equal to the total",
      hint: s.hint,
      difficulty: s.difficulty + (rng.bool(0.2) && s.difficulty < 4 ? 1 : 0),
      isCorrect: (cand) => eqThrough(cand, [p1, p2]),
    };
  },
};

// ------------------------------------------------------------------ a start and a rate

interface Growth {
  stem: string;
  Y: string;
  X: string;
  start: Frac;
  rate: Frac;
  /** The value after t units, worked out step by step from the story. */
  simulate: (t: number) => Frac;
  answerText: string;
  eq: Eq2;
  slips: Slip[];
  steps: Step[];
  difficulty: number;
  hint: string;
  tip: string;
}

const PLAIN = [
  {
    thing: "A puppy weighed",
    unit: "pounds",
    at: "when it was born",
    per: "week",
    verb: "gained",
    up: true,
    noun: "the puppy's weight, in pounds",
  },
  {
    thing: "A sunflower was",
    unit: "centimeters",
    at: "tall when it was planted",
    per: "week",
    verb: "grew",
    up: true,
    noun: "the sunflower's height, in centimeters",
  },
  {
    thing: "A savings jar held",
    unit: "dollars",
    at: "at the start of the year",
    per: "week",
    verb: "gained",
    up: true,
    noun: "the amount in the jar, in dollars",
  },
  {
    thing: "A water tank held",
    unit: "gallons",
    at: "when a valve was opened",
    per: "minute",
    verb: "lost",
    up: false,
    noun: "the water in the tank, in gallons",
  },
  {
    thing: "A candle was",
    unit: "centimeters",
    at: "tall when it was lit",
    per: "hour",
    verb: "lost",
    up: false,
    noun: "the candle's height, in centimeters",
  },
  {
    thing: "A hiker was at an elevation of",
    unit: "feet",
    at: "at noon",
    per: "hour",
    verb: "climbed",
    up: true,
    noun: "the hiker's elevation, in feet",
  },
] as const;

function plainGrowth(rng: Rng): Growth {
  const c = rng.pick(PLAIN);
  const decimal = rng.bool(0.3);
  const rateAbs = decimal ? F(rng.int(11, 95), 10) : F(rng.int(2, 25));
  const start = c.up ? F(rng.int(5, 400)) : F(rng.int(40, 600));
  const rate = c.up ? rateAbs : rateAbs.neg();
  need(!start.eq(rateAbs), "start equals rate");
  const unitNote = c.unit;
  const [Y, X] = ["y", "x"];
  const text = (mm: Frac, b: Frac) => m(`${Y} = ${lin([[mm, X]], b, D)}`);
  const stem = `${c.thing} ${n(start)} ${unitNote} ${c.at}. It ${c.verb} ${n(rateAbs, D)} ${unitNote} each ${c.per}. Which equation models this situation, where ${m(Y)} is ${c.noun}, ${m(X)} ${c.per}s later?`;
  return {
    stem,
    Y,
    X,
    start,
    rate,
    simulate: (t) => {
      let v = start;
      for (let i = 0; i < t; i++) v = v.add(rate);
      return v;
    },
    answerText: text(rate, start),
    eq: { A: rate.neg(), B: F(1), C: start },
    slips: [
      eqSlip(
        text(rate.neg(), start),
        { A: rate, B: F(1), C: start },
        c.up
          ? `you made the amount go down, but it ${c.verb} each ${c.per}`
          : `you made the amount go up, but it ${c.verb} each ${c.per}`
      ),
      eqSlip(
        text(start, rate),
        { A: start.neg(), B: F(1), C: rate },
        "you switched the starting amount and the rate"
      ),
      eqSlip(
        m(`${Y} = ${lin([[start, X]], 0, D)}`),
        { A: start.neg(), B: F(1), C: F(0) },
        `you multiplied the starting amount by the number of ${c.per}s`
      ),
      eqSlip(
        m(`${Y} = ${lin([[rate, X]], 0, D)}`),
        { A: rate.neg(), B: F(1), C: F(0) },
        "you left out the starting amount"
      ),
    ],
    steps: [
      {
        label: "Find the starting amount",
        work: `when ${m(`${X} = 0`)} the amount is ${n(start)} ${unitNote}, so the constant is ${n(start)}`,
      },
      {
        label: "Find the rate",
        work: `the amount changes by ${n(rate, D)} ${unitNote} each ${c.per}, so the ${m(X)}-coefficient is ${n(rate, D)}`,
      },
      { label: "Put them together", work: text(rate, start) },
    ],
    difficulty: (c.up ? 1 : 2) + (decimal ? 1 : 0),
    hint: `What is ${m(Y)} when ${m(X)} is ${m("0")}, and how much does it change each ${c.per}?`,
    tip: `In ${m("y = mx + b")}, ${m("b")} is the amount at the start and ${m("m")} is the change for each unit of ${m("x")}`,
  };
}

const FIRST = [
  { what: "A parking garage charges", unit: "day", first: "the first day", pay: "parking" },
  {
    what: "A bike rental shop charges",
    unit: "hour",
    first: "the first hour",
    pay: "renting a bike",
  },
  {
    what: "A shipping company charges",
    unit: "pound",
    first: "the first pound",
    pay: "shipping a package",
  },
  {
    what: "A kayak rental stand charges",
    unit: "hour",
    first: "the first hour",
    pay: "renting a kayak",
  },
] as const;

function firstUnit(rng: Rng): Growth {
  const c = rng.pick(FIRST);
  const A = F(rng.int(3, 15));
  const Fst = A.add(rng.int(2, 15));
  const [Y, X] = rng.pick([
    ["C", "t"],
    ["y", "x"],
    ["c", "n"],
  ]);
  const text = (mm: Frac, b: Frac) => m(`${Y} = ${lin([[mm, X]], b)}`);
  const eq = (mm: Frac, b: Frac): Eq2 => ({ A: mm.neg(), B: F(1), C: b });
  const stem = `${c.what} ${m(money(Fst))} for ${c.first} and ${m(money(A))} for each additional ${c.unit}. Which equation gives the cost ${m(Y)}, in dollars, of ${c.pay} for ${m(X)} ${c.unit}s, where ${m(X)} is a positive whole number?`;
  const b = Fst.sub(A);
  return {
    stem,
    Y,
    X,
    start: b,
    rate: A,
    simulate: (t) => {
      let v = F(0);
      for (let i = 1; i <= t; i++) v = v.add(i === 1 ? Fst : A);
      return v;
    },
    answerText: text(A, b),
    eq: eq(A, b),
    slips: [
      eqSlip(
        text(A, Fst),
        eq(A, Fst),
        `you charged ${c.first} twice: the ${m(money(A))} rate applies only to the ${m(`${X} - 1`)} additional ${c.unit}s`
      ),
      eqSlip(
        m(`${Y} = ${num(Fst)}${X}`),
        eq(Fst, F(0)),
        `you charged every ${c.unit} at the price of ${c.first}`
      ),
      eqSlip(text(A, A.neg()), eq(A, A.neg()), `you left out the charge for ${c.first}`),
      eqSlip(text(Fst, A.neg()), eq(Fst, A.neg()), "you switched the two prices"),
    ],
    steps: [
      {
        label: "Split the cost into parts",
        work: `${c.first} costs ${m(money(Fst))}, and the other ${m(`${X} - 1`)} ${c.unit}s cost ${m(money(A))} each`,
      },
      { label: "Write the total cost", work: `${m(`${Y} = ${num(Fst)} + ${num(A)}(${X} - 1)`)}` },
      {
        label: "Simplify",
        work: `${m(`${Y} = ${num(Fst)} + ${num(A)}${X} - ${num(A)}`)}, so ${text(A, b)}`,
      },
    ],
    difficulty: rng.pick([4, 5]),
    hint: `How many of the ${m(X)} ${c.unit}s are charged at the lower price?`,
    tip: "When the first unit is priced differently, the steady rate applies to one fewer unit than the total",
  };
}

export const startAndRate: Template = {
  id: "efw.start-and-rate",
  skill: SKILL,
  label: "Write y = mx + b from a starting amount and a rate",
  difficulty: [1, 5],
  formats: ["mc"],
  make(rng, format): Draft {
    const g = rng.bool(0.7) ? plainGrowth(rng) : firstUnit(rng);
    const pts = [1, 3, 4].map((t) => [F(t), g.simulate(t)] as const);
    const v3 = pts[1][1];
    return {
      format,
      stem: g.stem,
      answer: eqAnswer(g.answerText, g.eq),
      slips: g.slips,
      asks: `the equation that gives ${m(g.Y)} for any value of ${m(g.X)}`,
      steps: g.steps,
      check: `work out ${m(`${g.X} = 3`)} from the story: the amount is ${n(v3, D)}. The equation gives ${m(`${times(g.rate, 3, D)} ${g.start.n < 0 ? "-" : "+"} ${num(g.start.abs(), D)} = ${num(v3, D)}`)}, a match`,
      tip: g.tip,
      hint: g.hint,
      difficulty: g.difficulty,
      isCorrect: (cand) => eqThrough(cand, pts),
    };
  },
};

export const TEMPLATES: Template[] = [twoQuantities, startAndRate, solveStory];
