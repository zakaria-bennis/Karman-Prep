/*
 * m-probability: simple and conditional probability, from counts and two-way tables. Item
 * models after the bank's own questions for this skill: the probability of one category (or
 * two, or "not" one) from a count or a frequency table; how many are in the last group when
 * the other groups' probabilities are given; and joint and conditional probability from a
 * two-way table, where the given condition picks the denominator. Every check recounts the
 * table's raw cells instead of reading its printed totals.
 */
import { need } from "../core/build";
import { F, Frac } from "../core/frac";
import { m, num } from "../core/tex";
import type { Draft, Slip, Template } from "../core/types";
import {
  andList,
  cap,
  numAns,
  numSlip,
  prose,
  rawFracAns,
  rawFracSlip,
  sprKey,
  sumTex,
  tableFig,
  total,
  valueOf,
} from "./_data-common";
import { TWO_CTX } from "./_data-prob-contexts";

const SKILL = "m-probability";

const plural = (w: string) => (/(ch|sh|s|x)$/.test(w) ? `${w}es` : `${w}s`);

// ---------------------------------------------------------------- one category, from a count or a table

interface CatCtx {
  intro: (n: number) => string;
  item: string;
  head: [string, string];
  cats: string[];
  sel: (cat: string) => string;
}

const CAT_CTX: CatCtx[] = [
  {
    intro: (n) =>
      `Each of the ${n} rocks in a collection was classified as shown in the frequency table.`,
    item: "rock",
    head: ["Type of rock", "Frequency"],
    cats: ["Igneous", "Metamorphic", "Sedimentary"],
    sel: (c) => `a rock that is ${c.toLowerCase()}`,
  },
  {
    intro: (n) =>
      `A carnival game has ${n} prizes. The table shows the number of each type of prize.`,
    item: "prize",
    head: ["Prize", "Number"],
    cats: ["Bracelet", "Keychain", "Yo-yo", "Sticker sheet"],
    sel: (c) => `a ${c.toLowerCase()}`,
  },
  {
    intro: (n) =>
      `A bag holds ${n} marbles. The table shows how many marbles of each color are in the bag.`,
    item: "marble",
    head: ["Color", "Number of marbles"],
    cats: ["Red", "Blue", "Green", "Yellow"],
    sel: (c) => `a ${c.toLowerCase()} marble`,
  },
  {
    intro: (n) =>
      `A deli has ${n} sandwiches available. The table shows how many of each type there are.`,
    item: "sandwich",
    head: ["Sandwich type", "Number"],
    cats: ["Turkey", "Ham", "Veggie", "Tuna"],
    sel: (c) => `a ${c.toLowerCase()} sandwich`,
  },
  {
    intro: (n) =>
      `A library display has ${n} books. The table shows the number of books of each kind.`,
    item: "book",
    head: ["Kind of book", "Number"],
    cats: ["Mystery", "Biography", "Science", "Poetry"],
    sel: (c) => `a ${c.toLowerCase()} book`,
  },
];

export const simple: Template = {
  id: "prob.simple",
  skill: SKILL,
  label: "Probability of one category, two categories or not a category, from a frequency table",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = rng.pick(CAT_CTX);
    const k = Math.min(c.cats.length, rng.int(3, 4));
    const cats = c.cats.slice(0, k);
    let counts = cats.map(() => rng.int(4, 36));
    if (format === "spr") {
      // A total of 20, 25, 40, 50, 80 or 100 keeps the typed answer a terminating decimal.
      const goal = rng.pick([20, 25, 40, 50, 80, 100].filter((g) => g >= 5 * k));
      const cuts = rng
        .sample(
          Array.from({ length: goal - 1 }, (_, x) => x + 1),
          k - 1
        )
        .sort((x, y) => x - y);
      counts = [...cuts, goal].map((cut, x) => cut - (x ? cuts[x - 1] : 0));
      need(Math.min(...counts) >= 2, "a tiny category");
    }
    const N = total(counts);
    const showTotal = rng.bool(0.5);
    const kind = rng.pick(["one", "one", "two", "not"] as const);
    const [i, j] = rng.sample(
      cats.map((_, x) => x),
      2
    );
    const want =
      kind === "one"
        ? [i]
        : kind === "two"
          ? [i, j].sort()
          : cats.map((_, x) => x).filter((x) => x !== i);
    const fav = total(want.map((x) => counts[x]));
    const sel =
      kind === "one"
        ? c.sel(cats[i])
        : kind === "two"
          ? `${c.sel(cats[want[0]])} or ${c.sel(cats[want[1]])}`
          : `a ${c.item} that is not ${c.sel(cats[i]).replace(/^a /, "a ")}`;
    const selText = kind === "not" ? `a ${c.item} that is not ${cats[i].toLowerCase()}` : sel;
    const rows = cats.map((name, x) => [name, String(counts[x])]);
    const figure = tableFig([...c.head], showTotal ? [...rows, ["Total", String(N)]] : rows);
    const p = F(fav, N);
    const isFav = (x: number) => want.includes(x);
    const others = counts.filter((_, x) => !isFav(x));
    const slips: Slip[] =
      kind === "one"
        ? [
            rawFracSlip(
              fav,
              N - fav,
              `you divided by the number of ${plural(c.item)} that are not ${cats[i].toLowerCase()} instead of by the total`
            ),
            rawFracSlip(
              fav,
              counts[j],
              `you divided by the ${cats[j].toLowerCase()} count instead of by the total`
            ),
            rawFracSlip(N - fav, N, `you found the probability of not selecting ${c.sel(cats[i])}`),
            rawFracSlip(fav, 100, "you treated the count as a percent of 100"),
          ]
        : kind === "two"
          ? [
              rawFracSlip(counts[want[0]], N, `you counted only ${c.sel(cats[want[0]])}`),
              rawFracSlip(counts[want[1]], N, `you counted only ${c.sel(cats[want[1]])}`),
              rawFracSlip(N - fav, N, "you counted the categories that were not asked for"),
              rawFracSlip(
                fav,
                total(others),
                "you divided by the count of the other categories instead of by the total"
              ),
            ]
          : [
              rawFracSlip(
                counts[i],
                N,
                `you found the probability of selecting ${c.sel(cats[i])} instead of not selecting one`
              ),
              rawFracSlip(
                fav,
                counts[i],
                `you divided by the ${cats[i].toLowerCase()} count instead of by the total`
              ),
              rawFracSlip(
                others.length ? Math.max(...counts.filter((_, x) => x !== i)) : 1,
                N,
                "you counted only one of the other categories"
              ),
              rawFracSlip(
                counts[i],
                fav,
                "you compared the two groups instead of dividing by the total"
              ),
            ];
    const favWork =
      want.length === 1
        ? `There are ${counts[want[0]]} of them`
        : `${andList(want.map((x) => `${counts[x]} ${cats[x].toLowerCase()}`))}, so ${m(`${sumTex(want.map((x) => counts[x]))} = ${fav}`)}`;
    return {
      format,
      stem: `${c.intro(N)}\nIf one of these ${plural(c.item)} is selected at random, what is the probability of selecting ${selText}?${format === "spr" ? " (Express your answer as a decimal or fraction, not as a percent.)" : ""}`,
      figure,
      answer: format === "mc" ? rawFracAns(fav, N) : numAns(p, { fraction: true }),
      key: format === "spr" ? sprKey(p) : undefined,
      slips,
      asks: `the number of favorable ${plural(c.item)} out of all ${N} ${plural(c.item)}`,
      steps: [
        {
          label: "Find the total",
          work: showTotal ? `The table gives a total of ${N}` : m(`${sumTex(counts)} = ${N}`),
        },
        { label: "Count the favorable outcomes", work: favWork },
        {
          label: "Divide favorable by total",
          work: m(`\\frac{${fav}}{${N}}${p.d !== N ? ` = ${num(p)}` : ""}`),
        },
      ],
      check: `The other ${plural(c.item)} number ${m(String(N - fav))}, and ${m(`\\frac{${fav}}{${N}} + \\frac{${N - fav}}{${N}} = 1`)}`,
      tip: "A probability is favorable outcomes over all possible outcomes: the denominator is the whole group the selection is made from",
      hint: "Find how many there are in all, then how many match the description.",
      difficulty: Math.min(
        3,
        1 + (kind === "one" ? 0 : 1) + (showTotal ? 0 : 1) - (kind === "one" && showTotal ? 0 : 0)
      ),
      isCorrect: (cand) => {
        const v = valueOf(cand);
        if (v === null) return false;
        let hit = 0;
        let all = 0;
        counts.forEach((ct, x) => {
          all += ct;
          if (kind === "one" ? x === i : kind === "two" ? x === i || x === j : x !== i) hit += ct;
        });
        return v.mul(all).eq(hit);
      },
    };
  },
};

// ---------------------------------------------------------------- the last group from the others' probabilities

const ROOM_CTX = [
  { place: "a convention center", who: "visitors", groups: ["room A", "room B", "room C"] },
  { place: "a movie theater", who: "customers", groups: ["theater A", "theater B", "theater C"] },
  { place: "a summer camp", who: "campers", groups: ["cabin A", "cabin B", "cabin C"] },
  { place: "a museum", who: "visitors", groups: ["gallery A", "gallery B", "gallery C"] },
  { place: "a sports complex", who: "athletes", groups: ["gym A", "gym B", "gym C"] },
];

export const lastGroup: Template = {
  id: "prob.last-group",
  skill: SKILL,
  label: "How many are in the last group, from the other groups' probabilities",
  difficulty: [2, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = rng.pick(ROOM_CTX);
    const N = rng.pick([200, 225, 250, 275, 300, 350, 375, 400, 450, 500]);
    const pA = F(rng.int(10, 70), 100);
    const pB = F(rng.int(8, 40), 100);
    const pC = F(1).sub(pA).sub(pB);
    need(pC.gt(F(1, 50)) && pC.lt(F(1, 2)), "room C share");
    need(pA.mul(N).isInt() && pB.mul(N).isInt(), "whole counts");
    const [a, b, cc] = [pA.mul(N).n, pB.mul(N).n, pC.mul(N).n];
    const [A, B, C] = c.groups;
    const d = (q: Frac) => num(q, { decimal: true });
    return {
      format,
      stem: `At ${c.place}, there are a total of ${N} ${c.who}. Each of them is in ${A}, ${B}, or ${C}. If one of these ${c.who} is selected at random, the probability of selecting one who is in ${A} is ${d(pA)}, and the probability of selecting one who is in ${B} is ${d(pB)}. How many ${c.who} are in ${C}?`,
      answer: numAns(cc),
      slips: [
        numSlip(a, `you found the number in ${A}`),
        numSlip(b, `you found the number in ${B}`),
        numSlip(
          pC.mul(100),
          `you gave the probability for ${C} as a whole number instead of finding the count`
        ),
        numSlip(a + b, `you found the number in ${A} and ${B} together`),
      ],
      asks: `the number of ${c.who} in ${C}, not a probability`,
      steps: [
        {
          label: `Find the probability for ${C}`,
          work: `The three probabilities add to 1, so ${m(`1 - ${d(pA)} - ${d(pB)} = ${d(pC)}`)}`,
        },
        { label: "Turn it into a count", work: m(`${d(pC)} \\times ${N} = ${cc}`) },
      ],
      check: `${A} has ${m(`${d(pA)} \\times ${N} = ${a}`)} and ${B} has ${m(`${d(pB)} \\times ${N} = ${b}`)}, and ${m(`${a} + ${b} + ${cc} = ${N}`)}`,
      tip: "When every outcome falls in exactly one group, the probabilities add to 1, and probability times the total gives a count",
      hint: "The three probabilities must add up to 1.",
      difficulty: format === "spr" ? 3 : 2,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && v.add(pA.mul(N)).add(pB.mul(N)).eq(N);
      },
    };
  },
};

// ---------------------------------------------------------------- two-way tables

export const twoWay: Template = {
  id: "prob.two-way",
  skill: SKILL,
  label: "Joint and conditional probability from a two-way table",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const c = rng.pick(TWO_CTX);
    const R = c.rows.length;
    const C = c.cols.length;
    const cells = c.rows.map(() => c.cols.map(() => rng.int(3, 40)));
    const i = rng.int(0, R - 1);
    const j = rng.int(0, C - 1);
    const kind = rng.pick(["joint", "givenCol", "givenCol", "givenRow", "givenRow"] as const);
    if (format === "spr") {
      // The denominator (a row, a column or the grand total) is a friendly number, so the
      // typed answer is a terminating decimal.
      const split = (goal: number, parts: number) => {
        const cuts = rng
          .sample(
            Array.from({ length: goal - 1 }, (_, x) => x + 1),
            parts - 1
          )
          .sort((x, y) => x - y);
        return [...cuts, goal].map((cut, x) => cut - (x ? cuts[x - 1] : 0));
      };
      if (kind === "givenCol")
        split(rng.pick([20, 25, 40, 50]), R).forEach((v, r) => (cells[r][j] = v));
      else if (kind === "givenRow") cells[i] = split(rng.pick([20, 25, 40, 50]), C);
      else {
        const rest = total(cells.flat()) - cells[i][j];
        const goal = Math.ceil((rest + 3) / 25) * 25;
        cells[i][j] = goal - rest;
      }
      need(
        cells.flat().every((v) => v >= 2 && v <= 45),
        "cell out of range"
      );
    }
    const rowT = cells.map((r) => total(r));
    const colT = c.cols.map((_, j) => total(cells.map((r) => r[j])));
    const N = total(rowT);
    const showTotals = rng.bool(0.7);
    const header = [c.corner, ...c.cols.map((w) => w.name), ...(showTotals ? ["Total"] : [])];
    const body = c.rows.map((w, i) => [
      w.name,
      ...cells[i].map(String),
      ...(showTotals ? [String(rowT[i])] : []),
    ]);
    const rows = showTotals ? [...body, ["Total", ...colT.map(String), String(N)]] : body;
    const figure = tableFig(header, rows, {
      groups: [
        { label: "", span: 1 },
        { label: c.groupLabel, span: C },
        ...(showTotals ? [{ label: "", span: 1 }] : []),
      ],
    });
    const cell = cells[i][j];
    const row = c.rows[i];
    const col = c.cols[j];
    const totalsWork = (label: string, parts: number[], sum: number) =>
      showTotals
        ? `The table gives ${label} as ${sum}`
        : `${label}: ${m(`${sumTex(parts)} = ${sum}`)}`;
    const note =
      format === "spr" ? " (Express your answer as a decimal or fraction, not as a percent.)" : "";
    let stem: string;
    let num1: number;
    let den: number;
    let slips: Slip[];
    let steps: { label: string; work: string }[];
    let asks: string;
    if (kind === "joint") {
      num1 = cell;
      den = N;
      stem = `${c.intro(N)}\nIf one of these ${plural(c.item)} is selected at random, what is the probability of selecting ${row.sel} ${col.is}?${note}`;
      slips = [
        numSlip(
          F(cell, rowT[i]),
          `you divided by the ${row.name.toLowerCase()} total, as if the question said "given that"`
        ),
        numSlip(
          F(cell, colT[j]),
          `you divided by the ${col.name} total, as if the question said "given that"`
        ),
        numSlip(
          F(rowT[i], N),
          `you found the probability of selecting ${row.sel}, ignoring the second condition`
        ),
        numSlip(
          F(colT[j], N),
          `you found the probability of selecting ${col.sel}, ignoring the first condition`
        ),
      ];
      asks = `the share of all ${N} ${plural(c.item)} that fit both descriptions`;
      steps = [
        {
          label: "Find the cell that fits both",
          work: `The ${row.name} row and ${col.name} column meet at ${cell}`,
        },
        { label: "Find the total", work: totalsWork("the grand total", rowT, N) },
        {
          label: "Divide by that total",
          work: m(`\\frac{${cell}}{${N}}${F(cell, N).d !== N ? ` = ${num(F(cell, N))}` : ""}`),
        },
      ];
    } else if (kind === "givenCol") {
      num1 = cell;
      den = colT[j];
      stem = `${c.intro(N)}\nIf one of these ${plural(c.item)} is selected at random, what is the probability of selecting ${row.sel}, given that the ${c.item} ${col.given}?${note}`;
      slips = [
        numSlip(
          F(cell, N),
          "you divided by the grand total; the given condition limits the group to one column"
        ),
        numSlip(
          F(cell, rowT[i]),
          `you divided by the ${row.name.toLowerCase()} row total, which reverses the condition`
        ),
        numSlip(
          F(colT[j] - cell, colT[j]),
          `you found the probability of not selecting ${row.sel} in that column`
        ),
        ...(colT[j] - cell > 0
          ? [
              numSlip(
                F(cell, colT[j] - cell),
                "you divided by the rest of the column instead of the whole column"
              ),
            ]
          : []),
      ];
      asks = `the share of the ${col.name} ${plural(c.item)} (the given group) that ${row.given.replace(/^is /, "are ").replace(/^has /, "have ")}`;
      steps = [
        {
          label: "Limit to the given group",
          work: `Only the ${col.name} column counts. ${cap(
            totalsWork(
              "its total",
              cells.map((r) => r[j]),
              colT[j]
            )
          )}`,
        },
        { label: "Count the favorable ones in it", work: `${cell} of them are ${row.are}` },
        {
          label: "Divide by that total",
          work: m(
            `\\frac{${cell}}{${colT[j]}}${F(cell, colT[j]).d !== colT[j] ? ` = ${num(F(cell, colT[j]))}` : ""}`
          ),
        },
      ];
    } else {
      num1 = cell;
      den = rowT[i];
      stem = `${c.intro(N)}\nIf one of these ${plural(c.item)} is selected at random, what is the probability of selecting ${col.sel}, given that the ${c.item} ${row.given}?${note}`;
      slips = [
        numSlip(
          F(cell, N),
          "you divided by the grand total; the given condition limits the group to one row"
        ),
        numSlip(
          F(cell, colT[j]),
          `you divided by the ${col.name} column total, which reverses the condition`
        ),
        numSlip(
          F(rowT[i] - cell, rowT[i]),
          `you found the probability of not selecting ${col.sel} in that row`
        ),
        ...(rowT[i] - cell > 0
          ? [
              numSlip(
                F(cell, rowT[i] - cell),
                "you divided by the rest of the row instead of the whole row"
              ),
            ]
          : []),
      ];
      asks = `the share of the ${row.name.toLowerCase()} ${plural(c.item)} (the given group) that ${col.given.replace(/^is /, "are ").replace(/^has /, "have ")}`;
      steps = [
        {
          label: "Limit to the given group",
          work: `Only the ${row.name} row counts. ${cap(totalsWork("its total", cells[i], rowT[i]))}`,
        },
        { label: "Count the favorable ones in it", work: `${cell} of them are ${col.are}` },
        {
          label: "Divide by that total",
          work: m(
            `\\frac{${cell}}{${rowT[i]}}${F(cell, rowT[i]).d !== rowT[i] ? ` = ${num(F(cell, rowT[i]))}` : ""}`
          ),
        },
      ];
    }
    const p = F(num1, den);
    return {
      format,
      stem,
      figure,
      answer: numAns(p, { fraction: true }),
      key: format === "spr" ? sprKey(p) : undefined,
      slips: slips.map((s) => ({ ...s, text: m(num(s.value!.asRat()!)) })),
      asks,
      steps,
      check: `${kind === "joint" ? `The other ${prose(den - num1)} ${plural(c.item)}` : `The other ${prose(den - num1)} ${plural(c.item)} in the given group`} bring the count back to ${den}: ${m(`\\frac{${num1}}{${den}} + \\frac{${den - num1}}{${den}} = 1`)}`,
      tip: 'In a "given that" question, the denominator is the total of the given group only; with no condition, it is the grand total',
      hint:
        kind === "joint"
          ? "Find the one cell that fits both descriptions."
          : 'Find the row or column the word "given" points to; its total is the denominator.',
      difficulty: Math.min(
        5,
        (kind === "joint" ? 2 : 3) +
          (showTotals ? 0 : 1) +
          (format === "spr" && kind !== "joint" ? 1 : 0)
      ),
      isCorrect: (cand) => {
        const v = valueOf(cand);
        if (v === null) return false;
        const sumRow = cells[i].reduce((s, x) => s + x, 0);
        const sumCol = cells.reduce((s, r) => s + r[j], 0);
        const grand = cells.flat().reduce((s, x) => s + x, 0);
        const d = kind === "joint" ? grand : kind === "givenCol" ? sumCol : sumRow;
        return v.mul(d).eq(cells[i][j]);
      },
    };
  },
};

export const TEMPLATES: Template[] = [simple, lastGroup, twoWay];
