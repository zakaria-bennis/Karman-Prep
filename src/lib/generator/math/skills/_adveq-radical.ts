/*
 * m-radical-and-rational-equations, continued: a square root equal to a linear expression.
 * Squaring gives a quadratic with two candidates; one (or both) makes the linear side negative,
 * so it is a false solution of the original equation. The check finds the true solutions from
 * the printed equation alone: it solves the squared equation by the formula and keeps only the
 * candidates that satisfy the original, where the square root side is never negative.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { Sym } from "../core/sym";
import { block, lin, m, n, num, paren, poly, signed, times } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import {
  SolutionSets,
  factorTex,
  listTex,
  productTex,
  sameSet,
  solveQuad,
  sqrtRat,
  valueOf,
} from "./_adveq-common";

const VARS = ["x", "x", "x", "w", "n", "t"];

type Form = "plus" | "minus" | "func";

export const sqrtExtraneous: Template = {
  id: "rad-rat.sqrt-extraneous",
  skill: "m-radical-and-rational-equations",
  label: "A square root equal to a linear expression, with a false solution",
  difficulty: [4, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const v = rng.pick(VARS);
    const form = rng.pick(["plus", "plus", "minus", "func"] as Form[]);
    const none = format === "mc" && form !== "func" && rng.bool(0.2);
    // The linear side L = p v + q.
    const p = form === "func" ? -rng.pick([1, 2, 3, 4, 5, 6]) : 1;
    const q = form === "func" ? 0 : rng.nonzero(-12, 12);
    const L = (x: Frac) => F(p).mul(x).add(q);
    let t: number;
    let e: number;
    if (form === "func") {
      // L = p v with p < 0 is nonnegative only for v <= 0.
      t = rng.int(-12, -1);
      e = rng.int(1, 12);
    } else {
      const [x1, x2] = rng.sample(
        Array.from({ length: 31 }, (_, i) => i - 15),
        2
      );
      t = x1;
      e = x2;
    }
    const good = (x: number) => L(F(x)).sign() > 0;
    need(none ? !good(t) && !good(e) : good(t) && !good(e), "one true, one false");
    need(
      Math.abs(L(F(t)).n) >= 2 && Math.abs(L(F(e)).n) >= 2,
      "no square root of 0 or 1 in the work"
    );
    // Radicand R = L^2 - p^2 (v - t)(v - e), which is linear.
    const alpha = 2 * p * q + p * p * (t + e);
    const beta = q * q - p * p * t * e;
    need(
      alpha !== 0 && beta !== 0 && Math.abs(alpha) <= 60 && Math.abs(beta) <= 200,
      "tidy radicand"
    );
    const R = (x: Frac) => F(alpha).mul(x).add(beta);
    const rad = lin([[alpha, v]], beta);
    const lhs = `\\sqrt{${rad}}`;
    let eq: string;
    let stem: string;
    const kind = none
      ? "all"
      : form === "func" || format === "spr"
        ? "single"
        : rng.pick(["single", "all", "all"]);
    if (form === "func") {
      eq = `f(${v}) = ${lhs}`;
      stem = `${block(eq)}\nThe function ${m("f")} is defined by the given equation. If ${m(`f(k) = ${lin([[p, "k"]])}`)}, where ${m("k")} is a constant, what is the value of ${m("k")}?`;
    } else {
      eq = form === "plus" ? `${lhs} = ${lin([[1, v]], q)}` : `${v} - ${lhs} = ${num(-q)}`;
      stem = `${block(eq)}\n${kind === "all" ? "What are all the solutions to the given equation?" : "What is the solution to the given equation?"}`;
    }
    const sets = new SolutionSets();
    const T = F(t);
    const E = F(e);
    const noneText = "There is no solution";
    let answer: Answer;
    let slips: Slip[];
    if (kind === "all") {
      const truth = none ? [] : [T];
      answer = sets.answer(truth, none ? noneText : listTex(truth));
      slips = [
        sets.slip(
          [T, E],
          listTex([T, E]),
          "you kept both solutions of the squared equation without checking them in the original"
        ),
        ...(none
          ? [
              sets.slip(
                [T],
                listTex([T]),
                `${m(`${v} = ${t}`)} also fails: the right side is ${n(L(T))} there, and a square root is never negative`
              ),
              sets.slip(
                [E],
                listTex([E]),
                `${m(`${v} = ${e}`)} fails: the right side is ${n(L(E))} there, and a square root is never negative`
              ),
            ]
          : [
              sets.slip(
                [E],
                listTex([E]),
                `you kept the false solution and threw out the true one; at ${m(`${v} = ${e}`)} the right side is ${n(L(E))}`
              ),
              sets.slip([], noneText, `${m(`${v} = ${t}`)} does work: both sides equal ${n(L(T))}`),
            ]),
        sets.slip(
          [T.neg(), E.neg()],
          listTex([T.neg(), E.neg()]),
          "you factored the squared equation with the signs reversed"
        ),
      ];
    } else {
      answer = numAnswer(T, m(num(T)));
      slips = [
        {
          text: m(num(E)),
          value: Sym.rat(E),
          why: `you kept the false solution: at ${m(`${form === "func" ? "k" : v} = ${e}`)} the right side is ${n(L(E))}, but a square root is never negative`,
        },
        {
          text: m(num(T.neg())),
          value: Sym.rat(T.neg()),
          why: "you factored the squared equation with the signs reversed",
        },
        {
          text: m(num(E.neg())),
          value: Sym.rat(E.neg()),
          why: "you factored with the signs reversed and kept the wrong solution",
        },
        ...(form === "func"
          ? []
          : [
              {
                text: m(num(F(t + e))),
                value: Sym.rat(F(t + e)),
                why: "you added the two solutions of the squared equation",
              },
            ]),
      ];
    }
    const w = form === "func" ? "k" : v;
    // Squared equation: (p w + q)^2 = alpha w + beta  ->  p^2 w^2 + (2pq - alpha) w + (q^2 - beta) = 0.
    const A2 = p * p;
    const B2 = 2 * p * q - alpha;
    const C2 = q * q - beta;
    const linTex = lin([[p, w]], q);
    const squared = `${poly([A2, B2, C2], w)} = 0`;
    const factored = `${productTex(A2, [factorTex(F(t), w), factorTex(F(e), w)])} = 0`;
    const steps = [
      ...(form === "minus"
        ? [
            {
              label: "Get the root alone",
              work: `Add ${m(lhs)} to both sides and ${q < 0 ? `subtract ${n(-q)}` : `add ${n(q)}`}: ${m(`${lhs} = ${linTex}`)}`,
            },
          ]
        : form === "func"
          ? [
              {
                label: "Write the equation",
                work: `${m(`f(k) = ${linTex}`)} means ${m(`\\sqrt{${lin([[alpha, "k"]], beta)}} = ${linTex}`)}`,
              },
            ]
          : []),
      {
        label: "Square both sides",
        work: `${m(`(${linTex})^2 = ${form === "func" ? lin([[alpha, "k"]], beta) : rad}`)}, so ${m(squared)}`,
      },
      {
        label: "Solve the squared equation",
        work: `${m(factored)}, so ${m(`${w} = ${t}`)} or ${m(`${w} = ${e}`)}`,
      },
      {
        label: "Check both in the original",
        work: none
          ? `At ${m(`${w} = ${t}`)} the right side is ${n(L(T))} and at ${m(`${w} = ${e}`)} it is ${n(L(E))}. A square root is never negative, so neither works`
          : `At ${m(`${w} = ${e}`)} the right side is ${n(L(E))}, but a square root is never negative, so ${m(`${w} = ${e}`)} is false. At ${m(`${w} = ${t}`)} both sides equal ${n(L(T))}`,
      },
    ];
    const truthSet = (): Sym[] =>
      solveQuad(A2, B2, C2).filter((x) => {
        const q0 = x.asRat();
        if (!q0) return false;
        const root = sqrtRat(R(q0));
        return root !== null && root.eq(L(q0));
      });
    return {
      format,
      stem,
      answer,
      slips,
      asks:
        kind === "all"
          ? "every value that makes the original equation true, after any false solutions are thrown out"
          : form === "func"
            ? `the value of ${m("k")} for which ${m(`\\sqrt{${lin([[alpha, "k"]], beta)}}`)} equals ${m(linTex)}`
            : "the value that makes the original equation true",
      steps,
      check: none
        ? `${m(`\\sqrt{${num(R(T))}} = ${num(sqrtRat(R(T)) ?? 0)}`)}, which is not ${n(L(T))}, and ${m(`\\sqrt{${num(R(E))}} = ${num(sqrtRat(R(E)) ?? 0)}`)}, which is not ${n(L(E))}`
        : `${m(`\\sqrt{${times(alpha, T)} ${signed(beta)}} = \\sqrt{${num(R(T))}} = ${num(L(T))}`)}, and the right side is ${m(`${linTex.replace(w, paren(T))} = ${num(L(T))}`)}`,
      tip: "Squaring both sides can add a false solution, so put every candidate back into the original equation; a square root can never equal a negative number",
      hint: "Square both sides, then test each result in the original equation.",
      difficulty:
        form === "func"
          ? p === -1
            ? 6
            : 7
          : none
            ? 6
            : form === "minus"
              ? 6
              : kind === "all"
                ? 4
                : 5,
      isCorrect: (cand) => {
        const truth = truthSet();
        if (kind === "all") {
          const vals = sets.values(cand);
          return vals !== null && sameSet(vals, truth);
        }
        const x = valueOf(cand);
        return x !== null && truth.length === 1 && truth[0].eq(x);
      },
    };
  },
};
