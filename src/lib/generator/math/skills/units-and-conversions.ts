/*
 * m-units-and-conversions: Units and conversions (Problem-Solving and Data Analysis).
 * One-factor conversions of amounts and rates, square and cubic units (and a squared time
 * unit), distance, time and density with a unit change, and rates written with letters.
 * Item models after the bank's own question types; every check converts back the other way.
 */
import { need } from "../core/build";
import { F, Frac } from "../core/frac";
import { int, m } from "../core/tex";
import type { Draft, Template } from "../core/types";
import {
  ans,
  byValue,
  decimalKey,
  dn,
  fitsBox,
  keep,
  pickW,
  positive,
  sv,
} from "./_funcpct-common";

import { rateTime, letterRates } from "./_funcpct-units-rates";
const SKILL = "m-units-and-conversions";

interface Rel {
  big: string;
  bigs: string;
  small: string;
  smalls: string;
  f: number;
  kind: "length" | "mass" | "time" | "volume";
}

const RELS: Rel[] = [
  { big: "meter", bigs: "meters", small: "decimeter", smalls: "decimeters", f: 10, kind: "length" },
  {
    big: "meter",
    bigs: "meters",
    small: "centimeter",
    smalls: "centimeters",
    f: 100,
    kind: "length",
  },
  {
    big: "centimeter",
    bigs: "centimeters",
    small: "millimeter",
    smalls: "millimeters",
    f: 10,
    kind: "length",
  },
  {
    big: "kilometer",
    bigs: "kilometers",
    small: "meter",
    smalls: "meters",
    f: 1000,
    kind: "length",
  },
  { big: "yard", bigs: "yards", small: "foot", smalls: "feet", f: 3, kind: "length" },
  { big: "foot", bigs: "feet", small: "inch", smalls: "inches", f: 12, kind: "length" },
  { big: "mile", bigs: "miles", small: "yard", smalls: "yards", f: 1760, kind: "length" },
  { big: "mile", bigs: "miles", small: "foot", smalls: "feet", f: 5280, kind: "length" },
  { big: "fathom", bigs: "fathoms", small: "foot", smalls: "feet", f: 6, kind: "length" },
  { big: "furlong", bigs: "furlongs", small: "yard", smalls: "yards", f: 220, kind: "length" },
  { big: "kilogram", bigs: "kilograms", small: "gram", smalls: "grams", f: 1000, kind: "mass" },
  { big: "pound", bigs: "pounds", small: "ounce", smalls: "ounces", f: 16, kind: "mass" },
  { big: "ton", bigs: "tons", small: "pound", smalls: "pounds", f: 2000, kind: "mass" },
  { big: "stone", bigs: "stones", small: "pound", smalls: "pounds", f: 14, kind: "mass" },
  { big: "hour", bigs: "hours", small: "minute", smalls: "minutes", f: 60, kind: "time" },
  { big: "minute", bigs: "minutes", small: "second", smalls: "seconds", f: 60, kind: "time" },
  { big: "day", bigs: "days", small: "hour", smalls: "hours", f: 24, kind: "time" },
  {
    big: "liter",
    bigs: "liters",
    small: "milliliter",
    smalls: "milliliters",
    f: 1000,
    kind: "volume",
  },
  { big: "gallon", bigs: "gallons", small: "quart", smalls: "quarts", f: 4, kind: "volume" },
  { big: "quart", bigs: "quarts", small: "pint", smalls: "pints", f: 2, kind: "volume" },
];

const AMOUNT: Record<Rel["kind"], ((g: string, from: string, to: string) => string)[]> = {
  length: [
    (g, from, to) =>
      `A hiking trail is ${g} ${from} long. What is the length of the trail, in ${to}?`,
    (g, from, to) => `A length of ${g} ${from} is equal to how many ${to}?`,
    (g, from, to) =>
      `A ribbon is cut to a length of ${g} ${from}. How long is the ribbon, in ${to}?`,
    (g, from, to) =>
      `An athlete swam a distance of ${g} ${from}. How far did the athlete swim, in ${to}?`,
  ],
  mass: [
    (g, from, to) =>
      `A crate of apples has a mass of ${g} ${from}. What is the mass of the crate, in ${to}?`,
    (g, from, to) =>
      `A sculpture weighs ${g} ${from}. How much does the sculpture weigh, in ${to}?`,
    (g, from, to) =>
      `A delivery of sand weighs ${g} ${from}. What is the weight of the sand, in ${to}?`,
  ],
  time: [
    (g, from, to) =>
      `A science experiment ran for ${g} ${from}. How long did the experiment run, in ${to}?`,
    (g, from, to) => `A bus trip takes ${g} ${from}. How long is the trip, in ${to}?`,
  ],
  volume: [
    (g, from, to) =>
      `A fish tank holds ${g} ${from} of water. How much water does the tank hold, in ${to}?`,
    (g, from, to) => `A recipe makes ${g} ${from} of soup. How much soup does it make, in ${to}?`,
  ],
};

const RATE_SUBJECT = [
  "An object moves at a speed of",
  "A drone flies at a constant speed of",
  "A river current flows at",
  "A toy car rolls at",
];
const PER_SUBJECT = [
  { what: "A pump moves water at a rate of", amount: "liters" },
  { what: "A printer uses paper at a rate of", amount: "sheets" },
  { what: "A faucet drips at a rate of", amount: "milliliters" },
  { what: "A factory line packs boxes at a rate of", amount: "boxes" },
];

export const convert: Template = {
  id: "units.convert",
  skill: SKILL,
  label: "Convert an amount or a rate with one given factor",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["amount", 4],
      ["speed", 2],
      ["per", 2],
    ] as const);
    let rel = rng.pick(RELS);
    if (form === "speed") rel = rng.pick(RELS.filter((r) => r.kind === "length"));
    if (form === "per") rel = rng.pick(RELS.filter((r) => r.kind === "time"));
    const toSmall = rng.bool(0.5);
    const f = F(rel.f);
    // amount: value in "from" units g, answer in "to" units.
    let target: Frac;
    let given: Frac;
    const multiplies = form === "per" ? !toSmall : toSmall; // per hour -> per minute divides
    if (multiplies) {
      given = F(rng.int(2, 120))
        .mul(rng.pick([1, 1, 5, 10]))
        .div(rng.pick([1, 1, 1, 4, 10]));
      target = given.mul(f);
    } else {
      target = F(rng.int(2, 99)).div(rng.pick([1, 1, 2, 4, 5, 10]));
      given = target.mul(f);
    }
    need(
      given.decimalPlaces() <= 2 && target.decimalPlaces() <= 3 && target.lt(10_000_000),
      "clean"
    );
    if (format === "spr") need(fitsBox(target), "fits");
    const [fromU, toU] = toSmall ? [rel.bigs, rel.smalls] : [rel.smalls, rel.bigs];
    const g = m(dn(given));
    const relation = `(${m(`1`)} ${rel.big} ${m("=")} ${m(int(rel.f))} ${rel.smalls})`;
    let stem: string;
    if (form === "amount") {
      stem = `${rng.pick(AMOUNT[rel.kind])(g, fromU, toU)} ${relation}`;
    } else if (form === "speed") {
      const per = rng.pick(["second", "minute", "hour"]);
      stem = `${rng.pick(RATE_SUBJECT)} ${g} ${fromU} per ${per}. What is this speed, in ${toU} per ${per}? ${relation}`;
    } else {
      const s = rng.pick(PER_SUBJECT);
      const [fromT, toT] = toSmall ? [rel.big, rel.small] : [rel.small, rel.big];
      stem = `${s.what} ${g} ${s.amount} per ${fromT}. What is this rate, in ${s.amount} per ${toT}? ${relation}`;
    }
    const isCorrect = byValue((v) => (multiplies ? v.div(f).eq(given) : v.mul(f).eq(given)));
    const slips = keep(
      sv(
        multiplies ? given.div(f) : given.mul(f),
        form === "per"
          ? `you converted the time unit the wrong way: a rate per ${toSmall ? "smaller" : "larger"} unit of time is ${multiplies ? "larger" : "smaller"}, not ${multiplies ? "smaller" : "larger"}`
          : `you ${multiplies ? "divided" : "multiplied"} by ${m(int(rel.f))} instead of ${multiplies ? "multiplying" : "dividing"}`
      ),
      sv(
        given.add(f),
        `you added ${m(int(rel.f))} instead of ${multiplies ? "multiplying" : "dividing"}`
      ),
      sv(given.sub(f), `you subtracted ${m(int(rel.f))} instead of dividing`),
      rel.f % 10 === 0
        ? sv(
            multiplies ? target.div(10) : target.mul(10),
            "you moved the decimal point one place too few"
          )
        : null,
      sv(multiplies ? target.mul(2) : target.div(2), `you used the factor twice`)
    );
    let difficulty = multiplies ? 1 : 2;
    if (!target.isInt() || rel.f >= 1000) difficulty++;
    if (form === "per") difficulty++;
    const bigger = toSmall ? "smaller" : "larger";
    return {
      format,
      stem,
      answer: ans(target),
      slips: positive(slips),
      asks:
        form === "per"
          ? `the same rate counted per ${toSmall ? rel.small : rel.big} instead of per ${toSmall ? rel.big : rel.small}`
          : `the same ${form === "speed" ? "speed" : "amount"} measured in ${toU}`,
      steps: [
        {
          label: "Decide multiply or divide",
          work:
            form === "per"
              ? `Since a ${toSmall ? rel.small : rel.big} is ${toSmall ? "shorter" : "longer"} than a ${toSmall ? rel.big : rel.small}, ${toSmall ? "less" : "more"} gets done in it: ${multiplies ? "multiply" : "divide"} by ${m(int(rel.f))}`
              : `${capital(toU)} are ${bigger} units than ${fromU}, so the number gets ${toSmall ? "larger" : "smaller"}: ${multiplies ? "multiply" : "divide"} by ${m(int(rel.f))}`,
        },
        {
          label: "Convert",
          work: m(
            multiplies
              ? `${dn(given)} \\times ${int(rel.f)} = ${dn(target)}`
              : `\\frac{${dn(given)}}{${int(rel.f)}} = ${dn(target)}`
          ),
        },
      ],
      check: `converting back, ${m(multiplies ? `\\frac{${dn(target)}}{${int(rel.f)}} = ${dn(given)}` : `${dn(target)} \\times ${int(rel.f)} = ${dn(given)}`)}, the amount given`,
      tip: "Write the factor as a fraction that cancels the unit you have, such as 1 mile over 1,760 yards, and the right operation follows",
      hint: `Is a ${toSmall ? rel.small : rel.big} bigger or smaller than a ${toSmall ? rel.big : rel.small}?`,
      difficulty: Math.min(4, difficulty),
      isCorrect,
      key: decimalKey(target),
    };
  },
};

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

interface Sq {
  big: string;
  bigs: string;
  smalls: string;
  f: number;
}
const SQ: Sq[] = [
  { big: "foot", bigs: "feet", smalls: "inches", f: 12 },
  { big: "yard", bigs: "yards", smalls: "feet", f: 3 },
  { big: "meter", bigs: "meters", smalls: "centimeters", f: 100 },
  { big: "centimeter", bigs: "centimeters", smalls: "millimeters", f: 10 },
  { big: "mile", bigs: "miles", smalls: "yards", f: 1760 },
];

export const squareCubic: Template = {
  id: "units.square-cubic",
  skill: SKILL,
  label: "Square and cubic units, and a squared time unit",
  difficulty: [3, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["area", 3],
      ["volume", 2],
      ["perArea", 1],
      ["accel", 1],
      ["areaRate", 1],
    ] as const);
    if (form === "accel" || form === "areaRate") return rates(rng, format, form);
    const u =
      form === "volume" ? rng.pick(SQ.filter((s) => s.f <= 100 && s.f !== 100)) : rng.pick(SQ);
    const p = form === "volume" ? 3 : 2;
    const word = p === 2 ? "square" : "cubic";
    const F2 = F(u.f).pow(p);
    const toSmall = form === "perArea" ? false : rng.bool(0.5);
    let given: Frac;
    let target: Frac;
    if (form === "perArea") {
      // grams per square big -> grams per square small: divide by f^2
      target = F(rng.int(1, 999), 1000);
      given = target.mul(F2);
      need(given.lt(1000) && given.decimalPlaces() <= 3, "readable");
    } else if (toSmall) {
      given = F(rng.int(2, 60)).div(rng.pick([1, 2, 4, 10]));
      target = given.mul(F2);
    } else {
      target = F(rng.int(2, 90)).div(rng.pick([1, 1, 2, 4, 10]));
      given = target.mul(F2);
    }
    need(target.decimalPlaces() <= 5 && given.decimalPlaces() <= 3, "clean");
    if (format === "spr") need(fitsBox(target), "fits");
    const relation = `(${m("1")} ${u.big} ${m("=")} ${m(int(u.f))} ${u.smalls})`;
    const [fromU, toU] = toSmall ? [u.bigs, u.smalls] : [u.smalls, u.bigs];
    const g = m(dn(given));
    let stem: string;
    if (form === "perArea") {
      const subject = rng.pick([
        "The density of a coat of paint on a wall",
        "The mass of a thin sheet of gold leaf",
        "The amount of seed spread on a test field",
      ]);
      stem = `${subject} is ${g} grams per square ${u.big}. What is this amount in grams per square ${u.smalls.replace(/s$/, "").replace(/ee/, "oo").replace("inche", "inch")}? ${relation}`;
    } else if (form === "area") {
      const thing = rng.pick([
        "A figure",
        "A floor",
        "A garden plot",
        "A sheet of plywood",
        "A town park",
      ]);
      stem = `${thing} has an area of ${g} square ${fromU}. What is the area, in square ${toU}, of the ${thing.replace(/^A /, "").toLowerCase()}? ${relation}`;
    } else {
      const thing = rng.pick(["A storage bin", "A sandbox", "A fish tank", "A shipping box"]);
      stem = `${thing} has a volume of ${g} cubic ${fromU}. What is its volume, in cubic ${toU}? ${relation}`;
    }
    const mult = toSmall;
    const isCorrect = byValue((v) => (mult ? v.div(F2).eq(given) : v.mul(F2).eq(given)));
    const lin = F(u.f);
    const slips = keep(
      sv(
        mult ? given.mul(lin) : given.div(lin),
        `you used the length factor ${m(int(u.f))} once; a ${word} ${u.big} is ${m(`${int(u.f)}${p === 2 ? " \\times " : " \\times "}${int(u.f)}${p === 3 ? ` \\times ${int(u.f)}` : ""}`)} ${word} ${u.smalls}`
      ),
      sv(
        mult ? given.div(F2) : given.mul(F2),
        `you ${mult ? "divided" : "multiplied"} by ${m(int(F2.n))} instead of ${mult ? "multiplying" : "dividing"}`
      ),
      sv(
        mult ? given.mul(lin.mul(p)) : given.div(lin.mul(p)),
        `you multiplied ${m(int(u.f))} by ${m(`${p}`)} instead of raising it to the power ${m(`${p}`)}`
      ),
      p === 3
        ? sv(
            mult ? given.mul(lin.mul(lin)) : given.div(lin.mul(lin)),
            `you squared the factor, but cubic units need it cubed`
          )
        : null
    );
    return {
      format,
      stem,
      answer: ans(target),
      slips: positive(slips),
      asks: `the same ${form === "volume" ? "volume" : form === "area" ? "area" : "amount"} in ${word} ${toU}, which needs the factor ${p === 2 ? "squared" : "cubed"}`,
      steps: [
        {
          label: `Find the ${word} factor`,
          work: `${m("1")} ${u.big} ${m("=")} ${m(int(u.f))} ${u.smalls}, so ${m("1")} ${word} ${u.big} ${m(`= ${int(u.f)}^${p} = ${int(F2.n)}`)} ${word} ${u.smalls}`,
        },
        {
          label: "Convert",
          work:
            form === "perArea"
              ? `Each square ${u.big} holds the mass of ${m(int(F2.n))} smaller squares, so divide: ${m(`\\frac{${dn(given)}}{${int(F2.n)}} = ${dn(target)}`)}`
              : m(
                  mult
                    ? `${dn(given)} \\times ${int(F2.n)} = ${dn(target)}`
                    : `\\frac{${dn(given)}}{${int(F2.n)}} = ${dn(target)}`
                ),
        },
      ],
      check: `converting back, ${m(mult ? `\\frac{${dn(target)}}{${int(F2.n)}} = ${dn(given)}` : `${dn(target)} \\times ${int(F2.n)} = ${dn(given)}`)}`,
      tip: "For square units use the length factor squared, and for cubic units use it cubed",
      hint: `How many ${word} ${u.smalls} fit in one ${word} ${u.big}?`,
      difficulty: form === "area" ? (u.f >= 1000 ? 4 : 3) : form === "volume" ? 5 : 4,
      isCorrect,
      key: decimalKey(target),
    };
  },
};

function rates(
  rng: Parameters<Template["make"]>[0],
  format: "mc" | "spr",
  form: "accel" | "areaRate"
): Draft {
  if (form === "accel") {
    const a = F(rng.int(2, 60), rng.pick([1, 1, 2, 10]));
    const target = a.mul(3600).div(1000);
    need(target.decimalPlaces() <= 2, "clean");
    if (format === "spr") need(fitsBox(target), "fits");
    return {
      format,
      stem: `${rng.pick(["An object's", "A sled's", "A test car's", "A model rocket's", "A falling ball's"])} speed is increasing at a rate of ${m(dn(a))} meters per second squared. What is this rate in kilometers per minute squared? (${m("1")} kilometer ${m("=")} ${m("1{,}000")} meters)`,
      answer: ans(target),
      slips: positive(
        keep(
          sv(
            a.mul(60).div(1000),
            "you converted seconds to minutes only once; the rate is per second per second, so the factor 60 is used twice"
          ),
          sv(a.mul(3600), "you did not change meters to kilometers"),
          sv(
            a.div(3600).mul(1000),
            "you divided by 3,600 and multiplied by 1,000, which turns both conversions upside down"
          ),
          sv(a.mul(60), "you used the 60 once and did not change meters to kilometers")
        )
      ),
      asks: "the same acceleration in kilometers per minute per minute",
      steps: [
        {
          label: "Convert the squared time unit",
          work: `Since a minute is ${m("60")} seconds, per minute squared multiplies by ${m("60 \\times 60 = 3{,}600")}: ${m(`${dn(a)} \\times 3{,}600 = ${dn(a.mul(3600))}`)} meters per minute squared`,
        },
        {
          label: "Convert meters to kilometers",
          work:
            m(`\\frac{${dn(a.mul(3600))}}{1{,}000} = ${dn(target)}`) +
            " kilometers per minute squared",
        },
      ],
      check: `${m(`${dn(target)} \\times \\frac{1{,}000}{3{,}600} = ${dn(a)}`)}, the rate given`,
      tip: "A squared unit of time needs its conversion factor twice",
      hint: "Minute squared means minute times minute.",
      difficulty: 6,
      isCorrect: byValue((v) => v.mul(1000).eq(a.mul(3600))),
      key: decimalKey(target),
    };
  }
  const target = F(rng.int(1, 74), 4);
  const R = target.mul(540);
  need(R.isInt() && R.lt(10000), "whole");
  const region = rng.pick([
    "a rectangular region",
    "a puddle",
    "a mown section of a field",
    "a patch of frost on a window",
    "an oil-free area of a pan",
  ]);
  if (format === "spr") need(fitsBox(target), "fits");
  return {
    format,
    stem: `The area of ${region} is increasing at a rate of ${m(int(R.n))} square feet per hour. What is this rate in square yards per minute? (${m("1")} yard ${m("=")} ${m("3")} feet)`,
    answer: ans(target),
    slips: positive(
      keep(
        sv(R.div(3).div(60), "you divided by 3, but a square yard is 9 square feet"),
        sv(R.div(9), "you converted square feet to square yards but left the rate per hour"),
        sv(
          R.mul(60).div(9),
          "you multiplied by 60; a rate per minute is smaller than the same rate per hour"
        ),
        sv(R.div(9).div(3600), "you divided by 3,600, but an hour is 60 minutes")
      )
    ),
    asks: "the same rate with square yards for area and minutes for time",
    steps: [
      {
        label: "Convert the area unit",
        work: `${m("1")} square yard ${m("= 3^2 = 9")} square feet: ${m(`\\frac{${int(R.n)}}{9} = ${dn(R.div(9))}`)} square yards per hour`,
      },
      {
        label: "Convert the time unit",
        work: `An hour is ${m("60")} minutes, so the rate per minute is ${m(`\\frac{${dn(R.div(9))}}{60} = ${dn(target)}`)}`,
      },
    ],
    check: `${m(`${dn(target)} \\times 9 \\times 60 = ${int(R.n)}`)} square feet per hour`,
    tip: "Convert one unit at a time, squaring the length factor for an area unit",
    hint: "How many square feet are in one square yard?",
    difficulty: rng.pick([6, 7]),
    isCorrect: byValue((v) => v.mul(540).eq(R)),
    key: decimalKey(target),
  };
}

export const TEMPLATES: Template[] = [convert, squareCubic, rateTime, letterRates];
