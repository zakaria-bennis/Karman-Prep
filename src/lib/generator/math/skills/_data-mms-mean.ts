/*
 * m-mean-median-and-spread, part two: a missing value from a given mean, and the mean of two
 * groups combined (or of the rest of a group). Re-exported by mean-median-and-spread.ts.
 */
import { need, Retry } from "../core/build";
import { F, Frac } from "../core/frac";
import type { Rng } from "../core/rng";
import { m, num } from "../core/tex";
import type { Draft, Template } from "../core/types";
import {
  listText,
  numAns,
  numSlip,
  prose,
  sumTex,
  total,
  valueOf,
  wholeOnly,
} from "./_data-common";
import { LIST_CTX, NAMES } from "./_data-mms-contexts";

const SKILL = "m-mean-median-and-spread";

interface PairCtx {
  measure: string;
  unit: string;
  groupA: string;
  groupB: string;
  lo: number;
  hi: number;
}

const PAIR_CTX: PairCtx[] = [
  {
    measure: "daily commuting times",
    unit: "minutes",
    groupA: "employees at a company's downtown office",
    groupB: "employees at the company's riverside office",
    lo: 12,
    hi: 55,
  },
  {
    measure: "numbers of points scored",
    unit: "",
    groupA: "games by the Hawks",
    groupB: "games by the Owls",
    lo: 48,
    hi: 96,
  },
  {
    measure: "lengths",
    unit: "centimeters",
    groupA: "fish caught in Lake Arden",
    groupB: "fish caught in Lake Birch",
    lo: 18,
    hi: 52,
  },
  {
    measure: "numbers of pages read in one week",
    unit: "",
    groupA: "students in one reading club",
    groupB: "students in a second reading club",
    lo: 60,
    hi: 240,
  },
  {
    measure: "masses",
    unit: "grams",
    groupA: "tomatoes from one garden",
    groupB: "tomatoes from a second garden",
    lo: 90,
    hi: 210,
  },
];

function wholeList(rng: Rng, n: number, lo: number, hi: number, mean: number): number[] {
  for (let tries = 0; tries < 60; tries++) {
    const xs = Array.from({ length: n - 1 }, () => rng.int(lo, hi));
    const last = n * mean - total(xs);
    if (last < lo || last > hi) continue;
    xs.push(last);
    if (new Set(xs).size < n - 1) continue;
    return rng.shuffle(xs);
  }
  throw new Retry("no list with that mean");
}

export const missingValue: Template = {
  id: "mms.missing-value",
  skill: SKILL,
  label: "A missing value from a given mean",
  difficulty: [3, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const kind = rng.pick(["list", "list", "two-sets", "next-score"] as const);

    if (kind === "next-score") {
      const name = rng.pick(NAMES);
      const k = rng.int(3, 6);
      const m1 = rng.int(72, 90);
      const d = rng.int(1, 4);
      const m2 = m1 + d;
      const need1 = (k + 1) * m2 - k * m1;
      need(need1 <= 100 && need1 > m2 + d, "score out of reach");
      const isCorrectScore = (x: Frac) =>
        F(k * m1)
          .add(x)
          .div(k + 1)
          .eq(m2);
      return {
        format,
        stem: `${name}'s mean score on the first ${k} tests in a course was ${m1} points. What score, in points, on the next test would make ${name}'s mean score for all ${k + 1} tests exactly ${m2} points?`,
        answer: numAns(need1),
        slips: [
          numSlip(
            m2 + d,
            `you added the ${d}-point increase to the new mean only once, but each of the ${k + 1} tests must gain ${d} points`
          ),
          numSlip(m2, "you assumed the next score only needs to equal the new mean"),
          numSlip(
            m2 + (k + 1) * d,
            `you added ${d} points for all ${k + 1} tests on top of the new mean, counting the new test twice`
          ),
          numSlip(
            m1 + k * d,
            `you added the extra points to the old mean, ${m1}, instead of to the new mean`
          ),
          numSlip(
            (k + 1) * m2,
            `you found the total needed for all ${k + 1} tests but did not subtract the first ${k} scores`
          ),
        ],
        asks: `the score on test ${k + 1} that brings the total of all ${k + 1} scores to ${k + 1} times ${m2}`,
        steps: [
          {
            label: "Find the total so far",
            work: `${k} tests with a mean of ${m1} add to ${m(`${k} \\times ${m1} = ${num(k * m1)}`)}`,
          },
          {
            label: "Find the total needed",
            work: `${k + 1} tests with a mean of ${m2} must add to ${m(`${k + 1} \\times ${m2} = ${num((k + 1) * m2)}`)}`,
          },
          {
            label: "Find the next score",
            work: m(`${num((k + 1) * m2)} - ${num(k * m1)} = ${num(need1)}`),
          },
        ],
        check: `${m(`\\frac{${num(k * m1)} + ${need1}}{${k + 1}} = \\frac{${num(k * m1 + need1)}}{${k + 1}} = ${m2}`)}, the mean asked for`,
        tip: "When a mean changes, work with totals: the mean times the number of values gives the total",
        hint: "Turn each mean into a total by multiplying by the number of tests.",
        difficulty: k >= 5 ? 4 : 3,
        isCorrect: (cand) => {
          const v = valueOf(cand);
          return v !== null && isCorrectScore(v);
        },
      };
    }

    if (kind === "list") {
      const c = rng.pick(LIST_CTX.filter((x) => x.step === 1));
      const n = rng.pick([5, 6, 7]);
      const spread = Math.max(4, Math.floor((c.hi - c.lo) / 4));
      const mu = rng.int(c.lo + spread, c.hi - spread);
      const xs = wholeList(rng, n, mu - spread, mu + spread, mu);
      const hole = rng.int(0, n - 1);
      const x = xs[hole];
      need(x !== mu, "x equals the mean");
      const known = xs.filter((_, i) => i !== hole);
      const K = total(known);
      const shown = xs.map((v, i) => (i === hole ? "$x$" : prose(v))).join(", ");
      const u = c.unit ? `, in ${c.unit},` : "";
      const stem = `The list gives the ${c.props}${u} ${c.prep} ${n} ${c.subject}, where ${m("x")} is one of the ${c.props}.\n${shown}\nIf the mean of the list is ${mu}, what is the value of ${m("x")}?`;
      const withX = (v: Frac) => [...known.map((q) => F(q)), v];
      return {
        format,
        stem,
        answer: numAns(x),
        slips: wholeOnly([
          numSlip(mu, `you assumed ${m("x")} equals the mean`),
          numSlip(
            (n - 1) * mu - K,
            `you multiplied the mean by ${n - 1}, the number of known values, instead of by ${n}`
          ),
          numSlip((n + 1) * mu - K, `you multiplied the mean by ${n + 1} instead of by ${n}`),
          numSlip(F(K, n - 1), `you averaged the ${n - 1} known values`),
          numSlip(n * mu, `you found the total, ${n * mu}, but did not subtract the known values`),
        ]),
        asks: `the value of ${m("x")} that makes the mean of all ${n} values equal ${mu}`,
        steps: [
          {
            label: "Find the total the mean requires",
            work: `${n} values with a mean of ${mu} add to ${m(`${n} \\times ${mu} = ${num(n * mu)}`)}`,
          },
          { label: "Add the known values", work: m(`${sumTex(known)} = ${num(K)}`) },
          { label: `Find ${m("x")}`, work: m(`x = ${num(n * mu)} - ${num(K)} = ${num(x)}`) },
        ],
        check: `With ${m(`x = ${num(x)}`)}, the differences from ${mu} are ${m(xs.map((v) => num(v - mu)).join(", "))}, which add to ${m("0")}`,
        tip: "A mean and a count give a total: multiply the mean by the number of values, then subtract what you know",
        hint: "Multiply the mean by the number of values to get the total of the list.",
        difficulty: n === 7 ? 4 : 3,
        isCorrect: (cand) => {
          const v = valueOf(cand);
          return (
            v !== null &&
            withX(v)
              .reduce((s, q) => s.add(q.sub(mu)), F(0))
              .isZero()
          );
        },
      };
    }

    // Two data sets with equal means; x is one value of the second set.
    const c = rng.pick(PAIR_CTX);
    const nA = rng.pick([5, 6, 7]);
    const nB = rng.bool(0.6) ? nA : nA + rng.pick([-1, 1]);
    const spread = Math.floor((c.hi - c.lo) / 2);
    const mu = rng.int(c.lo + Math.floor(spread / 2), c.hi - Math.floor(spread / 2));
    const A = wholeList(rng, nA, c.lo, c.hi, mu);
    const B = wholeList(rng, nB, c.lo, c.hi, mu);
    const hole = rng.int(0, nB - 1);
    const x = B[hole];
    need(x !== mu, "x equals the mean");
    const knownB = B.filter((_, i) => i !== hole);
    const KB = total(knownB);
    const SA = total(A);
    const u = c.unit ? `, in ${c.unit},` : "";
    const stem = `The ${c.measure}${u} of ${nA} ${c.groupA} are ${listText(A)}. The ${c.measure}${u} of ${nB} ${c.groupB} are ${B.map((v, i) => (i === hole ? "$x$" : prose(v))).join(", ")}. If the means of the two data sets are equal, what is the value of ${m("x")}?`;
    const sameSize = nA === nB;
    return {
      format,
      stem,
      answer: numAns(x),
      slips: wholeOnly([
        numSlip(
          mu,
          `you found the common mean, ${mu}, and stopped; the question asks for ${m("x")}`
        ),
        ...(sameSize
          ? []
          : [
              numSlip(
                SA - KB,
                "you made the two totals equal, but the data sets have different numbers of values, so equal means do not give equal totals"
              ),
            ]),
        numSlip(
          (nB - 1) * mu - KB,
          `you multiplied the mean by ${nB - 1}, the number of known values, instead of by ${nB}`
        ),
        numSlip(F(KB, nB - 1), "you averaged the known values of the second data set"),
        numSlip((nB + 1) * mu - KB, `you multiplied the mean by ${nB + 1} instead of by ${nB}`),
      ]),
      asks: `the value of ${m("x")} that gives the second data set the same mean as the first`,
      steps: [
        {
          label: "Find the mean of the first data set",
          work: m(`\\frac{${sumTex(A)}}{${nA}} = \\frac{${num(SA)}}{${nA}} = ${mu}`),
        },
        {
          label: "Find the total the second set needs",
          work: `${nB} values with a mean of ${mu} add to ${m(`${nB} \\times ${mu} = ${num(nB * mu)}`)}`,
        },
        {
          label: `Find ${m("x")}`,
          work: `The known values add to ${m(num(KB))}, so ${m(`x = ${num(nB * mu)} - ${num(KB)} = ${num(x)}`)}`,
        },
      ],
      check: `With ${m(`x = ${num(x)}`)}, the second data set adds to ${m(num(nB * mu))}, and ${m(`\\frac{${num(nB * mu)}}{${nB}} = ${mu}`)}, the same mean as the first`,
      tip: "Equal means do not mean equal totals unless the data sets have the same number of values; compare means, then convert to a total",
      hint: "Find the mean of the complete data set first.",
      difficulty: sameSize ? 4 : 5,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        if (v === null) return false;
        const sumB = v.add(KB);
        return sumB.mul(nA).eq(F(SA).mul(nB));
      },
    };
  },
};

// ---------------------------------------------------------------- the mean of two groups combined

interface GroupCtx {
  intro: (a: number, b: number) => string;
  groups: [string, string];
  noun: string;
  measure: string;
  unit: string;
  base: [number, number];
  scale: number;
}

const GROUP_CTX: GroupCtx[] = [
  {
    intro: (a, b) =>
      `For a study, researchers measured the heights of ${a} king penguins on one island and ${b} king penguins on a second island.`,
    groups: ["the first island", "the second island"],
    noun: "penguins",
    measure: "height",
    unit: "centimeters",
    base: [78, 92],
    scale: 10,
  },
  {
    intro: (a, b) =>
      `A science teacher gave the same test to two classes. One class has ${a} students and the other has ${b} students.`,
    groups: ["the first class", "the second class"],
    noun: "students",
    measure: "test score",
    unit: "points",
    base: [66, 84],
    scale: 1,
  },
  {
    intro: (a, b) =>
      `An orchard sold ${a} apples from its north field and ${b} apples from its south field.`,
    groups: ["the north field", "the south field"],
    noun: "apples",
    measure: "mass",
    unit: "grams",
    base: [150, 190],
    scale: 10,
  },
  {
    intro: (a, b) =>
      `A company recorded the delivery times for ${a} orders from one warehouse and ${b} orders from a second warehouse.`,
    groups: ["the first warehouse", "the second warehouse"],
    noun: "orders",
    measure: "delivery time",
    unit: "minutes",
    base: [34, 58],
    scale: 10,
  },
  {
    intro: (a, b) =>
      `A park ranger measured the lengths of ${a} trout from one stream and ${b} trout from a second stream.`,
    groups: ["the first stream", "the second stream"],
    noun: "trout",
    measure: "length",
    unit: "centimeters",
    base: [24, 40],
    scale: 5,
  },
];

const RATIOS: [number, number][] = [
  [2, 1],
  [3, 1],
  [3, 2],
  [4, 1],
  [5, 2],
  [5, 3],
  [4, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

export const combinedMean: Template = {
  id: "mms.combined-mean",
  skill: SKILL,
  label: "Mean of two groups combined, or of the rest of a group",
  difficulty: [4, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = rng.pick(GROUP_CTX);
    const [ra, rb] = rng.pick(RATIOS);
    const scale = rng.int(2, 8) * c.scale;
    const nA = ra * scale;
    const nB = rb * scale;
    const N = nA + nB;
    const mA = rng.int(c.base[0], c.base[1]);
    const t = rng.pick([-3, -2, -1, 1, 2, 3]);
    const mB = mA + (ra + rb) * t;
    need(mB > 0 && Math.abs(mB - mA) <= 16, "means too far apart");
    const comb = F(nA * mA + nB * mB, N);
    need(comb.isInt(), "combined mean must be whole");
    const M = comb.n;
    const u = c.unit;

    if (rng.bool(0.6)) {
      const slips = wholeOnly([
        numSlip(
          F(mA + mB, 2),
          "you averaged the two means, which ignores that the groups have different sizes"
        ),
        numSlip(F(nB * mA + nA * mB, N), "you weighted each mean by the size of the other group"),
        numSlip(nA > nB ? mA : mB, "you used only the mean of the larger group"),
        numSlip(nA > nB ? mB : mA, "you used only the mean of the smaller group"),
      ]);
      return {
        format,
        stem: `${c.intro(nA, nB)} The mean ${c.measure} for ${c.groups[0]} was ${mA} ${u}, and the mean ${c.measure} for ${c.groups[1]} was ${mB} ${u}. What was the mean ${c.measure}, in ${u}, of all ${N} ${c.noun}?`,
        answer: numAns(M),
        slips,
        asks: `the mean of all ${N} values together, where the larger group counts for more`,
        steps: [
          {
            label: "Find each group's total",
            work: `${m(`${nA} \\times ${mA} = ${num(nA * mA)}`)} and ${m(`${nB} \\times ${mB} = ${num(nB * mB)}`)}`,
          },
          {
            label: "Add the totals",
            work: m(`${num(nA * mA)} + ${num(nB * mB)} = ${num(nA * mA + nB * mB)}`),
          },
          {
            label: "Divide by the combined count",
            work: m(`\\frac{${num(nA * mA + nB * mB)}}{${num(N)}} = ${num(M)}`),
          },
        ],
        check: `${M} is ${m(num(Math.abs(M - mA)))} from ${mA} and ${m(num(Math.abs(mB - M)))} from ${mB}, in the ratio ${nB} to ${nA}: the combined mean sits closer to the larger group, as it should`,
        tip: "To combine means of groups of different sizes, combine the totals, not the means",
        hint: "Turn each mean into a total first.",
        difficulty: format === "spr" ? 5 : 4,
        isCorrect: (cand) => {
          const v = valueOf(cand);
          return v !== null && v.sub(mA).mul(nA).add(v.sub(mB).mul(nB)).isZero();
        },
      };
    }

    // The mean of the remaining group, from the overall mean and one group's mean.
    const totalAll = N * M;
    const totalA = nA * mA;
    const slips = wholeOnly([
      numSlip(
        2 * M - mA,
        `you assumed the second group sits as far from ${M} as the first group does, which holds only for groups of equal size`
      ),
      numSlip(F(M + mA, 2), "you averaged the two given means"),
      numSlip(
        F(totalAll - totalA, N),
        `you divided the remaining total by all ${N} instead of by ${nB}`
      ),
      numSlip(totalAll - totalA, `you found the remaining total but did not divide it by ${nB}`),
      numSlip(M, "you assumed the second group has the overall mean"),
    ]);
    return {
      format,
      stem: `${c.intro(nA, nB)} The mean ${c.measure} of all ${N} ${c.noun} was ${M} ${u}, and the mean ${c.measure} for ${c.groups[0]} was ${mA} ${u}. What was the mean ${c.measure}, in ${u}, for ${c.groups[1]}?`,
      answer: numAns(mB),
      slips,
      asks: `the mean of the ${nB} values in the second group`,
      steps: [
        { label: "Find the overall total", work: m(`${num(N)} \\times ${M} = ${num(totalAll)}`) },
        { label: "Find the first group's total", work: m(`${nA} \\times ${mA} = ${num(totalA)}`) },
        {
          label: "Find the second group's mean",
          work: m(
            `\\frac{${num(totalAll)} - ${num(totalA)}}{${nB}} = \\frac{${num(totalAll - totalA)}}{${nB}} = ${num(mB)}`
          ),
        },
      ],
      check:
        m(
          `\\frac{${nA} \\times ${mA} + ${nB} \\times ${mB}}{${num(N)}} = \\frac{${num(totalAll)}}{${num(N)}} = ${M}`
        ) + ", the overall mean",
      tip: "Work with totals: the overall total minus one group's total is the other group's total",
      hint: "Find the total for everyone and the total for the first group.",
      difficulty: 5,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && F(totalA).add(v.mul(nB)).eq(F(M).mul(N));
      },
    };
  },
};
