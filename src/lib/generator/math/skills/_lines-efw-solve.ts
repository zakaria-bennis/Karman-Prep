/*
 * m-equations-from-words, part two: a one-unknown story solved by writing the equation (two
 * purchases, a gift card, a profit, "k times as many and d more"). The check puts the candidate
 * back into the story's own totals.
 */
import { need, numAnswer, Retry } from "../core/build";
import { F, Frac } from "../core/frac";
import type { Rng } from "../core/rng";
import { m, money, n, num, term, times } from "../core/tex";
import type { Answer, Draft, Slip, Step, Template } from "../core/types";
import { fitsBox, isValue, slip, weighted } from "./_lines-shared";

const SKILL = "m-equations-from-words";
const D = { decimal: true };

export const NAMES = [
  "Maya",
  "Jordan",
  "Priya",
  "Luis",
  "Ana",
  "Kenji",
  "Amara",
  "Diego",
  "Sofia",
  "Malik",
  "Elena",
  "Theo",
  "Nadia",
  "Omar",
  "Grace",
  "Wei",
];

// ------------------------------------------------------------------ one unknown, solved

interface Solve {
  stem: string;
  answer: Frac;
  slips: Slip[];
  steps: Step[];
  check: string;
  test: (v: Frac) => boolean;
  difficulty: number;
  asks: string;
  hint: string;
}

function shopping(rng: Rng): Solve {
  const name = rng.pick(NAMES);
  const [itemA, itemB] = rng.pick([
    ["packages of stickers", "granola bars"],
    ["notebooks", "pens"],
    ["bags of soil", "seed packets"],
    ["paint sets", "brushes"],
  ]);
  const a = F(rng.int(3, 12));
  const b = F(rng.pick([1, 1, 2, 3]));
  need(!a.eq(b), "prices");
  const nA = rng.int(5, 30);
  const nB = rng.int(10, 80);
  const T = a.mul(nA).add(b.mul(nB));
  const ans = F(nB);
  const rest = T.sub(a.mul(nA));
  return {
    stem: `${name} spent ${m(money(T))} on ${itemA} and ${itemB}. Each of the ${itemA} cost ${m(money(a))}, and each of the ${itemB} cost ${m(money(b))}. If ${name} bought ${n(nA)} ${itemA}, how many ${itemB} did ${name} buy?`,
    answer: ans,
    slips: [
      slip(T.sub(nA).div(b), `you subtracted the number of ${itemA} instead of their cost`),
      ...(b.eq(1)
        ? []
        : [
            slip(
              rest,
              `you found the money left for ${itemB} and did not divide by ${m(money(b))}`
            ),
          ]),
      slip(T.add(a.mul(nA)).div(b), `you added the cost of the ${itemA} instead of subtracting it`),
      slip(T.div(b), `you ignored the ${itemA}`),
      slip(a.mul(nA), `you found the cost of the ${itemA}`),
    ],
    steps: [
      {
        label: "Write the equation",
        work: `with ${m("g")} for the number of ${itemB}, ${m(`${num(a)}(${nA}) + ${term(b, "g")} = ${num(T)}`)}`,
      },
      {
        label: "Take away the known cost",
        work: `${m(`${num(a)}(${nA}) = ${num(a.mul(nA))}`)}, so ${m(`${term(b, "g")} = ${num(rest)}`)}`,
      },
      ...(b.eq(1)
        ? []
        : [{ label: `Find ${m("g")}`, work: `divide by ${n(b)}: ${m(`g = ${num(ans)}`)}` }]),
    ],
    check: `${m(`${num(a)}(${nA}) + ${b.eq(1) ? String(nB) : times(b, nB)} = ${num(a.mul(nA))} + ${num(b.mul(nB))} = ${num(T)}`)}, the amount spent`,
    test: (v) => a.mul(nA).add(b.mul(v)).eq(T),
    difficulty: b.eq(1) ? 1 : 2,
    asks: `the number of ${itemB}, given the total spent`,
    hint: `Write an equation for the total cost, using a letter for the number of ${itemB}.`,
  };
}

function profit(rng: Rng): Solve {
  const [seller, unit] = rng.pick([
    ["A food truck", "meals"],
    ["A park", "kayak rentals"],
    ["A school club", "T-shirts"],
    ["A bakery stand", "pies"],
  ]);
  const r = F(rng.int(4, 25));
  const units = rng.int(12, 90);
  const E = F(rng.int(5, 40) * 10);
  const P = r.mul(units).sub(E);
  need(P.n > 0, "profit");
  const ans = F(units);
  return {
    stem: `${seller} earns ${m(money(r))} in revenue for each of its ${unit}. On Saturday, it made a profit of ${m(money(P))} after paying expenses of ${m(money(E))}. How many ${unit} did it sell on Saturday? (profit = revenue ${m("-")} expenses)`,
    answer: ans,
    slips: [
      slip(P.sub(E).div(r), "you subtracted the expenses from the profit instead of adding them"),
      slip(P.div(r), "you ignored the expenses"),
      slip(P.add(E), `you found the revenue and did not divide by ${m(money(r))}`),
      slip(E.div(r), "you divided only the expenses by the price"),
    ],
    steps: [
      {
        label: "Write the equation",
        work: `with ${m("u")} for the number sold, revenue is ${m(`${num(r)}u`)}, so ${m(`${num(r)}u - ${num(E)} = ${num(P)}`)}`,
      },
      {
        label: "Undo the expenses",
        work: `add ${n(E)} to both sides: ${m(`${num(r)}u = ${num(P.add(E))}`)}`,
      },
      { label: `Find ${m("u")}`, work: `divide by ${n(r)}: ${m(`u = ${num(ans)}`)}` },
    ],
    check: `${m(`${num(r)}(${units}) - ${num(E)} = ${num(r.mul(units))} - ${num(E)} = ${num(P)}`)}, the profit`,
    test: (v) => r.mul(v).sub(E).eq(P),
    difficulty: 3,
    asks: `the number of ${unit} sold, given the profit and the expenses`,
    hint: "Revenue is the price times the number sold. Write profit as revenue minus expenses.",
  };
}

function timesAsMany(rng: Rng): Solve {
  const k = rng.int(2, 9);
  const less = rng.int(5, 200) * rng.pick([10, 50, 100]);
  const Dd = F(less * (k - 1));
  const [intro, more, fewer] = rng.pick([
    ["a vote on a new library", "voted in favor of the proposal", "voted against it"],
    ["a citywide survey about a new park", "chose a skate park", "chose a dog park"],
    ["a month at a public library", "checked out fiction books", "checked out nonfiction books"],
  ]);
  const ans = F(less);
  const kf = F(k);
  return {
    stem: `In ${intro}, ${n(k)} times as many people ${more} as ${fewer}. There were also ${n(Dd)} more people who ${more} than who ${fewer}. Based on these data, how many people ${fewer}?`,
    answer: ans,
    slips: [
      slip(Dd.div(k), `you divided by ${n(k)} instead of by ${n(k - 1)}`),
      slip(ans.mul(k), `you found the number who ${more}`),
      slip(Dd.div(k + 1), `you divided by ${n(k + 1)}, as if the groups were added`),
      slip(Dd, "you gave the difference between the groups"),
    ],
    steps: [
      {
        label: "Name the smaller group",
        work: `let ${m("p")} be the number who ${fewer}; then ${m(`${k}p`)} ${more}`,
      },
      {
        label: "Write the difference",
        work: `${m(`${k}p - p = ${num(Dd)}`)}, so ${m(`${k - 1}p = ${num(Dd)}`)}`,
      },
      { label: `Find ${m("p")}`, work: `divide by ${n(k - 1)}: ${m(`p = ${num(ans)}`)}` },
    ],
    check: `${m(`${k}(${num(ans)}) = ${num(ans.mul(k))}`)}, and ${m(`${num(ans.mul(k))} - ${num(ans)} = ${num(Dd)}`)}, the stated difference`,
    test: (v) => kf.mul(v).sub(v).eq(Dd),
    difficulty: 5,
    asks: `the size of the smaller group`,
    hint: "Use one letter for the smaller group and write the larger group in terms of it.",
  };
}

function giftCard(rng: Rng): Solve {
  const name = rng.pick(NAMES);
  const [card, first, second] = rng.pick([
    ["gift card", "movies to keep", "movie rentals"],
    ["store credit", "puzzle books", "postcards"],
    ["arcade card", "game tokens bundles", "single games"],
  ]);
  const k = rng.int(2, 4);
  const p = F(rng.int(9, 30), 2);
  const q = F(rng.int(2, 7), 2);
  const units = rng.int(6, 40);
  const G = p.mul(k).add(q.mul(units));
  need(G.mul(2).isInt() && G.mul(100).isInt(), "money");
  const ans = F(units);
  const rest = G.sub(p.mul(k));
  return {
    stem: `${name} has a ${card} worth ${m(money(G))}. ${name} uses it to buy ${n(k)} ${first} for ${m(money(p))} each and spends the rest on ${second} for ${m(money(q))} each. How many ${second} can ${name} buy?`,
    answer: ans,
    slips: [
      slip(G.div(q).sub(k), `you subtracted the number of ${first} instead of their cost`),
      slip(G.div(q), `you ignored the ${first}`),
      slip(rest, `you found the money left and did not divide by ${m(money(q))}`, true),
      slip(G.add(p.mul(k)).div(q), `you added the cost of the ${first} instead of subtracting it`),
    ],
    steps: [
      {
        label: "Write the equation",
        work: `with ${m("r")} for the number of ${second}, ${m(`${num(p, D)}(${k}) + ${num(q, D)}r = ${num(G, D)}`)}`,
      },
      {
        label: "Take away the first purchase",
        work: `${m(`${num(p, D)}(${k}) = ${num(p.mul(k), D)}`)}, so ${m(`${num(q, D)}r = ${num(rest, D)}`)}`,
      },
      { label: `Find ${m("r")}`, work: `divide by ${n(q, D)}: ${m(`r = ${num(ans)}`)}` },
    ],
    check: `${m(`${num(p.mul(k), D)} + ${num(q, D)}(${units}) = ${num(p.mul(k), D)} + ${num(q.mul(units), D)} = ${num(G, D)}`)}, the value of the ${card}`,
    test: (v) => p.mul(k).add(q.mul(v)).eq(G),
    difficulty: 2,
    asks: `how many ${second} the rest of the ${card} pays for`,
    hint: "Find how much is left after the first purchase.",
  };
}

const SOLVES: [number, (rng: Rng) => Solve][] = [
  [1.3, shopping],
  [1, giftCard],
  [1, profit],
  [0.9, timesAsMany],
];

export const solveStory: Template = {
  id: "efw.solve-story",
  skill: SKILL,
  label: "Write and solve a one-unknown equation from a story",
  difficulty: [1, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const s = weighted(rng, SOLVES)(rng);
    if (format === "spr" && !fitsBox(s.answer)) throw new Retry("does not fit");
    const answer: Answer = numAnswer(s.answer, m(num(s.answer)));
    // A wrong choice must be a count a student could give: whole, positive, and no repeats.
    const slips = s.slips.filter((x) => {
      const v = x.value?.asRat();
      return v && v.isInt() && v.n > 0;
    });
    return {
      format,
      stem: s.stem,
      answer,
      slips,
      asks: s.asks,
      steps: s.steps,
      check: s.check,
      tip: "Name the unknown with a letter, write the story as an equation, then solve it",
      hint: s.hint,
      difficulty: format === "spr" ? Math.min(5, s.difficulty + 1) : s.difficulty,
      isCorrect: (cand) => isValue(cand, s.test),
    };
  },
};
