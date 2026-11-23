/*
 * m-exponential-functions, part three: writing the model a situation describes (start, factor
 * per period, periods in the units of the variable), checked at EXPR_POINTS against the words.
 */
import { F, Frac } from "../core/frac";
import { int, m } from "../core/tex";
import type { Draft, Template } from "../core/types";
import { byExpr, dn, exprAns, exprSlip, keep, pc, pickW, type Vars } from "./_funcpct-common";
import { fac } from "./_funcpct-exp-shared";

const SKILL = "m-exponential-functions";

const BUILD = [
  { what: "the number of bacteria in a culture", unit: "hour", units: "hours", y: "N", dir: "up" },
  {
    what: "the pressure, in pounds per square inch, inside a tank",
    unit: "minute",
    units: "minutes",
    y: "P",
    dir: "both",
  },
  { what: "the number of views of an online video", unit: "day", units: "days", y: "V", dir: "up" },
  {
    what: "the value, in dollars, of a piece of equipment",
    unit: "year",
    units: "years",
    y: "V",
    dir: "down",
  },
  {
    what: "the mass, in grams, of a sample of an isotope",
    unit: "day",
    units: "days",
    y: "M",
    dir: "down",
  },
  {
    what: "the number of visitors at a theme park",
    unit: "hour",
    units: "hours",
    y: "V",
    dir: "up",
  },
  { what: "the population of a town", unit: "year", units: "years", y: "P", dir: "up" },
  {
    what: "the amount, in milligrams, of a medicine in a patient's blood",
    unit: "hour",
    units: "hours",
    y: "A",
    dir: "down",
  },
  {
    what: "the number of members of a hiking club",
    unit: "year",
    units: "years",
    y: "N",
    dir: "both",
  },
];

export const buildModel: Template = {
  id: "exp.build-model",
  skill: SKILL,
  label: "Write the exponential model a situation describes",
  difficulty: [1, 7],
  formats: ["mc"],
  make(rng, format): Draft {
    const ctx = rng.pick(BUILD);
    const kind = pickW(rng, [
      ["double", ctx.dir === "down" ? 0 : 2],
      ["triple", ctx.dir === "down" ? 0 : 1],
      ["half", ctx.dir === "up" ? 0 : 2],
      ["up", ctx.dir === "down" ? 0 : 3],
      ["down", ctx.dir === "up" ? 0 : 3],
      ["more", ctx.dir === "down" ? 0 : 2],
    ] as const);
    const p = F(
      kind === "more"
        ? rng.pick([110, 120, 125, 150, 160, 175, 200, 250, 130])
        : rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40])
    );
    const B =
      kind === "double"
        ? F(2)
        : kind === "triple"
          ? F(3)
          : kind === "half"
            ? F(1, 2)
            : kind === "down"
              ? F(1).sub(p.div(100))
              : F(1).add(p.div(100));
    const mismatch = rng.bool(0.3);
    // The period: k units of t (k may be a fraction of a unit when the period is given in a smaller unit).
    let periodText: string;
    let perT: Frac; // number of periods in one unit of t
    let tUnit = ctx.units;
    if (mismatch) {
      const [small, big, f, choices] =
        ctx.unit === "year" || ctx.unit === "day"
          ? ctx.unit === "year"
            ? (["months", "years", 12, [2, 3, 4, 6]] as const)
            : (["hours", "days", 24, [2, 3, 4, 6, 8, 12]] as const)
          : (["minutes", "hours", 60, [10, 15, 20, 30]] as const);
      const k = rng.pick(choices);
      periodText = `${k} ${small}`;
      perT = F(f, k);
      tUnit = big;
    } else {
      const k = rng.pick([1, 1, 2, 3, 4, 5, 6, 8, 10, 12, 24]);
      periodText = k === 1 ? ctx.unit : `${k} ${ctx.units}`;
      perT = F(1, k);
    }
    const a = F(rng.int(12, 900)).mul(rng.pick([1, 10, 100]));
    const v = rng.pick(["t", "x"]);
    const expTex = (r: Frac) =>
      r.eq(1)
        ? v
        : r.isInt()
          ? `${r.n}${v}`
          : r.n === 1
            ? `\\frac{${v}}{${r.d}}`
            : `\\frac{${r.n}${v}}{${r.d}}`;
    const eq = (base: Frac, r: Frac, start: Frac = a) =>
      m(`${ctx.y} = ${int(start.n)}(${fac(base)})^{${expTex(r)}}`);
    const fn =
      (base: Frac, r: Frac, start: Frac = a) =>
      (vars: Vars) =>
        start.toNumber() * Math.pow(base.toNumber(), r.toNumber() * vars[v]);
    // Truth from the words: after T units of t, the factor has applied T * perT times.
    const truth = (vars: Vars) => a.toNumber() * Math.pow(B.toNumber(), vars[v] * perT.toNumber());
    const every = `every ${periodText}`;
    const change =
      kind === "double"
        ? `doubled ${every}`
        : kind === "triple"
          ? `tripled ${every}`
          : kind === "half"
            ? `fell to half of its value ${every}`
            : kind === "down"
              ? `decreased by ${m(pc(p))} ${every}`
              : kind === "up"
                ? `increased by ${m(pc(p))} ${every}`
                : `was ${m(pc(p))} more at the end of ${every.replace("every", "each")} than at the end of the period before`;
    const stem = `At the start of a study, ${ctx.what} was ${m(int(a.n))}. After that, ${ctx.what.replace(/, in [^,]+,/, "")} ${change}. Which equation represents this situation, where ${m(ctx.y)} is ${ctx.what} ${m(v)} ${tUnit} after the start of the study?`;
    const inv = perT.inv();
    const slips = keep(
      !perT.eq(1)
        ? exprSlip(
            eq(B, inv),
            fn(B, inv),
            mismatch
              ? `you divided ${m(v)} by ${m(`${inv.d}`)}, but one ${tUnit.replace(/s$/, "")} holds ${m(`${perT.n}`)} periods, so multiply`
              : `you multiplied the time by ${m(`${inv.n}`)} instead of dividing by it`
          )
        : null,
      kind === "up" || kind === "down" || kind === "more"
        ? exprSlip(
            eq(p.div(100), perT),
            fn(p.div(100), perT),
            kind === "down"
              ? `you used the part lost, ${m(dn(p.div(100)))}, as the factor; the part that remains is ${m(fac(B))}`
              : `you used ${m(dn(p.div(100)))} as the factor; a gain of ${m(pc(p))} multiplies by ${m(fac(B))}`
          )
        : null,
      kind === "up" || kind === "down"
        ? exprSlip(
            eq(kind === "up" ? F(1).sub(p.div(100)) : F(1).add(p.div(100)), perT),
            fn(kind === "up" ? F(1).sub(p.div(100)) : F(1).add(p.div(100)), perT),
            `you treated the ${kind === "up" ? "increase" : "decrease"} as ${kind === "up" ? "a decrease" : "an increase"}`
          )
        : null,
      mismatch
        ? exprSlip(
            eq(B, F(1, Number(periodText.split(" ")[0]))),
            fn(B, F(1, Number(periodText.split(" ")[0]))),
            `you divided by ${m(periodText.split(" ")[0])}, but ${m(v)} is in ${tUnit}, not ${periodText.split(" ")[1]}`
          )
        : null,
      kind === "double" || kind === "triple" || kind === "half"
        ? exprSlip(
            m(`${ctx.y} = ${fac(B)}(${int(a.n)})^{${expTex(perT)}}`),
            (vars) => B.toNumber() * Math.pow(a.toNumber(), perT.toNumber() * vars[v]),
            "you swapped the starting amount and the factor"
          )
        : null,
      kind === "half"
        ? exprSlip(
            eq(F(2), perT),
            fn(F(2), perT),
            "you used a factor of 2, which doubles the amount instead of halving it"
          )
        : null,
      linear(a, B, perT, ctx.y, v),
      perT.eq(1)
        ? exprSlip(
            eq(B, F(2)),
            fn(B, F(2)),
            `you used an exponent of ${m(`2${v}`)}, which applies the factor twice each ${tUnit.replace(/s$/, "")}`
          )
        : null
    );
    const level =
      kind === "more"
        ? 5
        : kind === "double" || kind === "triple" || kind === "half"
          ? perT.eq(1)
            ? 1
            : 2
          : perT.eq(1)
            ? 2
            : 3;
    return {
      format,
      stem,
      answer: exprAns(eq(B, perT), truth),
      slips,
      asks: `the equation with the right starting amount, factor per period and number of periods`,
      steps: [
        {
          label: "Find the starting amount",
          work: `At ${m(`${v} = 0`)} the amount is ${m(int(a.n))}, the number in front`,
        },
        {
          label: "Find the factor per period",
          work:
            kind === "up" || kind === "more"
              ? `Gaining ${m(pc(p))} multiplies by ${m(`1 + ${dn(p.div(100))} = ${fac(B)}`)}`
              : kind === "down"
                ? `Losing ${m(pc(p))} leaves ${m(`1 - ${dn(p.div(100))} = ${fac(B)}`)} of the amount`
                : `${kind === "half" ? "Halving" : kind === "double" ? "Doubling" : "Tripling"} multiplies by ${m(fac(B))}`,
        },
        {
          label: "Count the periods",
          work: perT.eq(1)
            ? `One period is one ${tUnit.replace(/s$/, "")}, so after ${m(v)} ${tUnit} the factor applies ${m(v)} times`
            : `One period is ${periodText}, so in ${m(v)} ${tUnit} there are ${m(expTex(perT))} periods`,
        },
      ],
      check: `after one period the equation gives ${m(`${int(a.n)} \\times ${fac(B)} = ${dn(a.mul(B))}`)}, as the words describe`,
      tip: "Build ab^(number of periods): a is the start, b is the factor for one period, and the exponent counts periods in the units of the variable",
      hint: "What is the amount multiplied by in one period, and how many periods fit in the time?",
      difficulty: Math.min(7, level + (mismatch ? 3 : 0)),
      isCorrect: byExpr(truth),
    };
  },
};

/** The linear slip: the first period's change added again each period. */
function linear(a: Frac, B: Frac, perT: Frac, y: string, v: string) {
  const c = a.mul(B.sub(1)).mul(perT);
  if (!c.terminates() || c.decimalPlaces() > 3) return null;
  const sign = c.n < 0 ? "-" : "+";
  const coef = c.abs().eq(1) ? "" : dn(c.abs());
  return exprSlip(
    m(`${y} = ${int(a.n)} ${sign} ${coef}${v}`),
    (vars: Vars) => a.toNumber() + c.toNumber() * vars[v],
    "you added the same amount each period, which makes a linear model; a percent or factor change multiplies"
  );
}
