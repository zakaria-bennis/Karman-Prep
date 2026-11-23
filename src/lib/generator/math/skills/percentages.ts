/*
 * m-percentages: Percentages (Problem-Solving and Data Analysis). Percent of a number and the
 * part left over, percent change (and percentage points), reverse percent, and multistep
 * percents (successive changes, chains of percents). Item models after the bank's own question
 * types; every number is exact (Frac), and every check redoes the condition another way.
 */
import { need } from "../core/build";
import { F, Frac } from "../core/frac";
import { int, m, money } from "../core/tex";
import type { Draft, Template } from "../core/types";
import {
  ans,
  byValue,
  decimalKey,
  dn,
  fitsBox,
  keep,
  pc,
  pickW,
  positive,
  sv,
  tryQ,
  wholeFor,
} from "./_funcpct-common";

import { multistep } from "./_funcpct-pct-multistep";
const SKILL = "m-percentages";
const H = F(100);
const cash = (q: Frac) => money(q);

interface PartContext {
  intro: (whole: string, p: string) => string;
  part: string;
  rest: string;
  noun: string;
  partName: string;
  restName: string;
}

const PART_CONTEXTS: PartContext[] = [
  {
    intro: (w, p) =>
      `A school auditorium has ${w} seats. During an assembly, students filled ${p} of the seats.`,
    part: "How many seats did students fill during the assembly?",
    rest: "How many seats were empty during the assembly?",
    noun: "seats",
    partName: "filled seats",
    restName: "empty seats",
  },
  {
    intro: (w, p) => `A jar holds ${w} buttons, and ${p} of the buttons are green.`,
    part: "How many green buttons are in the jar?",
    rest: "How many buttons in the jar are not green?",
    noun: "buttons",
    partName: "green buttons",
    restName: "buttons that are not green",
  },
  {
    intro: (w, p) => `An orchard has ${w} trees, and ${p} of them are pear trees.`,
    part: "How many pear trees are in the orchard?",
    rest: "How many trees in the orchard are not pear trees?",
    noun: "trees",
    partName: "pear trees",
    restName: "trees that are not pear trees",
  },
  {
    intro: (w, p) =>
      `In a survey of ${w} residents of a town, ${p} said they would use a new bike path.`,
    part: "How many of the residents surveyed said they would use the bike path?",
    rest: "How many of the residents surveyed did not say they would use the bike path?",
    noun: "residents surveyed",
    partName: "residents who would use the path",
    restName: "residents who did not say so",
  },
  {
    intro: (w, p) =>
      `A theater sold ${w} tickets for a play, and ${p} of them were student tickets.`,
    part: "How many student tickets did the theater sell for the play?",
    rest: "How many of the tickets sold were not student tickets?",
    noun: "tickets",
    partName: "student tickets",
    restName: "other tickets",
  },
  {
    intro: (w, p) => `A gardener planted ${w} seeds, and ${p} of the seeds sprouted.`,
    part: "How many of the seeds sprouted?",
    rest: "How many of the seeds did not sprout?",
    noun: "seeds",
    partName: "seeds that sprouted",
    restName: "seeds that did not sprout",
  },
  {
    intro: (w, p) =>
      `A bakery made ${w} muffins on Saturday, and ${p} of them were blueberry muffins.`,
    part: "How many blueberry muffins did the bakery make on Saturday?",
    rest: "How many of the muffins made on Saturday were not blueberry muffins?",
    noun: "muffins",
    partName: "blueberry muffins",
    restName: "other muffins",
  },
  {
    intro: (w, p) => `A city race had ${w} runners, and ${p} of them finished in under one hour.`,
    part: "How many runners finished in under one hour?",
    rest: "How many runners did not finish in under one hour?",
    noun: "runners",
    partName: "runners who finished in under one hour",
    restName: "runners who did not",
  },
  {
    intro: (w, p) =>
      `A parking garage has ${w} spaces, and ${p} of the spaces are for compact cars.`,
    part: "How many spaces in the garage are for compact cars?",
    rest: "How many spaces in the garage are not for compact cars?",
    noun: "spaces",
    partName: "compact-car spaces",
    restName: "other spaces",
  },
  {
    intro: (w, p) => `A shipment contained ${w} light bulbs, and ${p} of the bulbs were defective.`,
    part: "How many light bulbs in the shipment were defective?",
    rest: "How many light bulbs in the shipment were not defective?",
    noun: "light bulbs",
    partName: "defective bulbs",
    restName: "bulbs that work",
  },
  {
    intro: (w, p) =>
      `A summer camp has ${w} campers, and ${p} of the campers signed up for swimming lessons.`,
    part: "How many campers signed up for swimming lessons?",
    rest: "How many campers did not sign up for swimming lessons?",
    noun: "campers",
    partName: "campers in swimming lessons",
    restName: "campers not in swimming lessons",
  },
  {
    intro: (w, p) => `A pond was stocked with ${w} fish, and ${p} of the fish were trout.`,
    part: "How many trout were stocked in the pond?",
    rest: "How many of the fish stocked were not trout?",
    noun: "fish",
    partName: "trout",
    restName: "fish that were not trout",
  },
];

const SMALL_CONTEXTS = [
  {
    rule: "a bag of rice to contain at most",
    tail: "broken grains by mass",
    item: "a bag of this rice",
    part: "broken grains",
  },
  {
    rule: "a metal alloy to contain at most",
    tail: "tin by mass",
    item: "a bar of this alloy",
    part: "tin",
  },
  {
    rule: "a garden fertilizer to contain at most",
    tail: "zinc by mass",
    item: "a bag of this fertilizer",
    part: "zinc",
  },
  {
    rule: "a type of flour to contain at most",
    tail: "ash by mass",
    item: "a sack of this flour",
    part: "ash",
  },
  {
    rule: "a jar of honey to contain at most",
    tail: "wax by mass",
    item: "a jar of this honey",
    part: "wax",
  },
  {
    rule: "a sample of sea salt to contain at most",
    tail: "moisture by mass",
    item: "a bag of this salt",
    part: "moisture",
  },
];

const P_INT = [
  5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 2, 4, 6, 8, 12, 14, 16, 18,
  22, 24, 26, 28, 32, 34, 36, 38, 42, 44, 46, 48, 52, 56, 64, 68, 72, 76, 84, 88, 96,
];
const P_HALF = [2.5, 7.5, 12.5, 17.5, 22.5, 37.5, 62.5, 87.5];
const P_SMALL = [0.5, 0.2, 0.4, 0.25, 0.75, 0.05, 0.02, 0.01, 0.001, 0.005, 1.5, 2.5, 0.3, 0.6];

export const percentOf: Template = {
  id: "pct.percent-of",
  skill: SKILL,
  label: "Find a percent of a number, or the part left over",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["bare", 1],
      ["part", 2],
      ["rest", 2],
      ["small", 1],
    ] as const);
    const half = form !== "small" && rng.bool(0.2);
    const p = F(form === "small" ? rng.pick(P_SMALL) : half ? rng.pick(P_HALF) : rng.pick(P_INT));
    const r = p.div(100);
    let N: number;
    let stem: string;
    let difficulty: number;
    let rest = false;
    let ctx: PartContext | null = null;
    let smallPart = "";
    if (form === "small") {
      N = 10 * rng.int(4, 250);
      const c = rng.pick(SMALL_CONTEXTS);
      smallPart = c.part;
      stem = `A quality standard allows ${c.rule} ${m(pc(p))} ${c.tail}. If ${c.item} has a mass of ${m(int(N))} grams, what is the greatest mass of ${c.part}, in grams, it can contain and still meet the standard?`;
      difficulty = p.lt(F(1, 10)) ? 4 : 3;
    } else if (form === "bare") {
      N = rng.int(4, 90) * 10 + rng.pick([0, 0, 5]);
      stem = `What is ${m(pc(p))} of ${m(int(N))}?`;
      difficulty = r.mul(N).isInt() ? 1 : 2;
    } else {
      ctx = rng.pick(PART_CONTEXTS);
      N = wholeFor(rng, p, 20, 2400);
      rest = form === "rest";
      stem = `${ctx.intro(m(int(N)), m(pc(p)))} ${rest ? ctx.rest : ctx.part}`;
      const round = p.isInt() && p.n % 5 === 0;
      difficulty = (rest ? 2 : 1) + (round ? 0 : 1);
    }
    const partValue = r.mul(N);
    const target = rest ? F(N).sub(partValue) : partValue;
    need(target.terminates() && target.decimalPlaces() <= 4 && target.gt(0), "clean answer");
    if (format === "spr") need(fitsBox(target), "fits the box");
    const restP = H.sub(p);
    const show = (q: Frac) => dn(q);
    const isCorrect = byValue((v) =>
      rest ? F(N).sub(v).mul(100).eq(p.mul(N)) : v.mul(100).eq(p.mul(N))
    );
    const slips =
      form === "small"
        ? keep(
            sv(
              target.mul(10),
              `you wrote ${m(pc(p))} as ${m(dn(p.div(10)))}, moving the decimal point only one place`
            ),
            sv(target.mul(100), `you multiplied by ${n0(p)} without dividing by ${m("100")}`),
            sv(target.div(10), `you divided by ${m("1{,}000")} instead of by ${m("100")}`),
            sv(F(N).sub(target), `you found the mass that is not ${smallPart}`)
          )
        : rest
          ? keep(
              sv(
                partValue,
                `you found the ${ctx!.partName}; the question asks for the ${ctx!.restName}`
              ),
              sv(
                F(N).sub(p),
                `you subtracted ${n0(p)} from ${m(int(N))} instead of subtracting ${m(pc(p))} of it`
              ),
              sv(
                restP,
                `you gave the percent of the ${ctx!.noun} left over, not how many there are`
              ),
              sv(
                target.mul(10),
                `you wrote ${m(pc(restP))} as ${m(dn(restP.div(10)))}, moving the decimal point only one place`
              )
            )
          : keep(
              sv(
                partValue.mul(10),
                `you wrote ${m(pc(p))} as ${m(dn(p.div(10)))}, moving the decimal point only one place`
              ),
              sv(
                F(N).div(p),
                `you divided ${m(int(N))} by ${n0(p)} instead of multiplying by ${m(dn(r))}`
              ),
              sv(F(N).sub(partValue), `you found the part that is not ${m(pc(p))}`),
              sv(
                F(N).sub(p),
                `you subtracted ${n0(p)} from ${m(int(N))} instead of finding ${m(pc(p))} of it`
              ),
              sv(p, `you gave the percent itself, not ${m(pc(p))} of ${m(int(N))}`)
            );
    const steps = rest
      ? [
          {
            label: "Find the percent left over",
            work: `The ${ctx!.restName} are ${m(`100\\% - ${pc(p)} = ${pc(restP)}`)} of the ${ctx!.noun}`,
          },
          {
            label: "Take that part of the whole",
            work: m(`${dn(restP.div(100))} \\times ${int(N)} = ${show(target)}`),
          },
        ]
      : [
          {
            label: "Write the percent as a decimal",
            work: `${m(`${pc(p)} = \\frac{${dn(p)}}{100} = ${dn(r)}`)}, because percent means per hundred`,
          },
          {
            label: "Take that part of the whole",
            work: m(`${dn(r)} \\times ${int(N)} = ${show(target)}`),
          },
        ];
    return {
      format,
      stem,
      answer: ans(target, show),
      slips: positive(slips),
      asks: rest
        ? `the number of ${ctx!.restName}, the ${ctx!.noun} outside the ${m(pc(p))}`
        : form === "small"
          ? `the mass of ${smallPart} that is ${m(pc(p))} of ${m(int(N))} grams`
          : `${m(pc(p))} of ${m(int(N))}, a part of the whole`,
      steps,
      check: rest
        ? `the ${ctx!.partName} number ${m(`${dn(r)} \\times ${int(N)} = ${show(partValue)}`)}, and ${m(`${show(partValue)} + ${show(target)} = ${int(N)}`)}, the whole`
        : `dividing back, ${m(`\\frac{${show(target)}}{${int(N)}} = ${dn(r)}`)}, which is ${m(pc(p))}`,
      tip: rest
        ? "For the part that is not a given percent, subtract the percent from 100% first, then multiply by the whole"
        : "To find a percent of a number, divide the percent by 100 and multiply the result by the number",
      hint: rest
        ? `What percent of the ${ctx!.noun} are not part of the ${m(pc(p))}?`
        : `Write ${m(pc(p))} as a decimal first.`,
      difficulty,
      isCorrect,
      key: decimalKey(target),
    };
  },
};

/** A percent number for prose: $12.5$. */
const n0 = (q: Frac) => m(dn(q));

const PRICE_ITEMS = [
  "a concert ticket",
  "a bicycle helmet",
  "a pound of coffee",
  "a movie ticket",
  "a box of cereal",
  "a parking permit",
  "a museum membership",
  "a set of paints",
  "a pair of running shoes",
  "a gallon of paint",
];
const COUNT_ITEMS = [
  { what: "the number of students in a robotics club", unit: "students" },
  { what: "the number of visitors to a state park in one week", unit: "visitors" },
  { what: "the number of books checked out from a library in one day", unit: "books" },
  { what: "the number of birds counted at a lake", unit: "birds" },
  { what: "the number of members of a hiking club", unit: "members" },
  { what: "the number of trees in a city park", unit: "trees" },
];
const RATE_TOPICS = [
  "walked to work",
  "had a library card",
  "volunteered at least once a month",
  "grew some of their own vegetables",
  "rode a bus to work",
  "owned a bicycle",
];
const INC = [
  10, 20, 25, 30, 40, 50, 60, 75, 80, 100, 120, 150, 200, 250, 300, 400, 5, 15, 35, 45, 12.5,
];
const DEC = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 65, 70, 75, 80, 12.5, 37.5, 62.5];

export const percentChange: Template = {
  id: "pct.change",
  skill: SKILL,
  label: "Percent increase or decrease, including percentage points",
  difficulty: [1, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["price", 3],
      ["count", 3],
      ["points", 2],
    ] as const);
    const up = rng.bool(form === "price" ? 0.65 : 0.5);
    let a: Frac;
    let b: Frac;
    let p: Frac;
    let stem: string;
    let show = (q: Frac) => dn(q);
    let unit: string;
    let difficulty: number;
    const word = up ? "increase" : "decrease";
    if (form === "points") {
      const P1 = rng.pick([4, 5, 8, 10, 12, 15, 16, 20, 24, 25, 30, 32, 40]);
      p = F(rng.pick(up ? [10, 20, 25, 50, 75, 100, 12.5] : [10, 20, 25, 50, 12.5, 37.5]));
      a = F(P1);
      b = a.mul(H.add(up ? p : p.neg())).div(100);
      need(b.isInt() && !b.eq(a), "whole percents");
      const y1 = rng.int(2005, 2016);
      const y2 = y1 + rng.int(3, 8);
      const topic = rng.pick(RATE_TOPICS);
      const ask =
        format === "spr"
          ? `The number of residents who ${topic} ${up ? "increased" : "decreased"} by ${m("p\\%")} from ${y1} to ${y2}. What is the value of ${m("p")}?`
          : `By what percent did the number of residents who ${topic} ${word} from ${y1} to ${y2}?`;
      stem = `The population of a town was the same in ${y1} and ${y2}. In ${y1}, ${m(pc(a))} of the residents ${topic}, and in ${y2}, ${m(pc(b))} of the residents ${topic}. ${ask}`;
      unit = "percentage points";
      difficulty = up ? 4 : 5;
    } else {
      p = F(rng.pick(up ? INC : DEC));
      if (form === "price") {
        a = F(rng.int(2, 160)).mul(rng.pick([1, 1, 1, 5]));
        need(a.lt(1000), "price");
        show = cash;
        unit = "dollars";
      } else {
        a = F(wholeFor(rng, p, 20, 3000));
        unit = rng.pick(COUNT_ITEMS).unit;
      }
      b = a.mul(H.add(up ? p : p.neg())).div(100);
      need(b.mul(100).isInt() && (form === "price" || b.isInt()), "clean new value");
      const item = rng.pick(PRICE_ITEMS);
      const count = COUNT_ITEMS.find((c) => c.unit === unit) ?? COUNT_ITEMS[0];
      const subject = form === "price" ? `The price of ${item}` : capital(count.what);
      const ask =
        format === "spr"
          ? `If the ${word} was ${m("p\\%")}, what is the value of ${m("p")}?`
          : `What was the percent ${word}?`;
      stem = `${subject} ${up ? "increased" : "decreased"} from ${m(show(a))} to ${m(show(b))}. ${ask}`;
      difficulty = (up ? 1 : 2) + (p.isInt() && p.n % 5 === 0 ? 0 : 1) + (p.gt(100) ? 1 : 0);
    }
    const change = up ? b.sub(a) : a.sub(b);
    if (format === "spr") need(fitsBox(p), "fits");
    const isCorrect = byValue((v) => a.mul(up ? H.add(v) : H.sub(v)).eq(b.mul(100)));
    const pts = form === "points";
    const slips = keep(
      pts
        ? sv(
            change,
            `you subtracted the percents: that is a change of ${n0(change)} percentage ${change.eq(1) ? "point" : "points"}, not a percent change`
          )
        : null,
      sv(
        tryQ(() => change.mul(100).div(b)),
        `you divided the change by the ${pts ? "later percent" : "new value"}, ${m(show(b))}, instead of the starting value, ${m(show(a))}`
      ),
      sv(
        b.mul(100).div(a),
        `you found the new value as a percent of the old one; the ${word} is the difference from ${m("100\\%")}`
      ),
      pts
        ? null
        : sv(
            change,
            `you used the change of ${m(show(change))}${form === "price" ? "" : ` ${unit}`} as the percent`
          ),
      sv(a.mul(100).div(b), `you divided the starting value by the new value`),
      sv(
        p.div(100),
        `you found ${m(dn(p.div(100)))} but did not multiply by ${m("100")} to make it a percent`
      )
    );
    return {
      format,
      stem,
      answer: ans(p, pc),
      slips: positive(slips).map((s) => ({ ...s, text: m(pc(s.value!.asRat()!)) })),
      asks: pts
        ? `the percent ${word} in the number of residents, which follows the percents because the population did not change`
        : `the percent ${word} from ${m(show(a))} to ${m(show(b))}, measured against the starting value`,
      steps: [
        {
          label: `Find the amount of ${word}`,
          work:
            m(`${up ? `${show(b)} - ${show(a)}` : `${show(a)} - ${show(b)}`} = ${show(change)}`) +
            (pts ? (change.eq(1) ? " percentage point" : " percentage points") : ""),
        },
        {
          label: "Compare it with the starting value",
          work: `Divide by the starting value, ${m(show(a))}: ${m(`\\frac{${show(change)}}{${show(a)}} = ${dn(p.div(100))}`)}`,
        },
        {
          label: "Write it as a percent",
          work: `${m(`${dn(p.div(100))} \\times 100 = ${dn(p)}`)}, so the ${word} is ${m(pc(p))}`,
        },
      ],
      check: `${up ? "an" : "a"} ${word} of ${m(pc(p))} multiplies by ${m(dn(H.add(up ? p : p.neg()).div(100)))}, and ${m(`${show(a)} \\times ${dn(H.add(up ? p : p.neg()).div(100))} = ${show(b)}`)}`,
      tip: "Percent change is the change divided by the starting value, times 100; percentage points are only the difference between two percents",
      hint: pts
        ? "Since the population did not change, compare the two percents as you would compare two counts."
        : `Find the change first, then compare it with the starting value.`,
      difficulty,
      isCorrect,
    };
  },
};

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const REV_ITEMS = [
  "a jacket",
  "a lamp",
  "a tablet",
  "a desk chair",
  "a tent",
  "a guitar",
  "a rug",
  "a blender",
];

export const reversePercent: Template = {
  id: "pct.reverse",
  skill: SKILL,
  label: "Find the original amount from a percent or a changed amount",
  difficulty: [2, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["of", 2],
      ["raised", 2],
      ["discount", 2],
      ["big", 1],
    ] as const);
    let p: Frac;
    let orig: Frac;
    let V: Frac;
    let factor: Frac; // V = orig * factor
    let stem: string;
    let show = (q: Frac) => dn(q);
    let difficulty: number;
    let isMoney = false;
    if (form === "of") {
      p = F(rng.pick([...P_INT, 2.5, 12.5, 37.5, 150, 120, 250]));
      orig = F(rng.int(8, 900)).mul(rng.pick([1, 1, 10]));
      factor = p.div(100);
      V = orig.mul(factor);
      need(V.decimalPlaces() <= 2 && orig.lt(10000), "clean");
      const letter = rng.pick(["w", "n", "k", "x"]);
      stem = `${m(pc(p))} of ${m(letter)} is ${m(dn(V))}. What is the value of ${m(letter)}?`;
      difficulty = V.isInt() ? 2 : 3;
    } else if (form === "big") {
      p = F(rng.pick([150, 200, 250, 300, 400, 500, 600, 700, 900]));
      orig = F(rng.int(6, 120));
      factor = H.add(p).div(100);
      V = orig.mul(factor);
      need(V.isInt(), "whole");
      stem = `The result of increasing the quantity ${m("x")} by ${m(pc(p))} is ${m(int(V.n))}. What is the value of ${m("x")}?`;
      difficulty = 4;
    } else {
      isMoney = true;
      show = (q: Frac) => money(q);
      const up = form === "raised";
      p = F(
        rng.pick(
          up
            ? [5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75]
            : [10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 75]
        )
      );
      factor = H.add(up ? p : p.neg()).div(100);
      orig = F(rng.int(8, 400)).mul(rng.pick([1, 1, 5]));
      V = orig.mul(factor);
      need(V.mul(100).isInt() && orig.lt(1000), "whole cents");
      const item = rng.pick(REV_ITEMS);
      stem = up
        ? `After the price of ${item} increased by ${m(pc(p))}, the new price was ${m(money(V))}. What was the price of the ${item.slice(2)} before the increase?`
        : `During a sale, the price of ${item} was reduced by ${m(pc(p))}. The sale price was ${m(money(V))}. What was the price of the ${item.slice(item.indexOf(" ") + 1)} before the sale?`;
      difficulty = 3 + (V.isInt() ? 0 : 1);
    }
    if (format === "spr") need(fitsBox(orig), "fits");
    const isCorrect = byValue((v) => v.mul(factor).eq(V));
    const up = form !== "discount";
    const slips =
      form === "of"
        ? keep(
            sv(
              V.mul(p).div(100),
              `you found ${m(pc(p))} of ${m(dn(V))} instead of the number whose ${m(pc(p))} is ${m(dn(V))}`,
              show
            ),
            sv(V.div(p), `you divided by ${n0(p)} instead of by ${m(dn(p.div(100)))}`, show),
            sv(V.mul(p), `you multiplied by ${n0(p)} instead of dividing`, show),
            sv(V.mul(H.add(p)).div(100), `you increased ${m(dn(V))} by ${m(pc(p))}`, show)
          )
        : form === "big"
          ? keep(
              sv(
                V.div(p.div(100)),
                `you divided by ${m(dn(p.div(100)))}; increasing by ${m(pc(p))} multiplies by ${m(dn(factor))}, not ${m(dn(p.div(100)))}`,
                show
              ),
              sv(
                V.mul(p).div(100),
                `you found ${m(pc(p))} of ${m(int(V.n))} instead of undoing the increase`,
                show
              ),
              sv(
                V.mul(factor),
                `you increased ${m(int(V.n))} by ${m(pc(p))} again instead of undoing it`,
                show
              ),
              sv(V.sub(p), `you subtracted ${n0(p)} from ${m(int(V.n))}`, show)
            )
          : keep(
              sv(
                up ? V.mul(H.sub(p)).div(100) : V.mul(H.add(p)).div(100),
                up
                  ? `you took ${m(pc(p))} off the new price, but the ${m(pc(p))} was a percent of the old price`
                  : `you added ${m(pc(p))} of the sale price back, but the ${m(pc(p))} was a percent of the original price`,
                show
              ),
              sv(
                up ? V.sub(p) : V.add(p),
                `you ${up ? "subtracted" : "added"} ${n0(p)} dollars instead of ${m(pc(p))}`,
                show
              ),
              sv(
                V.div(p.div(100)),
                `you treated ${m(money(V))} as ${m(pc(p))} of the original price`,
                show
              ),
              sv(
                V.mul(factor),
                up
                  ? "you raised the new price by the same percent again"
                  : "you took the discount off the sale price again",
                show
              )
            );
    const target = orig;
    return {
      format,
      stem,
      answer: ans(target, show),
      slips: positive(slips),
      asks: `the original amount, the number that becomes ${m(show(V))} after the percent is applied`,
      steps: [
        {
          label: "Write the change as a multiplier",
          work:
            form === "of"
              ? `${m(pc(p))} of a number means the number times ${m(dn(factor))}`
              : `${up ? "Increasing" : "Decreasing"} by ${m(pc(p))} multiplies the original by ${m(`${up ? "1 +" : "1 -"} ${dn(p.div(100))} = ${dn(factor)}`)}`,
        },
        {
          label: "Set up an equation",
          work: m(`${dn(factor)} \\times (\\text{original}) = ${isMoney ? money(V) : dn(V)}`),
        },
        {
          label: "Undo the multiplier",
          work: `Divide both sides by ${m(dn(factor))}: ${m(`\\frac{${isMoney ? money(V) : dn(V)}}{${dn(factor)}} = ${show(target)}`)}`,
        },
      ],
      check: `${m(`${dn(factor)} \\times ${isMoney ? money(target) : dn(target)} = ${isMoney ? money(V) : dn(V)}`)}, the amount given`,
      tip: "When the percent is of the unknown original, write the original times the multiplier equals the known amount, then divide by the multiplier",
      hint: "Call the original amount a letter and write an equation with a multiplier.",
      difficulty,
      isCorrect,
      key: decimalKey(target),
    };
  },
};

export const TEMPLATES: Template[] = [percentOf, percentChange, reversePercent, multistep];
