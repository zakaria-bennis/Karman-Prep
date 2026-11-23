/*
 * m-radical-and-rational-equations: solving them, and spotting false solutions. Item models
 * after the bank's own questions for this skill: one-step radical equations (square and cube
 * roots, "what is the value of x - h"), radical equations whose squared form has a false
 * solution (in _adveq-radical.ts), and rational equations where a candidate makes a
 * denominator zero (in _adveq-rational.ts). Every check substitutes each candidate into the
 * ORIGINAL equation, exactly, where a square root is never negative.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { block, m, n, num, paren, signed, times } from "../core/tex";
import type { Draft, Template } from "../core/types";
import { cbrtRat, slip, sqrtRat, valueOf } from "./_adveq-common";
import { sqrtExtraneous } from "./_adveq-radical";
import { rationalEq } from "./_adveq-rational";

const SKILL = "m-radical-and-rational-equations";
const VARS = ["x", "x", "x", "w", "n", "t"];

type Form = "plain" | "shift" | "coef" | "inside" | "cube";

export const radicalBasic: Template = {
  id: "rad-rat.radical-basic",
  skill: SKILL,
  label: "One radical: isolate it, then square or cube both sides",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const v = rng.pick(VARS);
    const form = rng.pick(["plain", "shift", "shift", "coef", "inside", "cube"] as Form[]);
    let eq: string;
    let answer: Frac;
    let asks: string;
    let question = `What is the solution to the given equation?`;
    let slips: ReturnType<typeof slip>[];
    let steps: { label: string; work: string }[];
    let check: string;
    let difficulty: number;
    // The original equation as a test: true when the value of v satisfies it exactly.
    let holds: (x: Frac) => boolean;
    let askChunk = false;
    let h = 0;
    if (form === "plain" || form === "coef") {
      const a = form === "coef" ? rng.pick([2, 3, 4, 5]) : 1;
      const r = rng.int(2, 12);
      const p = rng.nonzero(-40, 40);
      const q = a * r + p;
      need(q > 0, "positive right side");
      eq = `${a === 1 ? "" : a}\\sqrt{${v}} ${signed(p)} = ${q}`;
      answer = F(r * r);
      const qp = q - p;
      slips =
        a === 1
          ? [
              slip(qp, `you found ${m(`\\sqrt{${v}} = ${qp}`)} and did not square it`),
              slip(q * q - p, `you squared ${n(q)} before moving ${n(p)}`),
              slip(
                (q + p) ** 2,
                `you ${p > 0 ? "added" : "subtracted"} ${n(Math.abs(p))} instead of ${p > 0 ? "subtracting" : "adding"} it`
              ),
              slip(2 * qp, "you doubled the value instead of squaring it"),
            ]
          : [
              slip(F(qp, a), `you found ${m(`\\sqrt{${v}} = ${r}`)} and did not square it`),
              slip(F(qp * qp, a), `you squared ${n(qp)} but divided by ${a} instead of ${a * a}`),
              slip(qp * qp, `you squared ${n(qp)} and forgot to divide by ${m(`${a}^2`)}`),
              slip(F((q + p) ** 2, a * a), `you moved ${n(p)} with the wrong sign`),
            ];
      steps = [
        {
          label: "Get the root alone",
          work: `${p > 0 ? `Subtract ${n(p)} from` : `Add ${n(-p)} to`} both sides${a === 1 ? "" : ` and divide by ${a}`}: ${m(`\\sqrt{${v}} = ${r}`)}`,
        },
        { label: "Square both sides", work: m(`${v} = ${r}^2 = ${r * r}`) },
      ];
      check = `${m(`${a === 1 ? "" : a}\\sqrt{${r * r}} ${signed(p)} = ${a === 1 ? r : `${a}(${r})`} ${signed(p)} = ${q}`)}, which matches`;
      difficulty = a === 1 ? 1 : 2;
      holds = (x) => {
        const root = sqrtRat(x);
        return root !== null && root.mul(a).add(p).eq(q);
      };
      asks = `the value of ${m(v)} that makes the equation true`;
    } else if (form === "shift") {
      const c = rng.int(2, 12);
      h = rng.nonzero(-15, 15);
      eq = `\\sqrt{${v} ${signed(-h)}} = ${c}`;
      askChunk = rng.bool(0.5);
      const chunk = `${v} ${signed(-h)}`;
      answer = askChunk ? F(c * c) : F(c * c + h);
      question = askChunk
        ? `If ${m(eq)}, what is the value of ${m(`${chunk}`)}?`
        : `If ${m(eq)}, what is the value of ${m(v)}?`;
      slips = askChunk
        ? [
            slip(c, `you gave ${m(`\\sqrt{${chunk}}`)}, not ${m(chunk)}`),
            slip(c * c + h, `you found ${m(v)}; the question asks for ${m(chunk)}`),
            slip(2 * c, "you doubled the value instead of squaring it"),
            slip(c + h, `you did not square, and found ${m(v)} instead of ${m(chunk)}`),
          ]
        : [
            slip(c * c - h, `you moved ${n(-h)} with the wrong sign`),
            slip(c + h, `you did not square ${n(c)}`),
            slip(c * c, `you found ${m(chunk)}, not ${m(v)}`),
            slip(
              (c + h) ** 2,
              `you ${h > 0 ? "added" : "subtracted"} ${n(Math.abs(h))} before squaring`
            ),
          ];
      steps = [
        { label: "Square both sides", work: m(`${chunk} = ${c}^2 = ${c * c}`) },
        ...(askChunk
          ? [
              {
                label: "Answer what is asked",
                work: `The question asks for ${m(chunk)}, which is ${n(c * c)}`,
              },
            ]
          : [
              {
                label: `Find ${m(v)}`,
                work: `${h > 0 ? `Add ${h} to` : `Subtract ${-h} from`} both sides: ${m(`${v} = ${c * c + h}`)}`,
              },
            ]),
      ];
      check = `With ${m(`${v} = ${c * c + h}`)}, ${m(`\\sqrt{${c * c + h} ${signed(-h)}} = \\sqrt{${c * c}} = ${c}`)}, which matches`;
      difficulty = askChunk ? 2 : 1;
      holds = (x) => {
        const root = sqrtRat(askChunk ? x : x.sub(h));
        return root !== null && root.eq(c);
      };
      asks = askChunk
        ? `the value of the whole expression ${m(chunk)}, not of ${m(v)}`
        : `the value of ${m(v)} that makes the equation true`;
    } else if (form === "inside") {
      const a = rng.pick([2, 3, 4, 5]);
      const c = rng.int(2, 9);
      const b = rng.nonzero(-30, 30);
      const top = c * c - b;
      need(top % a === 0 && top !== 0, "whole solution");
      eq = `\\sqrt{${a}${v} ${signed(b)}} = ${c}`;
      answer = F(top, a);
      slips = [
        slip(F(c - b, a), `you did not square ${n(c)}`),
        slip(F(c * c + b, a), `you moved ${n(b)} with the wrong sign`),
        slip(top, `you forgot to divide by ${a}`),
        slip(F(c * c, a).sub(b), `you divided by ${a} before moving ${n(b)}`),
      ];
      steps = [
        { label: "Square both sides", work: m(`${a}${v} ${signed(b)} = ${c * c}`) },
        {
          label: `Get the ${m(v)}-term alone`,
          work: `${b > 0 ? `Subtract ${b} from` : `Add ${-b} to`} both sides: ${m(`${a}${v} = ${top}`)}`,
        },
        { label: `Find ${m(v)}`, work: `Divide by ${a}: ${m(`${v} = ${num(answer)}`)}` },
      ];
      check = `${m(`\\sqrt{${times(a, answer)} ${signed(b)}} = \\sqrt{${c * c}} = ${c}`)}, which matches`;
      difficulty = 3;
      holds = (x) => {
        const root = sqrtRat(x.mul(a).add(b));
        return root !== null && root.eq(c);
      };
      asks = `the value of ${m(v)} that makes the equation true`;
    } else {
      const c = rng.nonzero(-5, 6);
      const p = rng.nonzero(-20, 20);
      eq = `\\sqrt[3]{${v} ${signed(p)}} = ${c}`;
      answer = F(c ** 3 - p);
      need(!answer.isZero(), "nonzero");
      slips = [
        slip(c * c - p, `you squared ${n(c)} instead of cubing it`),
        slip(3 * c - p, `you multiplied ${n(c)} by 3 instead of cubing it`),
        slip(c ** 3 + p, `you moved ${n(p)} with the wrong sign`),
        slip(c - p, `you did not cube ${n(c)}`),
      ];
      steps = [
        { label: "Cube both sides", work: m(`${v} ${signed(p)} = ${paren(c)}^3 = ${c ** 3}`) },
        {
          label: `Find ${m(v)}`,
          work: `${p > 0 ? `Subtract ${p} from` : `Add ${-p} to`} both sides: ${m(`${v} = ${num(answer)}`)}`,
        },
      ];
      check = `${m(`\\sqrt[3]{${num(answer)} ${signed(p)}} = \\sqrt[3]{${c ** 3}} = ${c}`)}, which matches`;
      difficulty = c < 0 ? 3 : 2;
      holds = (x) => {
        const root = cbrtRat(x.add(p));
        return root !== null && root.eq(c);
      };
      asks = `the value of ${m(v)} that makes the equation true`;
    }
    const inline = form === "shift";
    return {
      format,
      stem: inline ? question : `${block(eq)}\n${question}`,
      answer: numAnswer(answer, m(num(answer))),
      slips,
      asks,
      steps,
      check,
      tip:
        form === "cube"
          ? "Undo a cube root by cubing both sides; a cube root can be negative, so no answer is ruled out"
          : "Get the root by itself first, then square both sides, and check your answer in the original equation",
      hint: form === "cube" ? "What undoes a cube root?" : "Get the square root by itself first.",
      difficulty: Math.min(3, difficulty + (format === "spr" && difficulty === 1 ? 1 : 0)),
      isCorrect: (cand) => {
        const x = valueOf(cand);
        return x !== null && holds(x);
      },
    };
  },
};

export const TEMPLATES: Template[] = [radicalBasic, sqrtExtraneous, rationalEq];
