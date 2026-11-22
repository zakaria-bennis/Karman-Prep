/*
 * m-systems-in-context: word problems, and systems with no or many solutions. Item models after
 * the bank's own questions for this skill: how many solutions a system of two or three
 * equations has, the constant that makes a system have none or infinitely many, the system that
 * models a situation, and solving a count-and-value word problem. Counts are checked by the rank
 * of the original equations; constants by putting them back and counting again.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac, gcd } from "../core/frac";
import { block, lin, m, n, num, term } from "../core/tex";
import type { Answer, Draft, Slip, Step, Template } from "../core/types";
import {
  countSolutions,
  eq,
  fitsBox,
  numSlip,
  scaleEq,
  stdTex,
  valueOf,
  type Eq,
} from "./_systems-common";
import { whichSystem, wordSolve } from "./_systems-ctx-words";

const SKILL = "m-systems-in-context";

type Count = "0" | "1" | "2" | "inf";
const COUNT_TEXT: Record<Count, string> = {
  "0": "Zero",
  "1": "Exactly one",
  "2": "Exactly two",
  inf: "Infinitely many",
};
const countKey = (c: number): Count => (c === 0 ? "0" : c === 1 ? "1" : "inf");

/** The equation shown as y = mx + q when that reads cleanly, else in another arrangement. */
function display(e: Eq, style: "slope" | "std" | "byRight" | "axRight"): string {
  if (style === "slope" && !e.b.isZero())
    return `y = ${lin([[e.a.neg().div(e.b), "x"]], e.c.div(e.b))}`;
  if (style === "byRight" && !e.b.isZero())
    return `${term(e.b, "y")} = ${lin([[e.a.neg(), "x"]], e.c)}`;
  if (style === "axRight" && !e.a.isZero())
    return `${term(e.a, "x")} = ${lin([[e.b.neg(), "y"]], e.c)}`;
  return stdTex(e);
}

const slopeOf = (e: Eq) => e.a.neg().div(e.b);
const interceptOf = (e: Eq) => e.c.div(e.b);

export const countSolutionsTemplate: Template = {
  id: "sys-ctx.count",
  skill: SKILL,
  label: "How many solutions a system of linear equations has",
  difficulty: [1, 5],
  formats: ["mc"],
  make(rng, format): Draft {
    const three = rng.bool(0.25);
    const a = rng.nonzero(-9, 9);
    const b = rng.pick([1, 1, -1, 2, 3, 4, 5, 6, 7, -2, -3]);
    need(gcd(a, b) === 1, "reduced");
    const c = rng.nonzero(-20, 20);
    const base = eq(a, b, c);
    const kind = rng.pick(["0", "1", "inf"] as const);
    const k = rng.pick([2, 3, 4, 5, -2, -3]);
    const other = (scale: number) => {
      // Same left side scaled; a different constant unless the kind asks for the same line.
      const shift = rng.nonzero(-9, 9);
      return eq(a * scale, b * scale, scale * c + shift);
    };
    const crossing = () => {
      const a2 = rng.nonzero(-9, 9);
      const b2 = rng.nonzero(-9, 9);
      need(a2 * b !== a * b2, "different slopes");
      return eq(a2, b2, rng.int(-20, 20));
    };
    let eqs: Eq[];
    if (!three) {
      eqs = [base, kind === "1" ? crossing() : kind === "inf" ? scaleEq(base, k) : other(k)];
    } else if (kind === "0") {
      eqs = [base, other(k), rng.bool(0.5) ? other(rng.pick([2, 3, -1])) : crossing()];
    } else if (kind === "1") {
      // Three lines through one point.
      const x0 = rng.int(-6, 6);
      const y0 = rng.int(-6, 6);
      const through = () => {
        const a2 = rng.nonzero(-6, 6);
        const b2 = rng.nonzero(-6, 6);
        return eq(a2, b2, a2 * x0 + b2 * y0);
      };
      eqs = [eq(a, b, a * x0 + b * y0), through(), through()];
    } else {
      eqs = [base, scaleEq(base, k), scaleEq(base, rng.pick([-1, 2, 3, 4]))];
    }
    const truth = countSolutions(eqs);
    need(countKey(truth) === kind, "the drawn system has the planned count");
    if (three && kind === "1")
      need(
        countSolutions([eqs[0], eqs[1]]) === 1 &&
          countSolutions([eqs[1], eqs[2]]) === 1 &&
          countSolutions([eqs[0], eqs[2]]) === 1,
        "three distinct lines"
      );
    const styles = ["slope", "std", "byRight", "axRight"] as const;
    const slopeReady = eqs.every((e) => slopeOf(e).isInt() && interceptOf(e).isInt());
    const style = slopeReady && rng.bool(0.6) ? ("slope" as const) : null;
    const plain = rng.bool(0.5);
    const texts = eqs.map((e) => display(e, style ?? (plain ? "std" : rng.pick(styles.slice(1)))));
    need(new Set(texts).size === texts.length, "distinct equations");
    const arranged = !style && texts.some((t, i) => t !== stdTex(eqs[i]));
    const lines = three ? "three lines" : "two lines";
    const whys: Record<"0" | "1" | "inf", Record<Count, string>> = {
      "0": {
        "1": three
          ? "some pairs of lines meet, but no point lies on all three"
          : "the lines have the same slope and different y-intercepts, so they are parallel and never meet",
        inf: "the left sides match after scaling, but the constants do not, so the lines are parallel, not the same line",
        "2": "lines that are not the same meet at most once, so a linear system never has exactly two solutions",
        "0": "",
      },
      "1": {
        "0": three
          ? "all three lines pass through one common point"
          : "the slopes are different, so the lines must cross",
        inf: three
          ? "the lines are different, so they share at most one point"
          : "the slopes are different, so the equations are not the same line",
        "2": "lines that are not the same meet at most once, so a linear system never has exactly two solutions",
        "1": "",
      },
      inf: {
        "0": "the equations are multiples of each other, constants included, so they are the same line, not parallel lines",
        "1": "the equations describe the same line, so every point on it is a solution, not only one",
        "2": "lines that are not the same meet at most once, and here every point of the line is a solution",
        inf: "",
      },
    };
    const choice = (key: Count): Answer => ({ text: COUNT_TEXT[key], key });
    const slips: Slip[] = (["0", "1", "inf", "2"] as Count[])
      .filter((key) => key !== kind)
      .map((key) => ({ ...choice(key), why: whys[kind][key] }));
    const steps: Step[] = [
      {
        label: "Write each line in slope form",
        work: eqs.map((e) => m(`y = ${lin([[slopeOf(e), "x"]], interceptOf(e))}`)).join(", "),
      },
      {
        label: "Compare slopes and intercepts",
        work:
          kind === "1"
            ? three
              ? `The slopes differ, and every pair of lines meets at the same point, so the ${lines} share exactly one point`
              : "The slopes differ, so the lines cross at exactly one point"
            : kind === "0"
              ? three
                ? "No single point lies on all three lines: at least two of them have the same slope and different y-intercepts"
                : "The slopes are equal and the y-intercepts differ, so the lines are parallel"
              : `Every equation gives the same slope and the same y-intercept: they are all one line`,
      },
    ];
    const difficulty = three
      ? kind === "0"
        ? 4
        : 5
      : style
        ? kind === "inf"
          ? 2
          : 1
        : arranged
          ? 4
          : 3;
    return {
      format,
      stem: `${texts.map(block).join("\n")}\n${three ? `The given equations are graphed in the ${m("xy")}-plane. How many solutions ${m("(x, y)")} does the system of three equations have?` : "How many solutions does the given system of equations have?"}`,
      answer: choice(kind),
      slips,
      asks: `how many points ${m("(x, y)")} make every equation true at once`,
      steps,
      check:
        kind === "inf"
          ? `${m(stdTex(eqs[1]))} is ${m(stdTex(eqs[0]))} multiplied through by ${n(eqs[1].b.div(eqs[0].b))}, so it is the same equation`
          : kind === "0"
            ? `If a point satisfied ${m(stdTex(eqs[0]))}, then ${m(
                `${lin([
                  [eqs[1].a, "x"],
                  [eqs[1].b, "y"],
                ])}`
              )} would equal ${n(eqs[0].c.mul(eqs[1].b.div(eqs[0].b)))}, not ${n(eqs[1].c)}`
            : `Solving the first two equations gives a single point${three ? ", and it satisfies the third equation too" : ""}`,
      tip: "Compare slopes first: different slopes give one solution; equal slopes give none or infinitely many, depending on the y-intercepts",
      hint: `Put each equation in the form ${m("y = mx + b")} and compare.`,
      difficulty,
      isCorrect: (cand) => cand.key === countKey(countSolutions(eqs)),
    };
  },
};

export const findConstant: Template = {
  id: "sys-ctx.find-constant",
  skill: SKILL,
  label: "The constant that gives no solution or infinitely many",
  difficulty: [2, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const hard = rng.bool(0.4);
    const letter = rng.pick(["r", "k", "t", "w", "s"]);
    if (hard) {
      // a1 x + bl y = br y + c1 and t y = q + p x; no solution fixes t.
      const p = rng.nonzero(-9, 9);
      const lambda = rng.pick([2, 3, -2, -3, 4]);
      const half = rng.bool(0.2);
      const t = half ? F(rng.nonzero(-15, 15) * 2 + 1, 2) : F(rng.nonzero(-15, 15));
      const A1 = F(-lambda * p);
      const B1 = t.mul(lambda);
      need(B1.isInt(), "whole coefficient");
      const br = rng.nonzero(-12, 12);
      const bl = B1.add(br);
      need(!bl.isZero(), "y on the left");
      const q = F(rng.nonzero(-20, 20));
      const c1 = F(rng.nonzero(-30, 30));
      need(!c1.eq(q.mul(lambda)), "no solution, not infinitely many");
      const e1 = eq(A1, B1, c1);
      const withT = (tv: Frac) => eq(-p, tv, q);
      need(countSolutions([e1, withT(t)]) === 0, "no solution");
      const tex1 = `${lin([
        [A1, "x"],
        [bl, "y"],
      ])} = ${lin([[br, "y"]], c1)}`;
      const tex2 = `${letter}y = ${num(q)} ${p > 0 ? "+" : "-"} ${term(Math.abs(p), "x")}`;
      const slip = (tv: Frac, why: string) => numSlip(tv, why, { decimal: true });
      if (format === "spr") need(fitsBox(t), "fits");
      return {
        format,
        stem: `${block(tex1)}\n${block(tex2)}\nIn the given system of equations, ${m(letter)} is a constant. If the system has no solution, what is the value of ${m(letter)}?`,
        answer: numAnswer(t, m(num(t, { decimal: true }))),
        slips: [
          slip(
            bl.mul(-p).div(A1),
            `you did not move ${m(term(br, "y"))} to the left side before comparing`
          ),
          slip(
            bl.add(br).mul(-p).div(A1),
            `you moved ${m(term(br, "y"))} to the left side without changing its sign`
          ),
          slip(
            t.neg(),
            `you moved ${m(term(p, "x"))} across the equals sign without changing its sign`
          ),
          slip(F(-p).mul(A1).div(B1), "you set up the ratio of the coefficients upside down"),
        ],
        asks: `the value of ${m(letter)} that makes the two lines parallel and different`,
        steps: [
          {
            label: "Collect the terms of each equation",
            work: `${m(stdTex(e1))} and ${m(`${lin([[-p, "x"]])} + ${letter}y = ${num(q)}`)}`,
          },
          {
            label: "Make the coefficients proportional",
            work: `No solution means parallel lines: ${m(`\\frac{${num(A1)}}{${num(-p)}} = \\frac{${num(B1)}}{${letter}}`)}, so ${m(`${letter} = ${num(t, { decimal: true })}`)}`,
          },
          {
            label: "Confirm the lines differ",
            work: `The first equation is ${n(lambda)} times ${m(`${lin([[-p, "x"]])} + ${num(t, { decimal: true })}y`)} on the left, but ${m(`${num(c1)} \\ne ${times2(lambda, q)}`)}, so the lines never meet`,
          },
        ],
        check: `With ${m(`${letter} = ${num(t, { decimal: true })}`)} both lines have slope ${n(slopeOf(e1))}, and their y-intercepts ${n(interceptOf(e1))} and ${n(q.div(t))} differ`,
        tip: "A system has no solution when the x- and y-coefficients are in the same ratio but the constants are not",
        hint: `Collect the ${m("y")}-terms of the first equation on one side.`,
        difficulty: half ? 7 : rng.pick([5, 6]),
        isCorrect: (cand) => {
          const v = valueOf(cand);
          return v !== null && !v.isZero() && countSolutions([e1, withT(v)]) === 0;
        },
      };
    }
    const a = rng.nonzero(-9, 9);
    const b = rng.int(2, 9);
    need(gcd(Math.abs(a), b) === 1 && Math.abs(a) !== 1, "reduced");
    const c = rng.nonzero(-30, 30);
    const k = rng.pick([2, 3, 4, 5, 6]);
    const none = rng.bool(0.4);
    const pos = none ? rng.pick(["x", "y"] as const) : rng.pick(["x", "y", "c"] as const);
    const e1 = eq(a, b, c);
    const d = none ? k * c + rng.nonzero(-9, 9) : k * c;
    const truth = pos === "x" ? k * a : pos === "y" ? k * b : k * c;
    const build = (v: Frac) =>
      pos === "x" ? eq(v, k * b, d) : pos === "y" ? eq(k * a, v, d) : eq(k * a, k * b, v);
    const tex2 =
      pos === "x"
        ? `${letter}x ${b * k > 0 ? "+" : "-"} ${term(Math.abs(b * k), "y")} = ${d}`
        : pos === "y"
          ? `${term(k * a, "x")} + ${letter}y = ${d}`
          : `${lin([
              [k * a, "x"],
              [k * b, "y"],
            ])} = ${letter}`;
    const known = pos === "y" ? a : b;
    const T = F(truth);
    const slips: Slip[] =
      pos === "c"
        ? [
            numSlip(c, "you kept the constant as it is; it must be scaled like the coefficients"),
            numSlip(k, `you gave the scale factor, ${n(k)}, instead of the constant`),
            numSlip(-k * c, "you lost the sign of the constant"),
            numSlip(F(c, k), `you divided by ${n(k)} instead of multiplying`),
          ]
        : [
            numSlip(pos === "x" ? a : b, "you copied the coefficient without scaling it"),
            numSlip(k, `you gave the scale factor, ${n(k)}, instead of the coefficient`),
            numSlip(pos === "x" ? k * b : k * a, "you scaled the wrong coefficient"),
            numSlip(-truth, "you lost the sign of the coefficient"),
          ];
    return {
      format,
      stem: `${block(stdTex(e1))}\n${block(tex2)}\nIn the given system of equations, ${m(letter)} is a constant. If the system has ${none ? "no solution" : "infinitely many solutions"}, what is the value of ${m(letter)}?`,
      answer: numAnswer(T, m(num(T))),
      slips,
      asks: `the value of ${m(letter)} that makes the second equation ${none ? "a parallel line" : "the same line as the first"}`,
      steps: [
        {
          label: "Find the scale factor",
          work: `Compare the coefficients you know: ${m(`${pos === "y" ? k * a : k * b} \\div ${paren(known)} = ${k}`)}, so the second equation must be ${k} times the first${none ? " on the left side" : ""}`,
        },
        {
          label: `Scale to find ${m(letter)}`,
          work: m(`${letter} = ${k}(${num(pos === "x" ? a : pos === "y" ? b : c)}) = ${truth}`),
        },
        ...(none
          ? [
              {
                label: "Confirm there is no solution",
                work: `${k} times the first constant is ${n(k * c)}, but the second constant is ${n(d)}, so the lines are parallel and never meet`,
              },
            ]
          : []),
      ],
      check: `With ${m(`${letter} = ${truth}`)} the second equation is ${m(stdTex(build(T)))}, and dividing it by ${k} gives ${m(
        none
          ? `${lin([
              [a, "x"],
              [b, "y"],
            ])} = ${num(F(d, k))}`
          : stdTex(e1)
      )}${none ? ": the same left side with a different constant" : ": the first equation"}`,
      tip: none
        ? "No solution: the coefficients of x and y are in the same ratio, but the constants are not"
        : "Infinitely many solutions: one equation is a constant multiple of the other, constants included",
      hint: "Compare the coefficients you know to find how the second equation is scaled.",
      difficulty: none ? rng.pick([3, 4]) : pos === "c" ? 3 : rng.pick([2, 3]),
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && countSolutions([e1, build(v)]) === (none ? 0 : Infinity);
      },
    };
  },
};

/** A number in parentheses when negative. */
const paren = (v: number) => (v < 0 ? `(${v})` : `${v}`);
const times2 = (k: number, q: Frac) => `${k}(${num(q)})`;

export const TEMPLATES: Template[] = [countSolutionsTemplate, findConstant, whichSystem, wordSolve];
