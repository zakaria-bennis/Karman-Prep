/*
 * m-linear-inequalities: solving linear inequalities and reading them in context. Item models
 * after the bank's own questions for this skill: the inequality that describes all solutions
 * (with the sign flip), the greatest or least whole-number solution, the coefficient behind a
 * given solution set, the inequality that represents a situation, budget and capacity limits,
 * and which points satisfy an inequality or a system. Checks test candidates against the
 * original inequality at exact points.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { block, lin, m, n, num } from "../core/tex";
import type { Answer, Draft, Slip, Step, Template } from "../core/types";
import {
  NAMES,
  REL,
  fitsBox,
  flipRel,
  holds,
  ineqAns,
  ineqSlip,
  numSlip,
  parseIneq,
  toggleStrict,
  valueOf,
  type Rel,
} from "./_systems-common";
import { pointsTest, wordLimit } from "./_systems-ineq-more";

const SKILL = "m-linear-inequalities";
const RELS: Rel[] = ["lt", "le", "gt", "ge"];
const floor = (q: Frac) => Math.floor(q.n / q.d);
const ceil = (q: Frac) => Math.ceil(q.n / q.d);

export const solveInequality: Template = {
  id: "lin-ineq.solve",
  skill: SKILL,
  label: "Solve a linear inequality in one variable",
  difficulty: [1, 6],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const kind =
      format === "spr"
        ? rng.pick(["integer", "integer", "reverse"] as const)
        : rng.pick(["which", "which", "which", "integer", "reverse"] as const);
    const rel = rng.pick(RELS);
    if (kind === "reverse") {
      const a = rng.int(-9, -2);
      const k = rng.nonzero(-12, 12);
      const b = rng.nonzero(-30, 30);
      const c = a * k + b;
      need(c !== 0, "constant");
      const sol = flipRel(rel);
      const ineq = `ax ${b > 0 ? "+" : "-"} ${Math.abs(b)} ${REL[rel]} ${c}`;
      const solves = (av: Frac): boolean => {
        if (av.isZero() || av.n > 0) return false; // a positive a keeps the direction, which gives the opposite set
        return F(c - b)
          .div(av)
          .eq(k);
      };
      return {
        format,
        stem: `If ${m(`x ${REL[sol]} ${k}`)} describes all solutions to the inequality ${m(ineq)}, where ${m("a")} is a constant, what is the value of ${m("a")}?`,
        answer: numAnswer(a, m(num(a))),
        slips: [
          numSlip(
            -a,
            "you did not account for the reversed inequality; it reverses only when you divide by a negative number, so a must be negative"
          ),
          numSlip(
            F(c + b, k),
            `you moved ${n(b)} across the inequality sign without changing its sign`
          ),
          numSlip(F(c, k), `you left out the ${n(b)}`),
          numSlip(
            F(k, c - b),
            `you divided ${n(k)} by ${n(c - b)} instead of the other way around`
          ),
        ],
        asks: `the coefficient ${m("a")} that makes the solutions exactly ${m(`x ${REL[sol]} ${k}`)}`,
        steps: [
          {
            label: `Isolate the ${m("x")}-term`,
            work: `${b > 0 ? "Subtract" : "Add"} ${n(Math.abs(b))} ${b > 0 ? "from" : "to"} both sides: ${m(`ax ${REL[rel]} ${c - b}`)}`,
          },
          {
            label: "Read the direction",
            work: `The solutions are ${m(`x ${REL[sol]} ${k}`)}, with the sign reversed, so dividing by ${m("a")} reversed it: ${m("a")} is negative`,
          },
          {
            label: `Find ${m("a")}`,
            work: `The boundary is ${m(`\\frac{${c - b}}{a} = ${k}`)}, so ${m(`a = ${a}`)}`,
          },
        ],
        check: `With ${m(`a = ${a}`)}: ${m(`${a}x ${REL[rel]} ${c - b}`)}, and dividing by ${n(a)} reverses the sign: ${m(`x ${REL[sol]} ${k}`)}`,
        tip: "Dividing or multiplying both sides of an inequality by a negative number reverses its direction",
        hint: `Get ${m("ax")} alone first, then ask why the inequality sign changed direction.`,
        difficulty: rng.pick([5, 6]),
        isCorrect: (cand) => {
          const v = valueOf(cand);
          return v !== null && solves(v);
        },
      };
    }
    const brackets = rng.bool(0.3);
    let a: number;
    let b: number;
    let leftTex: string;
    if (brackets) {
      const p = rng.pick([2, 3, 4, 5, -2, -3]);
      const q = rng.nonzero(-8, 8);
      a = p;
      b = p * q;
      leftTex = `${p}(${lin([[1, "x"]], q)})`;
    } else {
      a = rng.nonzero(-9, 9);
      b = rng.nonzero(-25, 25);
      leftTex = lin([[a, "x"]], b);
    }
    const c = rng.bool(0.25) ? 0 : rng.nonzero(-9, 9);
    const A = a - c;
    need(A !== 0, "x stays");
    const k =
      kind === "integer" && Math.abs(A) > 1 && rng.bool(0.6)
        ? F(rng.nonzero(-40, 40), A)
        : F(rng.nonzero(-12, 12));
    const d = F(A).mul(k).add(b);
    need(d.isInt() && !d.isZero(), "whole constant");
    const rightTex = lin([[c, "x"]], d);
    const ineq = `${leftTex} ${REL[rel]} ${rightTex}`;
    const sol: Rel = A > 0 ? rel : flipRel(rel);
    const L = (x: Frac) => F(a).mul(x).add(b);
    const R = (x: Frac) => F(c).mul(x).add(d);
    const steps: Step[] = [
      ...(brackets
        ? [
            {
              label: "Clear the parentheses",
              work: m(`${lin([[a, "x"]], b)} ${REL[rel]} ${rightTex}`),
            },
          ]
        : []),
      ...(c !== 0
        ? [
            {
              label: `Collect the ${m("x")}-terms`,
              work: `${c > 0 ? "Subtract" : "Add"} ${m(lin([[Math.abs(c), "x"]]))} ${c > 0 ? "from" : "to"} both sides: ${m(`${lin([[A, "x"]], b)} ${REL[rel]} ${num(d)}`)}`,
            },
          ]
        : []),
      {
        label: `Isolate the ${m("x")}-term`,
        work: `${b > 0 ? "Subtract" : "Add"} ${n(Math.abs(b))} ${b > 0 ? "from" : "to"} both sides: ${m(`${lin([[A, "x"]])} ${REL[rel]} ${num(d.sub(b))}`)}`,
      },
      {
        label: `Solve for ${m("x")}`,
        work:
          A === 1
            ? m(`x ${REL[sol]} ${num(k)}`)
            : A > 0
              ? `Divide both sides by ${n(A)}: ${m(`x ${REL[sol]} ${num(k)}`)}`
              : `Divide both sides by ${n(A)} and reverse the inequality, because you are dividing by a negative number: ${m(`x ${REL[sol]} ${num(k)}`)}`,
      },
    ];
    const tip =
      "Solve an inequality like an equation, but reverse the sign whenever you multiply or divide both sides by a negative number";
    const hint =
      A < 0
        ? `Collect the ${m("x")}-terms, and watch the sign of the number you divide by.`
        : `Collect the ${m("x")}-terms on one side and the numbers on the other.`;
    const base = (c !== 0 ? 1 : 0) + (brackets ? 1 : 0) + (A < 0 ? 1 : 0);
    const probe = sol === "lt" || sol === "le" ? floor(k) - 1 : floor(k) + 1;
    if (kind === "which") {
      const stem = rng.bool(0.5)
        ? `Which inequality describes all solutions to ${m(ineq)}?`
        : `${block(ineq)}\nWhich of the following describes all solutions to the given inequality?`;
      return {
        format,
        stem,
        answer: ineqAns("x", sol, k),
        slips: [
          ineqSlip(
            "x",
            flipRel(sol),
            k,
            A < 0
              ? "you divided by a negative number without reversing the inequality"
              : "you reversed the inequality, but you divided by a positive number, so it keeps its direction"
          ),
          ineqSlip("x", sol, k.neg(), "you lost a negative sign while solving"),
          ineqSlip(
            "x",
            sol,
            d.add(b).div(A),
            `you moved ${n(b)} across the inequality without changing its sign`
          ),
          ineqSlip(
            "x",
            toggleStrict(sol),
            k,
            rel === "lt" || rel === "gt"
              ? "the boundary value makes the two sides equal, and the inequality is strict, so it is not a solution"
              : "the boundary value makes the two sides equal, which the inequality allows, so it is a solution"
          ),
        ],
        asks: `every value of ${m("x")} that makes ${m(ineq)} true, written as one simple inequality`,
        steps,
        check: `At ${m(`x = ${num(k)}`)} both sides equal ${n(L(k))}, so that is the boundary. At ${m(`x = ${probe}`)} the inequality reads ${m(`${num(L(F(probe)))} ${REL[rel]} ${num(R(F(probe)))}`)}, which is true, and ${n(probe)} is on the side that ${m(`x ${REL[sol]} ${num(k)}`)} describes`,
        tip,
        hint,
        difficulty: Math.min(4, 1 + base),
        isCorrect: (cand) => {
          const p = parseIneq(cand.key);
          if (!p || !L(p.k).eq(R(p.k))) return false;
          return [p.k, p.k.sub(1), p.k.add(1)].every(
            (t) => holds(L(t), rel, R(t)) === holds(t, p.r, p.k)
          );
        },
      };
    }
    const greatest = sol === "lt" || sol === "le";
    const ans = greatest
      ? sol === "le"
        ? floor(k)
        : ceil(k) - 1
      : sol === "ge"
        ? ceil(k)
        : floor(k) + 1;
    if (format === "spr") need(fitsBox(F(ans)), "fits");
    const wrongWay = greatest
      ? rel === "ge"
        ? ceil(k)
        : floor(k) + 1
      : rel === "le"
        ? floor(k)
        : ceil(k) - 1;
    const word = greatest ? "greatest" : "least";
    return {
      format,
      stem: `What is the ${word} integer value of ${m("x")} that satisfies ${m(ineq)}?`,
      answer: numAnswer(ans, m(num(ans))),
      slips: [
        numSlip(
          greatest ? ans + 1 : ans - 1,
          k.isInt()
            ? `${n(k)} makes the two sides equal, and the inequality is strict, so it is not a solution`
            : `you rounded ${n(k)} the wrong way; that integer is not a solution`
        ),
        numSlip(
          greatest ? ans - 1 : ans + 1,
          `this is a solution, but ${n(ans)} is a ${greatest ? "greater" : "smaller"} one`
        ),
        ...(A < 0
          ? [numSlip(wrongWay, "you divided by a negative number without reversing the inequality")]
          : []),
        numSlip(-ans, "you lost a negative sign while solving"),
      ],
      asks: `the ${word} whole number that makes ${m(ineq)} true`,
      steps: [
        ...steps,
        {
          label: `Pick the ${word} integer`,
          work: `The ${word} integer with ${m(`x ${REL[sol]} ${num(k)}`)} is ${n(ans)}`,
        },
      ],
      check: `${m(`x = ${ans}`)} gives ${m(`${num(L(F(ans)))} ${REL[rel]} ${num(R(F(ans)))}`)}, which is true, while ${m(`x = ${greatest ? ans + 1 : ans - 1}`)} gives ${m(`${num(L(F(greatest ? ans + 1 : ans - 1)))} ${REL[rel]} ${num(R(F(greatest ? ans + 1 : ans - 1)))}`)}, which is false`,
      tip,
      hint,
      difficulty: Math.min(4, 3 + (A < 0 ? 1 : 0)),
      isCorrect: (cand) => {
        const v = valueOf(cand);
        if (v === null || !v.isInt()) return false;
        const next = v.add(greatest ? 1 : -1);
        return holds(L(v), rel, R(v)) && !holds(L(next), rel, R(next));
      },
    };
  },
};

/** A candidate's truth at a point, from its key: "ix:<rel>;k", "ir:lo;hi" (lo <= x <= hi), "i2:p;q;<rel>;t" (p u + q v rel t), "ip:k;t" (k u v >= t). */
function truthOf(key: string | undefined, u: Frac, v: Frac): boolean | null {
  if (!key) return null;
  const [kind, body] = key.split(":");
  const parts = body?.split(";") ?? [];
  if (kind === "ix") return holds(u, parts[0] as Rel, Frac.parse(parts[1]));
  if (kind === "ir")
    return holds(u, "ge", Frac.parse(parts[0])) && holds(u, "le", Frac.parse(parts[1]));
  if (kind === "i2")
    return holds(
      Frac.parse(parts[0]).mul(u).add(Frac.parse(parts[1]).mul(v)),
      parts[2] as Rel,
      Frac.parse(parts[3])
    );
  if (kind === "ip") return holds(Frac.parse(parts[0]).mul(u).mul(v), "ge", Frac.parse(parts[1]));
  return null;
}

const opt = (text: string, key: string): Answer => ({ text: m(text), key });
const optSlip = (text: string, key: string, why: string): Slip => ({ ...opt(text, key), why });

export const writeInequality: Template = {
  id: "lin-ineq.write",
  skill: SKILL,
  label: "The inequality that represents a situation",
  difficulty: [1, 3],
  formats: ["mc"],
  make(rng, format): Draft {
    const story = rng.pick(["goal", "range", "two", "budget"] as const);
    const name = rng.pick(NAMES);
    let stem: string;
    let answer: Answer;
    let slips: Slip[];
    let truth: (u: Frac, v: Frac) => boolean;
    let tests: [Frac, Frac][];
    let steps: Step[];
    let difficulty: number;
    let check = "";
    const line = (lo: number, hi: number, step = F(1, 2)) => {
      const out: [Frac, Frac][] = [];
      for (let t = F(lo); t.cmp(hi) <= 0; t = t.add(step)) out.push([t, F(0)]);
      return out;
    };
    if (story === "goal") {
      const [act, unit] = rng.pick([
        ["run", "miles"],
        ["read", "pages"],
        ["practice piano for", "minutes"],
        ["swim", "laps"],
        ["save", "dollars"],
      ] as const);
      const G = rng.int(12, 60) * (unit === "pages" || unit === "minutes" ? 5 : 1);
      const a = rng.int(2, Math.floor(G / 2));
      stem = `${name} has a goal to ${act} at least ${G} ${unit} this week and has already done ${a} ${unit}. If ${m("x")} represents the additional ${unit} ${name} needs to reach the goal, which inequality represents this situation?`;
      answer = opt(`${a} + x \\ge ${G}`, `ix:ge;${G - a}`);
      slips = [
        optSlip(
          `${a} + x \\le ${G}`,
          `ix:le;${G - a}`,
          `"at least" means the total must be ${G} or more, so the sign is ${m("\\ge")}`
        ),
        optSlip(
          `${a} - x \\ge ${G}`,
          `ix:le;${a - G}`,
          "the additional amount adds to what is done, so it is added, not subtracted"
        ),
        optSlip(
          `${a}x \\ge ${G}`,
          `ix:ge;${F(G, a)}`,
          `the ${a} ${unit} done and the ${m("x")} more are added, not multiplied`
        ),
      ];
      truth = (u) => holds(F(a).add(u), "ge", F(G));
      tests = line(-5, G + 5);
      steps = [
        {
          label: "Write the total",
          work: `The ${unit} done plus the additional ${unit}: ${m(`${a} + x`)}`,
        },
        {
          label: "Translate at least",
          work: `"At least ${G}" means ${m(`\\ge ${G}`)}: ${m(`${a} + x \\ge ${G}`)}`,
        },
      ];
      check = `If ${name} does ${G - a} more ${unit}, the total is ${m(`${a} + ${G - a} = ${G}`)}, which meets the goal exactly`;
      difficulty = 1;
    } else if (story === "range") {
      const [what, unit, v] = rng.pick([
        ["speed of a train on one stretch of track", "miles per hour", "s"],
        ["temperature in a greenhouse", "degrees Fahrenheit", "t"],
        ["depth of a pool", "feet", "d"],
        ["weight of a package that a shipper accepts", "pounds", "w"],
        ["number of people in a tour group", "people", "p"],
      ] as const);
      const lo = rng.int(2, 60);
      const hi = lo + rng.int(3, 40);
      stem = `The ${what} is at least ${lo} ${unit} and no more than ${hi} ${unit}. Which inequality represents this situation, where ${m(v)} is the ${what.split(" ")[0] === "number" ? "number of people" : what.split(" ")[0]}?`;
      answer = opt(`${lo} \\le ${v} \\le ${hi}`, `ir:${lo};${hi}`);
      slips = [
        optSlip(`${v} \\ge ${lo}`, `ix:ge;${lo}`, `this leaves out the upper limit of ${hi}`),
        optSlip(`${v} \\le ${hi}`, `ix:le;${hi}`, `this leaves out the lower limit of ${lo}`),
        optSlip(
          `${v} \\le ${lo + hi}`,
          `ix:le;${lo + hi}`,
          "you added the two limits, which has no meaning here"
        ),
        optSlip(
          `${v} \\le ${hi - lo}`,
          `ix:le;${hi - lo}`,
          "you subtracted the two limits, which gives the width of the range, not the range"
        ),
      ];
      truth = (u) => holds(u, "ge", F(lo)) && holds(u, "le", F(hi));
      tests = line(0, lo + hi + 3);
      steps = [
        {
          label: "Translate each limit",
          work: `"At least ${lo}" is ${m(`${v} \\ge ${lo}`)}; "no more than ${hi}" is ${m(`${v} \\le ${hi}`)}`,
        },
        { label: "Combine them", work: m(`${lo} \\le ${v} \\le ${hi}`) },
      ];
      check = `${lo} and ${hi} are both allowed and make the inequality true, while ${hi + 1} is not allowed and makes it false`;
      difficulty = 1;
    } else if (story === "two") {
      const [seller, one, two, u, v] = rng.pick([
        ["A newsstand", "magazines", "newspapers", "m", "n"],
        ["A juice stand", "large juices", "small juices", "l", "s"],
        ["A bookstore", "hardcover books", "paperback books", "h", "p"],
        ["A bakery", "cakes", "pies", "c", "p"],
      ] as const);
      const p = rng.int(3, 12);
      const q = rng.int(2, p - 1);
      const T = p * q * rng.int(3, 12);
      stem = `${seller} sells ${one} for ${m(`\\$${p}`)} each and ${two} for ${m(`\\$${q}`)} each. It needs to sell ${m(u)} ${one} and ${m(v)} ${two} for a total of at least ${m(`\\$${T}`)} each day to cover its costs. Which inequality represents this situation?`;
      answer = opt(`${p}${u} + ${q}${v} \\ge ${T}`, `i2:${p};${q};ge;${T}`);
      slips = [
        optSlip(
          `${p}${u} + ${q}${v} \\le ${T}`,
          `i2:${p};${q};le;${T}`,
          `"at least" means ${T} dollars or more, so the sign is ${m("\\ge")}`
        ),
        optSlip(
          `${q}${u} + ${p}${v} \\ge ${T}`,
          `i2:${q};${p};ge;${T}`,
          "you matched each price with the wrong item"
        ),
        optSlip(
          `${p + q}${u}${v} \\ge ${T}`,
          `ip:${p + q};${T}`,
          "you multiplied the counts together; the two sales should be added"
        ),
        optSlip(
          `${p}${u} + ${q}${v} > ${T}`,
          `i2:${p};${q};gt;${T}`,
          `"at least" allows exactly ${T} dollars, so the sign is ${m("\\ge")}, not ${m(">")}`
        ),
      ];
      truth = (x, y) => holds(F(p).mul(x).add(F(q).mul(y)), "ge", F(T));
      tests = [];
      for (let x = 0; x <= T / p + 2; x++)
        for (let y = 0; y <= T / q + 2; y += 1) tests.push([F(x), F(y)]);
      steps = [
        { label: "Write the sales in dollars", work: m(`${p}${u} + ${q}${v}`) },
        { label: "Translate at least", work: m(`${p}${u} + ${q}${v} \\ge ${T}`) },
      ];
      check = `Selling ${T / p} ${one} and no ${two} brings in exactly the amount needed, and ${m(`${p}(${T / p}) + ${q}(0) = ${T}`)} satisfies the inequality`;
      difficulty = 2;
    } else {
      const [thing, fee, each] = rng.pick([
        ["guests at a party", "renting a room", "food for each guest"],
        ["prints at a print shop", "setting up an order", "each print"],
        ["T-shirts for a team", "a design fee", "each shirt"],
        ["rides at a fair", "admission", "each ride ticket"],
      ] as const);
      const Fv = rng.int(3, 30) * 5;
      const p = rng.int(2, 15);
      const B = Fv + p * rng.int(5, 30) + rng.int(0, p - 1);
      stem = `${name} can spend at most ${m(`\\$${B}`)} on ${thing}. There is a one-time charge of ${m(`\\$${Fv}`)} for ${fee}, plus ${m(`\\$${p}`)} for ${each}. Which inequality represents the possible numbers ${m("x")} of ${thing.split(" ")[0]} ${name} can pay for?`;
      answer = opt(`${Fv} + ${p}x \\le ${B}`, `ix:le;${F(B - Fv, p)}`);
      slips = [
        optSlip(
          `${Fv} + ${p}x \\ge ${B}`,
          `ix:ge;${F(B - Fv, p)}`,
          `"at most" means ${B} dollars or less, so the sign is ${m("\\le")}`
        ),
        optSlip(
          `${Fv}x + ${p} \\le ${B}`,
          `ix:le;${F(B - p, Fv)}`,
          "you swapped the one-time charge and the charge for each one"
        ),
        optSlip(
          `${Fv} + ${p}x < ${B}`,
          `ix:lt;${F(B - Fv, p)}`,
          `"at most" allows spending exactly ${B} dollars, so the sign is ${m("\\le")}, not ${m("<")}`
        ),
        optSlip(`${p}x \\le ${B}`, `ix:le;${F(B, p)}`, "you left out the one-time charge"),
      ];
      truth = (u) => holds(F(Fv).add(F(p).mul(u)), "le", F(B));
      tests = line(0, Math.ceil(B / p) + 3, F(1, p * 2));
      steps = [
        { label: "Write the total cost", work: m(`${Fv} + ${p}x`) },
        { label: "Translate at most", work: m(`${Fv} + ${p}x \\le ${B}`) },
      ];
      const most = Math.floor((B - Fv) / p);
      check = `${most} of them cost ${m(`${Fv} + ${p}(${most}) = ${Fv + p * most}`)} dollars, within the limit, while ${most + 1} cost ${Fv + p * (most + 1)} dollars, over it; the inequality agrees with both`;
      difficulty = rng.pick([2, 3]);
    }
    return {
      format,
      stem,
      answer,
      slips,
      asks: "the inequality whose solutions are exactly the values the situation allows",
      steps,
      check,
      tip: `"At least" means ${m("\\ge")} and "at most" or "no more than" means ${m("\\le")}; both include the boundary`,
      hint: "Write the total first, then decide which way the inequality points.",
      difficulty,
      isCorrect: (cand) => tests.every(([u, v]) => truthOf(cand.key, u, v) === truth(u, v)),
    };
  },
};

export const TEMPLATES: Template[] = [solveInequality, writeInequality, wordLimit, pointsTest];
