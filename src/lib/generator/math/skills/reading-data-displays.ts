/*
 * m-reading-data-displays: histograms, box plots, dot plots, bar graphs and frequency tables.
 * Item models after the bank's own questions for this skill: read a frequency, a value or an
 * extreme from a display; count (or give the percent of) the values in a range from a histogram
 * or grouped table; and read or compare box plots. Every answer is recounted from the drawn data
 * in the check (a value's frequency by counting the data list, a range count by testing each
 * bar's interval, a box plot statistic by adding back).
 */
import { need } from "../core/build";
import { F } from "../core/frac";
import type { Rng } from "../core/rng";
import { m, num, pct } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import {
  barFig,
  boxFig,
  dotFig,
  expand,
  histFig,
  numAns,
  numSlip,
  sumTex,
  tableFig,
  total,
  valueOf,
  type Pair,
} from "./_data-common";
import { BIN_CTX, BOX_CTX, READ_CTX, type BoxCtx } from "./_data-rdd-contexts";

const SKILL = "m-reading-data-displays";

// ---------------------------------------------------------------- read a frequency, a value or an extreme

export const readValue: Template = {
  id: "rdd.read-value",
  skill: SKILL,
  label: "Read a frequency, a value or an extreme from a table, bar graph or dot plot",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = rng.pick(READ_CTX);
    const k = rng.int(c.k[0], c.k[1]);
    const a = rng.int(c.start[0], c.start[1]);
    const vals = Array.from({ length: k }, (_, i) => a + i);
    const freqs = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], k);
    const pairs: Pair[] = vals.map((v, i) => [v, freqs[i]]);
    const N = total(freqs);
    const data = expand(pairs);
    const tallest = Math.max(...freqs);
    const display = rng.pick(
      tallest <= 9 ? (["table", "bar", "dot"] as const) : (["table", "table", "bar"] as const)
    );
    const yStep = tallest <= 10 ? 1 : 2;
    const figure =
      display === "table"
        ? tableFig(
            [...c.head],
            pairs.map(([v, f]) => [String(v), String(f)])
          )
        : display === "dot"
          ? dotFig(pairs, a - 1, a + k, c.head[0])
          : barFig(
              vals.map(String),
              [{ values: freqs }],
              Math.ceil((tallest + 1) / yStep) * yStep,
              { x: c.head[0], y: c.head[1] },
              { yStep }
            );
    const shown =
      display === "table" ? "frequency table" : display === "dot" ? "dot plot" : "bar graph";
    const lead = `The ${shown} summarizes ${c.what(N)}.`;
    const where =
      display === "table"
        ? (v: number) => `the row for ${v}`
        : display === "dot"
          ? (v: number) => `the stack of dots above ${v}`
          : (v: number) => `the bar for ${v}`;
    const ask = rng.pick(["count", "count", "value", "extreme"] as const);
    const countOf = (v: number) => data.filter((x) => x === v).length;

    if (ask === "count") {
      const i = rng.int(0, k - 1);
      const v = vals[i];
      const f = freqs[i];
      const neighbor = i + 1 < k ? i + 1 : i - 1;
      return {
        format,
        stem: `${lead}\n${c.count(v)}`,
        figure,
        answer: numAns(f),
        slips: [
          numSlip(v, "you gave the data value instead of how often it occurs"),
          numSlip(freqs[neighbor], `you read ${where(vals[neighbor])} instead of ${where(v)}`),
          numSlip(N, `you gave the total, ${N}, instead of the frequency of one value`),
          numSlip(
            N - f,
            `you counted the ${shown === "dot plot" ? "dots" : "values"} that are not ${v}`
          ),
        ],
        asks: `the frequency of the value ${v}: how many times it occurs`,
        steps: [
          { label: `Find the value ${v}`, work: `Look at ${where(v)}` },
          {
            label: "Read its frequency",
            work:
              display === "table"
                ? `The frequency in that row is ${f}`
                : display === "dot"
                  ? `There are ${f} dots above ${v}`
                  : `The bar reaches ${f} on the vertical axis`,
          },
        ],
        check: `The frequencies ${m(sumTex(freqs))} add to ${N}, the total, and ${f} of those are the value ${v}`,
        tip: "In a frequency display, the data values run along one side and the frequencies tell how many times each value occurs; keep the two apart",
        hint: `Find ${v} among the data values, not among the frequencies.`,
        difficulty: display === "dot" ? 1 : format === "spr" ? 2 : 1,
        isCorrect: (cand) => {
          const x = valueOf(cand);
          return x !== null && x.eq(countOf(v));
        },
      };
    }

    if (ask === "value") {
      const i = rng.int(0, k - 1);
      const f = freqs[i];
      const most = vals[freqs.indexOf(tallest)];
      const slips: Slip[] = [
        numSlip(f, "you gave the frequency itself instead of the data value that has it"),
        ...(i + 1 < k ? [numSlip(vals[i + 1], `you read the value next to ${vals[i]}`)] : []),
        ...(i > 0 ? [numSlip(vals[i - 1], `you read the value next to ${vals[i]}`)] : []),
        numSlip(most, "you chose the value with the greatest frequency"),
      ];
      return {
        format,
        stem: `${lead}\nWhich ${c.valueName} has a frequency of ${f}?`,
        figure,
        answer: numAns(vals[i]),
        slips,
        asks: `the data value that occurs exactly ${f} times`,
        steps: [
          {
            label: `Find the frequency ${f}`,
            work: `Scan the frequencies for ${f}: it belongs to ${where(vals[i])}`,
          },
          {
            label: "Read the data value",
            work: `The value with a frequency of ${f} is ${vals[i]}`,
          },
        ],
        check: `No other value has a frequency of ${f}: the frequencies are ${freqs.join(", ")}`,
        tip: "Read the question for which column it gives you: a frequency leads to a data value, and a data value leads to a frequency",
        hint: `Look for ${f} among the frequencies.`,
        difficulty: format === "spr" ? 2 : 1,
        isCorrect: (cand) => {
          const x = valueOf(cand);
          return x !== null && x.isInt() && countOf(x.n) === f;
        },
      };
    }

    const max = rng.bool(0.5);
    const v = max ? vals[k - 1] : vals[0];
    const word = max ? "maximum" : "minimum";
    const extremeFreq = max ? Math.max(...freqs) : Math.min(...freqs);
    const valueAtExtremeFreq = vals[freqs.indexOf(extremeFreq)];
    const slips: Slip[] = [
      numSlip(
        freqs[max ? k - 1 : 0],
        `you gave the frequency of the ${word} value instead of the value`
      ),
      numSlip(
        extremeFreq,
        `you gave the ${max ? "greatest" : "least"} frequency instead of the ${word} data value`
      ),
      numSlip(
        valueAtExtremeFreq,
        `you chose the value with the ${max ? "greatest" : "least"} frequency`
      ),
      numSlip(N, "you gave the total number of values"),
      numSlip(max ? vals[k - 2] : vals[1], `you skipped the ${max ? "last" : "first"} value`),
    ];
    return {
      format,
      stem: `${lead}\nWhat is the ${word} ${c.valueName} in the data set?`,
      figure,
      answer: numAns(v),
      slips,
      asks: `the ${max ? "greatest" : "least"} data value that occurs at least once, not a frequency`,
      steps: [
        {
          label: "Find the data values",
          work: `The data values are ${vals.join(", ")}, each with a frequency of at least 1`,
        },
        { label: `Pick the ${max ? "greatest" : "least"} one`, work: `The ${word} value is ${v}` },
      ],
      check: `Every one of the ${N} values is ${max ? "at most" : "at least"} ${v}, and ${v} occurs ${countOf(v)} times, so it is in the data set`,
      tip: "The minimum and maximum are data values; the frequencies only say how many times each value occurs",
      hint: "Look at the data values, not at how often they occur.",
      difficulty: format === "spr" ? 2 : rng.pick([1, 2]),
      isCorrect: (cand) => {
        const x = valueOf(cand);
        return (
          x !== null &&
          x.isInt() &&
          countOf(x.n) > 0 &&
          data.every((d) => (max ? d <= x.n : d >= x.n))
        );
      },
    };
  },
};

// ---------------------------------------------------------------- count or percent of the values in a range

export const countRange: Template = {
  id: "rdd.count-range",
  skill: SKILL,
  label:
    "How many (or what percent) of the values lie in a range, from a histogram or grouped table",
  difficulty: [2, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = rng.pick(BIN_CTX);
    const k = rng.int(4, 6);
    const w = c.width;
    const lo = rng.int(c.lo[0] / w, c.lo[1] / w) * w;
    const percent = rng.bool(0.3);
    const N = percent ? rng.pick([20, 25, 40, 50]) : rng.int(18, 60);
    // Counts that add to N, each at least 1.
    const cuts = rng
      .sample(
        Array.from({ length: N - 1 }, (_, i) => i + 1),
        k - 1
      )
      .sort((x, y) => x - y);
    const counts = [...cuts, N].map((cut, i) => cut - (i ? cuts[i - 1] : 0));
    need(Math.max(...counts) <= 20, "a bar too tall");
    const edges = counts.map((_, i) => lo + i * w);
    const kind = rng.pick(["atLeast", "lessThan", "between"] as const);
    const i1 = kind === "between" ? rng.int(1, k - 3 < 1 ? 1 : k - 3) : rng.int(1, k - 1);
    const i2 = kind === "between" ? rng.int(i1 + 1, k - 1) : i1;
    need(kind !== "between" || i2 > i1, "empty range");
    const X = edges[i1];
    const Y = edges[i2];
    const inRange = (left: number) =>
      kind === "atLeast"
        ? left >= X
        : kind === "lessThan"
          ? left + w <= X
          : left >= X && left + w <= Y;
    const chosen = counts.filter((_, i) => inRange(edges[i]));
    const count = total(chosen);
    need(!percent || (count * 100) % N === 0, "percent not whole");
    const table = rng.bool(0.4);
    const label = (left: number) => `${left} to ${left + w - 1}`;
    const figure = table
      ? tableFig(
          [c.axis.replace(/ \(.*\)$/, "") + ` (${c.unit})`, `Number of ${c.items}`],
          edges.map((e, i) => [label(e), String(counts[i])])
        )
      : histFig(
          edges.map((e, i) => [e, counts[i]] as Pair),
          w,
          Math.max(...counts) + (Math.max(...counts) > 10 ? 2 : 1),
          { x: c.axis, y: `Number of ${c.items}` },
          Math.max(...counts) > 10 ? { yStep: 2 } : {}
        );
    const phrase =
      kind === "atLeast"
        ? table
          ? `${X} or more ${c.unit}`
          : `at least ${X} ${c.unit}`
        : kind === "lessThan"
          ? table
            ? `${X - 1} or fewer ${c.unit}`
            : `less than ${X} ${c.unit}`
          : table
            ? `from ${X} to ${Y - 1} ${c.unit}`
            : `at least ${X} ${c.unit} but less than ${Y} ${c.unit}`;
    const note = table
      ? ""
      : " Each bar includes the values at its left edge but not the values at its right edge.";
    const lead = table
      ? `The table summarizes ${c.what(N)}, rounded down to a whole number of ${c.unit}.`
      : `The histogram summarizes ${c.what(N)}.${note}`;
    const question = percent
      ? `What percent of the ${N} ${c.items} have a ${c.measure} of ${phrase}?`
      : `How many of the ${N} ${c.items} have a ${c.measure} of ${phrase}?`;
    const bars = table ? "rows" : "bars";
    const usedIdx = counts.map((_, i) => i).filter((i) => inRange(edges[i]));
    const single = counts[usedIdx[0]];
    const offIdx =
      kind === "atLeast"
        ? usedIdx.slice(1)
        : kind === "lessThan"
          ? usedIdx.slice(0, -1)
          : usedIdx.slice(0, -1);
    const off = total(offIdx.map((i) => counts[i]));
    const wider =
      kind === "atLeast"
        ? count + counts[i1 - 1]
        : kind === "lessThan"
          ? count + counts[i1]
          : count + (i2 < k ? counts[i2] : 0);
    const asNum = (x: number) => (percent ? F(x * 100, N) : F(x));
    const slipsRaw: Slip[] = [
      numSlip(asNum(N - count), "you counted the values outside the range instead of inside it"),
      numSlip(
        asNum(wider),
        `you included one ${table ? "row" : "bar"} too many: the boundary ${table ? "row" : "bar"} is not part of the range`
      ),
      ...(usedIdx.length > 1
        ? [numSlip(asNum(off), `you left out a ${table ? "row" : "bar"} that is part of the range`)]
        : []),
      ...(usedIdx.length > 1
        ? [
            numSlip(
              asNum(single),
              `you counted only the ${table ? "row" : "bar"} at ${edges[usedIdx[0]]}`
            ),
          ]
        : []),
      ...(percent ? [numSlip(count, "you gave the number of values, not the percent")] : []),
      numSlip(asNum(N), "you gave the total"),
    ];
    const answerValue = asNum(count);
    need(answerValue.isInt(), "whole answer");
    const answer: Answer = percent
      ? { text: m(pct(answerValue)), value: numAns(answerValue).value }
      : numAns(count);
    const slips = percent
      ? slipsRaw.map((s) =>
          s.why.startsWith("you gave the number") ? s : { ...s, text: m(pct(s.value!.asRat()!)) }
        )
      : slipsRaw;
    const usedList = usedIdx.map((i) =>
      table ? label(edges[i]) : `${edges[i]} to ${edges[i] + w}`
    );
    return {
      format: percent ? "mc" : format,
      stem: `${lead}\n${question}`,
      figure,
      answer,
      slips: slips.filter((s) => s.value!.asRat()!.isInt()),
      asks: percent
        ? `the share of all ${N} ${c.items}, as a percent, whose ${c.measure} is ${phrase}`
        : `the number of ${c.items} whose ${c.measure} is ${phrase}`,
      steps: [
        {
          label: `Find the ${bars} in the range`,
          work: `The ${bars} for ${usedList.join(", ")} cover ${phrase}`,
        },
        { label: "Add their counts", work: m(`${sumTex(chosen)} = ${count}`) },
        ...(percent
          ? [
              {
                label: "Turn the count into a percent",
                work: m(`\\frac{${count}}{${N}} \\times 100 = ${num(answerValue)}`) + "%",
              },
            ]
          : []),
      ],
      check: `The other ${bars} hold ${m(String(N - count))} ${c.items}, and ${m(`${count} + ${N - count} = ${N}`)}, the total`,
      tip: `Decide which ${bars} lie fully inside the range before adding; watch the ${bars} at the edge of the range`,
      hint: `Mark the ${bars} that belong to the range, then add them.`,
      difficulty: Math.min(4, 2 + (kind === "between" ? 1 : 0) + (percent ? 1 : 0)),
      isCorrect: (cand) => {
        const x = valueOf(cand);
        if (x === null) return false;
        let tally = 0;
        counts.forEach((ct, i) => {
          const left = edges[i];
          const right = left + w;
          const ok =
            kind === "atLeast"
              ? left >= X
              : kind === "lessThan"
                ? right <= X
                : left >= X && right <= Y;
          if (ok) tally += ct;
        });
        return percent ? x.mul(N).eq(tally * 100) : x.eq(tally);
      },
    };
  },
};

// ---------------------------------------------------------------- box plots

type Five = [number, number, number, number, number];

function drawFive(rng: Rng, c: BoxCtx): Five {
  const slots = (c.hi - c.lo) / c.step;
  const picks = rng
    .sample(
      Array.from({ length: slots + 1 }, (_, i) => i),
      5
    )
    .sort((x, y) => x - y);
  return picks.map((p) => c.lo + p * c.step) as Five;
}

type Stat = "median" | "range" | "iqr" | "min" | "max";
const STAT_NAME: Record<Stat, string> = {
  median: "median",
  range: "range",
  iqr: "interquartile range",
  min: "minimum",
  max: "maximum",
};

function statOf(f: Five, s: Stat): number {
  if (s === "median") return f[2];
  if (s === "range") return f[4] - f[0];
  if (s === "iqr") return f[3] - f[1];
  return s === "min" ? f[0] : f[4];
}

function statWork(f: Five, s: Stat): string {
  if (s === "median") return `the line inside the box is at ${f[2]}`;
  if (s === "range")
    return `the whiskers end at ${f[0]} and ${f[4]}, so the range is ${m(`${f[4]} - ${f[0]} = ${f[4] - f[0]}`)}`;
  if (s === "iqr")
    return `the box runs from ${f[1]} to ${f[3]}, so the interquartile range is ${m(`${f[3]} - ${f[1]} = ${f[3] - f[1]}`)}`;
  return s === "min" ? `the left whisker ends at ${f[0]}` : `the right whisker ends at ${f[4]}`;
}

/** Wrong readings of one statistic from one box. */
function statSlips(f: Five, s: Stat): Slip[] {
  if (s === "median")
    return [
      numSlip(f[1], "you read the left edge of the box (the first quartile)"),
      numSlip(f[3], "you read the right edge of the box (the third quartile)"),
      numSlip(F(f[0] + f[4], 2), "you took the point halfway between the ends of the whiskers"),
      numSlip(F(f[1] + f[3], 2), "you took the point halfway between the edges of the box"),
    ];
  if (s === "range")
    return [
      numSlip(f[3] - f[1], "you found the width of the box (the interquartile range)"),
      numSlip(f[4], "you gave the maximum instead of maximum minus minimum"),
      numSlip(f[4] - f[2], "you subtracted the median from the maximum"),
      numSlip(f[3] - f[0], "you subtracted the minimum from the third quartile"),
    ];
  if (s === "iqr")
    return [
      numSlip(f[4] - f[0], "you found the range, from whisker to whisker"),
      numSlip(f[3] - f[2], "you measured only from the median to the third quartile"),
      numSlip(f[2] - f[1], "you measured only from the first quartile to the median"),
      numSlip(f[3], "you gave the third quartile instead of the width of the box"),
    ];
  if (s === "min")
    return [
      numSlip(f[1], "you read the left edge of the box, the first quartile"),
      numSlip(f[2], "you read the median"),
      numSlip(f[4], "you read the right end, the maximum"),
      numSlip(f[4] - f[0], "you found the range"),
    ];
  return [
    numSlip(f[3], "you read the right edge of the box, the third quartile"),
    numSlip(f[2], "you read the median"),
    numSlip(f[0], "you read the left end, the minimum"),
    numSlip(f[4] - f[0], "you found the range"),
  ];
}

export const boxPlotRead: Template = {
  id: "rdd.box-plot",
  skill: SKILL,
  label: "Read a box plot, or compare two box plots",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = rng.pick(BOX_CTX);
    const step = c.step;
    const axisOpts = { step, labelStep: step * ((c.hi - c.lo) / step > 12 ? 2 : 1) };
    if (rng.bool(0.55)) {
      const f = drawFive(rng, c);
      const s = rng.pick(["median", "median", "range", "iqr", "min", "max"] as const);
      const n = rng.int(20, 90);
      const value = statOf(f, s);
      return {
        format,
        stem: `${c.one(n)}\nWhat is the ${STAT_NAME[s]} of the data, in ${c.unit}?`,
        figure: boxFig([{ five: f }], c.lo, c.hi, c.axis, axisOpts),
        answer: numAns(value),
        slips: statSlips(f, s),
        asks: `the ${STAT_NAME[s]} shown by the box plot`,
        steps: [
          {
            label: "Read the five numbers",
            work: `Minimum ${f[0]}, first quartile ${f[1]}, median ${f[2]}, third quartile ${f[3]}, maximum ${f[4]}`,
          },
          { label: `Find the ${STAT_NAME[s]}`, work: statWork(f, s) },
        ],
        check:
          s === "range"
            ? m(`${f[0]} + ${value} = ${f[4]}`) + ", the right end of the plot"
            : s === "iqr"
              ? m(`${f[1]} + ${value} = ${f[3]}`) + ", the right edge of the box"
              : `About half the data lie on each side of the median at ${f[2]}, and the value ${value} matches the ${s === "median" ? "line inside the box" : s === "min" ? "left whisker's end" : "right whisker's end"}`,
        tip: "A box plot shows five numbers: the whisker ends are the minimum and maximum, the box edges are the quartiles, and the line inside is the median",
        hint:
          s === "range" || s === "iqr"
            ? "Decide which two of the five numbers you need to subtract."
            : "Name each part of the box plot before you read it.",
        difficulty: s === "min" || s === "max" ? 1 : s === "iqr" ? 3 : 2,
        isCorrect: (cand) => {
          const x = valueOf(cand);
          if (x === null) return false;
          if (s === "range") return x.add(f[0]).eq(f[4]);
          if (s === "iqr") return x.add(f[1]).eq(f[3]);
          return x.eq(s === "median" ? f[2] : s === "min" ? f[0] : f[4]);
        },
      };
    }
    const A = drawFive(rng, c);
    const B = drawFive(rng, c);
    const s = rng.pick(["median", "range", "range", "iqr"] as const);
    const a = statOf(A, s);
    const b = statOf(B, s);
    need(a !== b, "equal statistics");
    const diff = Math.abs(a - b);
    const other: Stat = s === "range" ? "iqr" : s === "iqr" ? "range" : "range";
    const name = STAT_NAME[s];
    return {
      format,
      stem: `${c.two} Each box plot summarizes ${rng.int(18, 60)} values.\nWhat is the positive difference between the ${name}s of the two data sets, in ${c.unit}?`,
      figure: boxFig(
        [
          { five: A, name: c.names[0] },
          { five: B, name: c.names[1] },
        ],
        c.lo,
        c.hi,
        c.axis,
        axisOpts
      ),
      answer: numAns(diff),
      slips: [
        numSlip(
          Math.abs(statOf(A, other) - statOf(B, other)),
          `you compared the ${STAT_NAME[other]}s instead of the ${name}s`
        ),
        numSlip(a + b, `you added the two ${name}s instead of subtracting`),
        numSlip(Math.max(a, b), `you gave the larger ${name} instead of the difference`),
        ...(s !== "median" ? [numSlip(Math.abs(A[2] - B[2]), "you compared the medians")] : []),
        numSlip(Math.abs(A[4] - B[4]), "you compared only the maximums"),
      ],
      asks: `the difference between the two ${name}s, larger minus smaller`,
      steps: [
        { label: `Find the ${name} for ${c.names[0]}`, work: statWork(A, s) },
        { label: `Find the ${name} for ${c.names[1]}`, work: statWork(B, s) },
        {
          label: "Find the difference",
          work: m(`${Math.max(a, b)} - ${Math.min(a, b)} = ${diff}`),
        },
      ],
      check: m(`${Math.min(a, b)} + ${diff} = ${Math.max(a, b)}`) + `, the larger ${name}`,
      tip: "When comparing box plots, compute the same statistic from each plot first, then compare",
      hint: `Find the ${name} of each data set separately.`,
      difficulty: s === "median" ? 3 : 4,
      isCorrect: (cand) => {
        const x = valueOf(cand);
        return x !== null && (x.add(a).eq(b) || x.add(b).eq(a)) && x.sign() > 0;
      },
    };
  },
};

export const TEMPLATES: Template[] = [readValue, countRange, boxPlotRead];
