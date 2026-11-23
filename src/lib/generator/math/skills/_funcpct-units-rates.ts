/*
 * m-units-and-conversions, part two: distance, time and density with a change of unit, and
 * rates written with letters.
 */
import { need } from "../core/build";
import { F, gcd } from "../core/frac";
import { int, m } from "../core/tex";
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
  NAMES,
  pickW,
  positive,
  sv,
  type Vars,
} from "./_funcpct-common";

const SKILL = "m-units-and-conversions";

const TRAVELERS = [
  { who: "A cyclist", unit: "kilometers" },
  { who: "A train", unit: "miles" },
  { who: "A ferry", unit: "kilometers" },
  { who: "A runner", unit: "miles" },
  { who: "A delivery van", unit: "miles" },
];
const DENSITY = [
  { stuff: "aluminum", d: [27, 10] },
  { stuff: "a type of granite", d: [27, 10] },
  { stuff: "a type of wood", d: [6, 10] },
  { stuff: "a type of plastic", d: [12, 10] },
  { stuff: "copper", d: [9, 1] },
  { stuff: "a type of glass", d: [25, 10] },
];

export const rateTime: Template = {
  id: "units.rate-time",
  skill: SKILL,
  label: "Distance, time and density, with a change of unit",
  difficulty: [1, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["simple", 2],
      ["mixed", 3],
      ["fill", 2],
      ["density", 2],
    ] as const);
    if (form === "simple") {
      const r = rng.int(3, 40);
      const t = rng.int(2, 15);
      const animal = rng.pick(["A pigeon", "A hawk", "A dragonfly", "A swift", "A falcon"]);
      const target = F(r * t);
      if (format === "spr") need(fitsBox(target), "fits");
      return {
        format,
        stem: `${animal} can fly at an average speed of ${m(`${r}`)} meters per second. At this rate, how many meters would it fly in ${m(`${t}`)} seconds?`,
        answer: ans(target),
        slips: positive(
          keep(
            sv(F(r + t), "you added the speed and the time instead of multiplying"),
            sv(F(r, t), "you divided the speed by the time"),
            sv(F(r - t), "you subtracted the time from the speed"),
            sv(F(t, r), "you divided the time by the speed")
          )
        ),
        asks: `the distance covered in ${m(`${t}`)} seconds at ${m(`${r}`)} meters each second`,
        steps: [
          {
            label: "Use distance equals rate times time",
            work: `Each second adds ${m(`${r}`)} meters, so multiply: ${m(`${r} \\times ${t} = ${r * t}`)}`,
          },
        ],
        check: `${m(`\\frac{${r * t}}{${t}} = ${r}`)} meters per second, the speed given`,
        tip: "Distance is rate times time when the units of time match",
        hint: "How far does it fly in one second?",
        difficulty: 1,
        isCorrect: byValue((v) => v.div(t).eq(F(r))),
      };
    }
    if (form === "mixed") {
      const tr = rng.pick(TRAVELERS);
      const r = rng.int(4, 90);
      const T = rng.pick([
        10, 12, 15, 20, 24, 30, 36, 40, 45, 48, 50, 54, 75, 90, 100, 105, 135, 150,
      ]);
      const target = F(r * T, 60);
      need(target.decimalPlaces() <= 2, "clean");
      if (format === "spr") need(fitsBox(target), "fits");
      const asDec = F(Math.floor(T / 60)).add(F(T % 60, 100));
      return {
        format,
        stem: `${tr.who} travels at a constant speed of ${m(`${r}`)} ${tr.unit} per hour. At this speed, how many ${tr.unit} does it travel in ${m(`${T}`)} minutes?`,
        answer: ans(target),
        slips: positive(
          keep(
            sv(F(r * T), "you multiplied by the minutes without changing them to hours"),
            sv(
              asDec.mul(r),
              `you wrote ${m(`${T}`)} minutes as ${m(dn(asDec))} hours, but an hour has 60 minutes, not 100`
            ),
            sv(F(r * 60, T), "you divided by the time instead of multiplying"),
            sv(F(r, 60), "you found the distance in one minute and stopped")
          )
        ),
        asks: `the distance in ${m(`${T}`)} minutes, which must first be written in hours`,
        steps: [
          {
            label: "Write the time in hours",
            work:
              m(
                `${T} \\text{ minutes} = \\frac{${T}}{60} \\text{ hour} = ${dn(F(T, 60))} \\text{ hour}`
              ) + `, because an hour has ${m("60")} minutes`,
          },
          {
            label: "Multiply rate by time",
            work: m(`${r} \\times ${dn(F(T, 60))} = ${dn(target)}`),
          },
        ],
        check: `in ${m("1")} minute it goes ${m(`\\frac{${r}}{60}`)} ${tr.unit}, and ${m(`\\frac{${r}}{60} \\times ${T} = ${dn(target)}`)}`,
        tip: "Before multiplying a rate by a time, make the time units match the rate's units",
        hint: "The speed is per hour, but the time is in minutes.",
        difficulty: T % 60 === 0 ? 2 : 3,
        isCorrect: byValue((v) => v.mul(60).eq(F(r * T))),
        key: decimalKey(target),
      };
    }
    if (form === "fill") {
      const rate = rng.int(3, 40);
      const hours = F(rng.int(1, 16), rng.pick([1, 2, 4]));
      const V = hours.mul(60).mul(rate);
      need(V.isInt(), "whole volume");
      if (format === "spr") need(fitsBox(hours), "fits");
      const tank = rng.pick([
        "a swimming pool",
        "a water tower",
        "a rain barrel system",
        "an irrigation pond",
      ]);
      const who = rng.pick(NAMES);
      return {
        format,
        stem: `${who} uses a pump that moves ${m(`${rate}`)} gallons of water per minute to fill ${tank} that holds ${m(int(V.n))} gallons. How many hours will it take to fill it at this rate?`,
        answer: ans(hours),
        slips: positive(
          keep(
            sv(V.div(rate), "you found the time in minutes and did not change it to hours"),
            sv(
              V.div(rate).div(100),
              "you changed minutes to hours by dividing by 100 instead of 60"
            ),
            sv(V.mul(rate).div(60), "you multiplied the volume by the rate instead of dividing"),
            sv(V.div(rate).div(3600), "you divided by 3,600, but an hour has 60 minutes")
          )
        ),
        asks: "the filling time in hours, from a rate given per minute",
        steps: [
          {
            label: "Find the time in minutes",
            work: m(`\\frac{${int(V.n)}}{${rate}} = ${int(V.div(rate).n)}`) + " minutes",
          },
          {
            label: "Change minutes to hours",
            work: m(`\\frac{${int(V.div(rate).n)}}{60} = ${dn(hours)}`) + " hours",
          },
        ],
        check: `${m(dn(hours))} hours is ${m(int(hours.mul(60).n))} minutes, and ${m(`${int(hours.mul(60).n)} \\times ${rate} = ${int(V.n)}`)} gallons`,
        tip: "Time is amount divided by rate; then convert the time to the unit asked for",
        hint: "How many minutes does it take first?",
        difficulty: hours.isInt() ? 3 : 4,
        isCorrect: byValue((v) => v.mul(60).mul(rate).eq(V)),
        key: decimalKey(hours),
      };
    }
    const mat = rng.pick(DENSITY);
    const d = F(mat.d[0], mat.d[1]);
    const [l, w, h] = [rng.int(2, 12), rng.int(2, 10), rng.int(1, 8)];
    const vol = l * w * h;
    const mass = d.mul(vol);
    const findMass = rng.bool(0.6);
    const target = findMass ? mass : d;
    need(target.decimalPlaces() <= 2, "clean");
    if (format === "spr") need(fitsBox(target), "fits");
    const stem = findMass
      ? `The density of ${mat.stuff} is ${m(dn(d))} grams per cubic centimeter. A block of ${mat.stuff} is a rectangular prism that measures ${m(`${l}`)} centimeters by ${m(`${w}`)} centimeters by ${m(`${h}`)} centimeters. What is the mass, in grams, of the block?`
      : `A block of ${mat.stuff} is a rectangular prism that measures ${m(`${l}`)} centimeters by ${m(`${w}`)} centimeters by ${m(`${h}`)} centimeters, and it has a mass of ${m(dn(mass))} grams. What is the density, in grams per cubic centimeter, of the block?`;
    return {
      format,
      stem,
      answer: ans(target),
      slips: positive(
        keep(
          findMass
            ? sv(F(vol).div(d), "you divided the volume by the density instead of multiplying")
            : sv(
                F(vol).div(mass),
                "you divided the volume by the mass; density is mass divided by volume"
              ),
          findMass
            ? sv(
                d.mul(l + w + h),
                "you added the three edge lengths instead of multiplying them to get the volume"
              )
            : sv(
                mass.div(l + w + h),
                "you added the edge lengths instead of multiplying them to get the volume"
              ),
          findMass
            ? sv(d.mul(l * w), "you used the area of one face instead of the volume")
            : sv(mass.div(l * w), "you divided by the area of one face instead of the volume"),
          findMass
            ? sv(F(vol), "you found the volume and stopped")
            : sv(mass.mul(vol), "you multiplied the mass by the volume")
        )
      ),
      asks: findMass
        ? "the mass of the block, density times volume"
        : "the density, mass divided by volume",
      steps: [
        {
          label: "Find the volume",
          work: m(`${l} \\times ${w} \\times ${h} = ${vol}`) + " cubic centimeters",
        },
        findMass
          ? {
              label: "Multiply density by volume",
              work: m(`${dn(d)} \\times ${vol} = ${dn(mass)}`) + " grams",
            }
          : {
              label: "Divide mass by volume",
              work: m(`\\frac{${dn(mass)}}{${vol}} = ${dn(d)}`) + " grams per cubic centimeter",
            },
      ],
      check: findMass
        ? `${m(`\\frac{${dn(mass)}}{${vol}} = ${dn(d)}`)}, the density given`
        : `${m(`${dn(d)} \\times ${vol} = ${dn(mass)}`)}, the mass given`,
      tip: "Density is mass per unit of volume, so mass equals density times volume",
      hint: "Find the volume of the block first.",
      difficulty: findMass ? 3 : 4,
      isCorrect: byValue((v) => (findMass ? v.div(vol).eq(d) : v.mul(vol).eq(mass))),
      key: decimalKey(target),
    };
  },
};

/** A coefficient and letters as LaTeX, as a fraction when it has a denominator. */
function term(top: string, bottom: string): string {
  return bottom === "" || bottom === "1" ? top : `\\frac{${top}}{${bottom}}`;
}

export const letterRates: Template = {
  id: "units.letter-rates",
  skill: SKILL,
  label: "Rates written with letters, with a unit change",
  difficulty: [2, 6],
  formats: ["mc"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["times", 2],
      ["years", 2],
      ["minutes", 2],
      ["speeds", 1],
    ] as const);
    if (form === "times") {
      const N = rng.int(3, 150);
      const who = rng.pick([
        "A bicyclist",
        "A snail",
        "A kayaker",
        "A robot vacuum",
        "A hiker",
        "A tugboat",
      ]);
      const [d, t] = rng.pick([
        ["x", "y"],
        ["a", "b"],
        ["m", "n"],
        ["p", "q"],
      ]);
      const dist = rng.pick(["feet", "meters", "yards"]);
      const time = rng.pick(["minutes", "seconds", "hours"]);
      const truth = (v: Vars) => N * v[d];
      return {
        format,
        stem: `${who} travels a distance of ${m(d)} ${dist} in ${m(t)} ${time}. At this rate, which expression represents the distance, in ${dist}, traveled in ${m(`${N}${t}`)} ${time}?`,
        answer: exprAns(m(`${N}${d}`), truth),
        slips: keep(
          exprSlip(
            m(`${d} + ${N}`),
            (v) => v[d] + N,
            `you added ${m(`${N}`)} instead of multiplying`
          ),
          exprSlip(
            m(`\\frac{${d}}{${N}}`),
            (v) => v[d] / N,
            `you divided by ${m(`${N}`)}; more time means more distance`
          ),
          exprSlip(
            m(`\\frac{${N}}{${d}}`),
            (v) => N / v[d],
            `you divided ${m(`${N}`)} by the distance`
          )
        ),
        asks: `the distance in ${m(`${N}`)} times as many ${time}`,
        steps: [
          {
            label: "Compare the times",
            work: `${m(`${N}${t}`)} ${time} is ${m(`${N}`)} times as long as ${m(t)} ${time}`,
          },
          {
            label: "Scale the distance",
            work: `At a constant rate, ${m(`${N}`)} times the time gives ${m(`${N}`)} times the distance: ${m(`${N}${d}`)} ${dist}`,
          },
        ],
        check: `the rate is ${m(`\\frac{${d}}{${t}}`)} ${dist} per ${time.replace(/s$/, "")}, and ${m(`\\frac{${d}}{${t}} \\times ${N}${t} = ${N}${d}`)}`,
        tip: "At a constant rate, multiplying the time by a number multiplies the distance by the same number",
        hint: `How many times as long is ${m(`${N}${t}`)} ${time} as ${m(t)} ${time}?`,
        difficulty: 2,
        isCorrect: byExpr(truth),
      };
    }
    if (form === "years") {
      const C = rng.int(5, 99);
      const thing = rng.pick([
        "a certain tree grows",
        "a glacier moves",
        "a coral reef grows",
        "a stalagmite grows",
        "a sand dune moves",
      ]);
      const unit = /glacier|dune/.test(thing) ? "meters" : "centimeters";
      const verb = thing.includes("moves") ? "moves" : "grows";
      const [small, big, f] = rng.pick([
        ["months", "years", 12],
        ["weeks", "years", 52],
        ["days", "weeks", 7],
      ] as const);
      const [P, Q] = rng.pick([
        ["m", "k"],
        ["n", "t"],
        ["h", "w"],
        ["r", "s"],
      ]);
      const kf = f * C;
      const truth = (v: Vars) => (kf * v[Q]) / v[P];
      return {
        format,
        stem: `On average, ${thing} ${m(`${C}`)} ${unit} every ${m(P)} ${small}. At this rate, which expression represents the number of ${unit} it ${verb} every ${m(Q)} ${big}?`,
        answer: exprAns(m(term(`${kf}${Q}`, P)), truth),
        slips: keep(
          exprSlip(
            m(term(`${kf}${P}`, Q)),
            (v) => (kf * v[P]) / v[Q],
            `you put the ${small} on top and the ${big} on the bottom`
          ),
          exprSlip(
            m(term(`${C}${Q}`, `${f}${P}`)),
            (v) => (C * v[Q]) / (f * v[P]),
            `you divided by ${m(`${f}`)} instead of multiplying; a ${big.replace(/s$/, "")} is longer than a ${small.replace(/s$/, "")}`
          ),
          exprSlip(
            m(term(`${C}${Q}`, P)),
            (v) => (C * v[Q]) / v[P],
            `you did not change ${big} to ${small}`
          )
        ),
        asks: `the amount in ${m(Q)} ${big}, when the rate is given per ${m(P)} ${small}`,
        steps: [
          {
            label: `Find the rate per ${small.replace(/s$/, "")}`,
            work: m(`\\frac{${C}}{${P}}`) + ` ${unit} per ${small.replace(/s$/, "")}`,
          },
          {
            label: `Write the time in ${small}`,
            work: `${m(Q)} ${big} is ${m(`${f}${Q}`)} ${small}`,
          },
          {
            label: "Multiply rate by time",
            work: m(`\\frac{${C}}{${P}} \\times ${f}${Q} = ${term(`${kf}${Q}`, P)}`),
          },
        ],
        check: `with ${m(`${P} = ${f}`)} and ${m(`${Q} = 1`)}, it ${verb} ${m(`${C}`)} ${unit} in one ${big.replace(/s$/, "")}, and the expression gives ${m(`\\frac{${kf}}{${f}} = ${C}`)}`,
        tip: "Change every time to the same unit before you compare or multiply rates",
        hint: `How many ${small} are in ${m(Q)} ${big}?`,
        difficulty: 5,
        isCorrect: byExpr(truth),
      };
    }
    if (form === "minutes") {
      const [thing, obj] = rng.pick([
        ["A machine makes", "parts"],
        ["A bakery bakes", "loaves"],
        ["A press prints", "posters"],
        ["A team assembles", "chairs"],
        ["A volunteer crew plants", "trees"],
        ["A kitchen packs", "lunches"],
      ]);
      const M = rng.int(2, 90);
      const g = gcd(M, 60);
      const top = M / g === 1 ? "" : `${M / g}`;
      const bot = 60 / g === 1 ? "" : `${60 / g}`;
      const truth = (v: Vars) => (M * v.p * v.t) / (60 * v.h);
      const right = term(`${top}pt`, `${bot}h`);
      return {
        format,
        stem: `${thing} ${m("p")} ${obj} every ${m("h")} hours. At this rate, which expression represents the number of ${obj} made in ${m(`${M}t`)} minutes?`,
        answer: exprAns(m(right), truth),
        slips: keep(
          exprSlip(
            m(term(`${60 * M}pt`, "h")),
            (v) => (60 * M * v.p * v.t) / v.h,
            "you multiplied by 60; a minute is shorter than an hour, so the rate per minute is smaller"
          ),
          exprSlip(
            m(term(`${M}pt`, "h")),
            (v) => (M * v.p * v.t) / v.h,
            "you multiplied the hourly rate by a number of minutes without converting"
          ),
          exprSlip(
            m(term(`${top}ht`, `${bot}p`)),
            (v) => (M * v.h * v.t) / (60 * v.p),
            "you turned the rate upside down, hours per item"
          )
        ),
        asks: `the number made in ${m(`${M}t`)} minutes from a rate given per hour`,
        steps: [
          { label: "Find the rate per hour", work: m("\\frac{p}{h}") + ` ${obj} per hour` },
          {
            label: "Change it to a rate per minute",
            work: `An hour has ${m("60")} minutes: ${m("\\frac{p}{60h}")} ${obj} per minute`,
          },
          { label: "Multiply by the minutes", work: m(`\\frac{p}{60h} \\times ${M}t = ${right}`) },
        ],
        check: `with ${m("h = 1")}, ${m("t = 60")} and ${m("p = 10")}, the time is ${m(`${M}`)} hours, so ${m(`${10 * M}`)} ${obj} are made, and ${m(`\\frac{${M}(10)(60)}{60(1)} = ${10 * M}`)}`,
        tip: "Write the rate as a fraction, convert its time unit, then multiply by the time",
        hint: "How many are made in one hour, and then in one minute?",
        difficulty: 4,
        isCorrect: byExpr(truth),
      };
    }
    const N = rng.int(2, 30);
    const M = rng.int(2, 12);
    const NM = N * M;
    const [dist, time] = rng.pick([
      ["centimeters", "seconds"],
      ["meters", "seconds"],
      ["meters", "minutes"],
      ["feet", "seconds"],
      ["feet", "minutes"],
      ["miles", "hours"],
    ]);
    const truth = (v: Vars) => NM * v.a * v.b;
    return {
      format,
      stem: `Objects X and Y each travel at a constant speed. The speed of object X is ${m("\\frac{1}{a}")} times the speed of object Y, where ${m("a > 0")}. Object X travels a distance of ${m(`${N}b`)} ${dist} in ${m("c")} ${time}, where ${m("c > 1")}. Which expression represents the distance, in ${dist}, object Y travels in ${m(`${M}c`)} ${time}?`,
      answer: exprAns(m(`${NM}ab`), truth),
      slips: keep(
        exprSlip(
          m(`\\frac{${NM}b}{a}`),
          (v) => (NM * v.b) / v.a,
          "you divided by a; object Y is the faster one, so its speed is a times object X's"
        ),
        exprSlip(
          m(`\\frac{${NM}bc}{a}`),
          (v) => (NM * v.b * v.c) / v.a,
          "you multiplied the distance by the time instead of using the speed, and divided by a"
        ),
        exprSlip(
          m(`\\frac{${NM}ab}{c}`),
          (v) => (NM * v.a * v.b) / v.c,
          "you divided by c a second time"
        )
      ),
      asks: `object Y's distance in ${m(`${M}c`)} ${time}`,
      steps: [
        {
          label: "Find object X's speed",
          work: `${m(`\\frac{${N}b}{c}`)} ${dist} per ${time.replace(/s$/, "")}`,
        },
        {
          label: "Find object Y's speed",
          work: `X's speed is ${m("\\frac{1}{a}")} of Y's, so Y's speed is ${m("a")} times X's: ${m(`\\frac{${N}ab}{c}`)}`,
        },
        { label: "Multiply by the time", work: m(`\\frac{${N}ab}{c} \\times ${M}c = ${NM}ab`) },
      ],
      check: `with ${m("a = 1")}, the speeds match, and Y covers ${m(`${N}b`)} ${dist} every ${m("c")} ${time}, so ${m(`${NM}b`)} in ${m(`${M}c`)} ${time}, as the expression gives`,
      tip: "Find each speed as distance over time, then multiply the speed you need by the new time",
      hint: "Write object X's speed as distance divided by time.",
      difficulty: 6,
      isCorrect: byExpr(truth),
    };
  },
};
