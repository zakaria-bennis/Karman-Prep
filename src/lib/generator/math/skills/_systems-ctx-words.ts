/*
 * m-systems-in-context, word problems: the system that models a situation, and solving a
 * count-and-value problem. The model check compares each candidate's equations, reduced to
 * lowest whole numbers, with the two facts stated in the story; the solve check rebuilds the
 * other count from the total and tests the value equation.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac, gcd, lcm } from "../core/frac";
import { m, money, num } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import { NAMES, fitsBox, numSlip, valueOf } from "./_systems-common";

const SKILL = "m-systems-in-context";

/** One equation a u + b v = c, shown as written. */
interface Line {
  tex: string;
  a: Frac;
  b: Frac;
  c: Frac;
}
const L = (tex: string, a: number | Frac, b: number | Frac, c: number | Frac): Line => ({
  tex,
  a: F(a),
  b: F(b),
  c: F(c),
});

/** The equation in lowest whole numbers with a positive leading coefficient. */
function norm(l: Line): string {
  const parts = [l.a, l.b, l.c];
  const den = parts.reduce((acc, q) => lcm(acc, q.d), 1);
  let ints = parts.map((q) => q.mul(den).n);
  const g = ints.reduce((acc, v) => gcd(acc, v), 0) || 1;
  ints = ints.map((v) => v / g);
  const lead = ints.find((v) => v !== 0) ?? 1;
  return ints.map((v) => (lead < 0 ? -v : v) || 0).join(",");
}

const sysKey = (ls: Line[]) => `sys:${ls.map(norm).sort().join("|")}`;

function sysAns(ls: Line[]): Answer {
  return { text: m(`\\begin{cases} ${ls[0].tex} \\\\ ${ls[1].tex} \\end{cases}`), key: sysKey(ls) };
}
const sysSlip = (ls: Line[], why: string): Slip => ({ ...sysAns(ls), why });

const pct = (q: Frac) => `${num(q.mul(100))}\\%`;

export const whichSystem: Template = {
  id: "sys-ctx.which-system",
  skill: SKILL,
  label: "The system of equations that models a situation",
  difficulty: [2, 4],
  formats: ["mc"],
  make(rng, format): Draft {
    const story = rng.pick(["value", "value", "times", "discount", "more"] as const);
    const name = rng.pick(NAMES);
    let stem: string;
    let truth: Line[];
    let slips: Slip[];
    let steps: Draft["steps"];
    let check: string;
    let difficulty: number;
    if (story === "value") {
      const [what, u, v, uw, vw] = rng.pick([
        ["books at a book sale", "h", "p", "hardcover books", "paperback books"],
        ["plants at a garden center", "s", "l", "small plants", "large plants"],
        ["tickets to a play", "a", "s", "adult tickets", "student tickets"],
        ["sandwiches for a picnic", "t", "v", "turkey sandwiches", "veggie sandwiches"],
        ["notebooks for a class", "w", "r", "wide-ruled notebooks", "graph-paper notebooks"],
      ] as const);
      const pu = rng.int(3, 15);
      const pv = rng.int(2, pu - 1);
      const cu = rng.int(4, 30);
      const cv = rng.int(4, 30);
      need(cu !== cv, "different counts");
      const N = cu + cv;
      const R = pu * cu + pv * cv;
      need(R !== N, "totals differ");
      stem = `${name} spent ${m(money(R))} on ${what} and bought ${N} items in all: ${m(u)} ${uw} for ${m(money(pu))} each and ${m(v)} ${vw} for ${m(money(pv))} each. Which system of equations represents this situation?`;
      const count = (t: number) => L(`${u} + ${v} = ${t}`, 1, 1, t);
      const value = (x: number, y: number, t: number) => L(`${x}${u} + ${y}${v} = ${t}`, x, y, t);
      truth = [count(N), value(pu, pv, R)];
      slips = [
        sysSlip([count(N), value(pv, pu, R)], "you matched each price with the wrong item"),
        sysSlip(
          [count(R), value(pu, pv, N)],
          "you swapped the number of items and the amount spent"
        ),
        sysSlip(
          [count(R), value(pv, pu, N)],
          "you swapped the totals and matched the prices with the wrong items"
        ),
      ];
      steps = [
        {
          label: "Write the count equation",
          work: `The items add up to ${N}: ${m(`${u} + ${v} = ${N}`)}`,
        },
        {
          label: "Write the cost equation",
          work: `Each ${uw.replace(/s$/, "")} costs ${m(money(pu))} and each ${vw.replace(/s$/, "")} costs ${m(money(pv))}: ${m(`${pu}${u} + ${pv}${v} = ${R}`)}`,
        },
      ];
      check = `If ${name} bought ${cu} ${uw} and ${cv} ${vw}: ${m(`${cu} + ${cv} = ${N}`)} and ${m(`${pu}(${cu}) + ${pv}(${cv}) = ${R}`)}, so these numbers fit the system`;
      difficulty = 3;
    } else if (story === "times") {
      const other = rng.pick(NAMES.filter((x) => x !== name));
      const u = name[0].toLowerCase();
      const v = other[0].toLowerCase() === u ? "y" : other[0].toLowerCase();
      const k = rng.int(2, 6);
      const mv = rng.int(3, 20);
      const T = (k + 1) * mv;
      const what = rng.pick(["dollars", "stickers", "trading cards", "postcards", "marbles"]);
      stem = `${name} has ${m(u)} ${what} and ${other} has ${m(v)} ${what}. ${name} has ${k} times as many ${what} as ${other}, and together they have ${T} ${what}. Which system of equations represents this situation?`;
      truth = [L(`${u} = ${k}${v}`, 1, -k, 0), L(`${u} + ${v} = ${T}`, 1, 1, T)];
      slips = [
        sysSlip(
          [L(`${v} = ${k}${u}`, -k, 1, 0), L(`${u} + ${v} = ${T}`, 1, 1, T)],
          `you gave ${other} the larger amount; "${name} has ${k} times as many" means ${m(`${u} = ${k}${v}`)}`
        ),
        sysSlip(
          [L(`${u} = ${v} + ${k}`, 1, -1, k), L(`${u} + ${v} = ${T}`, 1, 1, T)],
          `you read "${k} times as many" as "${k} more"`
        ),
        sysSlip(
          [L(`${u} = ${T}${v}`, 1, -T, 0), L(`${u} + ${v} = ${k}`, 1, 1, k)],
          `you swapped the ${k} and the ${T}`
        ),
      ];
      steps = [
        {
          label: "Translate the comparison",
          work: `"${name} has ${k} times as many as ${other}": ${m(`${u} = ${k}${v}`)}`,
        },
        { label: "Translate the total", work: m(`${u} + ${v} = ${T}`) },
      ];
      check = `If ${other} has ${mv} and ${name} has ${k * mv}, then ${m(`${k * mv} = ${k}(${mv})`)} and ${m(`${k * mv} + ${mv} = ${T}`)}`;
      difficulty = 2;
    } else if (story === "discount") {
      const [one, two, u, v] = rng.pick([
        ["a lamp", "a rug", "l", "r"],
        ["a jacket", "a pair of boots", "j", "b"],
        ["a desk", "a chair", "d", "c"],
        ["a mirror", "a vase", "m", "v"],
        ["a tent", "a sleeping bag", "t", "s"],
      ] as const);
      const [d1, d2] = rng.sample([10, 15, 20, 25, 30, 35, 40, 45, 50], 2).map((x) => F(x, 100));
      const p1 = rng.int(4, 30) * 5;
      const p2 = rng.int(4, 30) * 5;
      const T = p1 + p2;
      const S = F(1).sub(d1).mul(p1).add(F(1).sub(d2).mul(p2));
      need(S.mul(100).isInt(), "whole cents");
      const keep1 = F(1).sub(d1);
      const keep2 = F(1).sub(d2);
      const dec = (q: Frac) => num(q, { decimal: true });
      const pay = (x: Frac, y: Frac) => L(`${dec(x)}${u} + ${dec(y)}${v} = ${dec(S)}`, x, y, S);
      const total = L(`${u} + ${v} = ${T}`, 1, 1, T);
      stem = `The original prices of ${one} and ${two} add up to ${m(money(T))}. After a ${m(pct(d1))} discount on ${one} and a ${m(pct(d2))} discount on ${two}, the two cost ${m(money(S))} together. Which system of equations gives the original price ${m(u)}, in dollars, of ${one} and the original price ${m(v)}, in dollars, of ${two}?`;
      truth = [total, pay(keep1, keep2)];
      slips = [
        sysSlip(
          [total, pay(d1, d2)],
          "you used the discounts as the share of the price that is paid"
        ),
        sysSlip([total, pay(keep2, keep1)], "you matched each discount with the wrong item"),
        sysSlip(
          [total, pay(d2, d1)],
          "you used the discounts as the share paid and matched them with the wrong items"
        ),
      ];
      steps = [
        { label: "Write the original total", work: m(`${u} + ${v} = ${T}`) },
        {
          label: "Find the share paid for each",
          work: `A ${m(pct(d1))} discount leaves ${m(pct(keep1))} of the price, so ${one} costs ${m(`${dec(keep1)}${u}`)}; likewise ${two} costs ${m(`${dec(keep2)}${v}`)}`,
        },
        {
          label: "Write the sale total",
          work: m(`${dec(keep1)}${u} + ${dec(keep2)}${v} = ${dec(S)}`),
        },
      ];
      check = `Original prices of ${m(money(p1))} and ${m(money(p2))} fit: they add to ${m(money(T))}, and ${m(`${dec(keep1)}(${p1}) + ${dec(keep2)}(${p2}) = ${dec(S)}`)}`;
      difficulty = 4;
    } else {
      const [u, v, uw, vw, unit] = rng.pick([
        ["a", "b", "the first hike", "the second hike", "miles"],
        ["p", "q", "the first song", "the second song", "minutes"],
        ["c", "d", "the larger box", "the smaller box", "pounds"],
        ["s", "t", "Saturday's sales", "Sunday's sales", "dollars"],
      ] as const);
      const dd = rng.int(2, 25);
      const bv = rng.int(3, 40);
      const T = 2 * bv + dd;
      stem = `Together, ${uw} and ${vw} total ${T} ${unit}. ${uw.charAt(0).toUpperCase() + uw.slice(1)} is ${dd} ${unit} more than ${vw}. If ${m(u)} is ${uw} and ${m(v)} is ${vw}, in ${unit}, which system of equations represents this situation?`;
      truth = [L(`${u} = ${v} + ${dd}`, 1, -1, dd), L(`${u} + ${v} = ${T}`, 1, 1, T)];
      slips = [
        sysSlip(
          [L(`${v} = ${u} + ${dd}`, -1, 1, dd), L(`${u} + ${v} = ${T}`, 1, 1, T)],
          "you added the difference to the wrong amount"
        ),
        sysSlip(
          [L(`${u} = ${dd}${v}`, 1, -dd, 0), L(`${u} + ${v} = ${T}`, 1, 1, T)],
          `you read "${dd} more than" as "${dd} times"`
        ),
        sysSlip(
          [L(`${u} = ${v} + ${dd}`, 1, -1, dd), L(`${u} - ${v} = ${T}`, 1, -1, T)],
          "you subtracted for the total instead of adding"
        ),
      ];
      steps = [
        {
          label: "Translate the difference",
          work: `"${dd} more than ${vw}": ${m(`${u} = ${v} + ${dd}`)}`,
        },
        { label: "Translate the total", work: m(`${u} + ${v} = ${T}`) },
      ];
      check = `${m(`${v} = ${bv}`)} and ${m(`${u} = ${bv + dd}`)} fit both: ${m(`${bv + dd} = ${bv} + ${dd}`)} and ${m(`${bv + dd} + ${bv} = ${T}`)}`;
      difficulty = 3;
    }
    const key = sysKey(truth);
    return {
      format,
      stem,
      answer: sysAns(truth),
      slips,
      asks: "the pair of equations that states both facts in the story",
      steps,
      check,
      tip: "Write one equation for each fact in the story, and check which quantity each number belongs to",
      hint: "Find the two facts the story gives, then write an equation for each.",
      difficulty,
      isCorrect: (cand) => cand.key === key,
    };
  },
};

const COUNT_STORIES = [
  {
    setup:
      "A theater sold {N} tickets to a show. Adult tickets cost {pu} each and student tickets cost {pv} each. The theater collected {R} from these tickets.",
    u: "adult tickets",
    v: "student tickets",
    money: true,
  },
  {
    setup:
      "A bakery sold {N} pies one day. Apple pies cost {pu} each and cherry pies cost {pv} each. The bakery took in {R} from pies that day.",
    u: "apple pies",
    v: "cherry pies",
    money: true,
  },
  {
    setup:
      "A farm stand sold {N} baskets of berries. Large baskets cost {pu} each and small baskets cost {pv} each. Sales totaled {R}.",
    u: "large baskets",
    v: "small baskets",
    money: true,
  },
  {
    setup:
      "A quiz has {N} questions. Some are worth {pu} points each and the rest are worth {pv} points each. The quiz is worth {R} points in all.",
    u: "questions worth {pu} points",
    v: "questions worth {pv} points",
    money: false,
  },
  {
    setup:
      "A shipment holds {N} boxes. Each large box weighs {pu} pounds and each small box weighs {pv} pounds. The boxes weigh {R} pounds in all.",
    u: "large boxes",
    v: "small boxes",
    money: false,
  },
  {
    setup:
      "A school bought {N} packs of supplies. Packs of markers cost {pu} each and packs of pencils cost {pv} each. The school spent {R} on these packs.",
    u: "packs of markers",
    v: "packs of pencils",
    money: true,
  },
];

export const wordSolve: Template = {
  id: "sys-ctx.word-solve",
  skill: SKILL,
  label: "Solve a count-and-value word problem",
  difficulty: [3, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const st = rng.pick(COUNT_STORIES);
    const pu = rng.int(4, 20);
    const pv = rng.int(2, pu - 1);
    const a = rng.int(6, 90);
    const b = rng.int(6, 90);
    need(a !== b, "different counts");
    const N = a + b;
    const R = pu * a + pv * b;
    const show = (x: number) => (st.money ? m(money(x)) : x.toLocaleString("en-US"));
    const fill = (t: string) =>
      t
        .replace("{N}", String(N))
        .replace(/\{pu\}/g, show(pu))
        .replace(/\{pv\}/g, show(pv))
        .replace("{R}", show(R));
    const uw = fill(st.u).replace(/\$\\\$/, "$\\$");
    const vw = fill(st.v);
    const ask = rng.pick(["u", "u", "v", "diff"] as const);
    const target = ask === "u" ? a : ask === "v" ? b : a - b;
    const question =
      ask === "diff"
        ? `How many more ${uw} than ${vw} were there?`
        : `How many ${ask === "u" ? uw : vw} were there?`;
    if (format === "spr") need(fitsBox(F(target)) && target > 0, "fits");
    const slips: Slip[] =
      ask === "diff"
        ? [
            numSlip(a, `this is the number of ${uw}, not the difference`),
            numSlip(b, `this is the number of ${vw}, not the difference`),
            numSlip(b - a, "you subtracted in the wrong order"),
            numSlip(N, "this is the total count, not the difference"),
          ]
        : [
            numSlip(ask === "u" ? b : a, `this is the number of ${ask === "u" ? vw : uw}`),
            numSlip(
              ask === "u" ? R - pv * N : pu * N - R,
              `you stopped at ${m(`${pu - pv}${ask === "u" ? "u" : "v"} = ${num(ask === "u" ? R - pv * N : pu * N - R)}`)} without dividing by ${pu - pv}`
            ),
            numSlip(Math.abs(a - b), "this is the difference between the two counts"),
          ];
    return {
      format,
      stem: `${fill(st.setup)} ${question}`,
      answer: numAnswer(target, m(num(target))),
      slips,
      asks:
        ask === "diff"
          ? `how many more ${uw} there were than ${vw}`
          : `the number of ${ask === "u" ? uw : vw}`,
      steps: [
        {
          label: "Write two equations",
          work: `Let ${m("u")} be the number of ${uw} and ${m("v")} the number of ${vw}: ${m(`u + v = ${N}`)} and ${m(`${pu}u + ${pv}v = ${num(R)}`)}`,
        },
        {
          label: `Eliminate ${m("v")}`,
          work: `Multiply the first equation by ${pv} and subtract it from the second: ${m(`${pu - pv}u = ${num(R - pv * N)}`)}, so ${m(`u = ${a}`)}`,
        },
        { label: "Find the other count", work: m(`v = ${N} - ${a} = ${b}`) },
        ...(ask === "diff"
          ? [{ label: "Answer the question asked", work: m(`${a} - ${b} = ${a - b}`) }]
          : []),
      ],
      check: `${m(`${a} + ${b} = ${N}`)} and ${m(`${pu}(${a}) + ${pv}(${b}) = ${num(R)}`)}, matching both totals`,
      tip: "For a count-and-value problem, write one equation for the number of items and one for their total value",
      hint: "Write one equation for the number of items and one for the total.",
      difficulty: ask === "diff" ? 5 : format === "spr" ? 4 : 3,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        if (v === null || !v.isInt()) return false;
        const t = v.n;
        const [x, y] =
          ask === "u" ? [t, N - t] : ask === "v" ? [N - t, t] : [(N + t) / 2, (N - t) / 2];
        return Number.isInteger(x) && x > 0 && y > 0 && pu * x + pv * y === R;
      },
    };
  },
};
