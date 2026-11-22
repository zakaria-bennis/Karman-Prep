/*
 * m-solving-systems: two linear equations, by substitution or elimination. Item models after
 * the bank's own questions for this skill: solve for x, y, x + y or the pair (equations in many
 * arrangements, with decimals at the top end), find an expression straight from a combination
 * of the equations, read the solution from a graph, and the points of a system with infinitely
 * many solutions. Every check solves the displayed equations again by Cramer's rule or
 * substitutes the candidate into both of them.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac, gcd, lcm } from "../core/frac";
import { block, lin, m, n, num, signed, term, times } from "../core/tex";
import type { Answer, Draft, Slip, Step, Template } from "../core/types";
import {
  eq,
  fitsBox,
  numSlip,
  pairAns,
  pairSlip,
  parsePair,
  satisfies,
  scaleEq,
  solve2,
  stdTex,
  undoAdd,
  valueOf,
  type Eq,
} from "./_systems-common";
import { dependentPoints, fromGraph } from "./_systems-solve-more";

const SKILL = "m-solving-systems";

type Style = "std" | "byRight" | "axRight";

/** The equation a x + b y = c written in one of three arrangements. */
function show(e: Eq, style: Style, decimal = false): string {
  const o = { decimal };
  if (style === "byRight" && !e.b.isZero())
    return `${term(e.b, "y", o)} = ${lin([[e.a.neg(), "x"]], e.c, o)}`;
  if (style === "axRight" && !e.a.isZero())
    return `${term(e.a, "x", o)} = ${lin([[e.b.neg(), "y"]], e.c, o)}`;
  return stdTex(e, o);
}

/** Elimination of y from two equations with whole-number coefficients, step by step. */
function eliminateY(
  e1: Eq,
  e2: Eq
): { steps: Step[]; x: Frac; y: Frac; k1: number; k2: number; A: Frac; same: boolean } {
  const b1 = e1.b.n;
  const b2 = e2.b.n;
  const L = lcm(Math.abs(b1), Math.abs(b2));
  const k1 = L / Math.abs(b1);
  const k2 = L / Math.abs(b2);
  const same = Math.sign(b1) === Math.sign(b2);
  const s = same ? -1 : 1;
  const A = e1.a.mul(k1).add(e2.a.mul(k2 * s));
  const C = e1.c.mul(k1).add(e2.c.mul(k2 * s));
  const x = C.div(A);
  const y = e1.c.sub(e1.a.mul(x)).div(e1.b);
  const combine = same ? "subtract the second from the first" : "add them";
  const how =
    k1 === 1 && k2 === 1
      ? same
        ? "Subtract the second equation from the first"
        : "Add the two equations"
      : k1 === 1
        ? `Multiply the second equation by ${k2}, then ${combine}`
        : k2 === 1
          ? `Multiply the first equation by ${k1}, then ${combine}`
          : `Multiply the first equation by ${k1} and the second by ${k2}, then ${combine}`;
  const steps: Step[] = [
    {
      label: `Eliminate ${m("y")}`,
      work: `${how}, so the ${m("y")}-terms cancel: ${m(`${lin([[A, "x"]])} = ${num(C)}`)}`,
    },
    {
      label: `Find ${m("x")}`,
      work: A.eq(1) ? m(`x = ${num(x)}`) : `Divide by ${n(A)}: ${m(`x = ${num(x)}`)}`,
    },
    {
      label: `Find ${m("y")}`,
      work: `Put ${m(`x = ${num(x)}`)} into the first equation: ${m(`${times(e1.a, x)} ${e1.b.n > 0 ? "+" : "-"} ${term(e1.b.abs(), "y")} = ${num(e1.c)}`)}, so ${m(`y = ${num(y)}`)}`,
    },
  ];
  return { steps, x, y, k1, k2, A, same };
}

type Ask = "x" | "y" | "sum" | "pair";
const ASK_TEX: Record<Ask, string> = { x: "x", y: "y", sum: "x + y", pair: "(x, y)" };

export const solveSystem: Template = {
  id: "sys.solve",
  skill: SKILL,
  label: "Solve a system of two linear equations",
  difficulty: [1, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = rng.pick([
      "single",
      "hline",
      "subst",
      "subst",
      "elim",
      "elim",
      "general",
      "general",
      "decimal",
    ] as const);
    const x0 = F(rng.nonzero(-9, 12));
    const y0 = F(rng.nonzero(-9, 12));
    need(!x0.eq(y0) && !x0.eq(y0.neg()), "distinct coordinates");
    let e1: Eq;
    let e2: Eq;
    let tex1: string;
    let tex2: string;
    let steps: Step[];
    let ask: Ask;
    let difficulty: number;
    const extra: Slip[] = [];
    const pickAsk = (options: Ask[]): Ask =>
      rng.pick(format === "spr" ? options.filter((a) => a !== "pair") : options);
    if (form === "single") {
      const a = rng.int(2, 12);
      const p = F(rng.nonzero(-6, 6));
      const q = y0.sub(p.mul(x0));
      need(!q.isZero(), "constant");
      e1 = eq(a, 0, x0.mul(a));
      e2 = eq(p, -1, q.neg());
      tex1 = `${a}x = ${num(x0.mul(a))}`;
      tex2 = rng.pick([
        `y = ${lin([[p, "x"]], q)}`,
        `${lin([[p, "x"]], q)} = y`,
        `${lin([
          [p, "x"],
          [-1, "y"],
        ])} = ${num(q.neg())}`,
      ]);
      ask = rng.pick(["y", "y", "sum"]);
      steps = [
        {
          label: `Find ${m("x")} from the first equation`,
          work: `Divide both sides by ${a}: ${m(`x = ${num(x0)}`)}`,
        },
        {
          label: `Find ${m("y")} from the second`,
          work: m(`y = ${lin([[p, `(${num(x0)})`]], q)} = ${num(y0)}`),
        },
      ];
      extra.push(
        numSlip(
          ask === "sum" ? p.mul(x0.mul(a)).add(q).add(x0) : p.mul(x0.mul(a)).add(q),
          `you used ${n(x0.mul(a))} as ${m("x")} instead of dividing by ${a}`
        ),
        numSlip(
          ask === "sum" ? p.mul(x0).sub(q).add(x0) : p.mul(x0).sub(q),
          "you made a sign slip with the constant in the second equation"
        )
      );
      difficulty = ask === "sum" || x0.n < 0 ? 2 : 1;
    } else if (form === "hline") {
      const s = F(rng.nonzero(-5, 5));
      const b = y0.sub(s.mul(x0));
      need(!b.isZero(), "constant");
      e1 = eq(0, 1, y0);
      e2 = eq(s.neg(), 1, b);
      tex1 = `y = ${num(y0)}`;
      tex2 = `y = ${lin([[s, "x"]], b)}`;
      ask = format === "spr" ? "x" : rng.pick(["pair", "pair", "x"]);
      steps = [
        {
          label: `Set the two expressions for ${m("y")} equal`,
          work: m(`${num(y0)} = ${lin([[s, "x"]], b)}`),
        },
        {
          label: `Find ${m("x")}`,
          work: `${undoAdd(b)}, then divide by ${n(s)}: ${m(`x = ${num(x0)}`)}`,
        },
        {
          label: "Write the point",
          work: `${m("y")} is ${n(y0)} everywhere on the first graph, so the point is ${m(`(${num(x0)}, ${num(y0)})`)}`,
        },
      ];
      if (ask === "pair") {
        extra.push(
          pairSlip(
            y0.add(b).div(s),
            y0,
            `you moved ${n(b)} across the equals sign without changing its sign`
          ),
          pairSlip(
            0,
            b,
            "this is where the second line crosses the y-axis, not where the lines meet"
          )
        );
      } else
        extra.push(
          numSlip(
            y0.add(b).div(s),
            `you moved ${n(b)} across the equals sign without changing its sign`
          )
        );
      difficulty = 1;
    } else if (form === "subst") {
      const [m1, m2] = rng.sample([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6], 2).map((v) => F(v));
      const b1 = y0.sub(m1.mul(x0));
      const b2 = y0.sub(m2.mul(x0));
      need(!b1.isZero() && !b2.isZero(), "constants");
      e1 = eq(m1.neg(), 1, b1);
      e2 = eq(m2.neg(), 1, b2);
      tex1 = `y = ${lin([[m1, "x"]], b1)}`;
      tex2 = `y = ${lin([[m2, "x"]], b2)}`;
      ask = pickAsk(["x", "y", "y", "pair"]);
      const k = m1.sub(m2);
      steps = [
        {
          label: `Set the two expressions for ${m("y")} equal`,
          work: m(`${lin([[m1, "x"]], b1)} = ${lin([[m2, "x"]], b2)}`),
        },
        {
          label: `Collect the ${m("x")}-terms`,
          work: `${m(`${lin([[k, "x"]])} = ${num(b2.sub(b1))}`)}, so ${m(`x = ${num(x0)}`)}`,
        },
        { label: `Find ${m("y")}`, work: m(`y = ${lin([[m1, `(${num(x0)})`]], b1)} = ${num(y0)}`) },
      ];
      if (ask === "x") {
        extra.push(
          numSlip(b2.add(b1).div(k), "you added the constants instead of subtracting them")
        );
        if (!m1.add(m2).isZero())
          extra.push(
            numSlip(
              b2.sub(b1).div(m1.add(m2)),
              `you added the ${m("x")}-coefficients instead of subtracting them`
            )
          );
      } else if (ask === "y") {
        extra.push(
          numSlip(
            m1.mul(x0),
            `you multiplied ${n(m1)} by ${n(x0)} but did not ${b1.n > 0 ? "add" : "subtract"} ${n(b1.abs())}`
          ),
          numSlip(b1, "this is the first line's y-intercept")
        );
      }
      difficulty = ask === "y" ? 3 : 2;
    } else {
      const decimal = form === "decimal";
      if (form === "elim") {
        const b = rng.nonzero(-9, 9);
        const [a1, a2] = [rng.nonzero(-9, 9), rng.nonzero(-9, 9)];
        need(a1 !== a2 && a1 !== -a2, "x-terms differ");
        e1 = eq(a1, b, x0.mul(a1).add(y0.mul(b)));
        const sb = rng.pick([1, -1]) * b;
        e2 = eq(a2, sb, x0.mul(a2).add(y0.mul(sb)));
      } else {
        const [a1, b1, a2, b2] = [
          rng.nonzero(-9, 9),
          rng.nonzero(-9, 9),
          rng.nonzero(-9, 9),
          rng.nonzero(-9, 9),
        ];
        need(gcd(a1, b1) === 1 && Math.abs(a1 * b2 - a2 * b1) >= 2, "independent equations");
        need(Math.abs(b1) !== Math.abs(b2), "needs a multiplier");
        if (decimal) {
          e1 = eq(F(a1, 10), F(b1, 10), F(a1 * x0.n + b1 * y0.n, 10));
          need(Math.abs(a1) !== Math.abs(b1), "two decimals");
        } else e1 = eq(a1, b1, x0.mul(a1).add(y0.mul(b1)));
        e2 = eq(a2, b2, x0.mul(a2).add(y0.mul(b2)));
      }
      const styles: Style[] = ["std", "std", "byRight", "axRight"];
      const s1 = decimal ? "byRight" : rng.pick(styles);
      const s2 = rng.pick(styles);
      tex1 = show(e1, s1, decimal);
      tex2 = show(e2, s2);
      const whole = decimal ? scaleEq(e1, 10) : e1;
      const el = eliminateY(whole, e2);
      steps = [
        ...(s1 !== "std" || s2 !== "std" || decimal
          ? [
              {
                label: "Line up the variables",
                work: `${decimal ? "Multiply the first equation by 10 to clear the decimals, and write" : "Write"} both equations as ${m("ax + by = c")}: ${m(stdTex(whole))} and ${m(stdTex(e2))}`,
              },
            ]
          : []),
        ...el.steps,
      ];
      ask = decimal
        ? rng.pick(["x", "y"])
        : pickAsk(form === "elim" ? ["x", "y", "pair"] : ["x", "y", "sum", "pair"]);
      if (ask === "x" && (el.k1 !== 1 || el.k2 !== 1)) {
        const s = el.same ? -1 : 1;
        const sloppy =
          el.k1 !== 1 ? whole.c.add(e2.c.mul(el.k2 * s)) : whole.c.mul(el.k1).add(e2.c.mul(s));
        extra.push(
          numSlip(
            sloppy.div(el.A),
            `you multiplied the left side of ${el.k1 !== 1 ? "the first" : "the second"} equation but not its constant`
          )
        );
      }
      if (ask === "y")
        extra.push(
          numSlip(
            e1.c.add(e1.a.mul(x0)).div(e1.b),
            `you substituted ${n(x0.neg())} for ${m("x")} instead of ${n(x0)}`
          )
        );
      difficulty =
        (form === "elim" ? 2 : form === "general" ? 3 : 4) +
        (s1 !== "std" || s2 !== "std" ? 1 : 0) -
        (form === "decimal" ? 1 : 0) +
        (ask === "sum" ? 1 : 0);
      difficulty = Math.min(5, Math.max(2, difficulty));
      if (decimal && rng.bool(0.5)) difficulty = 5;
    }
    const target = ask === "x" ? x0 : ask === "y" ? y0 : ask === "sum" ? x0.add(y0) : null;
    let answer: Answer;
    let slips: Slip[];
    if (target === null) {
      answer = pairAns(x0, y0);
      const g1 = e1.a.isInt() && e1.b.isInt() ? F(gcd(e1.a.n, e1.b.n) || 1) : F(1);
      const g2 = e2.a.isInt() && e2.b.isInt() ? F(gcd(e2.a.n, e2.b.n) || 1) : F(1);
      slips = [
        ...extra,
        pairSlip(y0, x0, "you swapped the coordinates"),
        pairSlip(
          x0.add(e1.b.div(g1)),
          y0.sub(e1.a.div(g1)),
          "this point satisfies the first equation but not the second"
        ),
        pairSlip(
          x0.add(e2.b.div(g2)),
          y0.sub(e2.a.div(g2)),
          "this point satisfies the second equation but not the first"
        ),
        pairSlip(x0.neg(), y0, "you lost the sign of the x-coordinate"),
      ];
    } else {
      answer = numAnswer(target, m(num(target)));
      const other: Slip[] =
        ask === "sum"
          ? [
              numSlip(x0, `you found ${m("x")} and stopped; the question asks for ${m("x + y")}`),
              numSlip(y0, `you found ${m("y")} and stopped; the question asks for ${m("x + y")}`),
              numSlip(x0.sub(y0), `you found ${m("x - y")} instead of ${m("x + y")}`),
            ]
          : [
              numSlip(
                ask === "x" ? y0 : x0,
                `this is the value of ${m(ask === "x" ? "y" : "x")}, not ${m(ask)}`
              ),
            ];
      slips = [...other, ...extra, numSlip(target.neg(), "you lost a negative sign along the way")];
      if (format === "spr") need(fitsBox(target), "fits");
    }
    if (ask === "sum")
      steps.push({
        label: "Add the two values",
        work: m(`x + y = ${num(x0)} ${signed(y0)} = ${num(x0.add(y0))}`),
      });
    if (ask === "pair" && form !== "hline")
      steps.push({ label: "Write the solution", work: m(`(x, y) = (${num(x0)}, ${num(y0)})`) });
    const stem =
      form === "hline" && ask === "pair"
        ? `At what point ${m("(x, y)")} do the graphs of ${m(tex1)} and ${m(tex2)} intersect in the ${m("xy")}-plane?`
        : ask === "pair"
          ? `${block(tex1)}\n${block(tex2)}\nWhat is the solution ${m("(x, y)")} to the given system of equations?`
          : rng.bool(0.15)
            ? `If ${m(tex1)} and ${m(tex2)}, what is the value of ${m(ASK_TEX[ask])}?`
            : `${block(tex1)}\n${block(tex2)}\nThe solution to the given system of equations is ${m("(x, y)")}. What is the value of ${m(ASK_TEX[ask])}?`;
    const sub = (e: Eq) =>
      `${times(e.a, x0)} ${e.b.n < 0 ? "-" : "+"} ${times(e.b.abs(), y0)} = ${num(e.c)}`;
    return {
      format,
      stem,
      answer,
      slips,
      asks:
        ask === "pair"
          ? "the one point that makes both equations true"
          : `the value of ${m(ASK_TEX[ask])} at the one point that makes both equations true`,
      steps,
      check: `Put ${m(`x = ${num(x0)}`)} and ${m(`y = ${num(y0)}`)} into the equations as ${m("ax + by = c")}: ${m(e1.a.isZero() ? `y = ${num(y0)}` : sub(e1))} and ${m(sub(e2))}. Both are true`,
      tip: "Use substitution when an equation is already solved for a variable, and elimination when the coefficients of one variable match or are opposites",
      hint:
        form === "single"
          ? `Solve the first equation for ${m("x")}.`
          : form === "hline" || form === "subst"
            ? `Set the two expressions for ${m("y")} equal to each other.`
            : `Make the ${m("y")}-terms cancel by adding or subtracting the equations.`,
      difficulty,
      isCorrect: (cand) => {
        if (ask === "pair") {
          const p = parsePair(cand.key);
          return !!p && satisfies(e1, p[0], p[1]) && satisfies(e2, p[0], p[1]);
        }
        const v = valueOf(cand);
        const s = solve2(e1, e2);
        if (v === null || !s) return false;
        const [x, y] = s;
        return (ask === "x" ? x : ask === "y" ? y : x.add(y)).eq(v);
      },
    };
  },
};

export const combination: Template = {
  id: "sys.combination",
  skill: SKILL,
  label: "Find an expression from a combination of the two equations",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    // B = e1 + s e2 is a short combination; the question asks for k times it.
    const drop = rng.pick(["none", "none", "x", "y"] as const);
    const p = drop === "x" ? 0 : rng.nonzero(-6, 6);
    const q = drop === "y" ? 0 : rng.nonzero(-9, 9);
    const s = rng.pick([1, -1]);
    const k = rng.pick([1, 1, 1, -1, 2, 3, 4, 6]);
    const v0 = rng.nonzero(-20, 20);
    const a2 = rng.nonzero(-9, 9);
    const b2 = rng.nonzero(-9, 9);
    const c2 = rng.nonzero(-30, 30);
    const e2 = eq(a2, b2, c2);
    const e1 = eq(p - s * a2, q - s * b2, v0 - s * c2);
    need(!e1.a.isZero() && !e1.b.isZero(), "both variables in each equation");
    need(solve2(e1, e2) !== null, "one solution");
    need(
      gcd(Math.abs(p), Math.abs(q)) === 1 ||
        (p === 0 && Math.abs(q) === 1) ||
        (q === 0 && Math.abs(p) === 1) ||
        k === 1,
      "reduced"
    );
    const [xs, ys] = solve2(e1, e2)!;
    const T = [p * k, q * k] as const;
    const targetTex = lin([
      [T[0], "x"],
      [T[1], "y"],
    ]);
    need(
      !(Math.abs(T[0]) === 1 && T[1] === 0) && !(Math.abs(T[1]) === 1 && T[0] === 0),
      "asks for a variable itself"
    );
    const value = F(v0 * k);
    const styles: Style[] = ["std", "std", "std", "byRight", "axRight"];
    const st1 = rng.pick(styles);
    const st2 = rng.pick(styles);
    const arranged = st1 !== "std" || st2 !== "std";
    const Btex = lin([
      [p, "x"],
      [q, "y"],
    ]);
    const one = drop !== "none" ? (drop === "x" ? ys : xs) : null;
    const slips: Slip[] = [
      numSlip(
        F(k * (e1.c.n - s * c2)),
        `you ${s > 0 ? "subtracted" : "added"} the equations; ${s > 0 ? "adding" : "subtracting"} them is what gives ${m(Btex)}`
      ),
      ...(k !== 1
        ? [numSlip(F(v0), `you found the value of ${m(Btex)} but did not multiply it by ${n(k)}`)]
        : []),
      ...(one
        ? [numSlip(one, `you found ${m(drop === "x" ? "y" : "x")} itself, not ${m(targetTex)}`)]
        : []),
      numSlip(value.neg(), "you lost a negative sign when combining the equations"),
      numSlip(e1.c.mul(k), "you used only the first equation's constant"),
      numSlip(xs.add(ys), `you found ${m("x + y")} instead of ${m(targetTex)}`),
    ];
    if (format === "spr") need(fitsBox(value), "fits");
    const steps: Step[] = [
      ...(arranged
        ? [
            {
              label: "Line up the variables",
              work: `Write both as ${m("ax + by = c")}: ${m(stdTex(e1))} and ${m(stdTex(e2))}`,
            },
          ]
        : []),
      {
        label: "Combine the equations",
        work: `${s > 0 ? "Add the two equations" : "Subtract the second equation from the first"}: ${m(`${Btex} = ${num(v0)}`)}`,
      },
      ...(k !== 1
        ? [
            {
              label: "Scale to the expression asked for",
              work: `Multiply both sides by ${n(k)}: ${m(`${targetTex} = ${num(value)}`)}`,
            },
          ]
        : []),
    ];
    const difficulty = Math.min(
      5,
      (drop !== "none" && k === 1 ? 2 : Math.abs(k) === 1 ? 3 : 4) + (arranged ? 1 : 0)
    );
    return {
      format,
      stem: `${block(show(e1, st1))}\n${block(show(e2, st2))}\nThe solution to the given system of equations is ${m("(x, y)")}. What is the value of ${m(targetTex)}?`,
      answer: numAnswer(value, m(num(value))),
      slips,
      asks: `the value of the expression ${m(targetTex)}, which you can reach without finding ${m("x")} and ${m("y")} separately`,
      steps,
      check: `Solving the system fully gives ${m(`x = ${num(xs)}`)} and ${m(`y = ${num(ys)}`)}, and ${m(
        `${lin([
          [T[0], `\\left(${num(xs)}\\right)`],
          [T[1], `\\left(${num(ys)}\\right)`],
        ])} = ${num(value)}`
      )}`,
      tip: "When a question asks for an expression, try adding or subtracting the equations before solving for each variable",
      hint: `Compare ${m(targetTex)} with the sum and the difference of the two equations.`,
      difficulty,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        const sol = solve2(e1, e2);
        return v !== null && !!sol && sol[0].mul(T[0]).add(sol[1].mul(T[1])).eq(v);
      },
    };
  },
};

export const TEMPLATES: Template[] = [solveSystem, combination, fromGraph, dependentPoints];
