/*
 * m-linear-inequalities, two more item models: the greatest or least whole number a budget,
 * capacity or goal allows, and which points satisfy an inequality or a system of two. Checks
 * test the candidate (and the next whole number) against the story's own numbers, or substitute
 * each candidate point into the original inequalities.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { block, lin, m, money, num, times } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import {
  NAMES,
  REL,
  fitsBox,
  holds,
  numSlip,
  pairAns,
  parsePair,
  valueOf,
  type Rel,
} from "./_systems-common";

const SKILL = "m-linear-inequalities";
const commas = (v: number) => v.toLocaleString("en-US");
const floorQ = (q: Frac) => Math.floor(q.n / q.d);
const dollars = (q: Frac | number) => m(money(F(q)));
const dec = (q: Frac) => num(q, { decimal: true });

export const wordLimit: Template = {
  id: "lin-ineq.word-limit",
  skill: SKILL,
  label: "The greatest or least whole number a limit allows",
  difficulty: [1, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const story = rng.pick([
      "words",
      "tow",
      "lift",
      "event",
      "event",
      "baker",
      "save",
      "fund",
      "fund",
    ] as const);
    const name = rng.pick(NAMES);
    let stem: string;
    let ans: number;
    let ok: (k: number) => boolean;
    let max: boolean;
    let slips: Slip[];
    let steps: Draft["steps"];
    let difficulty: number;
    let unit: string;
    let total: (k: number) => string;
    if (story === "words") {
      const G = rng.int(4, 30) * 250;
      const w = rng.int(Math.floor(G / 5), G - 50);
      max = true;
      ans = G - w;
      unit = "words";
      stem = `An essay for a history class can have no more than ${commas(G)} words. ${name} has already written ${commas(w)} words. What is the greatest number of additional words ${name} can write?`;
      ok = (k) => w + k <= G;
      total = (k) => m(`${num(w)} + ${num(k)} = ${num(w + k)}`) + " words";
      slips = [
        numSlip(G + w, "you added the words already written to the limit"),
        numSlip(G, "this is the whole limit, not what is left"),
        numSlip(w, "this is what is already written"),
      ];
      steps = [
        { label: "Write the inequality", work: m(`${num(w)} + x \\le ${num(G)}`) },
        { label: "Solve it", work: m(`x \\le ${num(G)} - ${num(w)} = ${num(G - w)}`) },
      ];
      difficulty = 1;
    } else if (story === "tow" || story === "lift") {
      const each = rng.int(15, 140);
      const base = rng.int(100, 900);
      ans = rng.int(5, 40);
      const C = base + each * ans + rng.int(1, each - 1);
      max = true;
      ok = (k) => base + each * k <= C;
      total = (k) => m(`${num(base)} + ${each}(${k}) = ${num(base + each * k)}`) + " pounds";
      const [carrier, baseWord, item] =
        story === "tow"
          ? [
              "A truck can tow at most {C} pounds, counting the trailer and everything in it.",
              "The trailer weighs {B} pounds",
              "crates",
            ]
          : [
              "A freight elevator can carry at most {C} pounds.",
              "Its operator weighs {B} pounds",
              "boxes",
            ];
      unit = item;
      stem = `${carrier.replace("{C}", commas(C))} ${baseWord.replace("{B}", commas(base))}, and each of the ${item} weighs ${each} pounds. What is the greatest number of ${item} that can be ${story === "tow" ? "towed in the trailer" : "carried with the operator"} in one trip?`;
      slips = [
        numSlip(ans + 1, `you rounded up; ${ans + 1} ${item} would go over ${commas(C)} pounds`),
        numSlip(
          Math.floor(C / each),
          `you left out the ${commas(base)} pounds that are always there`
        ),
        numSlip(
          Math.floor((C + base) / each),
          `you added the ${commas(base)} pounds instead of subtracting them`
        ),
      ];
      steps = [
        { label: "Write the inequality", work: m(`${num(base)} + ${each}x \\le ${num(C)}`) },
        {
          label: "Solve it",
          work: `${m(`${each}x \\le ${num(C - base)}`)}, so ${m(
            `x \\le ${dec(
              F(C - base, each)
                .mul(100)
                .isInt()
                ? F(C - base, each)
                : F(Math.floor(((C - base) / each) * 100), 100)
            )}`
          )}${
            F(C - base, each)
              .mul(100)
              .isInt()
              ? ""
              : "..."
          }`,
        },
        {
          label: "Take the whole number",
          work: `The count must be a whole number no more than that, so it is ${ans}`,
        },
      ];
      difficulty = 2;
    } else if (story === "event" || story === "baker") {
      max = true;
      if (story === "event") {
        const p = F(rng.int(8, 40) * 4 + rng.pick([1, 2, 3]), 4);
        const fee = rng.int(5, 60) * 5;
        ans = rng.int(8, 60);
        const B = p
          .mul(ans)
          .add(fee)
          .add(rng.int(1, Math.max(1, floorQ(p))))
          .add(rng.pick([0, F(1, 2)]));
        need(B.lt(p.mul(ans + 1).add(fee)), "under the next guest");
        const Bv = F(Math.floor(B.toNumber()));
        need(Bv.gt(p.mul(ans).add(fee)), "whole budget");
        unit = "guests";
        stem = `A planner has a budget of ${dollars(Bv)} for a banquet. Renting the hall has a one-time fee of ${dollars(fee)}, and the meal costs ${dollars(p)} per guest. What is the greatest number of guests the planner can invite without going over the budget?`;
        ok = (k) => p.mul(k).add(fee).cmp(Bv) <= 0;
        total = (k) => m(`${num(fee)} + ${dec(p)}(${k}) = ${money(p.mul(k).add(fee))}`);
        slips = [
          numSlip(ans + 1, `you rounded up; ${ans + 1} guests would cost more than ${dollars(Bv)}`),
          numSlip(floorQ(Bv.div(p)), "you left out the hall fee"),
          numSlip(
            floorQ(Bv.add(fee).div(p)),
            "you added the hall fee to the budget instead of subtracting it"
          ),
        ];
        steps = [
          { label: "Write the inequality", work: m(`${num(fee)} + ${dec(p)}x \\le ${num(Bv)}`) },
          {
            label: "Solve it",
            work: `${m(`${dec(p)}x \\le ${num(Bv.sub(fee))}`)}, so ${m("x")} is at most ${m(`\\frac{${num(Bv.sub(fee))}}{${dec(p)}}`)}, which is between ${ans} and ${ans + 1}`,
          },
          { label: "Take the whole number", work: `The planner can invite at most ${ans} guests` },
        ];
        difficulty = 3;
      } else {
        const T = rng.int(8, 30);
        const a = F(rng.pick([5, 6, 7, 9, 10]), 4);
        const kb = rng.int(2, 8);
        const b = F(rng.pick([2, 3, 5]), 4);
        const left = F(T).sub(a.mul(kb));
        need(left.gt(b.mul(2)), "room for muffins");
        ans = floorQ(left.div(b));
        need(!left.div(b).isInt(), "not exact");
        unit = "batches";
        stem = `A baker has ${T} cups of flour. Each batch of bread uses ${dec(a)} cups of flour, and each batch of muffins uses ${dec(b)} cup${b.eq(1) ? "" : "s"} of flour. If the baker makes ${kb} batches of bread, what is the greatest number of whole batches of muffins the baker can make?`;
        ok = (k) => a.mul(kb).add(b.mul(k)).cmp(T) <= 0;
        total = (k) =>
          m(`${kb}(${dec(a)}) + ${k}(${dec(b)}) = ${dec(a.mul(kb).add(b.mul(k)))}`) + " cups";
        slips = [
          numSlip(ans + 1, `you rounded up; ${ans + 1} batches would need more flour than is left`),
          numSlip(floorQ(F(T).div(b)), "you left out the flour used for the bread"),
          numSlip(
            floorQ(F(T).sub(a).div(b)),
            "you subtracted the flour for only one batch of bread"
          ),
        ];
        steps = [
          { label: "Find the flour left", work: m(`${T} - ${kb}(${dec(a)}) = ${dec(left)}`) },
          {
            label: "Divide by the flour per batch",
            work: `${m(`${dec(left)} \\div ${dec(b)}`)} is between ${ans} and ${ans + 1}`,
          },
          {
            label: "Take the whole number",
            work: `Only whole batches count, so the answer is ${ans}`,
          },
        ];
        difficulty = 3;
      }
    } else if (story === "save") {
      const s = rng.int(5, 40);
      const S = rng.int(10, 200);
      ans = rng.int(4, 30);
      const G = S + s * (ans - 1) + rng.int(1, s - 1);
      max = false;
      unit = "weeks";
      stem = `${name} has ${dollars(S)} saved and adds ${dollars(s)} each week. What is the least number of weeks until ${name} has saved at least ${dollars(G)}?`;
      ok = (k) => S + s * k >= G;
      total = (k) => m(`${S} + ${s}(${k}) = ${money(S + s * k)}`);
      slips = [
        numSlip(
          ans - 1,
          `you rounded down; after ${ans - 1} weeks the savings are still under ${dollars(G)}`
        ),
        numSlip(Math.ceil(G / s), `you left out the ${dollars(S)} already saved`),
        numSlip(G - S, `you did not divide by the ${dollars(s)} saved each week`),
      ];
      steps = [
        { label: "Write the inequality", work: m(`${S} + ${s}w \\ge ${num(G)}`) },
        {
          label: "Solve it",
          work: `${m(`${s}w \\ge ${num(G - S)}`)}, so ${m("w")} is at least ${m(`\\frac{${num(G - S)}}{${s}}`)}, which is between ${ans - 1} and ${ans}`,
        },
        { label: "Take the whole number", work: `The least whole number of weeks is ${ans}` },
      ];
      difficulty = 2;
    } else {
      const P = rng.int(12, 60);
      const c = rng.int(3, P - 5);
      const E = rng.int(10, 120) * 10;
      ans = rng.int(20, 150);
      const G = (P - c) * (ans - 1) - E + rng.int(1, P - c - 1);
      need(G > 100, "a real goal");
      const Gr = Math.floor(G / 10) * 10;
      need(
        (P - c) * (ans - 1) - E < Gr && Gr <= (P - c) * ans - E,
        "rounded goal keeps the answer"
      );
      max = false;
      unit = "tickets";
      stem = `A club sells tickets to a fundraiser for ${dollars(P)} each. Its expenses are ${dollars(E)} for the hall and ${dollars(c)} per person for food. The club wants to earn at least ${dollars(Gr)} after paying all expenses. What is the least number of tickets the club must sell to meet this goal?`;
      ok = (k) => P * k - E - c * k >= Gr;
      total = (k) => m(`${P - c}(${k}) - ${num(E)} = ${money((P - c) * k - E)}`);
      slips = [
        numSlip(
          ans - 1,
          `you rounded down; ${ans - 1} tickets leave the club short of ${dollars(Gr)}`
        ),
        numSlip(Math.ceil((Gr + E) / P), "you left out the food cost for each person"),
        numSlip(Math.ceil(Gr / (P - c)), "you left out the hall expense"),
        numSlip(
          Math.ceil((Gr - E) / (P - c)),
          "you subtracted the hall expense from the goal instead of adding it"
        ),
      ];
      steps = [
        {
          label: "Find the profit per ticket",
          work: `Each ticket brings in ${dollars(P)} and costs ${dollars(c)} in food: ${m(`${P} - ${c} = ${P - c}`)} dollars`,
        },
        { label: "Write the inequality", work: m(`${P - c}t - ${num(E)} \\ge ${num(Gr)}`) },
        {
          label: "Solve it",
          work: `${m(`${P - c}t \\ge ${num(Gr + E)}`)}, so ${m("t")} is at least ${m(`\\frac{${num(Gr + E)}}{${P - c}}`)}, which is between ${ans - 1} and ${ans}; the least whole number is ${ans}`,
        },
      ];
      difficulty = rng.pick([4, 5]);
    }
    if (format === "spr") need(fitsBox(F(ans)), "fits");
    const near = max ? ans + 1 : ans - 1;
    return {
      format,
      stem,
      answer: numAnswer(ans, m(num(ans))),
      slips,
      asks: `the ${max ? "greatest" : "least"} whole number of ${unit} the situation allows`,
      steps,
      check: `With ${ans} ${unit} the total is ${total(ans)}, which ${max ? "stays within the limit" : "reaches the goal"}; with ${near} it is ${total(near)}, which ${max ? "goes over" : "falls short"}`,
      tip: max
        ? "When the answer must be a whole number below a limit, solve the inequality and round down"
        : "When the answer must be a whole number that reaches a goal, solve the inequality and round up",
      hint: "Write an inequality for the total, then solve it.",
      difficulty,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        if (v === null || !v.isInt() || v.n < 0) return false;
        return ok(v.n) && !ok(max ? v.n + 1 : v.n - 1);
      },
    };
  },
};

/** a x + b y rel c, shown as y rel m x + q when b is 1. */
interface Ineq {
  a: number;
  b: number;
  c: number;
  rel: Rel;
}
const okAt = (I: Ineq, x: number, y: number) => holds(F(I.a * x + I.b * y), I.rel, F(I.c));
const ineqTex = (I: Ineq) =>
  I.b === 1
    ? `y ${REL[I.rel]} ${lin([[-I.a, "x"]], I.c)}`
    : `${lin([
        [I.a, "x"],
        [I.b, "y"],
      ])} ${REL[I.rel]} ${I.c}`;
const subTex = (I: Ineq, x: number, y: number) =>
  I.b === 1
    ? `${y} ${REL[I.rel]} ${-I.a * x + I.c}`
    : `${times(I.a, x)} ${I.b < 0 ? "-" : "+"} ${times(Math.abs(I.b), y)} = ${I.a * x + I.b * y} ${REL[I.rel]} ${I.c}`;
const strict = (r: Rel) => r === "lt" || r === "gt";
const listKey = (pts: [number, number][]) => `pts:${pts.map(([x, y]) => `${x};${y}`).join("|")}`;
const listText = (pts: [number, number][]) => m(pts.map(([x, y]) => `(${x}, ${y})`).join(", "));

export const pointsTest: Template = {
  id: "lin-ineq.points",
  skill: SKILL,
  label: "Which points satisfy an inequality or a system",
  difficulty: [2, 5],
  formats: ["mc"],
  make(rng, format): Draft {
    const kind = rng.pick(["one", "one", "system", "list", "statements"] as const);
    const draw = (slopeForm: boolean): Ineq => {
      const rel = rng.pick<Rel>(["lt", "le", "gt", "ge"]);
      if (slopeForm) return { a: -rng.nonzero(-6, 6), b: 1, c: rng.int(-12, 12), rel };
      return {
        a: rng.nonzero(-7, 7),
        b: rng.pick([-5, -4, -3, -2, 2, 3, 4, 5]),
        c: rng.int(-20, 20),
        rel,
      };
    };
    const I1 = draw(kind !== "one" || rng.bool(0.6));
    const above = (I: Ineq) => (I.rel === "gt" || I.rel === "ge") === I.b > 0;
    const boundaryY = (I: Ineq, x: number) => F(I.c - I.a * x, I.b);
    if (kind === "statements") {
      const I2 = draw(true);
      const x = rng.int(-6, 6);
      const y = rng.int(-12, 12);
      const t1 = okAt(I1, x, y);
      const t2 = okAt(I2, x, y);
      need(!boundaryY(I1, x).eq(y) && !boundaryY(I2, x).eq(y), "off both lines");
      const keyOf = (a: boolean, b: boolean) => (a && b ? "both" : a ? "I" : b ? "II" : "neither");
      const TEXT: Record<string, string> = {
        I: "I only",
        II: "II only",
        both: "I and II",
        neither: "Neither I nor II",
      };
      const claims: Record<string, [boolean, boolean]> = {
        I: [true, false],
        II: [false, true],
        both: [true, true],
        neither: [false, false],
      };
      const key = keyOf(t1, t2);
      const ineqs = [I1, I2];
      const slips: Slip[] = Object.keys(TEXT)
        .filter((k) => k !== key)
        .map((k) => {
          const c = claims[k];
          const idx = c[0] !== t1 ? 0 : 1;
          const truth = idx === 0 ? t1 : t2;
          const label = idx === 0 ? "I" : "II";
          return {
            text: TEXT[k],
            key: k,
            why: truth
              ? `inequality ${label} is also true for this point: ${m(subTex(ineqs[idx], x, y))}`
              : `inequality ${label} is false for this point: ${m(subTex(ineqs[idx], x, y))} does not hold`,
          };
        });
      const verdict = (I: Ineq, ok: boolean) =>
        `${m(subTex(I, x, y))}, which is ${ok ? "true" : "false"}`;
      return {
        format,
        stem: `The point ${m(`(${x}, ${y})`)} is graphed in the ${m("xy")}-plane. Which of the following inequalities does it satisfy?\n\nI. ${m(ineqTex(I1))}\nII. ${m(ineqTex(I2))}`,
        answer: { text: TEXT[key], key },
        slips,
        asks: "which of the two inequalities are true when you substitute the point",
        steps: [
          {
            label: "Test inequality I",
            work: `Substitute ${m(`x = ${x}`)} and ${m(`y = ${y}`)}: ${verdict(I1, t1)}`,
          },
          { label: "Test inequality II", work: verdict(I2, t2) },
        ],
        check: `On the graph, the point is ${above(I1) === t1 ? "above" : "below"} the line ${m(ineqTex(I1).replace(REL[I1.rel], "="))} and ${above(I2) === t2 ? "above" : "below"} the line ${m(ineqTex(I2).replace(REL[I2.rel], "="))}, which matches each result`,
        tip: "A point is a solution of an inequality exactly when substituting its coordinates makes the inequality true",
        hint: "Substitute the point into each inequality separately.",
        difficulty: rng.pick([2, 3]),
        isCorrect: (cand) => cand.key === keyOf(okAt(I1, x, y), okAt(I2, x, y)),
      };
    }
    if (kind === "list") {
      const xs = rng.sample([-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 8], 3).sort((p, q) => p - q);
      const dir = above(I1) ? 1 : -1;
      const good = xs.map(
        (x) =>
          [x, Math.round(boundaryY(I1, x).toNumber()) + dir * rng.int(1, 5)] as [number, number]
      );
      need(
        good.every(([x, y]) => okAt(I1, x, y)),
        "good list holds"
      );
      const wrongs = [0, 1, 2].map((i) => {
        const pts = good.map((p) => [...p] as [number, number]);
        pts[i][1] = Math.round(boundaryY(I1, pts[i][0]).toNumber()) - dir * rng.int(1, 5);
        return pts;
      });
      need(
        wrongs.every((pts, i) => !okAt(I1, pts[i][0], pts[i][1])),
        "each wrong list fails"
      );
      const slips: Slip[] = wrongs.map((pts, i) => ({
        text: listText(pts),
        key: listKey(pts),
        why: `the point ${m(`(${pts[i][0]}, ${pts[i][1]})`)} gives ${m(subTex(I1, pts[i][0], pts[i][1]))}, which is false`,
      }));
      return {
        format,
        stem: `${block(ineqTex(I1))}\nFor which of the following lists are all the points ${m("(x, y)")} solutions to the given inequality?`,
        answer: { text: listText(good), key: listKey(good) },
        slips,
        asks: "the list in which every point makes the inequality true",
        steps: [
          {
            label: "Substitute each point",
            work: good.map(([x, y]) => m(subTex(I1, x, y))).join(", "),
          },
          {
            label: "Keep the list with no failures",
            work: "All three are true for this list; every other list has one point that fails",
          },
        ],
        check: `Each point of this list lies on the ${above(I1) ? "upper" : "lower"} side of the line ${m(ineqTex(I1).replace(REL[I1.rel], "="))}, the side the inequality shades`,
        tip: "One point that fails is enough to rule out a whole list",
        hint: "Substitute each point; one false result rules out a list.",
        difficulty: rng.pick([4, 5]),
        isCorrect: (cand) => {
          if (!cand.key?.startsWith("pts:")) return false;
          return cand.key
            .slice(4)
            .split("|")
            .every((p) => {
              const [x, y] = p.split(";").map(Number);
              return okAt(I1, x, y);
            });
        },
      };
    }
    const system = kind === "system";
    const I2 = system ? draw(true) : null;
    need(!I2 || I2.a !== I1.a, "lines cross");
    const all = (x: number, y: number) => okAt(I1, x, y) && (!I2 || okAt(I2, x, y));
    const xs = rng.sample([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], 6);
    const pts: [number, number][] = [];
    for (const x of xs) for (let y = -15; y <= 15; y++) pts.push([x, y]);
    const pick = (pred: (x: number, y: number) => boolean) => {
      const options = pts.filter(([x, y]) => pred(x, y));
      need(options.length > 0, "a point of this kind");
      return rng.pick(options);
    };
    const onLine = (I: Ineq, x: number, y: number) => boundaryY(I, x).eq(y);
    const right = pick((x, y) => all(x, y) && !onLine(I1, x, y) && (!I2 || !onLine(I2, x, y)));
    let wrong: { p: [number, number]; why: string }[];
    if (I2) {
      const a = pick((x, y) => okAt(I1, x, y) && !okAt(I2, x, y));
      const b = pick((x, y) => !okAt(I1, x, y) && okAt(I2, x, y));
      const c = pick((x, y) => !okAt(I1, x, y) && !okAt(I2, x, y));
      wrong = [
        {
          p: a,
          why: `it satisfies the first inequality but not the second: ${m(subTex(I2, a[0], a[1]))} is false`,
        },
        {
          p: b,
          why: `it satisfies the second inequality but not the first: ${m(subTex(I1, b[0], b[1]))} is false`,
        },
        { p: c, why: `it satisfies neither inequality: ${m(subTex(I1, c[0], c[1]))} is false` },
      ];
    } else {
      const fails = (x: number, y: number) => !okAt(I1, x, y);
      const edge = strict(I1.rel) ? pick((x, y) => onLine(I1, x, y)) : null;
      const w1 = pick((x, y) => fails(x, y) && !onLine(I1, x, y));
      const w2 = pick((x, y) => fails(x, y) && !onLine(I1, x, y) && (x !== w1[0] || y !== w1[1]));
      const w3 = pick(
        (x, y) => fails(x, y) && (x !== w1[0] || y !== w1[1]) && (x !== w2[0] || y !== w2[1])
      );
      wrong = [
        ...(edge
          ? [
              {
                p: edge,
                why: `it lies on the boundary line, where the two sides are equal (${m(subTex(I1, edge[0], edge[1]))} is false), and the inequality is strict`,
              },
            ]
          : []),
        { p: w1, why: `it gives ${m(subTex(I1, w1[0], w1[1]))}, which is false` },
        { p: w2, why: `it gives ${m(subTex(I1, w2[0], w2[1]))}, which is false` },
        { p: w3, why: `it gives ${m(subTex(I1, w3[0], w3[1]))}, which is false` },
      ];
    }
    const slips: Slip[] = wrong.map(({ p, why }) => ({ ...pairAns(p[0], p[1]), why }));
    const answer: Answer = pairAns(right[0], right[1]);
    const [rx, ry] = right;
    return {
      format,
      stem: I2
        ? `${block(ineqTex(I1))}\n${block(ineqTex(I2))}\nWhich point ${m("(x, y)")} is a solution to the given system of inequalities in the ${m("xy")}-plane?`
        : `${block(ineqTex(I1))}\nWhich point ${m("(x, y)")} is a solution to the given inequality in the ${m("xy")}-plane?`,
      answer,
      slips,
      asks: I2
        ? "the point that makes both inequalities true"
        : "the point that makes the inequality true",
      steps: [
        {
          label: "Substitute the point",
          work: `For ${m(`(${rx}, ${ry})`)}: ${m(subTex(I1, rx, ry))}${I2 ? ` and ${m(subTex(I2, rx, ry))}` : ""}`,
        },
        {
          label: "Confirm it holds",
          work: I2
            ? "Both statements are true, so the point is in both solution sets"
            : "The statement is true, so the point is a solution",
        },
      ],
      check: `The point ${m(`(${rx}, ${ry})`)} lies on the ${above(I1) ? "upper" : "lower"} side of the line ${m(ineqTex(I1).replace(REL[I1.rel], "="))}${I2 ? ` and on the ${above(I2) ? "upper" : "lower"} side of ${m(ineqTex(I2).replace(REL[I2.rel], "="))}` : ""}, as the inequality${I2 ? " signs require" : " sign requires"}`,
      tip: "Test each choice by substituting it; a point on the boundary line counts only when the inequality includes equality",
      hint: I2
        ? "Substitute each point into both inequalities."
        : "Substitute each point into the inequality.",
      difficulty: I2 ? rng.pick([3, 4]) : I1.b === 1 ? rng.pick([2, 3]) : 3,
      isCorrect: (cand) => {
        const p = parsePair(cand.key);
        if (!p || !p[0].isInt() || !p[1].isInt()) return false;
        return all(p[0].n, p[1].n);
      },
    };
  },
};
