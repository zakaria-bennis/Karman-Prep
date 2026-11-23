/*
 * m-ratios-and-proportions: Ratios and proportions (Problem-Solving and Data Analysis).
 * Missing terms and proportional quantities, part-to-part counts with a total or a difference,
 * ratio expressions and rate equations, and scaling (rectangles that keep a ratio, a shrunken
 * map, linked ratios). Item models after the bank's own question types; every check redoes the
 * ratio condition by cross-multiplying or by testing the expression at sample points.
 */
import { need } from "../core/build";
import { F, Frac } from "../core/frac";
import { int, m, num } from "../core/tex";
import type { Draft, Template } from "../core/types";
import {
  ans,
  byExpr,
  byValue,
  decimalKey,
  dn,
  exprAns,
  exprSlip,
  fitsBox,
  keep,
  pickW,
  positive,
  sv,
  tryQ,
  type Vars,
} from "./_funcpct-common";

import { scaling } from "./_funcpct-ratio-scaling";
const SKILL = "m-ratios-and-proportions";

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

interface RateContext {
  give: (b: string, c: string) => string;
  askFirst: (y: string) => string;
  askSecond: (x: string) => string;
  first: string;
  second: string;
}

const RATE_CONTEXTS: RateContext[] = [
  {
    give: (b, c) => `A pancake recipe uses ${b} cups of flour for every ${c} cups of milk.`,
    askFirst: (y) => `How many cups of flour are needed for ${y} cups of milk?`,
    askSecond: (x) => `How many cups of milk are needed for ${x} cups of flour?`,
    first: "the cups of flour",
    second: "the cups of milk",
  },
  {
    give: (b, c) => `On a map, ${b} centimeters represent ${c} kilometers.`,
    askFirst: (y) => `How many centimeters on the map represent ${y} kilometers?`,
    askSecond: (x) => `How many kilometers do ${x} centimeters on the map represent?`,
    first: "the centimeters",
    second: "the kilometers",
  },
  {
    give: (b, c) => `A printer prints ${b} pages every ${c} minutes.`,
    askFirst: (y) => `At this rate, how many pages does the printer print in ${y} minutes?`,
    askSecond: (x) => `At this rate, how many minutes does the printer take to print ${x} pages?`,
    first: "the pages",
    second: "the minutes",
  },
  {
    give: (b, c) =>
      `A paint color is made by mixing ${b} liters of blue paint with ${c} liters of white paint.`,
    askFirst: (y) =>
      `How many liters of blue paint should be mixed with ${y} liters of white paint to make the same color?`,
    askSecond: (x) =>
      `How many liters of white paint should be mixed with ${x} liters of blue paint to make the same color?`,
    first: "the blue paint",
    second: "the white paint",
  },
  {
    give: (b, c) => `A forester recommends planting ${b} trees for every ${c} acres of land.`,
    askFirst: (y) =>
      `Based on this recommendation, how many trees should be planted on ${y} acres?`,
    askSecond: (x) => `Based on this recommendation, how many acres are needed for ${x} trees?`,
    first: "the trees",
    second: "the acres",
  },
  {
    give: (b, c) => `A machine fills ${b} bottles of juice every ${c} seconds.`,
    askFirst: (y) => `At this rate, how many bottles does the machine fill in ${y} seconds?`,
    askSecond: (x) => `At this rate, how many seconds does the machine take to fill ${x} bottles?`,
    first: "the bottles",
    second: "the seconds",
  },
];

export const proportion: Template = {
  id: "ratio.proportion",
  skill: SKILL,
  label: "Missing term of equivalent ratios, or a proportional quantity",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["equiv", 2],
      ["given", 1],
      ["constant", 1],
      ["context", 3],
    ] as const);
    // first : second = b : c. Given one value, find the other.
    let b = rng.int(1, 12);
    let c = rng.int(1, 12);
    let askFirst = rng.bool(0.5);
    let k: Frac;
    let given: Frac;
    let stem: string;
    let difficulty: number;
    let known: string;
    if (form === "equiv") {
      k = F(rng.int(2, 40));
      askFirst = false;
      given = k.mul(b);
      const letter = rng.pick(["m", "n", "x", "k"]);
      stem = `The ratio ${m(int(given.n))} to ${m(letter)} is equivalent to the ratio ${m(`${b}`)} to ${m(`${c}`)}. What is the value of ${m(letter)}?`;
      difficulty = b > c ? 1 : 2;
      known = m(int(given.n));
    } else if (form === "given") {
      b = rng.int(10, 60);
      c = rng.int(5, 40);
      need(Math.abs(b - c) > 2, "different");
      k = F(rng.int(2, 15));
      askFirst = true;
      given = k.mul(c);
      const [x, y] = rng.pick([
        ["a", "b"],
        ["x", "y"],
        ["p", "q"],
        ["s", "t"],
      ]);
      stem = `The ratio ${m(x)} to ${m(y)} is equivalent to the ratio ${m(`${b}`)} to ${m(`${c}`)}. What is the value of ${m(x)} when ${m(`${y} = ${int(given.n)}`)}?`;
      difficulty = 3;
      known = m(y);
    } else if (form === "constant") {
      k = F(rng.int(2, 12));
      given = askFirst ? k.mul(c) : k.mul(b);
      const [x, y] = rng.pick([
        ["k", "p"],
        ["y", "x"],
        ["r", "s"],
        ["u", "v"],
      ]);
      stem = `The ratio of ${m(x)} to ${m(y)} is constant. If ${m(`${x} = ${b}`)}, then ${m(`${y} = ${c}`)}. What is the value of ${askFirst ? m(x) : m(y)} when ${askFirst ? m(`${y} = ${int(given.n)}`) : m(`${x} = ${int(given.n)}`)}?`;
      difficulty = 2;
      known = askFirst ? m(y) : m(x);
    } else {
      const ctx = rng.pick(RATE_CONTEXTS);
      b = rng.int(2, 15);
      c = rng.int(2, 15);
      k = F(rng.int(3, 40), rng.pick([1, 1, 2]));
      given = askFirst ? k.mul(c) : k.mul(b);
      need(given.isInt(), "whole given");
      stem = `${ctx.give(m(`${b}`), m(`${c}`))} ${askFirst ? ctx.askFirst(m(int(given.n))) : ctx.askSecond(m(int(given.n)))}`;
      difficulty = k.isInt() ? 2 : 3;
      known = askFirst ? ctx.second : ctx.first;
    }
    need(b !== c, "different terms");
    const B = F(b);
    const C = F(c);
    const target = askFirst ? given.mul(B).div(C) : given.mul(C).div(B);
    need(target.terminates() && target.decimalPlaces() <= 2, "clean");
    if (format === "spr") need(fitsBox(target), "fits");
    const [own, other] = askFirst ? [B, C] : [C, B];
    const g = int(given.n);
    const isCorrect = byValue((v) =>
      askFirst ? v.mul(C).eq(given.mul(B)) : v.mul(B).eq(given.mul(C))
    );
    const slips = keep(
      sv(
        given.mul(other).div(own),
        `you set up the proportion upside down, matching ${m(num(own))} with ${m(g)} instead of with the unknown`
      ),
      sv(
        given.add(own).sub(other),
        "you kept the difference between the two quantities the same instead of their ratio"
      ),
      sv(
        given.div(other),
        `you found how many times larger ${m(g)} is than ${m(num(other))} and stopped`
      ),
      sv(
        given.mul(own),
        `you multiplied ${m(g)} by ${m(num(own))} without dividing by ${m(num(other))}`
      )
    );
    const [top, bottom] = askFirst ? [b, c] : [c, b];
    return {
      format,
      stem,
      answer: ans(target),
      slips: positive(slips),
      asks: `the missing amount that keeps the ratio ${m(`${b}`)} to ${m(`${c}`)}`,
      steps: [
        {
          label: "Write a proportion",
          work: `Put the unknown ${m("u")} over the given ${m(g)}, in the same order as ${m(`\\frac{${top}}{${bottom}}`)}: ${m(`\\frac{u}{${g}} = \\frac{${top}}{${bottom}}`)}`,
        },
        {
          label: "Solve for the unknown",
          work: `Multiply both sides by ${m(g)}: ${m(`u = \\frac{${top} \\times ${g}}{${bottom}} = ${dn(target)}`)}`,
        },
      ],
      check: `${m(`\\frac{${dn(target)}}{${g}}`)} simplifies to ${m(`\\frac{${top}}{${bottom}}`)}, the same ratio`,
      tip: "In a proportion, keep the same quantity on top of both fractions, then cross-multiply",
      hint: `Write a proportion with ${known} in matching places on both sides.`,
      difficulty,
      isCorrect,
      key: decimalKey(target),
    };
  },
};

const GROUPS = [
  {
    a: "red marbles",
    b: "blue marbles",
    whole: "marbles in a bag",
    all: "marbles in the bag",
    total: "marbles",
    only: "A bag holds only red marbles and blue marbles.",
  },
  {
    a: "students who walk to school",
    b: "students who bike to school",
    whole: "students in a club, and each of them either walks or bikes to school",
    all: "students in the club",
    total: "students",
    only: "Each student in a club either walks or bikes to school.",
  },
  {
    a: "dogs",
    b: "cats",
    whole: "animals at a shelter, all dogs or cats",
    all: "animals at the shelter",
    total: "animals",
    only: "An animal shelter has only dogs and cats.",
  },
  {
    a: "fiction books",
    b: "nonfiction books",
    whole: "books on a shelf",
    all: "books on the shelf",
    total: "books",
    only: "Each book on a shelf is either fiction or nonfiction.",
  },
  {
    a: "adults",
    b: "children",
    whole: "people at a puppet show",
    all: "people at the show",
    total: "people",
    only: "Everyone at a puppet show is either an adult or a child.",
  },
  {
    a: "oak trees",
    b: "maple trees",
    whole: "trees in a park, all oaks or maples",
    all: "trees in the park",
    total: "trees",
    only: "The trees in a park are all oaks or maples.",
  },
];

export const partWhole: Template = {
  id: "ratio.part-whole",
  skill: SKILL,
  label: "Part-to-part ratios with a total or a difference",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["total", 3],
      ["fromPart", 2],
      ["difference", 2],
    ] as const);
    const g = rng.pick(GROUPS);
    const a = rng.int(1, 9);
    const b = rng.int(1, 9);
    need(a !== b, "different parts");
    const share = rng.int(2, 30);
    const A = F(a * share);
    const B = F(b * share);
    const T = A.add(B);
    const ratio = `${m(`${a}`)} to ${m(`${b}`)}`;
    const intro = `The ratio of ${g.a} to ${g.b} is ${ratio}.`;
    let stem: string;
    let target: Frac;
    let difficulty: number;
    let slips;
    let steps;
    let isCorrect;
    if (form === "total") {
      const wantB = rng.bool(0.5);
      target = wantB ? B : A;
      const [mine, theirs, mineN, theirsN] = wantB ? [b, a, g.b, g.a] : [a, b, g.a, g.b];
      stem = `There are ${m(int(T.n))} ${g.whole}. ${intro} How many ${mineN} are there?`;
      difficulty = 2;
      slips = keep(
        sv(wantB ? A : B, `you found the number of ${theirsN}`),
        sv(
          T.div(a + b),
          `you found the size of one share, ${m(`\\frac{${int(T.n)}}{${a + b}}`)}, and stopped`
        ),
        sv(
          tryQ(() => T.sub(T.mul(theirs).div(mine))),
          `you read the ratio as part to whole, as if ${m(`${theirs}`)} of every ${m(`${mine}`)} were ${theirsN}`
        ),
        sv(
          T.div(mine),
          `you divided the total by ${m(`${mine}`)} instead of by the ${m(`${a + b}`)} shares in all`
        )
      );
      steps = [
        {
          label: "Count the shares in all",
          work: `Every ${m(`${a + b}`)} ${g.total} include ${m(`${a}`)} ${g.a} and ${m(`${b}`)} ${g.b}`,
        },
        { label: "Find one share", work: m(`\\frac{${int(T.n)}}{${a + b}} = ${share}`) },
        { label: `Count the ${mineN}`, work: m(`${mine} \\times ${share} = ${int(target.n)}`) },
      ];
      isCorrect = byValue((v) => v.isInt() && T.sub(v).mul(mine).eq(v.mul(theirs)));
    } else if (form === "fromPart") {
      target = T;
      stem = `${g.only} ${intro} There are ${m(int(B.n))} ${g.b}. How many ${g.all} are there in all?`;
      difficulty = 3;
      slips = keep(
        sv(A, `you found the number of ${g.a} and did not add the ${g.b}`),
        sv(B.add(a), `you added the ratio number ${m(`${a}`)} to the count`),
        sv(
          B.mul(a + b).div(a),
          `you matched the ${m(int(B.n))} ${g.b} with the ${m(`${a}`)} in the ratio`
        ),
        sv(B.mul(a), `you multiplied the ${g.b} by ${m(`${a}`)} without dividing by ${m(`${b}`)}`)
      );
      steps = [
        {
          label: "Find one share",
          work: `The ${g.b} are ${m(`${b}`)} shares: ${m(`\\frac{${int(B.n)}}{${b}} = ${share}`)}`,
        },
        {
          label: "Count all the shares",
          work: `There are ${m(`${a} + ${b} = ${a + b}`)} shares in all: ${m(`${a + b} \\times ${share} = ${int(T.n)}`)}`,
        },
      ];
      isCorrect = byValue((v) => v.isInt() && v.sub(B).mul(b).eq(B.mul(a)));
    } else {
      need(a > b, "first group larger");
      target = A;
      const D = A.sub(B);
      stem = `${intro} There are ${m(int(D.n))} more ${g.a} than ${g.b}. How many ${g.a} are there?`;
      difficulty = format === "spr" ? 5 : 4;
      slips = keep(
        sv(B, `you found the number of ${g.b}`),
        sv(
          D.mul(a),
          `you multiplied the difference by ${m(`${a}`)}; the difference is ${m(`${a - b}`)} shares, not one`
        ),
        sv(T, `you found the total number of ${g.total}`),
        sv(D.add(a), `you added ${m(`${a}`)} to the difference`)
      );
      steps = [
        {
          label: "Find what the difference counts",
          work: `The ${g.a} have ${m(`${a} - ${b} = ${a - b}`)} more shares than the ${g.b}`,
        },
        { label: "Find one share", work: m(`\\frac{${int(D.n)}}{${a - b}} = ${share}`) },
        { label: `Count the ${g.a}`, work: m(`${a} \\times ${share} = ${int(A.n)}`) },
      ];
      isCorrect = byValue((v) => v.isInt() && v.gt(D) && v.mul(b).eq(v.sub(D).mul(a)));
    }
    if (format === "spr") need(fitsBox(target), "fits");
    return {
      format,
      stem,
      answer: ans(target),
      slips: positive(slips).filter((s) => s.value!.asRat()!.isInt()),
      asks: `a count from the ratio ${ratio}, which compares the two groups with each other, not with the total`,
      steps,
      check: `${m(int(A.n))} ${g.a} and ${m(int(B.n))} ${g.b} give ${m(`\\frac{${int(A.n)}}{${int(B.n)}} = \\frac{${a}}{${b}}`)}, the ratio given`,
      tip: "A part-to-part ratio a to b splits the whole into a + b equal shares; find the size of one share first",
      hint: "How many equal shares does the ratio describe, and how big is one share?",
      difficulty,
      isCorrect,
    };
  },
};

/** k times a letter as LaTeX: 3x, x, \frac{5x}{3}, \frac{x}{4}. */
function kx(k: Frac, v: string): string {
  if (k.isInt()) return k.eq(1) ? v : `${k.n}${v}`;
  return `\\frac{${k.n === 1 ? "" : k.n}${v}}{${k.d}}`;
}

const COVER = [
  {
    stuff: "paint",
    per: "gallon",
    surface: "the walls of a room",
    noun: "total wall area",
    unit: "gallons",
  },
  {
    stuff: "deck sealant",
    per: "gallon",
    surface: "a deck",
    noun: "surface area",
    unit: "gallons",
  },
  { stuff: "lawn fertilizer", per: "bag", surface: "a lawn", noun: "area", unit: "bags" },
  { stuff: "floor wax", per: "bottle", surface: "a gym floor", noun: "area", unit: "bottles" },
];
const TIMES_WORD = ["", "once", "twice", "three times"];

export const ratioExpressions: Template = {
  id: "ratio.expressions",
  skill: SKILL,
  label: "Ratio expressions and rate equations",
  difficulty: [2, 5],
  formats: ["mc"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["ratio", 2],
      ["solve", 2],
      ["cover", 3],
    ] as const);
    if (form === "ratio") {
      const g = rng.pick(GROUPS);
      const p = rng.int(1, 9);
      const q = rng.int(2, 25);
      need(p !== q, "different");
      const kq = F(q, p);
      const truth = (v: Vars) => (q * v.x) / p;
      return {
        format,
        stem: `The ratio of ${g.a} to ${g.b} is ${m(`${p}`)} to ${m(`${q}`)}. If there are ${m("x")} ${g.a}, which expression represents the number of ${g.b}?`,
        answer: exprAns(m(kx(kq, "x")), truth),
        slips: keep(
          exprSlip(
            m(kx(F(p, q), "x")),
            (v) => (p * v.x) / q,
            `you flipped the ratio and multiplied by ${m(`\\frac{${p}}{${q}}`)}`
          ),
          q > p
            ? exprSlip(
                m(`x + ${q - p}`),
                (v) => v.x + q - p,
                "you added the difference of the ratio numbers instead of multiplying"
              )
            : null,
          p === 1
            ? null
            : exprSlip(
                m(kx(F(q), "x")),
                (v) => q * v.x,
                `you multiplied by ${m(`${q}`)} and forgot to divide by ${m(`${p}`)}`
              ),
          exprSlip(
            m(`\\frac{${q}}{${p === 1 ? "" : p}x}`),
            (v) => q / (p * v.x),
            `you divided ${m(`${q}`)} by the number of ${g.a} instead of multiplying`
          )
        ),
        asks: `the number of ${g.b} written with ${m("x")}, using the ratio ${m(`${p}`)} to ${m(`${q}`)}`,
        steps: [
          {
            label: "Write a proportion",
            work: `Call the number of ${g.b} ${m("u")}: ${m(`\\frac{x}{u} = \\frac{${p}}{${q}}`)}`,
          },
          {
            label: "Solve for the second group",
            work: `Cross-multiply: ${m(`${p === 1 ? "" : p}u = ${q}x`)}, so ${m(`u = ${kx(kq, "x")}`)}`,
          },
        ],
        check: `with ${m(`x = ${p * 4}`)} ${g.a}, the expression gives ${m(`${q * 4}`)} ${g.b}, and ${m(`${p * 4}`)} to ${m(`${q * 4}`)} is the same ratio as ${m(`${p}`)} to ${m(`${q}`)}`,
        tip: "Test an expression answer with a simple number of your own that fits the ratio",
        hint: `For every ${m(`${p}`)} ${g.a} there are ${m(`${q}`)} ${g.b}.`,
        difficulty: p === 1 ? 2 : 3,
        isCorrect: byExpr(truth),
      };
    }
    if (form === "solve") {
      const a = rng.int(2, 15);
      const b = rng.int(2, 15);
      need(a !== b, "different");
      const [x, y] = rng.pick([
        ["x", "y"],
        ["m", "n"],
        ["r", "s"],
        ["u", "v"],
      ]);
      const truth = (v: Vars) => (a * b) / v[y];
      const eq = (rhs: string) => m(`${x} = ${rhs}`);
      return {
        format,
        stem: `The ratio ${m(`${a}`)} to ${m(x)} is equivalent to the ratio ${m(y)} to ${m(`${b}`)}. Which equation represents ${m(x)} in terms of ${m(y)}?`,
        answer: exprAns(eq(`\\frac{${a * b}}{${y}}`), truth),
        slips: keep(
          exprSlip(
            eq(`\\frac{${a}${y}}{${b}}`),
            (v) => (a * v[y]) / b,
            `you cross-multiplied the wrong pairs, ${m(`${a}`)} with ${m(y)}`
          ),
          exprSlip(
            eq(`\\frac{${b}${y}}{${a}}`),
            (v) => (b * v[y]) / a,
            `you wrote the second ratio upside down, as ${m(`${b}`)} to ${m(y)}`
          ),
          exprSlip(
            eq(`\\frac{${y}}{${a * b}}`),
            (v) => v[y] / (a * b),
            `you solved for ${m(`\\frac{1}{${x}}`)} instead of ${m(x)}`
          )
        ),
        asks: `${m(x)} alone on one side, using ${m(`\\frac{${a}}{${x}} = \\frac{${y}}{${b}}`)}`,
        steps: [
          {
            label: "Write the ratios as fractions",
            work: m(`\\frac{${a}}{${x}} = \\frac{${y}}{${b}}`),
          },
          {
            label: "Cross-multiply",
            work: `${m(`${a} \\times ${b} = ${x}${y}`)}, so ${m(`${x}${y} = ${a * b}`)}`,
          },
          {
            label: `Get ${m(x)} alone`,
            work: `Divide both sides by ${m(y)}: ${eq(`\\frac{${a * b}}{${y}}`)}`,
          },
        ],
        check: `with ${m(`${y} = ${b}`)}, the equation gives ${m(`${x} = ${a}`)}, and ${m(`${a}`)} to ${m(`${a}`)} is equivalent to ${m(`${b}`)} to ${m(`${b}`)}`,
        tip: "Write each ratio as a fraction in the order the words give it, then cross-multiply",
        hint: `Write ${m(`${a}`)} to ${m(x)} and ${m(y)} to ${m(`${b}`)} as two equal fractions.`,
        difficulty: 4,
        isCorrect: byExpr(truth),
      };
    }
    const c = rng.pick(COVER);
    const coats = rng.pick([1, 2, 2, 3]);
    const A = rng.pick([40, 50, 60, 70, 75, 80, 90, 100, 120, 150, 200, 250, 300, 350, 400, 450]);
    const priced = rng.bool(0.5);
    const cost = rng.int(12, 60);
    const area = rng.pick(["w", "a", "s"]);
    const per = F(coats, A);
    const truth = (v: Vars) => (priced ? cost : 1) * per.toNumber() * v[area];
    const write = (k: Frac) =>
      priced ? `c = ${cost}\\left(${kx(k, area)}\\right)` : `u = ${kx(k, area)}`;
    const word = TIMES_WORD[coats];
    const target = c.surface.replace(/^a /, "the ");
    const stem = priced
      ? `One ${c.per} of ${c.stuff} costs ${m(`\\$${cost}`)} and covers ${m(`${A}`)} square feet. ${capital(c.surface)} has a ${c.noun} of ${m(area)} square feet. Which equation represents the cost ${m("c")}, in dollars, of the ${c.stuff} needed to cover ${target} ${word}?`
      : `One ${c.per} of ${c.stuff} covers ${m(`${A}`)} square feet. ${capital(c.surface)} has a ${c.noun} of ${m(area)} square feet. Which equation represents the number of ${c.unit} ${m("u")} of ${c.stuff} needed to cover ${target} ${word}?`;
    const mk = (k: Frac, f: (v: Vars) => number, why: string) => exprSlip(m(write(k)), f, why);
    const slips = priced
      ? keep(
          exprSlip(
            m(`c = \\frac{${A * coats}${area}}{${cost}}`),
            (v) => (A * coats * v[area]) / cost,
            "you divided by the price and multiplied by the area one unit covers, which turns both rates upside down"
          ),
          coats > 1
            ? mk(
                F(1, A),
                (v) => (cost * v[area]) / A,
                `you found the cost to cover it once, not ${word}`
              )
            : null,
          exprSlip(
            m(`c = \\frac{${A}${area}}{${cost}}`),
            (v) => (A * v[area]) / cost,
            "you divided by the price instead of multiplying by it"
          ),
          coats > 1
            ? mk(
                F(1, A * coats),
                (v) => (cost * v[area]) / (A * coats),
                "you divided by the number of coats instead of multiplying"
              )
            : mk(
                F(2, A),
                (v) => (2 * cost * v[area]) / A,
                "you covered it twice, but the question says once"
              )
        )
      : keep(
          coats > 1
            ? mk(F(1, A), (v) => v[area] / A, `you found the amount to cover it once, not ${word}`)
            : null,
          mk(
            F(A * coats),
            (v) => A * coats * v[area],
            `you multiplied the area by the area one ${c.per} covers instead of dividing`
          ),
          coats > 1
            ? mk(
                F(1, A * coats),
                (v) => v[area] / (A * coats),
                "you divided by the number of coats instead of multiplying"
              )
            : null,
          mk(
            F(coats + 1, A),
            (v) => ((coats + 1) * v[area]) / A,
            `you counted ${coats + 1} coats instead of ${coats}`
          ),
          mk(F(A), (v) => A * v[area], `you multiplied by ${m(`${A}`)} instead of dividing by it`)
        );
    const level = 3 + (coats > 1 ? 1 : 0) + (priced ? 1 : 0);
    return {
      format,
      stem,
      answer: exprAns(m(write(per)), truth),
      slips,
      asks: priced
        ? `the cost as an equation in ${m(area)}: the ${c.per}s needed times the price of one ${c.per}`
        : `the number of ${c.unit} as an equation in ${m(area)}`,
      steps: [
        {
          label: "Find the area to cover",
          work:
            coats === 1
              ? `The surface is covered once: ${m(area)} square feet`
              : `Covering it ${word} means covering ${m(`${coats}${area}`)} square feet`,
        },
        {
          label: `Count the ${c.unit} needed`,
          work: `Each ${c.per} covers ${m(`${A}`)} square feet, so divide by ${m(`${A}`)}: ${m(kx(per, area))} ${c.unit}`,
        },
        ...(priced
          ? [
              {
                label: "Multiply by the price",
                work: `Each ${c.per} costs ${m(`\\$${cost}`)}: ${m(write(per))}`,
              },
            ]
          : []),
      ],
      check: `if ${m(`${area} = ${A}`)}, each coat takes one ${c.per}, so covering it ${word} takes ${m(`${coats}`)} ${coats === 1 ? c.per : c.unit}${priced ? `, costing ${m(`\\$${cost * coats}`)}` : ""}, which is what the equation gives`,
      tip: "Divide the total area by the area one unit covers to count units; multiply by the price only after that",
      hint: `How many square feet must be covered in all, and how much does one ${c.per} cover?`,
      difficulty: Math.min(5, level),
      isCorrect: byExpr(truth),
    };
  },
};

export const TEMPLATES: Template[] = [proportion, partWhole, ratioExpressions, scaling];
