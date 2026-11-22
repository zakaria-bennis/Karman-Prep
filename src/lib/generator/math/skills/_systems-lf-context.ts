/*
 * m-linear-functions, building a linear function from a situation: a first unit priced apart
 * from the rest, an amount that runs down at a steady rate, and a fee read from two customers'
 * totals. Every check rebuilds the story's numbers directly (day by day, or from the given
 * totals) and compares them with the candidate function.
 */
import { need } from "../core/build";
import { F, Frac } from "../core/frac";
import { lin, m, money, num, signed, times } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import { near } from "./_systems-common";

type Expr = (P: Readonly<Record<string, number>>) => number;
const ans = (text: string, expr: Expr): Answer => ({ text: m(text), expr });
const slip = (text: string, expr: Expr, why: string): Slip => ({ ...ans(text, expr), why });

const FIRST_UNIT = [
  ["A bike shop", "rents a bicycle for", "day", "days", "d"],
  ["A tutor", "charges for tutoring:", "hour", "hours", "h"],
  ["A storage company", "rents a storage unit for", "month", "months", "m"],
  ["A boat rental company", "rents a kayak for", "hour", "hours", "h"],
  ["An equipment store", "rents a floor sander for", "day", "days", "d"],
  ["A parking garage", "charges", "hour", "hours", "h"],
  ["A consultant", "charges", "hour", "hours", "h"],
] as const;

const TANKS = [
  [
    "A water tank holds",
    "gallons of water",
    "Water drains from the tank at",
    "gallons per minute",
    "the amount of water left in the tank",
    "gallons",
    "minutes",
  ],
  [
    "A candle is",
    "centimeters tall",
    "It burns down at",
    "centimeters per hour",
    "the height of the candle",
    "centimeters",
    "hours",
  ],
  [
    "A phone plan starts each month with",
    "gigabytes of data",
    "A student uses data at",
    "gigabytes per day",
    "the data left in the plan",
    "gigabytes",
    "days",
  ],
  [
    "A camp has",
    "logs of firewood",
    "The campers burn",
    "logs per night",
    "the number of logs left",
    "logs",
    "nights",
  ],
] as const;

const VEHICLES = ["car", "truck", "van", "motorcycle"] as const;

const LESSONS = [
  ["A dance studio", "lesson", "lessons"],
  ["A swim school", "class", "classes"],
  ["A music teacher", "lesson", "lessons"],
  ["A pottery studio", "session", "sessions"],
  ["A driving school", "lesson", "lessons"],
] as const;

export const contextBuild: Template = {
  id: "lin-fn.context-build",
  skill: "m-linear-functions",
  label: "Write the linear function for a situation",
  difficulty: [3, 7],
  formats: ["mc"],
  make(rng, format): Draft {
    const story = rng.pick(["first", "first", "tank", "tank", "two"] as const);
    if (story === "first") {
      const [who, verb, unit, units, v] = rng.pick(FIRST_UNIT);
      const A = rng.int(2, 40) * 5;
      const Fc = rng.bool(0.5) ? 2 * A : A + rng.int(1, 20) * 5;
      const perN = rng.bool(0.3);
      const k = Fc - A;
      // The story's cost for x units (and n of something), added unit by unit.
      const cost = (x: number, nn: number) => {
        let total = Fc * nn;
        for (let i = 2; i <= x; i++) total += A * nn;
        return total;
      };
      const unitTex = perN ? "n" : "";
      const mk = (slope: number, c: number) =>
        perN
          ? ans(
              `C(${v}) = ${lin([
                [slope, `n${v}`],
                [c, "n"],
              ])}`,
              (P) => slope * P.n * P.x + c * P.n
            )
          : ans(`C(${v}) = ${lin([[slope, v]], c)}`, (P) => slope * P.x + c);
      const mkSlip = (slope: number, c: number, why: string): Slip => ({ ...mk(slope, c), why });
      const stem = `${who} ${verb} ${m(`${money(Fc)}${unitTex}`)} for the first ${unit} and ${m(`${money(A)}${unitTex}`)} for each additional ${unit}${perN ? `, where ${m("n")} is a positive integer` : ""}. Which function gives the total charge ${m(`C(${v})`)}, in dollars, for ${m(v)} ${units}, where ${m(v)} is a positive integer?`;
      return {
        format,
        stem,
        answer: mk(A, k),
        slips: [
          mkSlip(
            A,
            Fc,
            `you charged ${m(`${money(A)}${unitTex}`)} for every ${unit}, the first one too, and then added the first ${unit}'s charge again`
          ),
          mkSlip(Fc, A, "you swapped the slope and the constant"),
          mkSlip(
            Fc,
            A - Fc,
            `you used ${m(`${money(Fc)}${unitTex}`)} as the charge for each additional ${unit}`
          ),
          mkSlip(A, 0, `you left out the extra charge for the first ${unit}`),
          mkSlip(A, -k, "you subtracted the extra charge for the first unit instead of adding it"),
        ],
        asks: `a rule for the total charge after ${m(v)} ${units}, when the first ${unit} costs more than the others`,
        steps: [
          {
            label: "Split the charge into its parts",
            work: `The first ${unit} costs ${m(`${money(Fc)}${unitTex}`)}; the other ${m(`${v} - 1`)} ${units} cost ${m(`${money(A)}${unitTex}`)} each`,
          },
          {
            label: "Write the total",
            work: m(`C(${v}) = ${Fc}${unitTex} + ${A}${unitTex}(${v} - 1)`),
          },
          {
            label: "Simplify",
            work: `${m(`${A}${unitTex}${v} - ${A}${unitTex} + ${Fc}${unitTex}`)}, which is ${mk(A, k).text}`,
          },
        ],
        check: `For 3 ${units}${perN ? ` with ${m("n = 1")}` : ""}, the charge is ${m(`${money(Fc)} + ${times(2, A)} = ${money(Fc + 2 * A)}`)}, and the function gives ${m(`${times(A, 3)} + ${k} = ${A * 3 + k}`)}`,
        tip: `When the first unit is priced differently, the other units number ${m("x - 1")}, not ${m("x")}`,
        hint: `Write the charge as the first ${unit} plus the charge for the other ${m(`${v} - 1`)} ${units}.`,
        difficulty: perN ? rng.pick([6, 7]) : 5,
        isCorrect: (cand) =>
          !!cand.expr &&
          [1, 2, 3, 7].every((x) =>
            [1, 3].every((nn) => near(cand.expr!({ x, n: nn }), cost(x, perN ? nn : 1)))
          ),
      };
    }
    if (story === "tank") {
      const divide = rng.bool(0.4);
      if (divide) {
        const k = rng.pick([18, 20, 22, 24, 25, 28, 30, 32, 35, 40]);
        const G = rng.int(5, 20);
        const vehicle = rng.pick(VEHICLES);
        const right = (d: number) => G - d / k;
        return {
          format,
          stem: `A ${vehicle} uses gas at a rate of ${k} miles per gallon on the highway. The ${vehicle} starts a trip with ${G} gallons of gas in its tank. Which function gives the amount of gas ${m("f(d)")}, in gallons, left in the tank after the ${vehicle} is driven ${m("d")} miles on the highway?`,
          answer: ans(`f(d) = ${G} - \\frac{d}{${k}}`, (P) => right(P.x)),
          slips: [
            slip(
              `f(d) = ${G} - ${k}d`,
              (P) => G - k * P.x,
              `you multiplied the miles by ${k} instead of dividing; ${k} is miles per gallon, so ${m("d")} miles use ${m(`\\frac{d}{${k}}`)} gallons`
            ),
            slip(
              `f(d) = \\frac{d}{${k}} - ${G}`,
              (P) => P.x / k - G,
              "you subtracted in the wrong order"
            ),
            slip(
              `f(d) = ${G} + \\frac{d}{${k}}`,
              (P) => G + P.x / k,
              "you added the gas used instead of subtracting it"
            ),
            slip(
              `f(d) = \\frac{${G} - d}{${k}}`,
              (P) => (G - P.x) / k,
              `you divided the starting amount by ${k} as well`
            ),
          ],
          asks: "a rule for the gas left after a number of miles",
          steps: [
            {
              label: "Find the gas used",
              work: `Each gallon lasts ${k} miles, so ${m("d")} miles use ${m(`\\frac{d}{${k}}`)} gallons`,
            },
            { label: "Subtract it from the start", work: m(`f(d) = ${G} - \\frac{d}{${k}}`) },
          ],
          check: `After ${k} miles the ${vehicle} has used 1 gallon, and ${m(`${G} - \\frac{${k}}{${k}} = ${G - 1}`)}`,
          tip: "A rate in miles per gallon divides the miles; a rate per minute or per hour multiplies the time",
          hint: `How many gallons does the ${vehicle} use in ${m("d")} miles?`,
          difficulty: 4,
          isCorrect: (cand) =>
            !!cand.expr && [0, k, 3 * k].every((d) => near(cand.expr!({ x: d }), right(d))),
        };
      }
      const [start, startUnit, verb, rateUnit, what, unitWord, timeWord] = rng.pick(TANKS);
      const half = rng.bool(0.25);
      const r = half ? F(rng.int(1, 8) * 2 + 1, 2) : F(rng.int(2, 25));
      const V = r.mul(rng.int(6, 40)).add(rng.int(0, 9));
      need(V.isInt(), "whole start");
      const rv = r.toNumber();
      const Vv = V.toNumber();
      const right = (t: number) => Vv - rv * t;
      const rt = num(r, { decimal: true });
      return {
        format,
        stem: `${start} ${num(V)} ${startUnit}. ${verb} a constant rate of ${rt} ${rateUnit}. Which function gives ${what}, ${m("f(t)")}, in ${unitWord}, after ${m("t")} ${timeWord}?`,
        answer: ans(`f(t) = ${num(V)} - ${num(r, { decimal: true })}t`, (P) => right(P.x)),
        slips: [
          slip(
            `f(t) = ${lin([[r, "t"]], V.neg(), { decimal: true })}`,
            (P) => rv * P.x - Vv,
            "you subtracted in the wrong order"
          ),
          slip(
            `f(t) = ${num(V)} - \\frac{t}{${rt}}`,
            (P) => Vv - P.x / rv,
            `you divided the time by ${rt} instead of multiplying`
          ),
          slip(
            `f(t) = ${num(V)} + ${num(r, { decimal: true })}t`,
            (P) => Vv + rv * P.x,
            "you added the amount used instead of subtracting it"
          ),
          slip(
            `f(t) = ${lin([[V, "t"]], r.neg(), { decimal: true })}`,
            (P) => Vv * P.x - rv,
            "you swapped the starting amount and the rate"
          ),
        ],
        asks: `a rule for ${what} after ${m("t")} ${timeWord}`,
        steps: [
          {
            label: "Find the amount used",
            work: `At ${rt} ${rateUnit}, ${m("t")} ${timeWord} use ${m(`${rt}t`)} ${unitWord}`,
          },
          {
            label: "Subtract it from the start",
            work: m(`f(t) = ${num(V)} - ${num(r, { decimal: true })}t`),
          },
        ],
        check: `After 2 ${timeWord}, ${m(`${num(V)} - ${times(r, 2, { decimal: true })} = ${num(V.sub(r.mul(2)), { decimal: true })}`)}, and the function gives the same value at ${m("t = 2")}`,
        tip: "An amount that falls at a constant rate is the starting amount minus the rate times the time",
        hint: `How much is used in ${m("t")} ${timeWord}?`,
        difficulty: 3,
        isCorrect: (cand) =>
          !!cand.expr && [0, 1, 4].every((t) => near(cand.expr!({ x: t }), right(t))),
      };
    }
    const [who, unit, units] = rng.pick(LESSONS);
    const r = rng.int(4, 16) * 5;
    const k = rng.pick([2, 3, 4]);
    const c = rng.nonzero(-12, 12) * 5;
    const intro = c + k * r;
    need(intro > 0, "positive introductory fee");
    const x1 = k + rng.int(2, 6);
    const x2 = x1 + rng.int(3, 9);
    const T1 = r * x1 + c;
    const T2 = r * x2 + c;
    const fn = (s: number, b: number) => ans(`f(x) = ${lin([[s, "x"]], b)}`, (P) => s * P.x + b);
    const fnSlip = (s: number, b: number, why: string): Slip => ({ ...fn(s, b), why });
    const avg = Frac.of(T1, x1);
    return {
      format,
      stem: `${who} charges an introductory fee for the first ${k} ${units} and then a fixed fee for each additional ${unit}. One student took ${x1} ${units} and was charged ${m(money(T1))}. Another student took ${x2} ${units} and was charged ${m(money(T2))}. Which function ${m("f")} gives the total charge, in dollars, for a student who takes ${m("x")} ${units}, where ${m(`x \\ge ${k}`)}?`,
      answer: fn(r, c),
      slips: [
        ...(avg.isInt() && avg.n !== r
          ? [
              fnSlip(
                avg.n,
                0,
                `you divided one student's charge by that student's number of ${units}, which ignores the introductory fee`
              ),
            ]
          : []),
        fnSlip(r, 0, "you found the fee per additional " + unit + " but left out the constant"),
        fnSlip(r, -c, "you made a sign slip finding the constant"),
        fnSlip(
          r,
          intro,
          `you used the introductory fee, ${m(money(intro))}, as the constant, but the constant is the value at ${m("x = 0")}`
        ),
      ],
      asks: `a rule for the total charge, found from the two students' totals`,
      steps: [
        {
          label: `Find the fee per ${unit}`,
          work: `The second student took ${x2 - x1} more ${units} and paid ${m(`${money(T2)} - ${money(T1)} = ${money(T2 - T1)}`)} more, so each costs ${m(`\\frac{${T2 - T1}}{${x2 - x1}} = ${r}`)} dollars`,
        },
        {
          label: "Find the constant",
          work: `${m(`${T1} = ${times(r, x1)} + b`)}, so ${m(`b = ${T1} ${signed(-r * x1)} = ${c}`)}`,
        },
        { label: "Write the function", work: fn(r, c).text },
      ],
      check: `${m(`f(${x2}) = ${times(r, x2)} ${signed(c)} = ${T2}`)}, the second student's charge`,
      tip: "Two (input, output) pairs give the slope as change in output over change in input; then either pair gives the constant",
      hint: `Compare the two students: how much did the extra ${units} cost?`,
      difficulty: 5,
      isCorrect: (cand) =>
        !!cand.expr && near(cand.expr({ x: x1 }), T1) && near(cand.expr({ x: x2 }), T2),
    };
  },
};
