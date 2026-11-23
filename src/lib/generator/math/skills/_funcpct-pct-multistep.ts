/*
 * m-percentages, part two: multistep percents (a markup then a discount, both sides of a
 * rectangle changing, a chain of percent statements, two groups growing from equal starts).
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
} from "./_funcpct-common";

const SKILL = "m-percentages";
const H = F(100);
/** A percent number for prose: $12.5$. */
const n0 = (q: Frac) => m(dn(q));

const WHOLESALE_ITEMS = [
  "shirts",
  "mugs",
  "notebooks",
  "scarves",
  "candles",
  "phone cases",
  "water bottles",
  "hats",
];

export const multistep: Template = {
  id: "pct.multistep",
  skill: SKILL,
  label: "Successive percent changes and chains of percents",
  difficulty: [4, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["markup", 2],
      ["area", 2],
      ["chain", 2],
      ["growth", 2],
    ] as const);
    if (form === "chain") return chain(rng, format);
    if (form === "growth") return growth(rng, format);
    let target: Frac;
    let stem: string;
    let show = (q: Frac) => dn(q);
    let difficulty: number;
    let slips;
    let steps;
    let check: string;
    let asks: string;
    let hint: string;
    let isCorrect;
    if (form === "markup") {
      show = (q: Frac) => money(q);
      const W = F(rng.int(8, 60), 4);
      const rp = F(rng.pick([150, 175, 200, 220, 240, 250, 260, 270, 280, 300, 320, 350]));
      const dp = F(rng.pick([20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80]));
      const retail = W.mul(rp).div(100);
      target = retail.mul(H.sub(dp)).div(100);
      need(retail.mul(100).isInt() && target.mul(100).isInt() && W.mul(100).isInt(), "whole cents");
      const item = rng.pick(WHOLESALE_ITEMS);
      stem = `A store buys ${item} at a wholesale price of ${m(money(W))} each and sells them at a retail price that is ${m(pc(rp))} of the wholesale price. At the end of the season, the remaining ${item} are marked down to a price that is ${m(pc(dp))} off the retail price. What is the marked-down price of each of these ${item}, in dollars?`;
      difficulty = 5;
      asks =
        "the price after two changes: first the retail price, then the discount on the retail price";
      steps = [
        {
          label: "Find the retail price",
          work: m(`${dn(rp.div(100))} \\times ${money(W)} = ${money(retail)}`),
        },
        {
          label: "Take the discount off",
          work: `${m(pc(dp))} off leaves ${m(pc(H.sub(dp)))} of the retail price: ${m(`${dn(H.sub(dp).div(100))} \\times ${money(retail)} = ${money(target)}`)}`,
        },
      ];
      check = `the discount is ${m(`${dn(dp.div(100))} \\times ${money(retail)} = ${money(retail.mul(dp).div(100))}`)}, and ${m(`${money(retail)} - ${money(retail.mul(dp).div(100))} = ${money(target)}`)}`;
      hint = "Find the retail price before you take off the discount.";
      slips = keep(
        sv(
          W.mul(rp.sub(dp)).div(100),
          `you subtracted the percents, ${m(`${pc(rp)} - ${pc(dp)}`)}, instead of applying them one after the other`,
          show
        ),
        sv(
          retail.mul(dp).div(100),
          `you found the amount of the discount, not the marked-down price`,
          show
        ),
        sv(
          W.mul(H.sub(dp)).div(100),
          `you took the discount off the wholesale price instead of the retail price`,
          show
        ),
        sv(
          W.mul(H.add(rp)).mul(H.sub(dp)).div(10000),
          `you read ${m(pc(rp))} of the wholesale price as an increase of ${m(pc(rp))}`,
          show
        )
      );
      isCorrect = byValue((v) => retail.sub(retail.mul(dp).div(100)).eq(v));
    } else {
      const A = F(rng.int(6, 90)).mul(rng.pick([10, 25, 5]));
      const up = rng.bool(0.6);
      const p = F(rng.pick(up ? [10, 20, 25, 30, 40, 50, 5, 15] : [10, 20, 25, 30, 40, 50, 5]));
      const f = H.add(up ? p : p.neg()).div(100);
      target = A.mul(f).mul(f);
      need(target.decimalPlaces() <= 2, "clean");
      const shape = rng.pick(["poster", "photograph", "garden plot", "banner", "rug"]);
      const unit = shape === "garden plot" ? "feet" : shape === "rug" ? "feet" : "inches";
      stem = `A rectangular ${shape} has an area of ${m(int(A.n))} square ${unit}. A new ${shape} is made by ${up ? "increasing" : "decreasing"} both the length and the width of the original by ${m(pc(p))}. What is the area, in square ${unit}, of the new ${shape}?`;
      difficulty = up ? 4 : 5;
      asks = `the new area when each of two dimensions changes by ${m(pc(p))}`;
      steps = [
        {
          label: "Write each change as a multiplier",
          work: `The length and the width are each multiplied by ${m(dn(f))}`,
        },
        {
          label: "Multiply the area by both",
          work: `Area is length times width, so it is multiplied by ${m(`${dn(f)} \\times ${dn(f)} = ${dn(f.mul(f))}`)}: ${m(`${dn(f.mul(f))} \\times ${int(A.n)} = ${dn(target)}`)}`,
        },
      ];
      check = `${m(`\\frac{${dn(target)}}{${int(A.n)}} = ${dn(f.mul(f))}`)}, and ${m(`${dn(f)}^2 = ${dn(f.mul(f))}`)}, so the area changed by the square of the side multiplier`;
      hint = "Both the length and the width change, and area multiplies them.";
      slips = keep(
        sv(
          A.mul(f),
          `you changed the area by ${m(pc(p))} once, but both the length and the width change`
        ),
        sv(
          A.mul(H.add(up ? p.mul(2) : p.mul(-2))).div(100),
          `you ${up ? "added" : "subtracted"} ${m(pc(p.mul(2)))}; the two multipliers multiply, they do not add`
        ),
        sv(
          A.mul(p).div(100).mul(p).div(100),
          `you multiplied by ${m(dn(p.div(100)))} twice instead of by ${m(dn(f))}`
        ),
        sv(
          up ? A.add(p.mul(2)) : A.sub(p.mul(2)),
          `you ${up ? "added" : "subtracted"} ${n0(p.mul(2))} square ${unit}`
        )
      );
      isCorrect = byValue((v) => v.eq(A.mul(f).mul(f)));
    }
    if (format === "spr") need(fitsBox(target), "fits");
    return {
      format,
      stem,
      answer: ans(target, show),
      slips: positive(slips),
      asks,
      steps,
      check,
      tip: "Apply successive percent changes one at a time as multipliers; never add or subtract the percents",
      hint,
      difficulty,
      isCorrect,
      key: decimalKey(target),
    };
  },
};

/** h, j, k chain (with bottled/tap/mineral style wording) or A is x% of B and y% of C. */
function chain(rng: Parameters<Template["make"]>[0], format: "mc" | "spr"): Draft {
  const kind = rng.bool(0.6) ? "hjk" : "abc";
  if (kind === "hjk") {
    // a% of h = b% of j, and j = c% of k  =>  h = (b c / a)% of k
    const ratio = rng.pick([
      F(2),
      F(1, 2),
      F(3, 2),
      F(2, 3),
      F(3),
      F(1, 3),
      F(4, 3),
      F(3, 4),
      F(5, 4),
      F(4, 5),
      F(5, 2),
    ]);
    const a = F(rng.int(4, 48)).mul(ratio.d);
    const b = a.mul(ratio);
    const c = F(
      rng.pick([20, 24, 25, 30, 32, 36, 40, 45, 48, 50, 60, 64, 72, 75, 80, 90, 120, 150])
    );
    need(a.lt(100) && b.lt(100) && !a.eq(b), "percents under 100");
    const p = b.mul(c).div(a);
    need(p.decimalPlaces() <= 2 && fitsBox(p), "clean");
    const [h, j, k] = rng.pick([
      ["h", "j", "k"],
      ["a", "b", "c"],
      ["p", "q", "r"],
      ["u", "v", "w"],
    ]);
    const ask =
      format === "spr"
        ? `If ${m(h)} is ${m("x\\%")} of ${m(k)}, what is the value of ${m("x")}?`
        : `${m(h)} is what percent of ${m(k)}?`;
    const stem = `For the positive quantities ${m(h)}, ${m(j)}, and ${m(k)}, ${m(pc(a))} of ${m(h)} is equal to ${m(pc(b))} of ${m(j)}, and ${m(j)} is ${m(pc(c))} of ${m(k)}. ${ask}`;
    const slips = keep(
      sv(
        a.mul(c).div(b),
        `you turned the first relationship upside down and wrote ${m(`${h} = ${dn(a.div(b))}${j}`)}`
      ),
      sv(
        b.mul(c).div(100),
        `you multiplied ${m(pc(b))} by ${m(pc(c))} and left out the ${m(pc(a))}`
      ),
      sv(
        tryQ(() => H.mul(100).div(p)),
        `you found ${m(k)} as a percent of ${m(h)}, the reverse of what is asked`
      ),
      sv(c, `you used only ${m(`${j} = ${dn(c.div(100))}${k}`)} and skipped the first relationship`)
    );
    return {
      format,
      stem,
      answer: ans(p, (q) => (format === "spr" ? dn(q) : pc(q))),
      slips: positive(slips).map((s) => ({
        ...s,
        text: m(format === "spr" ? dn(s.value!.asRat()!) : pc(s.value!.asRat()!)),
      })),
      asks: `${m(h)} as a percent of ${m(k)}, found by linking both relationships through ${m(j)}`,
      steps: [
        {
          label: `Write ${m(h)} in terms of ${m(j)}`,
          work: `${m(`${dn(a.div(100))}${h} = ${dn(b.div(100))}${j}`)}, so ${m(`${h} = ${dn(ratio)}${j}`)} after dividing by ${m(dn(a.div(100)))}`,
        },
        {
          label: `Replace ${m(j)} with ${m(k)}`,
          work: `${m(`${j} = ${dn(c.div(100))}${k}`)}, so ${m(`${h} = ${dn(ratio)}(${dn(c.div(100))}${k}) = ${dn(p.div(100))}${k}`)}`,
        },
        {
          label: "Write it as a percent",
          work: `${m(`${dn(p.div(100))} \\times 100 = ${dn(p)}`)}, so ${m(h)} is ${m(pc(p))} of ${m(k)}`,
        },
      ],
      check: `try ${m(`${k} = 100`)}: then ${m(`${j} = ${dn(c)}`)} and ${m(`${h} = ${dn(p)}`)}; ${m(`${dn(a.div(100))} \\times ${dn(p)} = ${dn(a.mul(p).div(100))}`)} and ${m(`${dn(b.div(100))} \\times ${dn(c)} = ${dn(b.mul(c).div(100))}`)}, which match`,
      tip: "Turn every percent statement into an equation with decimals, then substitute to connect the quantities you need",
      hint: `Write ${m(h)} in terms of ${m(j)} first.`,
      difficulty: format === "spr" ? 5 : 4,
      isCorrect: byValue((v) => {
        // with k = 100: j = c, h = b c / a; check a% of h = b% of j
        const hv = v;
        return a.mul(hv).eq(b.mul(c));
      }),
    };
  }
  // A is x% of B and y% of C: C is (100 x / y)% of B.
  const x = F(rng.pick([120, 150, 160, 180, 200, 240, 250, 300, 320, 400, 450, 480, 500]));
  const y = F(rng.pick([0.2, 0.4, 0.5, 0.8, 1.2, 1.5, 2, 2.4, 2.5, 3, 4, 5, 6, 8]));
  const pVal = x.mul(100).div(y);
  need(pVal.isInt(), "whole");
  const scale = pVal.gt(99999) ? F(1000) : F(1);
  const target = pVal.div(scale);
  need(target.isInt() && fitsBox(target), "fits");
  const [A, B, C] = rng.pick([
    ["A", "B", "C"],
    ["X", "Y", "Z"],
    ["P", "Q", "R"],
  ]);
  const obj = rng.pick(["mass", "volume", "length"]);
  const asked = scale.eq(1) ? m("p") : m("\\frac{p}{1{,}000}");
  const stem = `The ${obj} of object ${A} is ${m(pc(x))} of the ${obj} of object ${B}, and the ${obj} of object ${A} is ${m(pc(y))} of the ${obj} of object ${C}. If the ${obj} of object ${C} is ${m("p\\%")} of the ${obj} of object ${B}, what is the value of ${asked}?`;
  const slips = keep(
    sv(
      y.mul(100).div(x).div(scale),
      `you found ${B} as a percent of ${C}, the reverse of what is asked`
    ),
    sv(x.mul(y).div(100).div(scale), `you multiplied the two percents instead of dividing them`),
    sv(
      x.div(y).div(scale),
      `you found ${m(`\\frac{${C}}{${B}}`)} but did not multiply by ${m("100")}`
    ),
    sv(x.sub(y).div(scale), `you subtracted the percents`)
  );
  return {
    format,
    stem,
    answer: ans(target),
    slips: positive(slips),
    asks: `${asked}, where ${m("p")} is object ${C}'s ${obj} as a percent of object ${B}'s`,
    steps: [
      {
        label: `Write ${A} two ways`,
        work: m(`${A} = ${dn(x.div(100))}${B} \\text{ and } ${A} = ${dn(y.div(100))}${C}`),
      },
      {
        label: `Compare ${C} with ${B}`,
        work: `${m(`${dn(y.div(100))}${C} = ${dn(x.div(100))}${B}`)}, so ${m(`${C} = \\frac{${dn(x.div(100))}}{${dn(y.div(100))}}${B} = ${dn(x.div(y))}${B}`)}`,
      },
      {
        label: "Write it as a percent",
        work: `${m(`p = ${dn(x.div(y))} \\times 100 = ${int(pVal.n)}`)}${scale.eq(1) ? "" : `, so ${m(`\\frac{p}{1{,}000} = ${int(target.n)}`)}`}`,
      },
    ],
    check: `with ${m(`${B} = 100`)}, ${m(`${A} = ${dn(x)}`)} and ${m(`${C} = ${int(pVal.n)}`)}; ${m(pc(y))} of ${m(int(pVal.n))} is ${m(dn(pVal.mul(y).div(100)))}, which is ${m(A)}`,
    tip: "When one quantity is given as a percent of two others, write two equations for it and set them equal",
    hint: `Write two equations for ${m(A)}, one with ${m(B)} and one with ${m(C)}.`,
    difficulty: rng.pick([6, 7]),
    isCorrect: byValue((v) => v.mul(scale).mul(y).eq(x.mul(100))),
  };
}

/** Two groups that start equal and grow by different percents. */
function growth(rng: Parameters<Template["make"]>[0], format: "mc" | "spr"): Draft {
  const pA = F(rng.pick([300, 400, 500, 700, 900, 1100, 1300, 1400, 1500, 1900, 2300]));
  const pB = F(rng.pick([25, 50, 60, 100, 150, 200, 250, 300, 400]));
  need(pA.gt(pB), "A grows more");
  const fA = H.add(pA).div(100);
  const fB = H.add(pB).div(100);
  const less = rng.bool(0.5);
  const pair = rng.pick([
    ["prey", "predators", "a species of mite and its predator", "number"],
    ["algae", "snails", "a type of algae and a type of snail in a tank", "number"],
    ["chemical X", "chemical Y", "two chemicals in a mixture", "mass"],
    ["sunflowers", "daisies", "two kinds of flowers in a field", "number"],
  ] as const);
  const [gA, gB, both, measure] = pair;
  const target = less ? fA.sub(fB).mul(100).div(fA) : fA.div(fB);
  need(target.decimalPlaces() <= 2 && fitsBox(target), "clean");
  const ask = less
    ? `At the end, the ${measure} of ${gB} was ${m("p\\%")} less than the ${measure} of ${gA}. What is the value of ${m("p")}?`
    : `At the end, the ${measure} of ${gA} was how many times the ${measure} of ${gB}?`;
  const stem = `A researcher studied ${both}. At the start, the ${measure} of ${gA} was equal to the ${measure} of ${gB}. By the end of the study, the ${measure} of ${gA} had increased by ${m(pc(pA))}, and the ${measure} of ${gB} had increased by ${m(pc(pB))}. ${ask}`;
  const slips = less
    ? keep(
        sv(
          fA.sub(fB).mul(100).div(fB),
          `you divided the difference by the ${measure} of ${gB}; "less than" the ${gA} means the ${gA} are the base`
        ),
        sv(fB.mul(100).div(fA), `you found the ${gB} as a percent of the ${gA}, not how much less`),
        sv(pA.sub(pB), `you subtracted the percent increases`),
        sv(
          pA.sub(pB).mul(100).div(pA),
          `you compared the percent increases instead of the final amounts`
        )
      )
    : keep(
        sv(pA.div(pB), `you divided the percent increases instead of the final amounts`),
        sv(fA.sub(fB), `you subtracted the multipliers instead of dividing`),
        sv(
          tryQ(() => fB.div(fA)),
          `you divided the ${gB} by the ${gA}`
        ),
        sv(pA.sub(pB).div(100), `you subtracted the percents and divided by ${m("100")}`)
      );
  return {
    format,
    stem,
    answer: ans(target),
    slips: positive(slips),
    asks: less
      ? `how much less the ${gB} ended up than the ${gA}, as a percent of the ${gA}`
      : `the ratio of the final ${measure}s, not the ratio of the percents`,
    steps: [
      {
        label: "Write each group as a multiple",
        work: `Call the starting ${measure} ${m("s")}. An increase of ${m(pc(pA))} gives ${m(`${dn(fA)}s`)} ${gA}, and an increase of ${m(pc(pB))} gives ${m(`${dn(fB)}s`)} ${gB}`,
      },
      less
        ? {
            label: `Compare with the ${gA}`,
            work: `${m(`\\frac{${dn(fA)}s - ${dn(fB)}s}{${dn(fA)}s} = \\frac{${dn(fA.sub(fB))}}{${dn(fA)}} = ${dn(target.div(100))}`)}, which is ${m(pc(target))}`,
          }
        : {
            label: "Divide the two amounts",
            work: m(`\\frac{${dn(fA)}s}{${dn(fB)}s} = ${dn(target)}`),
          },
    ],
    check: less
      ? `with ${m("s = 100")}, there are ${m(dn(fA.mul(100)))} ${gA} and ${m(dn(fB.mul(100)))} ${gB}; ${m(pc(target))} of ${m(dn(fA.mul(100)))} is ${m(dn(fA.mul(target)))}, the gap`
      : `with ${m("s = 100")}, the amounts are ${m(dn(fA.mul(100)))} and ${m(dn(fB.mul(100)))}, and ${m(`${dn(fB.mul(100))} \\times ${dn(target)} = ${dn(fA.mul(100))}`)}`,
    tip: `An increase of ${m("p\\%")} multiplies by ${m("1 + \\frac{p}{100}")}; compare final amounts, never the percents themselves`,
    hint: "Call the starting amount a letter and write each final amount as a multiple of it.",
    difficulty: less ? 7 : 6,
    isCorrect: byValue((v) =>
      less ? F(100).mul(100).sub(v.mul(100)).mul(fA).eq(fB.mul(10000)) : v.mul(fB).eq(fA)
    ),
  };
}
