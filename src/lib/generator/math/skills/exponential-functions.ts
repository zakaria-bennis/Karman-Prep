/*
 * m-exponential-functions: Exponential functions (Advanced Math). Growth, decay and what
 * each number means: reading a model (start, percent rate, y-intercept, doubling time),
 * interpreting a statement about it, and building a model from words. More templates (forms
 * and rates, finding constants) are in _funcpct-exp-forms.ts. Every check works from the
 * model itself: exact values with Frac, or expressions compared at EXPR_POINTS.
 */
import { need } from "../core/build";
import { F, Frac } from "../core/frac";
import { int, m } from "../core/tex";
import type { Answer, Draft, Template } from "../core/types";
import { ans, byValue, dn, fitsBox, keep, pc, pickW, said, saidSlip, sv } from "./_funcpct-common";
import { DECAY, fac, GROW, model, MODELS, startFor } from "./_funcpct-exp-shared";
import { FORM_TEMPLATES } from "./_funcpct-exp-forms";

import { buildModel } from "./_funcpct-exp-build";
const SKILL = "m-exponential-functions";

/** f(k) for f(t) = a b^t, exactly; throws when it leaves the safe range. */
const at = (a: Frac, b: Frac, k: number) => a.mul(b.pow(k));

const pair = (x: Frac | number, y: Frac) => m(`(${dn(x)}, ${dn(y)})`);

export const readModel: Template = {
  id: "exp.read-model",
  skill: SKILL,
  label: "Read a model: starting value, percent rate, y-intercept, doubling time",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["initial", 2],
      ["rate", 3],
      ["intercept", 2],
      ["double", 2],
    ] as const);
    const ctx = rng.pick(MODELS);
    const name = rng.pick(["f", "g", "P", "N", "V", "A"]);
    const v = rng.pick(["t", "x"]);
    if (form === "intercept") {
      if (format === "spr") {
        const a = F(rng.int(2, 40));
        const b = F(rng.pick(GROW.filter((g) => g !== 2)));
        const c = F(rng.int(-30, 30));
        need(!c.isZero() && !a.add(c).isZero(), "nonzero");
        const y0 = a.add(c);
        need(fitsBox(y0), "fits");
        const rhs = `${int(a.n)}(${fac(b)})^{x} ${c.n < 0 ? "-" : "+"} ${int(Math.abs(c.n))}`;
        return {
          format,
          stem: `The graph of ${m(`y = ${rhs}`)} in the ${m("xy")}-plane crosses the ${m("y")}-axis at the point ${m("(0, k)")}. What is the value of ${m("k")}?`,
          answer: ans(y0),
          slips: keep(
            sv(
              c,
              `you used only the constant; at ${m("x = 0")} the power is ${m("1")}, so ${m(`${int(a.n)}`)} is added too`
            ),
            sv(a, "you left out the constant added at the end")
          ),
          asks: `the ${m("y")}-value of the graph where ${m("x = 0")}`,
          steps: [
            {
              label: `Set ${m("x")} equal to zero`,
              work: `${m(`(${fac(b)})^0 = 1`)}, because any positive number to the power ${m("0")} is ${m("1")}`,
            },
            {
              label: "Evaluate",
              work: m(
                `y = ${int(a.n)}(1) ${c.n < 0 ? "-" : "+"} ${int(Math.abs(c.n))} = ${int(y0.n)}`
              ),
            },
          ],
          check: `at ${m("x = 1")} the graph is at ${m(dn(a.mul(b).add(c)))}, a different point, so ${m(`(0, ${int(y0.n)})`)} is the only point on the ${m("y")}-axis`,
          tip: "The y-intercept of y = ab^x + c is a + c, because b to the power 0 is 1",
          hint: `What is any positive number raised to the power ${m("0")}?`,
          difficulty: c.n < 0 ? 3 : 2,
          isCorrect: byValue((k) => k.eq(a.mul(b.pow(0)).add(c))),
        };
      }
      const pure = rng.bool(0.35);
      const a = pure ? F(1) : F(rng.int(-12, 40));
      need(!a.isZero(), "nonzero");
      const b = F(rng.int(2, 15));
      const c = pure ? F(0) : F(rng.int(-40, 40));
      need(pure || (!c.isZero() && !a.add(c).isZero()), "useful");
      const lead = pure ? "" : a.eq(-1) ? "-" : `${a.n < 0 ? `(${a.n})` : int(a.n)}`;
      const rhs = `${lead}${pure ? `${b.n}^{x}` : `(${b.n})^{x}`}${pure ? "" : ` ${c.n < 0 ? "-" : "+"} ${int(Math.abs(c.n))}`}`;
      const y0 = a.add(c);
      const keyOf = (x: Frac | number, y: Frac) => `${F(x).toString()},${y.toString()}`;
      const opt = (x: Frac | number, y: Frac, why: string) =>
        saidSlip(pair(x, y), keyOf(x, y), why);
      const slips = pure
        ? keep(
            opt(0, F(0), `${m(`${b.n}^0`)} is ${m("1")}, not ${m("0")}`),
            opt(0, b, `you put ${m("x = 1")} into the function`),
            opt(1, b, `you found the point where ${m("x = 1")}, which is not on the ${m("y")}-axis`)
          )
        : keep(
            opt(
              0,
              c,
              `you used only the constant; at ${m("x = 0")} the power is ${m("1")}, so ${m(`${int(a.n)}`)} is added too`
            ),
            opt(0, a, "you left out the constant added at the end"),
            opt(
              0,
              a.mul(b).add(c),
              `you put ${m("x = 1")} into the function instead of ${m("x = 0")}`
            ),
            opt(0, b, `you used the base ${m(`${b.n}`)} as the ${m("y")}-intercept`)
          );
      return {
        format,
        stem: rng.bool(0.5)
          ? `What is the ${m("y")}-intercept of the graph of ${m(`y = ${rhs}`)} in the ${m("xy")}-plane?`
          : `The function ${m("f")} is defined by ${m(`f(x) = ${rhs}`)}. What is the ${m("y")}-intercept of the graph of ${m("y = f(x)")} in the ${m("xy")}-plane?`,
        answer: said(pair(0, y0), keyOf(0, y0)),
        slips,
        asks: `the point where the graph crosses the ${m("y")}-axis, where ${m("x = 0")}`,
        steps: [
          {
            label: `Set ${m("x")} equal to zero`,
            work: `${m(`${b.n}^0 = 1`)}, because any positive number to the power ${m("0")} is ${m("1")}`,
          },
          {
            label: "Evaluate",
            work:
              m(
                `y = ${pure ? `${b.n}^0` : `${a.n < 0 ? `(${a.n})` : int(a.n)}(1) ${c.n < 0 ? "-" : "+"} ${int(Math.abs(c.n))}`} = ${int(y0.n)}`
              ) + `, so the point is ${pair(0, y0)}`,
          },
        ],
        check: `the ${m("y")}-intercept always has ${m("x = 0")}, and only ${pair(0, y0)} satisfies the equation with ${m("x = 0")}`,
        tip: "To find a y-intercept, set x = 0; any nonzero base to the power 0 is 1",
        hint: `On the ${m("y")}-axis, ${m("x = 0")}.`,
        difficulty: pure ? 1 : a.n < 0 || c.n < 0 ? 3 : 2,
        isCorrect: (cand: Answer) => {
          const [x, y] = (cand.key ?? "").split(",").map((t) => Frac.parse(t));
          return !!x && !!y && x.isZero() && y.eq(a.mul(b.pow(0)).add(c));
        },
      };
    }
    const grow = ctx.grow;
    const b = F(rng.pick(grow ? GROW : DECAY));
    const a = F(rng.int(2, 900)).mul(rng.pick([1, 1, 10, 100]));
    if (form === "double") {
      const half = !grow;
      const k = rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 25, 30, 40, 50, 60, 90, 600]);
      const base = half ? F(1, 2) : F(2);
      const f = `${name}(${v}) = ${int(a.n)}(${half ? "0.5" : "2"})^{\\frac{${v}}{${k}}}`;
      const word = half ? "half of its value" : "double";
      if (format === "spr") need(fitsBox(F(k)), "fits");
      return {
        format,
        stem: `The function ${m(f)} gives ${ctx.q} ${m(v)} ${ctx.units} after ${ctx.start}. How many ${ctx.units} does it take for ${ctx.q.replace(/, in [^,]+,/, "")} to ${half ? "fall to half of its value" : "double"}?`,
        answer: ans(F(k)),
        slips: keep(
          sv(
            F(2 * k),
            `you found the time for it to ${half ? "fall to a quarter" : "multiply by 4"}`
          ),
          sv(F(2), `you gave the base of the power, not the time`),
          sv(F(k, 2), "you halved the number in the exponent"),
          sv(F(k + 1), "you added one period")
        ),
        asks: `the time for the amount to ${word === "double" ? "double" : "halve"}, which is when the exponent ${m(`\\frac{${v}}{${k}}`)} equals ${m("1")}`,
        steps: [
          {
            label: "Find when the factor applies once",
            work: `The amount is multiplied by ${m(fac(base))} each time the exponent ${m(`\\frac{${v}}{${k}}`)} grows by ${m("1")}`,
          },
          {
            label: "Solve for the time",
            work: `${m(`\\frac{${v}}{${k}} = 1`)} when ${m(`${v} = ${k}`)}`,
          },
        ],
        check: `${m(`${name}(${k}) = ${int(a.n)}(${half ? "0.5" : "2"})^1 = ${int(a.mul(base).n)}`)}${a.mul(base).isInt() ? "" : ""}, which is ${half ? "half" : "twice"} ${m(`${name}(0) = ${int(a.n)}`)}`,
        tip: "In a model with base 2 and exponent t/k the amount doubles every k units of t; with base 0.5 it halves every k units",
        hint: `When does the exponent ${m(`\\frac{${v}}{${k}}`)} equal ${m("1")}?`,
        difficulty: 3,
        isCorrect: byValue((t) => t.div(k).eq(1)),
      };
    }
    const f = model(name, v, a, b, v);
    if (form === "initial") {
      if (format === "spr") need(fitsBox(a), "fits");
      const blind = rng.bool(0.4);
      const shown = blind ? `${name}(${v}) = ${int(a.n)}(c)^{${v}}` : f;
      return {
        format,
        stem: `${blind ? `The function ${m(shown)}, where ${m("c")} is a positive constant, gives` : `The function ${m(shown)} gives`} ${ctx.q} ${m(v)} ${ctx.units} after ${ctx.start}. According to the model, what was ${ctx.q} when ${ctx.start}?`,
        answer: ans(a),
        slips: keep(
          blind
            ? null
            : sv(tryAt(a, b, 1), `you found the value one ${ctx.unit} later, at ${m(`${v} = 1`)}`),
          blind ? null : sv(b, "you gave the growth factor, not the starting amount"),
          blind
            ? null
            : sv(a.mul(b.sub(1).abs()), `you found the change during the first ${ctx.unit}`),
          blind
            ? sv(F(0), `you put ${m(`${v} = 0`)} into the power as if ${m("c^0")} were ${m("0")}`)
            : null,
          blind
            ? sv(F(1), `you found ${m("c^0 = 1")} and forgot to multiply by ${m(int(a.n))}`)
            : null,
          blind ? sv(a.add(1), `you added the power ${m("c^0 = 1")} instead of multiplying`) : null
        ),
        asks: `the value of the model when ${m(`${v} = 0`)}`,
        steps: [
          { label: "Find the starting time", work: `When ${ctx.start}, ${m(`${v} = 0`)}` },
          {
            label: "Evaluate the model there",
            work: `${m(`${blind ? "c" : `(${fac(b)})`}^0 = 1`)}, so ${m(`${name}(0) = ${int(a.n)}(1) = ${int(a.n)}`)}`,
          },
        ],
        check: `in ${m(`ab^{${v}}`)} the number in front is always the value at ${m(`${v} = 0`)}, and here it is ${m(int(a.n))}`,
        tip: "In an exponential model ab^t, the number a in front is the starting amount, the value when t = 0",
        hint: `What is ${m(v)} at the start?`,
        difficulty: 1,
        isCorrect: byValue((y) => y.eq(blind ? a : a.mul(b.pow(0)))),
      };
    }
    // rate: percent change per unit
    const P = b.sub(1).abs().mul(100);
    const word = grow ? "increase" : "decrease";
    if (format === "spr") need(fitsBox(P), "fits");
    const showP = (q: Frac) => (format === "spr" ? dn(q) : pc(q));
    return {
      format,
      stem:
        format === "spr"
          ? `The function ${m(f)} models ${ctx.q} ${m(v)} ${ctx.units} after ${ctx.start}. According to the model, ${ctx.q} ${grow ? "increases" : "decreases"} by ${m("p\\%")} each ${ctx.unit}. What is the value of ${m("p")}?`
          : `The function ${m(f)} models ${ctx.q} ${m(v)} ${ctx.units} after ${ctx.start}. According to the model, by what percent does ${ctx.q} ${word} each ${ctx.unit}?`,
      answer: ans(P, showP),
      slips: keep(
        sv(
          b.mul(100),
          grow
            ? `you wrote the factor ${m(fac(b))} as a percent; it is ${m("100\\%")} plus the increase`
            : `you used ${m(pc(b.mul(100)))}, the part that remains each ${ctx.unit}, not the part lost`,
          showP
        ),
        sv(b, `you used the factor ${m(fac(b))} itself as the percent`, showP),
        sv(
          P.div(100),
          `you found the decimal ${m(dn(P.div(100)))} but did not multiply by ${m("100")}`,
          showP
        ),
        sv(F(100).add(P), "you added the percent to 100", showP)
      ),
      asks: `the percent ${word} each ${ctx.unit}, which comes from the factor ${m(fac(b))}`,
      steps: [
        {
          label: "Find the factor per unit",
          work: `Each ${ctx.unit}, the amount is multiplied by ${m(fac(b))}`,
        },
        {
          label: "Turn the factor into a percent",
          work: grow
            ? `${m(`${fac(b)} = 1 + ${dn(P.div(100))}`)}, so the amount grows by ${m(dn(P.div(100)))}, which is ${m(pc(P))}`
            : `${m(`${fac(b)} = 1 - ${dn(P.div(100))}`)}, so the amount loses ${m(dn(P.div(100)))}, which is ${m(pc(P))}`,
        },
      ],
      check: `${m(`${name}(1) = ${dn(at(a, b, 1))}`)} and ${m(`${name}(0) = ${int(a.n)}`)}; the change ${m(dn(at(a, b, 1).sub(a).abs()))} is ${m(pc(P))} of ${m(int(a.n))}`,
      tip: "A factor b means a change of (b − 1) × 100 percent: 1.06 is a 6% increase and 0.94 is a 6% decrease",
      hint: `Compare the factor ${m(fac(b))} with ${m("1")}.`,
      difficulty: grow ? 2 : 3,
      isCorrect: byValue((p) =>
        (grow ? a.mul(F(100).add(p)).div(100) : a.mul(F(100).sub(p)).div(100)).eq(at(a, b, 1))
      ),
    };
  },
};

function tryAt(a: Frac, b: Frac, k: number): Frac | null {
  try {
    return at(a, b, k);
  } catch {
    return null;
  }
}

export const interpret: Template = {
  id: "exp.interpret",
  skill: SKILL,
  label: "Interpret a statement about an exponential model",
  difficulty: [1, 4],
  formats: ["mc"],
  make(rng, format): Draft {
    const ctx = rng.pick(MODELS);
    const b = F(rng.pick(ctx.grow ? [2, 3, 1.5, 1.2, 1.1, 1.25] : [0.5, 0.8, 0.9, 0.75, 0.6]));
    const k = rng.int(2, b.d === 1 ? 7 : 4);
    const a = startFor(rng, b, k, 20, 5000);
    const val = at(a, b, k);
    need(val.isInt() && val.lt(1_000_000) && !val.eq(k), "clean value");
    const name = rng.pick(["f", "P", "N", "V"]);
    const v = rng.pick(["t", "x"]);
    const f = model(name, v, a, b, v);
    const what = rng.pick(["value", "start", "factor"] as const);
    const after = (t: string) => `${t} ${ctx.units} after ${ctx.start}`;
    const Q = ctx.q.charAt(0).toUpperCase() + ctx.q.slice(1);
    const P = b.sub(1).abs().mul(100);
    // A claim is checked against the model: at:t:y means f(t) = y; gain:t:y means f(t) - f(0) = y;
    // pct:p means each unit changes the amount by p percent (negative for a decrease); add:y means
    // each unit adds y.
    const holds = (key: string): boolean => {
      const [kind, p1, p2] = key.split(":");
      try {
        if (kind === "at") return at(a, b, Number(p1)).eq(Frac.parse(p2));
        if (kind === "gain") return at(a, b, Number(p1)).sub(a).eq(Frac.parse(p2));
        if (kind === "pct") return b.sub(1).mul(100).eq(Frac.parse(p1));
        if (kind === "add") return at(a, b, 1).sub(a).eq(Frac.parse(p1));
      } catch {
        return false;
      }
      return false;
    };
    let stem: string;
    let answer: Answer;
    let slips;
    let asks: string;
    let steps;
    const amt = (y: Frac) => m(dn(y));
    if (what === "value") {
      stem = `The function ${m(f)} gives ${ctx.q} ${m(v)} ${ctx.units} after ${ctx.start}. Which of the following is the best interpretation of ${m(`${name}(${k}) = ${int(val.n)}`)} in this context?`;
      answer = said(`${capital(after(m(`${k}`)))}, ${ctx.q} is ${amt(val)}`, `at:${k}:${val}`);
      slips = keep(
        saidSlip(
          `${capital(after(amt(val)))}, ${ctx.q} is ${m(`${k}`)}`,
          `at:${val}:${k}`,
          "you swapped the input and the output: the number in the parentheses is the time"
        ),
        saidSlip(
          `During the first ${m(`${k}`)} ${ctx.units} after ${ctx.start}, ${ctx.q} ${ctx.grow ? "increased" : "decreased"} by ${amt(val)}`,
          `gain:${k}:${ctx.grow ? val : val.neg()}`,
          `you read ${m(int(val.n))} as the change; it is the amount itself`
        ),
        saidSlip(
          `When ${ctx.start}, ${ctx.q} was ${amt(val)}`,
          `at:0:${val}`,
          `you ignored the input ${m(`${k}`)}; at the start the amount is ${m(int(a.n))}`
        )
      );
      asks = `what the input ${m(`${k}`)} and the output ${m(int(val.n))} stand for`;
      steps = [
        {
          label: "Name the input",
          work: `The ${m(`${k}`)} inside the parentheses is ${m(v)}, the number of ${ctx.units} after ${ctx.start}`,
        },
        {
          label: "Name the output",
          work: `${m(int(val.n))} is the value of the function, ${ctx.q}`,
        },
      ];
    } else if (what === "start") {
      stem = `The function ${m(f)} gives ${ctx.q} ${m(v)} ${ctx.units} after ${ctx.start}. What is the best interpretation of ${m(int(a.n))} in this context?`;
      answer = said(`${Q} when ${ctx.start}`, `at:0:${a}`);
      slips = keep(
        saidSlip(
          `The amount by which ${ctx.q} ${ctx.grow ? "increases" : "decreases"} each ${ctx.unit}`,
          `add:${ctx.grow ? a : a.neg()}`,
          "you read the starting amount as a constant change; an exponential model changes by a percent"
        ),
        saidSlip(
          `${Q} one ${ctx.unit} after ${ctx.start}`,
          `at:1:${a}`,
          `you placed the starting amount at ${m(`${v} = 1`)}; it is the value at ${m(`${v} = 0`)}`
        ),
        saidSlip(
          `The percent by which ${ctx.q} ${ctx.grow ? "increases" : "decreases"} each ${ctx.unit}`,
          `pct:${ctx.grow ? a : a.neg()}`,
          `you mixed up the two numbers; the percent change comes from ${m(fac(b))}`
        )
      );
      asks = `the meaning of the number in front, ${m(int(a.n))}`;
      steps = [
        {
          label: `Set ${m(v)} to zero`,
          work: `${m(`${name}(0) = ${int(a.n)}(${fac(b)})^0 = ${int(a.n)}`)}`,
        },
        {
          label: "Say what that means",
          work: `${m(`${v} = 0`)} is the moment ${ctx.start}, so ${m(int(a.n))} is the amount then`,
        },
      ];
    } else {
      stem = `The function ${m(f)} gives ${ctx.q} ${m(v)} ${ctx.units} after ${ctx.start}. Which statement is the best interpretation of ${m(fac(b))} in this context?`;
      const verb = ctx.grow ? "increases" : "decreases";
      const sp = ctx.grow ? P : P.neg();
      answer = said(`${Q} ${verb} by ${m(pc(P))} each ${ctx.unit}`, `pct:${sp}`);
      slips = keep(
        saidSlip(
          `${Q} ${verb} by ${m(pc(b.mul(100)))} each ${ctx.unit}`,
          `pct:${ctx.grow ? b.mul(100) : b.mul(100).neg()}`,
          `you wrote the factor as a percent; the change is the part above or below ${m("1")}`
        ),
        saidSlip(
          `${Q} ${verb} by ${m(fac(b))} each ${ctx.unit}`,
          `add:${ctx.grow ? b : b.neg()}`,
          "you read the factor as an amount added or taken away each period"
        ),
        saidSlip(
          `${Q} was ${m(fac(b))} when ${ctx.start}`,
          `at:0:${b}`,
          `you read the factor as the starting amount; the starting amount is ${m(int(a.n))}`
        )
      );
      asks = `what the factor ${m(fac(b))} says about the change each ${ctx.unit}`;
      steps = [
        {
          label: "Find the factor per unit",
          work: `Each time ${m(v)} grows by ${m("1")}, the amount is multiplied by ${m(fac(b))}`,
        },
        {
          label: "Turn it into a percent",
          work: `${m(`${fac(b)} = 1 ${ctx.grow ? "+" : "-"} ${dn(P.div(100))}`)}, a ${ctx.grow ? "gain" : "loss"} of ${m(pc(P))} each ${ctx.unit}`,
        },
      ];
    }
    return {
      format,
      stem,
      answer,
      slips,
      asks,
      steps,
      check: `the model gives ${m(`${name}(0) = ${int(a.n)}`)} and ${m(`${name}(${k}) = ${int(val.n)}`)}, which agree with this reading`,
      tip: "In f(t) = ab^t, t is the time, f(t) is the amount at that time, a is the amount at t = 0, and b is the factor for each unit of time",
      hint:
        what === "value"
          ? "Which number is the input, and which is the output?"
          : `What does the model give when ${m(v)} is ${m("0")}, and what happens each time ${m(v)} grows by ${m("1")}?`,
      difficulty: what === "value" ? (k > 4 ? 3 : 2) : what === "start" ? 1 : ctx.grow ? 3 : 4,
      isCorrect: (cand: Answer) => !!cand.key && holds(cand.key),
    };
  },
};

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const TEMPLATES: Template[] = [readModel, interpret, buildModel, ...FORM_TEMPLATES];
