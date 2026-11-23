/*
 * m-mean-median-and-spread: centre, range and standard deviation (Problem-Solving and Data
 * Analysis). Item models after the bank's own questions for this skill: the mean, median or
 * range of a short list; the mean or median from a frequency table, dot plot or bar graph; a
 * missing value from a mean; and the mean of two groups combined.
 * Every statistic is computed exactly from the data drawn, and every check recounts the data
 * by another route (deviations from the mean add to 0; the median has half the values on each
 * side; the range is the widest gap between two values).
 */
import { need, Retry } from "../core/build";
import { F } from "../core/frac";
import type { Rng } from "../core/rng";
import { m, num } from "../core/tex";
import type { Draft, Slip, Template } from "../core/types";
import {
  ascending,
  barFig,
  dotFig,
  expand,
  isMeanOf,
  isMedianOf,
  isRangeOf,
  listText,
  meanOf,
  medianOf,
  numAns,
  numSlip,
  ordinal,
  prose,
  sumTex,
  tableFig,
  total,
  valueOf,
  wholeOnly,
  type Pair,
} from "./_data-common";
import { FREQ_CTX, LIST_CTX, type ListCtx } from "./_data-mms-contexts";
import { combinedMean, missingValue } from "./_data-mms-mean";

const SKILL = "m-mean-median-and-spread";

/** The most common value, when one value appears more often than every other; else null. */
function modeOf(xs: readonly number[]): number | null {
  const counts = new Map<number, number>();
  for (const x of xs) counts.set(x, (counts.get(x) ?? 0) + 1);
  const best = Math.max(...counts.values());
  const tops = [...counts].filter(([, c]) => c === best);
  return best > 1 && tops.length === 1 ? tops[0][0] : null;
}

/** Products "v \times f" added up, then their sum, for a total from a frequency table. */
function productsTex(pairs: readonly Pair[]): string {
  return pairs.map(([v, f]) => `${num(v)} \\times ${num(f)}`).join(" + ");
}

// ---------------------------------------------------------------- the mean, median or range of a list

type ListAsk = "mean" | "median" | "range";

/** n values on the context's grid whose mean is a whole number of steps. */
function meanList(rng: Rng, n: number, c: ListCtx): { values: number[]; mu: number } {
  const loK = Math.ceil(c.lo / c.step);
  const hiK = Math.floor(c.hi / c.step);
  const spread = Math.max(3, Math.floor((hiK - loK) / 4));
  for (let tries = 0; tries < 60; tries++) {
    const muK = rng.int(loK + spread, hiK - spread);
    const devs = Array.from({ length: n - 1 }, () => rng.int(-spread, spread));
    const last = -total(devs);
    if (Math.abs(last) > spread) continue;
    devs.push(last);
    const values = devs.map((d) => (muK + d) * c.step);
    if (new Set(values).size < 4) continue;
    return { values, mu: muK * c.step };
  }
  throw new Retry("no list with a whole mean");
}

export const listCenter: Template = {
  id: "mms.list-center",
  skill: SKILL,
  label: "Mean, median or range of a short list",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const ask: ListAsk = rng.pick(["mean", "mean", "median", "median", "range"] as const);
    const plain = rng.bool(0.25);
    const c: ListCtx = plain
      ? {
          props: "values",
          prop: "value",
          prep: "in",
          subject: "",
          short: "",
          lo: 10,
          hi: 60,
          step: 1,
        }
      : rng.pick(LIST_CTX);
    const n = ask === "median" ? rng.pick([5, 6, 7, 8, 9]) : rng.pick([5, 6, 7]);
    let values: number[];
    if (ask === "mean") {
      values = meanList(rng, n, c).values;
    } else {
      const loK = Math.ceil(c.lo / c.step);
      const hiK = Math.floor(c.hi / c.step);
      values = Array.from({ length: n }, () => rng.int(loK, hiK) * c.step);
    }
    need(new Set(values).size >= Math.min(4, n - 1), "too many repeats");
    const sortedShown = ask === "mean" ? rng.bool(0.5) : rng.bool(ask === "median" ? 0.3 : 0.4);
    const shown = sortedShown ? ascending(values) : rng.shuffle(values);
    const s = ascending(values);
    const S = total(values);
    const big = values.some((v) => v >= 1000);
    const u = c.unit ? `, in ${c.unit},` : "";
    const intro = plain ? "" : `The list gives the ${c.props}${u} ${c.prep} ${n} ${c.subject}.\n`;
    const question = plain
      ? ask === "range"
        ? "What is the range of the data set shown?"
        : `What is the ${ask} of the data set shown?`
      : ask === "range"
        ? `What is the range of the ${c.props}${u} ${c.prep} these ${n} ${c.short}?`
        : `What is the ${ask} ${c.prop}${u} ${c.prep} these ${n} ${c.short}?`;
    const stem = `${intro}${listText(shown)}\n${question}`;
    const mean = meanOf(values);
    const median = medianOf(values);
    const min = s[0];
    const max = s[n - 1];

    if (ask === "mean") {
      const mode = modeOf(values);
      const devs = values.map((v) => F(v).sub(mean));
      const slips: Slip[] = wholeOnly([
        numSlip(median, "you found the median, the middle value, instead of the mean"),
        numSlip(F(min + max, 2), "you averaged only the smallest and largest values"),
        numSlip(
          F(S, n - 1),
          `you divided the total by ${n - 1} instead of by ${n}, the number of values`
        ),
        ...(mode !== null
          ? [numSlip(mode, "you chose the value that appears most often (the mode)")]
          : []),
        numSlip(F(S, n + 1), `you divided the total by ${n + 1} instead of by ${n}`),
        numSlip(S, "you found the total but did not divide it by the number of values"),
      ]);
      return {
        format,
        stem,
        answer: numAns(mean),
        slips,
        asks: `the mean of the ${n} values in the list: their total divided by ${n}`,
        steps: [
          { label: "Add the values", work: m(`${sumTex(shown)} = ${num(S)}`) },
          {
            label: "Divide by the number of values",
            work: `There are ${n} values, so the mean is ${m(`\\frac{${num(S)}}{${n}} = ${num(mean)}`)}`,
          },
        ],
        check: `The differences from ${m(num(mean))} are ${m(devs.map((d) => num(d)).join(", "))}, and they add to ${m("0")}, as differences from the mean always do`,
        tip: "The mean is the total of the values divided by how many values there are; the order of the list does not matter",
        hint: "Find the total of the list first, then decide what to divide it by.",
        difficulty: Math.min(3, 1 + (n >= 7 ? 1 : 0) + (big || format === "spr" ? 1 : 0)),
        isCorrect: (cand) => {
          const v = valueOf(cand);
          return v !== null && isMeanOf(values, v);
        },
      };
    }

    if (ask === "median") {
      const odd = n % 2 === 1;
      const mid = (n + 1) / 2;
      const printedMiddle = odd ? F(shown[mid - 1]) : F(shown[n / 2 - 1] + shown[n / 2], 2);
      const slips: Slip[] = [
        ...(sortedShown
          ? []
          : [
              numSlip(
                printedMiddle,
                "you took the middle of the list as printed, without putting the values in order first"
              ),
            ]),
        ...(odd
          ? [
              numSlip(
                s[mid],
                `you counted to the ${ordinal(mid + 1)} value; with ${n} values, the middle one is the ${ordinal(mid)}`
              ),
              numSlip(
                s[mid - 2],
                `you counted to the ${ordinal(mid - 1)} value; with ${n} values, the middle one is the ${ordinal(mid)}`
              ),
            ]
          : [
              numSlip(
                s[n / 2 - 1],
                `you used only the ${ordinal(n / 2)} value; with ${n} values, the median is halfway between the ${ordinal(n / 2)} and ${ordinal(n / 2 + 1)} values`
              ),
              numSlip(
                s[n / 2],
                `you used only the ${ordinal(n / 2 + 1)} value; with ${n} values, the median is halfway between the ${ordinal(n / 2)} and ${ordinal(n / 2 + 1)} values`
              ),
            ]),
        ...(mean.terminates() ? [numSlip(mean, "you found the mean instead of the median")] : []),
        numSlip(F(min + max, 2), "you averaged the smallest and largest values"),
      ];
      const middleWork = odd
        ? `With ${n} values, the median is the ${ordinal(mid)} value: ${m(num(median))}`
        : `With ${n} values, the median is halfway between the ${ordinal(n / 2)} and ${ordinal(n / 2 + 1)} values: ${m(`\\frac{${num(s[n / 2 - 1])} + ${num(s[n / 2])}}{2} = ${num(median, { decimal: true })}`)}`;
      return {
        format,
        stem,
        answer: numAns(median),
        slips,
        asks: `the median of the ${n} values: the middle value once they are in order`,
        steps: [
          { label: "Order the values from least to greatest", work: listText(s) },
          { label: "Find the middle of the ordered list", work: middleWork },
        ],
        check: odd
          ? `In the ordered list, ${(n - 1) / 2} values come before ${m(num(median))} and ${(n - 1) / 2} come after it`
          : `In the ordered list, ${n / 2} values sit at or below ${m(num(s[n / 2 - 1]))} and ${n / 2} sit at or above ${m(num(s[n / 2]))}, so ${m(num(median, { decimal: true }))} splits the list in half`,
        tip: "Always put the list in order before finding the median; with an even number of values, the median is the mean of the two middle values",
        hint: sortedShown
          ? "Count how many values there are, then find the middle position."
          : "Write the values in order from least to greatest first.",
        difficulty: Math.min(3, 1 + (sortedShown ? 0 : 1) + (odd ? 0 : 1)),
        isCorrect: (cand) => {
          const v = valueOf(cand);
          return v !== null && isMedianOf(values, v);
        },
      };
    }

    const first = shown[0];
    const last = shown[n - 1];
    const slips: Slip[] = [
      numSlip(
        max,
        "you gave the largest value instead of the difference between the largest and smallest values"
      ),
      ...(sortedShown
        ? []
        : [
            numSlip(
              Math.abs(last - first),
              "you subtracted the first and last values in the list as printed, which are not the extremes"
            ),
          ]),
      numSlip(max + min, "you added the largest and smallest values instead of subtracting"),
      ...(median.isInt()
        ? [numSlip(median, "you found the median, a measure of center, not the range")]
        : []),
      numSlip(min, "you gave the smallest value instead of the difference"),
    ];
    return {
      format,
      stem,
      answer: numAns(max - min),
      slips,
      asks: `the range of the ${n} values: the largest value minus the smallest value`,
      steps: [
        {
          label: "Find the two extreme values",
          work: `The largest value is ${prose(max)} and the smallest is ${prose(min)}`,
        },
        { label: "Find the difference", work: m(`${num(max)} - ${num(min)} = ${num(max - min)}`) },
      ],
      check: `Every value lies from ${prose(min)} to ${prose(max)}, and ${m(`${num(min)} + ${num(max - min)} = ${num(max)}`)}, so no two values are farther apart than ${prose(max - min)}`,
      tip: "The range is the largest value minus the smallest value, so only the two extremes matter",
      hint: "Find the most extreme values in the list.",
      difficulty: sortedShown ? 1 : 2,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && isRangeOf(values, v);
      },
    };
  },
};

// ---------------------------------------------------------------- the mean or median from a frequency display

/** Frequencies whose weighted mean is a chosen value: the values below and above balance. */
function balancedFreqs(rng: Rng, k: number, half: boolean): { freqs: number[]; t: number } {
  for (let tries = 0; tries < 80; tries++) {
    const t = half ? rng.int(0, k - 2) + 0.5 : rng.int(1, k - 2);
    const freqs = Array.from({ length: k }, () => rng.int(1, 9));
    const D = (i: number) => 2 * (i - t);
    const R = freqs.reduce((s, f, i) => s + f * D(i), 0);
    if (R > 0) {
      const j = Math.ceil(t) - 1;
      if (R % Math.abs(D(j)) !== 0) continue;
      freqs[j] += R / Math.abs(D(j));
    } else if (R < 0) {
      const j = Math.floor(t) + 1;
      if (-R % D(j) !== 0) continue;
      freqs[j] += -R / D(j);
    }
    const N = total(freqs);
    if (Math.max(...freqs) > 24 || N < 12 || N > 80) continue;
    return { freqs, t };
  }
  throw new Retry("no balanced frequencies");
}

export const frequencyCenter: Template = {
  id: "mms.frequency-center",
  skill: SKILL,
  label: "Mean or median from a frequency table, dot plot or bar graph",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = rng.pick(FREQ_CTX);
    const ask = rng.bool(0.6) ? "mean" : "median";
    const k = rng.int(c.count[0], c.count[1]);
    const a = rng.int(c.start[0], c.start[1]) * c.step;
    const vals = Array.from({ length: k }, (_, i) => a + i * c.step);
    let freqs: number[];
    let half = false;
    if (ask === "mean") {
      half = rng.bool(0.3);
      freqs = balancedFreqs(rng, k, half).freqs;
    } else {
      freqs = Array.from({ length: k }, () => rng.int(1, 14));
    }
    const pairs: Pair[] = vals.map((v, i) => [v, freqs[i]]);
    const N = total(freqs);
    const data = expand(pairs);
    const S = total(data);
    const mean = meanOf(data);
    const median = medianOf(data);
    need(ask === "median" || mean.terminates(), "mean must be a clean decimal");
    const tallest = Math.max(...freqs);
    const display = rng.pick(
      tallest <= 9 && N <= 36
        ? (["table", "table", "dot", "bar"] as const)
        : (["table", "table", "bar"] as const)
    );
    const yStep = tallest <= 10 ? 1 : tallest <= 20 ? 2 : 5;
    const figure =
      display === "table"
        ? tableFig(
            [c.head[0], c.head[1]],
            pairs.map(([v, f]) => [String(v), String(f)])
          )
        : display === "dot"
          ? dotFig(pairs, vals[0], vals[k - 1], c.head[0], { step: c.step })
          : barFig(
              vals.map(String),
              [{ values: freqs }],
              Math.ceil((tallest + 1) / yStep) * yStep,
              { x: c.head[0], y: c.head[1] },
              { yStep }
            );
    const lead =
      display === "table"
        ? "The frequency table summarizes"
        : display === "dot"
          ? "The dot plot shows"
          : "The bar graph shows";
    const stem = `${lead} ${c.what(N)}.\n${c.ask(ask, N)}`;
    const readIt =
      display === "table"
        ? "the table"
        : display === "dot"
          ? "the dot plot (each dot is one value)"
          : "the bar heights";
    const mode = modeOf(data);

    if (ask === "mean") {
      const below = pairs.filter(([v]) => F(v).lt(mean));
      const above = pairs.filter(([v]) => F(v).gt(mean));
      const pull = (ps: Pair[]) => ps.reduce((s, [v, f]) => s.add(F(v).sub(mean).mul(f)), F(0));
      const unweighted = meanOf(vals);
      const raw = [
        numSlip(
          unweighted,
          `you averaged the ${k} values without weighting them by their frequencies`
        ),
        ...(mode !== null
          ? [numSlip(mode, "you chose the value with the greatest frequency (the mode)")]
          : []),
        ...(median.terminates()
          ? [numSlip(median, "you found the median instead of the mean")]
          : []),
        numSlip(
          F(S, k),
          `you divided the total by ${k}, the number of rows, instead of by ${N}, the number of values`
        ),
        numSlip(F(N, k), "you averaged the frequencies instead of the values"),
        numSlip(S, `you found the total but did not divide it by ${N}`),
      ];
      const slips = mean.isInt()
        ? wholeOnly(raw)
        : raw.filter((s) => s.value!.asRat()!.terminates());
      return {
        format,
        stem,
        figure,
        answer: numAns(mean),
        slips,
        asks: `the mean of all ${N} values, so each value counts as many times as its frequency`,
        steps: [
          {
            label: "Find the total of all the values",
            work: `From ${readIt}, multiply each value by its frequency and add: ${m(`${productsTex(pairs)} = ${num(S)}`)}`,
          },
          { label: "Count the values", work: m(`${sumTex(freqs)} = ${num(N)}`) },
          {
            label: "Divide the total by the count",
            work: m(`\\frac{${num(S)}}{${num(N)}} = ${num(mean, { decimal: true })}`),
          },
        ],
        check: `Measured from ${m(num(mean, { decimal: true }))}, the values below it add ${m(num(pull(below), { decimal: true }))} and the values above it add ${m(num(pull(above), { decimal: true }))}. These cancel, so ${m(num(mean, { decimal: true }))} is the balance point of the data`,
        tip: "In a frequency table each value counts as many times as its frequency: multiply, add, then divide by the total frequency",
        hint: "Each value appears as many times as its frequency, so start by finding the total of all the values.",
        difficulty: Math.min(
          5,
          3 + (half ? 1 : 0) + (format === "spr" && k >= 5 ? 1 : 0) - (k === 4 && !half ? 1 : 0)
        ),
        isCorrect: (cand) => {
          const v = valueOf(cand);
          return v !== null && isMeanOf(data, v);
        },
      };
    }

    // The median: find the middle position by counting up the frequencies.
    const odd = N % 2 === 1;
    const p1 = odd ? (N + 1) / 2 : N / 2;
    const p2 = odd ? p1 : N / 2 + 1;
    let run = 0;
    const spans: string[] = [];
    for (const [v, f] of pairs) {
      spans.push(
        f === 1
          ? `the ${ordinal(run + 1)} value is ${prose(v)}`
          : `values ${run + 1} to ${run + f} are ${prose(v)}`
      );
      run += f;
    }
    const middleRow = k % 2 ? F(vals[(k - 1) / 2]) : F(vals[k / 2 - 1] + vals[k / 2], 2);
    const freqMedian = medianOf(freqs);
    const below = data.filter((x) => F(x).lt(median)).length;
    const above = data.filter((x) => F(x).gt(median)).length;
    const slips: Slip[] = [
      numSlip(
        middleRow,
        "you took the middle of the values listed, without using their frequencies"
      ),
      ...(mode !== null
        ? [numSlip(mode, "you chose the value with the greatest frequency (the mode)")]
        : []),
      ...(mean.terminates() ? [numSlip(mean, "you found the mean instead of the median")] : []),
      numSlip(
        freqMedian,
        "you found the median of the frequencies instead of the median of the values"
      ),
      numSlip(F(vals[0] + vals[k - 1], 2), "you averaged the smallest and largest values"),
    ];
    return {
      format,
      stem,
      figure,
      answer: numAns(median),
      slips,
      asks: `the median of all ${N} values: the middle value when every value is listed in order`,
      steps: [
        {
          label: "Find the middle position",
          work: odd
            ? `There are ${m(`${sumTex(freqs)} = ${num(N)}`)} values, so the median is the ${ordinal(p1)} value`
            : `There are ${m(`${sumTex(freqs)} = ${num(N)}`)} values, so the median is halfway between the ${ordinal(p1)} and ${ordinal(p2)} values`,
        },
        { label: "Count up through the values in order", work: `${spans.join(", ")}` },
        {
          label: "Read off the median",
          work: odd
            ? `The ${ordinal(p1)} value is ${m(num(median))}`
            : `The ${ordinal(p1)} and ${ordinal(p2)} values are ${prose(data[p1 - 1])} and ${prose(data[p2 - 1])}, so the median is ${m(num(median, { decimal: true }))}`,
        },
      ],
      check: `${below} values are less than ${m(num(median, { decimal: true }))} and ${above} are greater, so neither side holds more than half of the ${N} values`,
      tip: "For the median from a frequency table, find the middle position from the total frequency, then count up the frequencies until you reach it",
      hint: "Add the frequencies to find how many values there are, then find the middle position.",
      difficulty: Math.min(
        5,
        3 + (odd ? 0 : 1) + (format === "spr" ? 1 : 0) - (display === "dot" ? 1 : 0)
      ),
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && isMedianOf(data, v);
      },
    };
  },
};

// ---------------------------------------------------------------- a missing value from a mean

export const TEMPLATES: Template[] = [listCenter, frequencyCenter, missingValue, combinedMean];
