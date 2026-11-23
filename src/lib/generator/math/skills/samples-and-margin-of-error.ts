/*
 * m-samples-and-margin-of-error: what a random sample can say about its population. Item models
 * after the bank's own questions for this skill: the plausible values an estimate and its margin
 * of error give; how the sample size moves the margin of error; and estimating a count in the
 * population from a sample (a point estimate, or the plausible counts an estimate and margin give).
 * Statement choices carry keys that say what they claim, and the check tests that claim against
 * the estimate and margin directly.
 */
import { need } from "../core/build";
import { F, Frac } from "../core/frac";
import type { Rng } from "../core/rng";
import { m, num } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import {
  numAns,
  numSlip,
  prose,
  proseDec,
  sprKey,
  statement,
  stmtSlip,
  tableFig,
  valueOf,
} from "./_data-common";

const SKILL = "m-samples-and-margin-of-error";

interface EstCtx {
  setup: (n: number) => string;
  what: string;
  kind: "percent" | "mean";
  unit: string;
  est: [number, number];
  margin: [number, number];
  places: number;
  member: string;
}

const EST_CTX: EstCtx[] = [
  {
    setup: (n) =>
      `For a survey, a sample of ${prose(n)} people was selected at random from all registered voters in a county.`,
    what: "percent of all registered voters in the county who are in favor of a new law",
    kind: "percent",
    unit: "",
    est: [40, 85],
    margin: [150, 700],
    places: 2,
    member: "registered voters",
  },
  {
    setup: (n) =>
      `The manager of a gym selected ${prose(n)} members at random to estimate how many members would keep their membership if the price increased.`,
    what: "percent of all the gym's members who would keep their membership if the price increased",
    kind: "percent",
    unit: "",
    est: [55, 90],
    margin: [200, 800],
    places: 2,
    member: "members",
  },
  {
    setup: (n) =>
      `A machine fills bags with sugar. To test the filling process, ${prose(n)} bags filled by the machine were selected at random and weighed.`,
    what: "average weight, in ounces, of all bags of sugar filled by the machine",
    kind: "mean",
    unit: "ounces",
    est: [1450, 1550],
    margin: [8, 30],
    places: 2,
    member: "bags",
  },
  {
    setup: (n) =>
      `A biologist measured the tarsus length of a random sample of ${prose(n)} finches from a habitat.`,
    what: "mean tarsus length, in millimeters, of the finches in the habitat",
    kind: "mean",
    unit: "millimeters",
    est: [1850, 1990],
    margin: [8, 25],
    places: 2,
    member: "finches",
  },
  {
    setup: (n) =>
      `A company surveyed a random sample of ${prose(n)} of its employees about the time they spend each week on shared projects.`,
    what: "average number of hours per week that all the company's employees spend on shared projects",
    kind: "mean",
    unit: "hours",
    est: [42, 95],
    margin: [6, 15],
    places: 1,
    member: "employees",
  },
  {
    setup: (n) =>
      `An inspector tested a random sample of ${prose(n)} scales from a warehouse to estimate how many of the scales are inaccurate.`,
    what: "percent of all the scales in the warehouse that are inaccurate",
    kind: "percent",
    unit: "",
    est: [5, 18],
    margin: [150, 400],
    places: 2,
    member: "scales",
  },
];

/** The estimate and margin as exact values (percents in percent points). */
function draw(rng: Rng, c: EstCtx): { est: Frac; mar: Frac } {
  const est =
    c.kind === "percent"
      ? F(rng.int(c.est[0], c.est[1]))
      : F(rng.int(c.est[0], c.est[1]), 10 ** c.places);
  const mar = F(rng.int(c.margin[0], c.margin[1]), c.kind === "percent" ? 100 : 10 ** c.places);
  return { est, mar };
}

const show = (q: Frac, c: EstCtx) =>
  c.kind === "percent" ? `${proseDec(q)}%` : `${proseDec(q)} ${c.unit}`;
const d = (q: Frac) => num(q, { decimal: true });

// ---------------------------------------------------------------- plausible values from an estimate

export const interval: Template = {
  id: "samp.interval",
  skill: SKILL,
  label: "Plausible values from an estimate and its margin of error",
  difficulty: [2, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = rng.pick(EST_CTX);
    const n = rng.int(40, 1500);
    const { est, mar } = draw(rng, c);
    const lo = est.sub(mar);
    const hi = est.add(mar);
    need(lo.gt(0), "positive interval");
    const setup = `${c.setup(n)} Based on the sample, it is estimated that the ${c.what} is ${show(est, c)}, with an associated margin of error of ${show(mar, c)}.`;
    const steps = [
      {
        label: "Find the low end",
        work: `Subtract the margin of error from the estimate: ${m(`${d(est)} - ${d(mar)} = ${d(lo)}`)}`,
      },
      {
        label: "Find the high end",
        work: `Add the margin of error to the estimate: ${m(`${d(est)} + ${d(mar)} = ${d(hi)}`)}`,
      },
    ];
    const tip =
      "An estimate with a margin of error gives a range of plausible values: from the estimate minus the margin to the estimate plus the margin";
    if (format === "spr") {
      const high = rng.bool(0.5);
      const v = high ? hi : lo;
      return {
        format,
        stem: `${setup}\nBased on the estimate and margin of error, what is the ${high ? "greatest" : "least"} plausible value of the ${c.what}?${c.kind === "percent" ? " (Disregard the % sign when entering your answer.)" : ""}`,
        answer: numAns(v),
        key: sprKey(v),
        slips: [
          numSlip(
            high ? lo : hi,
            `you found the ${high ? "least" : "greatest"} plausible value instead`
          ),
          numSlip(
            high ? est.add(mar.mul(2)) : est.sub(mar.mul(2)),
            "you used twice the margin of error"
          ),
          numSlip(est, "you gave the estimate itself"),
        ],
        asks: `the ${high ? "high" : "low"} end of the range of plausible values`,
        steps: [high ? steps[1] : steps[0]],
        check: `The range from ${show(lo, c)} to ${show(hi, c)} is centered on the estimate, ${show(est, c)}, and reaches ${show(mar, c)} to each side`,
        tip,
        hint: `${high ? "Add" : "Subtract"} the margin of error ${high ? "to" : "from"} the estimate.`,
        difficulty: 3,
        isCorrect: (cand) => {
          const x = valueOf(cand);
          return x !== null && x.sub(est).abs().eq(mar) && (high ? x.gt(est) : x.lt(est));
        },
      };
    }
    const range = (a: Frac, b: Frac) => `between ${show(a, c)} and ${show(b, c)}`;
    const lead = `Plausible values for the ${c.what} are`;
    const right: Answer = statement(
      `${lead} ${range(lo, hi)}.`,
      `in|${lo.toString()}|${hi.toString()}`
    );
    const slips: Slip[] = [
      stmtSlip(
        `${lead} less than ${show(lo, c)} or greater than ${show(hi, c)}.`,
        `out|${lo.toString()}|${hi.toString()}`,
        "you described the values outside the range; the plausible values are the ones inside it"
      ),
      stmtSlip(
        `${lead} ${range(est, hi)}.`,
        `in|${est.toString()}|${hi.toString()}`,
        "you added the margin of error to the estimate but did not also subtract it"
      ),
      stmtSlip(
        `${lead} ${range(est.sub(mar.mul(2)), est.add(mar.mul(2)))}.`,
        `in|${est.sub(mar.mul(2)).toString()}|${est.add(mar.mul(2)).toString()}`,
        "you used twice the margin of error on each side"
      ),
      stmtSlip(
        `The ${c.what} is exactly ${show(est, c)}.`,
        `exact|${est.toString()}`,
        "you treated the estimate as certain; a sample gives a range of plausible values, not an exact value"
      ),
    ];
    return {
      format,
      stem: `${setup}\nWhich of the following is the most appropriate conclusion based on this estimate?`,
      answer: right,
      slips: rng.shuffle(slips),
      asks: "the range of plausible values the estimate and margin of error give for the whole population",
      steps,
      check: `The estimate, ${show(est, c)}, sits in the middle of the range from ${show(lo, c)} to ${show(hi, c)}, ${show(mar, c)} from each end`,
      tip,
      hint: "Use the margin of error on both sides of the estimate.",
      difficulty: c.kind === "mean" ? 3 : rng.pick([2, 3]),
      isCorrect: (cand) => {
        const [kind, a, b] = (cand.key ?? "").split("|");
        return kind === "in" && Frac.parse(a).eq(est.sub(mar)) && Frac.parse(b).eq(est.add(mar));
      },
    };
  },
};

// ---------------------------------------------------------------- sample size and the margin of error

export const sampleSize: Template = {
  id: "samp.sample-size",
  skill: SKILL,
  label: "How sample size affects the margin of error",
  difficulty: [3, 5],
  formats: ["mc"],
  make(rng): Draft {
    const c = rng.pick(EST_CTX);
    const n = rng.int(40, 900);
    const { est, mar } = draw(rng, c);
    const kind = rng.pick(["repeat", "repeat", "repeat", "groups", "explain", "explain"] as const);
    const setup = `${c.setup(n)} Based on the sample, it is estimated that the ${c.what} is ${show(est, c)}, with an associated margin of error of ${show(mar, c)}.`;

    if (kind === "repeat") {
      const bigger = rng.bool(0.7);
      const factor = rng.pick([2, 3]);
      const mText = show(mar, c);
      const scaled = bigger ? mar.div(factor) : mar.mul(factor);
      const opts: [string, string, string][] = [
        [
          `It will be less than ${mText}.`,
          "less",
          "you have it backward: a smaller sample gives a larger margin of error, not a smaller one",
        ],
        [
          `It will be greater than ${mText}.`,
          "greater",
          "you have it backward: a larger sample gives a smaller margin of error, not a larger one",
        ],
        [
          `It will be exactly ${mText}.`,
          "equal",
          "the margin of error depends on the sample size, so changing the size changes it",
        ],
        [
          `It will be exactly ${show(scaled, c)}.`,
          "scaled",
          `the margin of error does not change in proportion to the sample size, so you cannot ${bigger ? "divide" : "multiply"} it by ${factor}`,
        ],
      ];
      const want = bigger ? "less" : "greater";
      const right = opts.find((o) => o[1] === want)!;
      need(scaled.decimalPlaces() <= 3, "clean scaled margin");
      return {
        format: "mc",
        stem: `${setup} The survey will be repeated with a new random sample ${bigger ? (factor === 2 ? "twice" : "three times") : factor === 2 ? "half" : "one-third"} as large, and the margin of error will be calculated in the same way. Which of the following is most likely true about the margin of error for the new estimate?`,
        answer: statement(right[0], right[1]),
        slips: opts.filter((o) => o[1] !== want).map((o) => stmtSlip(o[0], o[1], o[2])),
        asks: "how the margin of error changes when the sample size changes, with everything else the same",
        steps: [
          {
            label: "Recall the rule",
            work: "Larger random samples give more precise estimates, so their margins of error are smaller",
          },
          {
            label: "Apply it to the new sample",
            work: `The new sample is ${bigger ? "larger" : "smaller"}, so its margin of error will most likely be ${bigger ? "less" : "greater"} than ${mText}`,
          },
        ],
        check: `The margin of error moves opposite to the sample size, but more slowly than the size changes, so no exact multiple of ${mText} can be claimed`,
        tip: "Larger random samples give smaller margins of error; the change is not in proportion to the sample size",
        hint: "Ask whether a bigger sample makes an estimate more or less precise.",
        difficulty: bigger ? 3 : 4,
        isCorrect: (cand) => cand.key === (bigger ? "less" : "greater"),
      };
    }

    if (kind === "groups") {
      const topic = rng.pick([
        ["students at one high school", "students", "walk to school"],
        ["students at one high school", "students", "speak a second language"],
        ["students at one high school", "students", "play a team sport"],
        ["residents of a town", "residents", "visit the town library at least once a month"],
        ["residents of a town", "residents", "support a new bike lane"],
        ["employees at a company", "employees", "work from home at least one day a week"],
        ["employees at a company", "employees", "bike to work"],
        ["customers of a grocery store", "customers", "shop there every week"],
      ]);
      const margins = rng.sample([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15], 4);
      const ests = margins.map(() => rng.int(38, 52));
      const largest = rng.bool(0.6);
      const target = largest ? Math.min(...margins) : Math.max(...margins);
      const idx = margins.indexOf(target);
      const opposite = margins.indexOf(largest ? Math.max(...margins) : Math.min(...margins));
      const highEst = ests.indexOf(Math.max(...ests));
      need(highEst !== idx && highEst !== opposite, "estimate trap overlaps");
      const rest = [0, 1, 2, 3].find((i) => i !== idx && i !== opposite && i !== highEst)!;
      return {
        format: "mc",
        stem: `Four research groups each surveyed a random sample of ${topic[0]} to estimate the percent of ${topic[1]} who ${topic[2]}. The table shows each group's estimate and its margin of error. Assuming the margins of error were calculated in the same way, which group had the ${largest ? "largest" : "smallest"} sample size?`,
        figure: tableFig(
          ["Group", "Estimate", "Margin of error"],
          margins.map((mg, i) => [String(i + 1), `${ests[i]}%`, `${mg}%`])
        ),
        answer: statement(`Group ${idx + 1}`, `g${idx + 1}`),
        slips: [
          stmtSlip(
            `Group ${opposite + 1}`,
            `g${opposite + 1}`,
            `you chose the ${largest ? "largest" : "smallest"} margin of error, which comes from the ${largest ? "smallest" : "largest"} sample`
          ),
          stmtSlip(
            `Group ${highEst + 1}`,
            `g${highEst + 1}`,
            "you chose the highest estimate; the estimate itself says nothing about the sample size"
          ),
          stmtSlip(
            `Group ${rest + 1}`,
            `g${rest + 1}`,
            `its margin of error, ${margins[rest]}%, is not the ${largest ? "smallest" : "largest"} in the table`
          ),
        ],
        asks: `which group's sample was ${largest ? "largest" : "smallest"}, judged from the margins of error`,
        steps: [
          {
            label: "Link margin to sample size",
            work: "With the same method, a larger sample gives a smaller margin of error",
          },
          {
            label: `Find the ${largest ? "smallest" : "largest"} margin`,
            work: `Group ${idx + 1} has the ${largest ? "smallest" : "largest"} margin of error, ${target}%`,
          },
        ],
        check: `The margins in order are ${[...margins].sort((a, b) => a - b).join("%, ")}%, and group ${idx + 1}'s is the ${largest ? "first" : "last"}`,
        tip: "Compare sample sizes through the margins of error, never through the estimates",
        hint: "Which column changes with the sample size?",
        difficulty: largest ? 3 : 4,
        isCorrect: (cand) => {
          const g = Number((cand.key ?? "").replace("g", "")) - 1;
          return (
            g >= 0 &&
            g < 4 &&
            margins.every((mg) => (largest ? margins[g] <= mg : margins[g] >= mg))
          );
        },
      };
    }

    const mar2 = mar.mul(rng.pick([F(3, 2), F(2), F(11, 5)]));
    const est2 =
      c.kind === "percent"
        ? est.add(rng.pick([-6, -4, 3, 5]))
        : est.add(F(rng.pick([-3, -2, 2, 3]), 10 ** c.places));
    need(mar2.decimalPlaces() <= 2 && est2.gt(mar2), "clean second sample");
    const items = c.member;
    const higher = est.gt(est2);
    return {
      format: "mc",
      stem: `A researcher selected two random samples of ${items} to estimate the ${c.what}. Based on the first sample, the estimate was ${show(est, c)}, with a margin of error of ${show(mar, c)}. Based on the second sample, the estimate was ${show(est2, c)}, with a margin of error of ${show(mar2, c)}. Assuming the margins of error were calculated in the same way, which of the following best explains why the first sample had a smaller margin of error than the second sample?`,
      answer: statement(`The first sample contained more ${items} than the second sample.`, "more"),
      slips: [
        stmtSlip(
          `The first sample contained fewer ${items} than the second sample.`,
          "fewer",
          "you have it backward: a smaller sample gives a larger margin of error, so fewer would explain a larger margin"
        ),
        stmtSlip(
          `The first sample had a ${higher ? "higher" : "lower"} estimate than the second sample.`,
          "estimate",
          "the size of the estimate does not set the margin of error; the sample size does"
        ),
        stmtSlip(
          `The first sample had a ${higher ? "lower" : "higher"} estimate than the second sample.`,
          "estimate2",
          `the first estimate is ${higher ? "higher" : "lower"}, not ${higher ? "lower" : "higher"}, and the estimate does not set the margin of error anyway`
        ),
      ],
      asks: "what difference between the samples explains a smaller margin of error",
      steps: [
        {
          label: "Recall what sets the margin",
          work: "With the same method, the margin of error depends on the sample size: larger samples give smaller margins",
        },
        {
          label: "Apply it to the two samples",
          work: `The first margin, ${show(mar, c)}, is smaller than the second, ${show(mar2, c)}, so the first sample was most likely larger`,
        },
      ],
      check:
        "The estimates differ from sample to sample by chance; a higher or lower estimate does not make a margin smaller",
      tip: "When two margins of error were calculated the same way, the smaller margin goes with the larger sample",
      hint: "What property of a sample makes its estimate more precise?",
      difficulty: 5,
      isCorrect: (cand) => cand.key === "more",
    };
  },
};

// ---------------------------------------------------------------- counts in the population

const COUNT_CTX = [
  {
    pick: "employees",
    from: "all the employees at a company",
    has: "are enrolled in a training course",
    not: "are not enrolled",
    noun: "employees at the company who are enrolled in the course",
  },
  {
    pick: "students",
    from: "all the students at a high school",
    has: "walk to school",
    not: "do not walk to school",
    noun: "students at the school who walk to school",
  },
  {
    pick: "sparrows",
    from: "a population of sparrows",
    has: "have a tan-striped head",
    not: "do not have a tan-striped head",
    noun: "sparrows in the population that have a tan-striped head",
  },
  {
    pick: "households",
    from: "all the households in a town",
    has: "own a dog",
    not: "do not own a dog",
    noun: "households in the town that own a dog",
  },
  {
    pick: "trees",
    from: "all the trees in a forest preserve",
    has: "show signs of a leaf disease",
    not: "show no signs of the disease",
    noun: "trees in the preserve that show signs of the disease",
  },
];

export const populationCount: Template = {
  id: "samp.population-count",
  skill: SKILL,
  label: "Estimate a count in the population from a random sample",
  difficulty: [3, 6],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = rng.pick(COUNT_CTX);
    if (format === "spr" || rng.bool(0.55)) {
      const n = rng.pick([20, 25, 40, 50, 60, 80, 100, 120]);
      const k = rng.int(Math.ceil(n * 0.15), Math.floor(n * 0.85));
      const N = n * rng.int(8, 60);
      const est = F(k * N, n);
      return {
        format,
        stem: `A researcher selected ${n} ${c.pick} at random from ${c.from}, which has ${prose(N)} ${c.pick} in all. Of the ${n} ${c.pick} selected, ${k} ${c.has}. Based on this sample, what is the best estimate of the number of ${c.noun}?`,
        answer: numAns(est),
        slips: [
          numSlip(N - est.n, `you estimated the number that ${c.not}`),
          numSlip(k, "you gave the count in the sample, not in the population"),
          numSlip(N - k, "you subtracted the sample count from the population size"),
          numSlip(
            F(k * N, N - n),
            "you divided by the number not sampled instead of by the sample size"
          ),
        ].filter((s) => s.value!.asRat()!.isInt()),
        asks: `the number in the whole population of ${prose(N)}, scaled up from the sample's share`,
        steps: [
          {
            label: "Find the sample's share",
            work: m(`\\frac{${k}}{${n}}${F(k, n).d !== n ? ` = ${num(F(k, n))}` : ""}`),
          },
          {
            label: "Apply it to the population",
            work: m(`\\frac{${k}}{${n}} \\times ${num(N)} = ${num(est)}`),
          },
        ],
        check: `The ratio ${m(`${num(est)} : ${num(N)}`)} is the same as the sample's ratio, ${m(`${k} : ${n}`)}, since both reduce to ${m(`${F(k, n).n} : ${F(k, n).d}`)}`,
        tip: "A random sample's proportion is the best estimate of the population's proportion; multiply it by the population size",
        hint: "What fraction of the sample has the trait?",
        difficulty: format === "spr" ? 4 : 3,
        isCorrect: (cand) => {
          const x = valueOf(cand);
          return x !== null && x.mul(n).eq(F(k).mul(N));
        },
      };
    }
    const N = rng.pick([8000, 12000, 20000, 25000, 30000, 40000, 50000]);
    const n = rng.int(300, 2500);
    const p = rng.int(20, 80);
    const mg = F(rng.int(12, 45), 10);
    const lo = F(p).sub(mg).mul(N).div(100);
    const hi = F(p).add(mg).mul(N).div(100);
    need(lo.isInt() && hi.isInt(), "whole bounds");
    const inside = lo.add(
      hi
        .sub(lo)
        .mul(rng.pick([1, 2, 3]))
        .div(4)
    );
    const roundIn = F(Math.round(inside.toNumber() / 10) * 10);
    need(roundIn.gt(lo) && roundIn.lt(hi), "inside value");
    const below = F(Math.round((lo.toNumber() * 0.9) / 10) * 10);
    const above = F(Math.round((hi.toNumber() * 1.08) / 10) * 10);
    const sampleCount = F(p * n, 100);
    const inRange = (x: Frac) => !x.lt(lo) && !x.gt(hi);
    const pct = (q: Frac) => `${d(q)}\\%`;
    return {
      format: "mc",
      stem: `From a population of ${prose(N)} people, ${prose(n)} were selected at random and surveyed about a proposed law. Based on the survey, it is estimated that ${p}% of the people in the population support the law, with an associated margin of error of ${proseDec(mg)}%. Based on these results, which of the following is a plausible value for the total number of people in the population who support the law?`,
      answer: numAns(roundIn),
      slips: [
        ...(sampleCount.isInt()
          ? [
              numSlip(
                sampleCount,
                `you applied the percent to the ${prose(n)} people surveyed instead of to the whole population`
              ),
            ]
          : []),
        numSlip(
          below,
          `it is below the plausible range, which starts at ${proseDec(F(p).sub(mg))}% of ${prose(N)}, or ${prose(lo.n)}`
        ),
        numSlip(
          above,
          `it is above the plausible range, which ends at ${proseDec(F(p).add(mg))}% of ${prose(N)}, or ${prose(hi.n)}`
        ),
        numSlip(mg.mul(N).div(100), "you applied the margin of error alone to the population"),
      ].filter((s) => s.value!.asRat()!.isInt() && !inRange(s.value!.asRat()!)),
      asks: "a count in the whole population that falls inside the plausible range",
      steps: [
        {
          label: "Find the plausible percents",
          work: `${p}% minus and plus ${proseDec(mg)}%: from ${proseDec(F(p).sub(mg))}% to ${proseDec(F(p).add(mg))}%`,
        },
        {
          label: "Turn them into counts",
          work: `${m(`${pct(F(p).sub(mg))} \\times ${num(N)} = ${num(lo)}`)} and ${m(`${pct(F(p).add(mg))} \\times ${num(N)} = ${num(hi)}`)}`,
        },
        {
          label: "Pick the count in that range",
          work: `${prose(roundIn.n)} lies between ${prose(lo.n)} and ${prose(hi.n)}`,
        },
      ],
      check: `${prose(roundIn.n)} out of ${prose(N)} is ${m(pct(roundIn.mul(100).div(N)))}, within ${proseDec(mg)} percentage points of ${p}%`,
      tip: "Apply the estimate and margin of error to the population size, not to the sample size",
      hint: "Turn the plausible range of percents into a range of counts.",
      difficulty: rng.pick([5, 6]),
      isCorrect: (cand) => {
        const x = valueOf(cand);
        return x !== null && !x.mul(100).div(N).sub(p).abs().gt(mg);
      },
    };
  },
};

export const TEMPLATES: Template[] = [interval, sampleSize, populationCount];
