/*
 * m-graphs-of-quadratics, continued: height and revenue models. The meaning of the vertex, the
 * starting value, the maximum, a later value, and the model built from its vertex. The checks
 * evaluate the model itself and find its peak by symmetry.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { m, n, num, poly } from "../core/tex";
import type { Answer, Draft, Format, Slip, Template } from "../core/types";
import { slip, valueOf } from "./_adveq-common";
import { vertexTex } from "./_adveq-quad-graph";

const SKILL = "m-graphs-of-quadratics";

const OBJECTS = ["ball", "stone", "water balloon", "beanbag", "model rocket", "foam dart"];

const money = (x: number) =>
  `\\$${x >= 1000 ? String(x).replace(/\B(?=(\d{3})+(?!\d))/g, "{,}") : x}`;

function meaningDraft(
  format: Format,
  stem: string,
  answer: Answer,
  slips: Slip[],
  vertexWork: string,
  check: string,
  isCorrect: (cand: Answer) => boolean,
  yWord: string,
  xWord: string
): Draft {
  return {
    format,
    stem,
    answer,
    slips,
    asks: "what the two coordinates of the vertex mean in this situation",
    steps: [
      { label: "Find the vertex", work: vertexWork },
      {
        label: "Read each coordinate",
        work: `The first coordinate is the ${xWord} and the second is the ${yWord}. The leading coefficient is negative, so the vertex is the highest point: a maximum`,
      },
    ],
    check,
    tip: "In a model, the vertex's first coordinate is the input where the extreme value happens, and its second coordinate is that extreme value",
    hint: "Find the vertex, then say what each of its coordinates measures.",
    difficulty: 3,
    isCorrect,
  };
}

const ctxKey = (type: string, y: number, x: number) => `ctx:${type}|${y}|${x}`;
const readKey = (a: Answer) => /^ctx:(\w+)\|(\d+)\|(\d+)$/.exec(a.key ?? "");

export const context: Template = {
  id: "quad-graph.context",
  skill: SKILL,
  label: "Height and revenue models: the vertex, the starting value, the maximum",
  difficulty: [2, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const variant =
      format === "mc"
        ? rng.pick(["meaning", "meaning", "revenue", "start", "max", "model"] as const)
        : rng.pick(["start", "max", "later", "later"] as const);
    const thing = rng.pick(OBJECTS);
    const launched = /rocket|dart/.test(thing) ? "launched" : "thrown";
    const T = rng.int(1, 6);
    const h0 = rng.bool(0.3) ? 0 : rng.int(3, 120);
    const H = h0 + 16 * T * T;
    const v0 = 32 * T;
    const std = poly([-16, v0, h0], "t");
    const vtx = vertexTex(F(-16), F(T), F(H), "t");
    const ht = (t: Frac) => F(-16).mul(t).mul(t).add(F(v0).mul(t)).add(h0);
    const intro = (eq: string) =>
      `The function ${m("h")} gives the height, in feet, of a ${thing} ${m("t")} seconds after it is ${launched}, where ${m(`h(t) = ${eq}`)}.`;

    if (variant === "meaning") {
      const say = (type: string, y: number, x: number) =>
        `The ${thing} reaches a ${type} height of ${m(num(y))} feet ${m(String(x))} seconds after it is ${launched}`;
      const lines: [string, number, number, string][] = [
        [
          "maximum",
          T,
          H,
          "you swapped the roles of the two numbers: the first coordinate is the time and the second is the height",
        ],
        ["maximum", H, 16, "you read the coefficient $16$ as the time"],
        [
          "minimum",
          H,
          T,
          "the coefficient of the squared term is negative, so the graph opens down and the vertex is a maximum",
        ],
      ];
      return meaningDraft(
        format,
        `${intro(vtx)} If ${m("y = h(t)")} is graphed in the ty-plane, which of the following is the best interpretation of the vertex of the graph?`,
        { text: say("maximum", H, T), key: ctxKey("maximum", H, T) },
        lines.map(([type, y, x, why]) => ({ text: say(type, y, x), key: ctxKey(type, y, x), why })),
        `${m(`h(t) = ${vtx}`)} is in vertex form, so the vertex is ${m(`(${T}, ${num(H)})`)}`,
        `${m(`h(${T - 1})`)} and ${m(`h(${T + 1})`)} both equal ${n(ht(F(T + 1)))}, less than ${m(`h(${T}) = ${num(H)}`)}, so the height peaks at ${m(`t = ${T}`)}`,
        (cand) => {
          const hit = readKey(cand);
          const X = F(v0).div(32);
          return (
            !!hit &&
            hit[1] === "maximum" &&
            F(Number(hit[3])).eq(X) &&
            F(Number(hit[2])).eq(ht(X)) &&
            ht(X.sub(1)).eq(ht(X.add(1)))
          );
        },
        "height in feet",
        "time in seconds"
      );
    }

    if (variant === "revenue") {
      const a = rng.pick([2, 3, 4, 5]);
      const P = rng.int(6, 40);
      const M = rng.int(20, 180) * 50;
      need(
        M - a * P * P > 0,
        "revenue positive at price 0 is not needed but keeps the model sensible"
      );
      const say = (type: string, y: number, x: number) =>
        `The ${type} estimated weekly revenue is ${m(money(y))}, at a price of ${m(money(x))}`;
      const R = vertexTex(F(-a), F(P), F(M), "p");
      const Rp = (p: number) => -a * (p - P) ** 2 + M;
      const lines: [string, number, number, string][] = [
        [
          "maximum",
          P,
          M,
          "you swapped the roles: the first coordinate is the price and the second is the revenue",
        ],
        ["maximum", M, a, `you read the coefficient ${n(a)} as the price`],
        [
          "minimum",
          M,
          P,
          "the coefficient of the squared term is negative, so the graph opens down and the vertex is a maximum",
        ],
      ];
      return meaningDraft(
        format,
        `A store models its weekly revenue, in dollars, from selling a product at a price of ${m("p")} dollars with ${m(`R(p) = ${R}`)}. If ${m("y = R(p)")} is graphed in the py-plane, which of the following is the best interpretation of the vertex of the graph?`,
        { text: say("maximum", M, P), key: ctxKey("maximum", M, P) },
        lines.map(([type, y, x, why]) => ({ text: say(type, y, x), key: ctxKey(type, y, x), why })),
        `${m(`R(p) = ${R}`)} is in vertex form, so the vertex is ${m(`(${P}, ${num(M)})`)}`,
        `${m(`R(${P - 1})`)} and ${m(`R(${P + 1})`)} both equal ${n(Rp(P + 1))}, less than ${m(`R(${P}) = ${num(M)}`)}`,
        (cand) => {
          const hit = readKey(cand);
          return (
            !!hit &&
            hit[1] === "maximum" &&
            Number(hit[3]) === P &&
            Number(hit[2]) === Rp(P) &&
            Rp(P - 1) === Rp(P + 1)
          );
        },
        "revenue in dollars",
        "price in dollars"
      );
    }

    if (variant === "start") {
      const fromVertex = rng.bool(0.5);
      need(!fromVertex || h0 > 0, "starts above the ground");
      need(h0 > 0, "a starting height to find");
      return {
        format,
        stem: `${intro(fromVertex ? vtx : std)} What is the height, in feet, of the ${thing} at the moment it is ${launched}?`,
        answer: numAnswer(h0, m(num(h0))),
        slips: fromVertex
          ? [
              slip(H, "you gave the maximum height, the y-coordinate of the vertex"),
              slip(H + 16 * T * T, "you added the squared term instead of subtracting it"),
              slip(H - 16 * T, `you forgot to square ${m(`(0 - ${T})`)}`),
              slip(T, "you gave the time of the maximum height"),
            ]
          : [
              slip(v0, "you took the coefficient of $t$"),
              slip(ht(F(1)), "you found the height after $1$ second instead of at $t = 0$"),
              slip(H, "you gave the maximum height"),
              slip(16, "you took the coefficient of the squared term"),
            ],
        asks: `the height when ${m("t = 0")}, the moment the ${thing} is ${launched}`,
        steps: [
          {
            label: "Use the starting time",
            work: `The ${thing} is ${launched} at ${m("t = 0")}, so find ${m("h(0)")}`,
          },
          {
            label: "Evaluate at zero",
            work: fromVertex
              ? m(`h(0) = -16(0 - ${T})^2 + ${num(H)} = -16(${T * T}) + ${num(H)} = ${h0}`)
              : m(`h(0) = -16(0)^2 + ${v0}(0) + ${h0} = ${h0}`),
          },
        ],
        check: fromVertex
          ? `Expanded, ${m(`h(t) = ${std}`)}, whose constant term is ${n(h0)}`
          : `Every term with ${m("t")} is $0$ at ${m("t = 0")}, leaving the constant ${n(h0)}`,
        tip: "The starting value of a model is its value at time $0$, the y-intercept of its graph",
        hint: `What is the value of ${m("t")} at the moment the ${thing} is ${launched}?`,
        difficulty: fromVertex ? 4 : 2,
        isCorrect: (cand) => {
          const x = valueOf(cand);
          return x !== null && x.eq(ht(F(0)));
        },
      };
    }

    if (variant === "max") {
      return {
        format,
        stem: `${intro(std)} What is the maximum height, in feet, that the ${thing} reaches?`,
        answer: numAnswer(H, m(num(H))),
        slips: [
          slip(T, "you found the time of the maximum height, not the height"),
          slip(
            h0 === 0 ? v0 : h0,
            h0 === 0 ? "you took the coefficient of $t$" : "you gave the starting height"
          ),
          slip(h0 + 16 * T, `you did not square ${m(`t = ${T}`)}`),
          slip(h0 + 48 * T * T, `you treated ${m(`-16(${T})^2`)} as positive`),
        ],
        asks: `the greatest value of ${m("h(t)")}, the y-coordinate of the vertex`,
        steps: [
          {
            label: "Find when the maximum happens",
            work: `The vertex is at ${m(`t = -\\frac{b}{2a} = -\\frac{${v0}}{2(-16)} = ${T}`)}`,
          },
          {
            label: "Find the height then",
            work: m(
              `h(${T}) = -16(${T})^2 + ${v0}(${T})${h0 ? ` + ${h0}` : ""} = ${num(-16 * T * T)} + ${num(v0 * T)}${h0 ? ` + ${h0}` : ""} = ${num(H)}`
            ),
          },
        ],
        check: `In vertex form, ${m(`h(t) = ${vtx}`)}, which shows a maximum of ${n(H)} at ${m(`t = ${T}`)}`,
        tip: "For a maximum or minimum, find the vertex: its first coordinate says when, and its second says how much",
        hint: "The maximum height is at the vertex. When does it happen?",
        difficulty: 5,
        isCorrect: (cand) => {
          const x = valueOf(cand);
          if (x === null) return false;
          const peak = F(v0).div(32);
          return x.eq(ht(peak)) && ht(peak.sub(1)).lt(x) && ht(peak.add(1)).lt(x);
        },
      };
    }

    if (variant === "later") {
      const times1 = [T - 2, T - 1, T + 1, T + 2, T + 3].filter(
        (t) => t > 0 && ht(F(t)).sign() > 0
      );
      need(times1.length > 0, "time");
      const t1 = rng.pick(times1);
      const ans = ht(F(t1));
      return {
        format,
        stem: `A quadratic function ${m("h")} models the height, in feet, of a ${thing} ${m("t")} seconds after it is ${launched}. According to the model, the ${thing} is ${launched} from ${h0 === 0 ? "the ground" : `a height of ${m(String(h0))} feet`} and reaches its maximum height of ${m(num(H))} feet ${m(String(T))} seconds after it is ${launched}. Based on the model, what is the height, in feet, of the ${thing} ${m(String(t1))} seconds after it is ${launched}?`,
        answer: numAnswer(ans, m(num(ans))),
        slips: [
          slip(H - 16 * t1 * t1, `you used ${m(`(${t1})^2`)} instead of ${m(`(${t1} - ${T})^2`)}`),
          slip(
            H - 16 * (t1 + T) ** 2,
            `you used ${m(`(t + ${T})^2`)}, the wrong sign for the vertex`
          ),
          slip(H - 16 * Math.abs(t1 - T), `you did not square ${m(`${t1} - ${T}`)}`),
          slip(H, "you gave the maximum height"),
        ],
        asks: `the model's height at ${m(`t = ${t1}`)}`,
        steps: [
          {
            label: "Write the vertex form",
            work: `The vertex is ${m(`(${T}, ${num(H)})`)}, so ${m(`h(t) = a(t - ${T})^2 + ${num(H)}`)}`,
          },
          {
            label: "Find a from the start",
            work: `${m(`h(0) = ${h0}`)} gives ${m(`${T * T}a + ${num(H)} = ${h0}`)}, so ${m(`a = \\frac{${num(h0 - H)}}{${T * T}} = -16`)}`,
          },
          {
            label: "Evaluate at the given time",
            work: m(
              `h(${t1}) = -16(${t1} - ${T})^2 + ${num(H)} = -16(${(t1 - T) ** 2}) + ${num(H)} = ${num(ans)}`
            ),
          },
        ],
        check: `Expanded, ${m(`h(t) = ${std}`)}, and ${m(`-16(${t1 * t1}) + ${v0}(${t1})${h0 ? ` + ${h0}` : ""} = ${num(ans)}`)}`,
        tip: "Start a model from its vertex form, $a(t - h)^2 + k$, and use one more known point to find $a$",
        hint: "Write the model in vertex form, then use the starting height to find the leading coefficient.",
        difficulty: 7,
        isCorrect: (cand) => {
          const x = valueOf(cand);
          return x !== null && x.eq(ht(F(t1)));
        },
      };
    }

    // model: which equation, from the starting height and the vertex.
    need(h0 > 0, "starts above the ground");
    const choice = (a2: number, b2: number, c2: number) => ({
      text: m(`h(t) = ${poly([a2, b2, c2], "t")}`),
      expr: (vars: Readonly<Record<string, number>>) => a2 * vars.t * vars.t + b2 * vars.t + c2,
    });
    return {
      format,
      stem: `A ${thing} is ${launched} from a height of ${m(String(h0))} feet. According to a quadratic model, ${m(String(T))} seconds after it is ${launched}, it reaches its maximum height of ${m(num(H))} feet. Which equation represents this model, where ${m("h(t)")} is the height, in feet, ${m("t")} seconds after the ${thing} is ${launched}?`,
      answer: choice(-16, v0, h0),
      slips: [
        {
          ...choice(-16, 0, H),
          why: "you used the maximum height as the constant and left out the time of the maximum",
        },
        { ...choice(-16, v0, H), why: "you used the maximum height as the starting height" },
        {
          ...choice(-16, -v0, h0),
          why: "you used the wrong sign for the middle term; the maximum comes at a positive time",
        },
        {
          ...choice(16, -v0, h0),
          why: "you used a positive leading coefficient, which gives a minimum, not a maximum",
        },
      ],
      asks: `the equation whose graph starts at ${m(`(0, ${h0})`)} and has its vertex at ${m(`(${T}, ${num(H)})`)}`,
      steps: [
        {
          label: "Start from the vertex",
          work: `The vertex is ${m(`(${T}, ${num(H)})`)}, so ${m(`h(t) = a(t - ${T})^2 + ${num(H)}`)}`,
        },
        {
          label: "Find a from the starting height",
          work: `${m(`h(0) = ${h0}`)}: ${m(`${T * T}a + ${num(H)} = ${h0}`)}, so ${m("a = -16")}`,
        },
        { label: "Expand", work: m(`-16(${poly([1, -2 * T, T * T], "t")}) + ${num(H)} = ${std}`) },
      ],
      check: `${m(`h(0) = ${h0}`)}, and ${m(`h(${T - 1})`)} and ${m(`h(${T + 1})`)} both equal ${n(ht(F(T + 1)))}, so the peak is at ${m(`t = ${T}`)}, where ${m(`h(${T}) = ${num(H)}`)}`,
      tip: "Build a model from its vertex form, then expand; check the starting value and the vertex in your answer",
      hint: "Write the model as $a(t - h)^2 + k$ using the maximum, then use the starting height.",
      difficulty: 5,
      isCorrect: (cand) => {
        if (!cand.expr) return false;
        const at = (t: number) => cand.expr!({ t });
        const close = (x: number, y: number) => Math.abs(x - y) < 1e-9;
        return close(at(0), h0) && close(at(T), H) && close(at(T - 1), at(T + 1)) && at(T - 1) < H;
      },
    };
  },
};
