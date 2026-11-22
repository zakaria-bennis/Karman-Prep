/*
 * m-exponential-functions, part two: rates hidden in a form (a yearly rate from a monthly
 * exponent, the factor from "p% more", the change from one term to a later one), equivalent
 * forms (the factor per half period, the same rate over three units), and finding constants
 * (a missing table value, a^x + b through two points, a lower bound or asymptote).
 */
import { need } from "../core/build";
import { F, Frac } from "../core/frac";
import { table } from "../core/figures";
import { int, m, num } from "../core/tex";
import type { Draft, Template } from "../core/types";
import {
  ans,
  byExpr,
  byValue,
  dn,
  exprAns,
  exprSlip,
  fitsBox,
  keep,
  pickW,
  positive,
  sv,
  type Vars,
} from "./_funcpct-common";
import { fac, MODELS } from "./_funcpct-exp-shared";

const SKILL = "m-exponential-functions";

export const forms: Template = {
  id: "exp.forms",
  skill: SKILL,
  label: "Rates hidden in a form, and equivalent forms",
  difficulty: [4, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["year", 3],
      ["more", 2],
      ["term", 2],
      ["equiv", 2],
      ["per3", 1],
    ] as const);
    if ((form === "equiv" || form === "per3") && format === "spr")
      throw new RangeError("expression forms are multiple choice");
    if (form === "year") {
      const ctx = rng.pick(MODELS);
      const P = F(6 * rng.int(1, ctx.grow ? 16 : 15));
      const b = ctx.grow ? F(1).add(P.div(100)) : F(1).sub(P.div(100));
      const a = F(rng.int(12, 990)).mul(rng.pick([10, 100]));
      const word = ctx.grow ? "increases" : "decreases";
      if (format === "spr") need(fitsBox(P), "fits");
      return {
        format,
        stem: `${m(`f(x) = ${int(a.n)}(${fac(b)})^{\\frac{x}{12}}`)}\n\nThe function ${m("f")} gives ${ctx.q} ${m("x")} months after ${ctx.start}. According to the model, ${ctx.q} ${word} each year by ${m("p\\%")} of its value the year before. What is the value of ${m("p")}?`,
        answer: ans(P),
        slips: positive(
          keep(
            sv(
              b.mul(100),
              ctx.grow
                ? `you wrote the factor ${m(fac(b))} as a percent; the increase is the part above ${m("1")}`
                : `you used ${m(fac(b))}, the part that remains each year, not the part lost`
            ),
            sv(
              P.div(12),
              "you divided the yearly change by 12, but the exponent already counts years: it grows by 1 every 12 months"
            ),
            sv(b, `you used the factor ${m(fac(b))} itself`),
            sv(P.mul(12), "you multiplied by 12, as if the factor applied every month")
          )
        ),
        asks: "the percent change over one year, which is 12 months",
        steps: [
          {
            label: "Find what one year does",
            work: `When ${m("x")} grows by ${m("12")}, the exponent ${m("\\frac{x}{12}")} grows by ${m("1")}, so the value is multiplied by ${m(fac(b))} each year`,
          },
          {
            label: "Turn the factor into a percent",
            work: `${m(`${fac(b)} = 1 ${ctx.grow ? "+" : "-"} ${dn(P.div(100))}`)}, a change of ${m(`${dn(P)}\\%`)}, so ${m(`p = ${dn(P)}`)}`,
          },
        ],
        check: `${m(`f(12) = ${int(a.n)}(${fac(b)})^1 = ${dn(a.mul(b))}`)}, which is ${m(`${dn(P)}\\%`)} ${ctx.grow ? "more" : "less"} than ${m(`f(0) = ${int(a.n)}`)}`,
        tip: "In ab^(x/k), the factor b applies once every k units of x",
        hint: `How much does the exponent grow when ${m("x")} grows by ${m("12")}?`,
        difficulty: 5,
        isCorrect: byValue((p) => (ctx.grow ? F(100).add(p) : F(100).sub(p)).div(100).eq(b)),
      };
    }
    if (form === "more") {
      const p = F(rng.int(2, 95));
      const more = rng.bool(0.6);
      const b = more ? F(1).add(p.div(100)) : F(1).sub(p.div(100));
      const [g, c, mm] = rng.pick([
        ["g", "s", "m"],
        ["f", "n", "t"],
        ["h", "r", "w"],
      ]);
      if (format === "spr") need(fitsBox(b), "fits");
      return {
        format,
        stem: `The exponential function ${m(g)} is defined by ${m(`${g}(x) = ab^{x}`)}, where ${m("a")} and ${m("b")} are positive constants. If ${m(`${g}(${c}) = ${mm}`)}, where ${m(c)} and ${m(mm)} are constants, and the value of ${m(`${g}(${c} + 1)`)} is ${m(`${dn(p)}\\%`)} ${more ? "more" : "less"} than ${m(mm)}, what is the value of ${m("b")}?`,
        answer: ans(b),
        slips: positive(
          keep(
            sv(
              p.div(100),
              `you used the percent change ${m(dn(p.div(100)))} alone; the new value is the old value ${more ? "plus" : "minus"} that part`
            ),
            sv(
              more ? F(1).sub(p.div(100)) : F(1).add(p.div(100)),
              `you treated "${more ? "more" : "less"}" as "${more ? "less" : "more"}"`
            ),
            sv(p, "you used the percent number itself as the factor"),
            sv(more ? b.mul(2) : null, "you doubled the factor")
          )
        ),
        asks: `the factor ${m("b")} that one step in ${m("x")} multiplies by`,
        steps: [
          {
            label: "Compare consecutive values",
            work: `${m(`\\frac{${g}(${c} + 1)}{${g}(${c})} = \\frac{ab^{${c} + 1}}{ab^{${c}}} = b`)}`,
          },
          {
            label: "Write the percent as a factor",
            work: `${m(`${dn(p)}\\%`)} ${more ? "more" : "less"} than ${m(mm)} is ${m(`(1 ${more ? "+" : "-"} ${dn(p.div(100))})${mm} = ${fac(b)}${mm}`)}, so ${m(`b = ${fac(b)}`)}`,
          },
        ],
        check: `with ${m("a = 100")} and ${m(`${c} = 0`)}, ${m(`${g}(0) = 100`)} and ${m(`${g}(1) = ${dn(b.mul(100))}`)}, which is ${m(`${dn(p)}\\%`)} ${more ? "more" : "less"}`,
        tip: "One step in x multiplies an exponential function by b, so p% more means b = 1 + p/100 and p% less means b = 1 − p/100",
        hint: `Divide ${m(`${g}(${c} + 1)`)} by ${m(`${g}(${c})`)}.`,
        difficulty: more ? 4 : 5,
        isCorrect: byValue((v) => v.mul(100).eq(F(100).add(more ? p : p.neg()))),
      };
    }
    if (form === "term") {
      const B = F(rng.pick([1.5, 2.5, 3, 4.2, 6.5, 12.4, 20.42, 1.8, 2.25, 7.5, 3.6, 1.25, 9.8]));
      const k = rng.int(2, 9);
      const n0 = k * rng.int(1, 4);
      const a = rng.int(2, 40);
      const target = B.sub(1).mul(100);
      if (format === "spr") need(fitsBox(target), "fits");
      return {
        format,
        stem: `The function ${m(`f(n) = ${a}(${fac(B)})^{\\frac{n}{${k}}}`)} gives each term of a sequence as a function of the term's position, ${m("n")}, in the sequence. The value of the term in position ${m(`${n0 + k}`)} is ${m("p\\%")} more than the value of the term in position ${m(`${n0}`)}. What is the value of ${m("p")}?`,
        answer: ans(target),
        slips: positive(
          keep(
            sv(
              B.mul(100),
              `you wrote the factor ${m(fac(B))} as a percent; the increase is the part above ${m("1")}`
            ),
            sv(B, `you gave the factor ${m(fac(B))}, not the percent increase`),
            sv(
              target.div(k),
              `you divided by ${m(`${k}`)}, but the two positions are a full ${m(`${k}`)} apart, so the factor applies once`
            ),
            sv(
              B.sub(1),
              `you found the increase as a decimal, ${m(dn(B.sub(1)))}, and did not multiply by ${m("100")}`
            )
          )
        ),
        asks: `the percent increase from position ${m(`${n0}`)} to position ${m(`${n0 + k}`)}`,
        steps: [
          {
            label: "Compare the two exponents",
            work: `${m(`\\frac{${n0 + k}}{${k}} - \\frac{${n0}}{${k}} = 1`)}, so the later term is the earlier one times ${m(fac(B))}`,
          },
          {
            label: "Turn the factor into a percent",
            work: `${m(`${fac(B)} = 1 + ${dn(B.sub(1))}`)}, an increase of ${m(`${dn(target)}\\%`)}`,
          },
        ],
        check: `${m(`\\frac{f(${n0 + k})}{f(${n0})} = (${fac(B)})^{${(n0 + k) / k} - ${n0 / k}} = ${fac(B)}`)}, and ${m(`${dn(target)}\\%`)} more than ${m("1")} is ${m(fac(B))}`,
        tip: "A factor b is an increase of (b − 1) × 100 percent; first find how many times the factor applies between the two inputs",
        hint: "By how much does the exponent change between the two positions?",
        difficulty: 6 + (format === "spr" ? 1 : 0),
        isCorrect: byValue((p) => F(100).add(p).div(100).eq(B)),
      };
    }
    if (form === "equiv") {
      const r = F(rng.pick([1.1, 1.2, 1.3, 0.9, 0.8, 0.7, 1.5, 0.6, 1.4, 0.5]));
      const B = r.mul(r);
      const A = F(rng.int(12, 900)).mul(rng.pick([1, 10]));
      const ctx = rng.pick(MODELS.filter((c) => c.grow === r.gt(1) && c.unit === "year"));
      need(ctx, "context");
      const truth = (v: Vars) => A.toNumber() * Math.pow(B.toNumber(), v.t);
      const eq = (base: string, e: string) => m(`f(t) = ${int(A.n)}(${base})^{${e}}`);
      const half = F(1).add(B.sub(1).div(2));
      return {
        format,
        stem: `${m(`f(t) = ${int(A.n)}(${fac(B)})^{t}`)}\n\nThe function ${m("f")} gives ${ctx.q} ${m("t")} years after ${ctx.start}. Which of the following equivalent equations shows, as a constant or coefficient, the factor by which ${ctx.q} changes every half year?`,
        answer: exprAns(eq(fac(r), "2t"), truth),
        slips: keep(
          exprSlip(
            eq(fac(r), "\\frac{t}{2}"),
            (v) => A.toNumber() * Math.pow(r.toNumber(), v.t / 2),
            "you took the square root of the factor but halved the exponent instead of doubling it"
          ),
          exprSlip(
            eq(fac(B), "2t"),
            (v) => A.toNumber() * Math.pow(B.toNumber(), 2 * v.t),
            "you doubled the exponent but kept the yearly factor, which squares the yearly change"
          ),
          exprSlip(
            eq(fac(half), "2t"),
            (v) => A.toNumber() * Math.pow(half.toNumber(), 2 * v.t),
            `you split the yearly change in half; changes compound, so the half-year factor is the square root of ${m(fac(B))}`
          )
        ),
        asks: "an equation equal to the original for every t whose base is the factor for half a year",
        steps: [
          { label: "Count half years", work: `In ${m("t")} years there are ${m("2t")} half years` },
          {
            label: "Find the half-year factor",
            work: `Two half years make a year, so the factor ${m("r")} satisfies ${m(`r^2 = ${fac(B)}`)}, giving ${m(`r = ${fac(r)}`)}`,
          },
          {
            label: "Write the equivalent form",
            work: `${m(`(${fac(B)})^{t} = ((${fac(r)})^2)^{t} = (${fac(r)})^{2t}`)}, so ${eq(fac(r), "2t")}`,
          },
        ],
        check: `at ${m("t = 1")}, ${m(`(${fac(r)})^2 = ${fac(B)}`)}, the same yearly factor as the original`,
        tip: "To change the period of an exponential model, rewrite the base as a power and use (r^2)^t = r^(2t)",
        hint: "How many half years are in t years?",
        difficulty: 6,
        isCorrect: byExpr(truth),
      };
    }
    const B = F(rng.pick([1.85, 1.2, 1.5, 2.4, 1.35, 3.2, 1.06, 1.12, 2.5]));
    const j = rng.pick([2, 3, 4, 5]);
    const a = rng.int(2, 99);
    const truth = (v: Vars) => a * Math.pow(B.toNumber(), v.x / j);
    const g = (body: string) => m(`g(x) = ${body}`);
    return {
      format,
      stem: `${m(`f(x) = ${a}(${fac(B)})^{x}`)}\n\nThe function ${m("f")} is defined by the given equation. The value of ${m("f(x)")} increases by ${m("p\\%")} for every increase of ${m("x")} by ${m("1")}. For which of the following functions does the value of ${m("g(x)")} increase by ${m("p\\%")} for every increase of ${m("x")} by ${m(`${j}`)}?`,
      answer: exprAns(g(`${a}\\left(${fac(B)}^{x}\\right)^{\\frac{1}{${j}}}`), truth),
      slips: keep(
        exprSlip(
          g(`${a}\\left(${fac(B)}^{x}\\right)^{${j}}`),
          (v) => a * Math.pow(B.toNumber(), v.x * j),
          `you made it grow by ${m("p\\%")} ${m(`${j}`)} times for each step of ${m("1")}, not once for every ${m(`${j}`)}`
        ),
        exprSlip(
          g(`${a}(${fac(B)})^{x - ${j}}`),
          (v) => a * Math.pow(B.toNumber(), v.x - j),
          "you shifted the graph; a shift changes the starting value, not how fast it grows"
        ),
        exprSlip(
          g(`${a}(${fac(B)})^{x + ${j}}`),
          (v) => a * Math.pow(B.toNumber(), v.x + j),
          "you shifted the graph; a shift changes the starting value, not how fast it grows"
        )
      ),
      asks: `a function whose factor ${m(fac(B))} applies once for every ${m(`${j}`)} units of ${m("x")}`,
      steps: [
        {
          label: "Find the factor per step",
          work: `${m("f")} is multiplied by ${m(fac(B))} for each increase of ${m("1")} in ${m("x")}`,
        },
        {
          label: `Spread it over ${j} units`,
          work: `${m("g")} needs the exponent to grow by ${m("1")} when ${m("x")} grows by ${m(`${j}`)}: ${m(`g(x) = ${a}(${fac(B)})^{\\frac{x}{${j}}}`)}`,
        },
        {
          label: "Match a choice",
          work: `${m(`\\left(${fac(B)}^{x}\\right)^{\\frac{1}{${j}}} = (${fac(B)})^{\\frac{x}{${j}}}`)}`,
        },
      ],
      check: `${m(`\\frac{g(x + ${j})}{g(x)} = (${fac(B)})^{\\frac{${j}}{${j}}} = ${fac(B)}`)}, the same factor ${m("f")} has over one unit`,
      tip: "In ab^(x/n) the factor b applies once every n units of x, and (b^x)^(1/n) is the same as b^(x/n)",
      hint: `What exponent grows by ${m("1")} when ${m("x")} grows by ${m(`${j}`)}?`,
      difficulty: 7,
      isCorrect: byExpr(truth),
    };
  },
};

export const constants: Template = {
  id: "exp.constants",
  skill: SKILL,
  label: "Find constants: a table value, a^x + b through two points, a bound",
  difficulty: [3, 6],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["table", 3],
      ["points", 3],
      ["bound", 2],
    ] as const);
    if (form === "table") {
      const a = rng.int(2, 9);
      const b = rng.pick([2, 3, 4]);
      const c = rng.int(-15, 20);
      const ys = [1, 2, 3].map((x) => a * b ** x + c);
      const target = F(ys[2]);
      need(c !== 0 && ys.every((y) => y > 0), "positive values");
      if (format === "spr") need(fitsBox(target), "fits");
      const letter = rng.pick(["a", "k", "r"]);
      const rhs = `${a}(${b})^{x} ${c < 0 ? "-" : "+"} ${Math.abs(c)}`;
      return {
        format,
        stem: `The table shows three values of ${m("x")} and their corresponding values of ${m("y")} for the equation ${m(`y = ${rhs}`)}. In the table, ${m(letter)} is a constant. What is the value of ${m(letter)}?`,
        figure: table(
          [m("x"), m("y")],
          [
            ["1", m(int(ys[0]))],
            ["2", m(int(ys[1]))],
            ["3", m(letter)],
          ]
        ),
        answer: ans(target),
        slips: positive(
          keep(
            sv(
              F(2 * ys[1] - ys[0]),
              `you continued the table as if ${m("y")} went up by the same amount each time; it is exponential, not linear`
            ),
            sv(F(a * b ** 3), `you left out the ${m(`${c < 0 ? "-" : "+"} ${Math.abs(c)}`)}`),
            sv(
              F(ys[1] * b),
              `you multiplied the last value by ${m(`${b}`)}, but the constant ${m(`${c}`)} is not multiplied`
            ),
            sv(
              F(a * b * 3 + c),
              `you multiplied ${m(`${b}`)} by ${m("3")} instead of raising it to the power ${m("3")}`
            )
          )
        ),
        asks: `the value of ${m("y")} when ${m("x = 3")}`,
        steps: [
          {
            label: `Put ${m("x = 3")} into the equation`,
            work: m(`y = ${a}(${b})^{3} ${c < 0 ? "-" : "+"} ${Math.abs(c)}`),
          },
          {
            label: "Evaluate",
            work: m(`${a}(${b ** 3}) ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${int(ys[2])}`),
          },
        ],
        check: `the table's other rows fit: ${m(`${a}(${b}) ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${int(ys[0])}`)} and ${m(`${a}(${b ** 2}) ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${int(ys[1])}`)}`,
        tip: "Evaluate the power first, then multiply, then add the constant",
        hint: `Which value of ${m("x")} goes with ${m(letter)}?`,
        difficulty: 4,
        isCorrect: byValue((v) => v.sub(c).eq(F(ys[1] - c).mul(b))),
      };
    }
    if (form === "points") {
      const a = rng.int(2, 11);
      const b = rng.int(-40, 40);
      need(b !== 0 && b !== -1, "useful");
      const Y0 = 1 + b;
      const x2 = rng.pick([2, 2, 3]);
      need(x2 === 2 || a <= 5, "small cube");
      const Y2 = a ** x2 + b;
      const ask = rng.pick(["sum", "diff", "prod"] as const);
      const val = ask === "sum" ? a + b : ask === "diff" ? a - b : a * b;
      const target = F(val);
      if (format === "spr") need(fitsBox(target), "fits");
      const show = ask === "sum" ? "a + b" : ask === "diff" ? "a - b" : "ab";
      const combine = (aa: number, bb: number) =>
        ask === "sum" ? aa + bb : ask === "diff" ? aa - bb : aa * bb;
      return {
        format,
        stem: `The function ${m("f")} is defined by ${m("f(x) = a^{x} + b")}, where ${m("a")} and ${m("b")} are constants and ${m("a > 0")}. In the ${m("xy")}-plane, the graph of ${m("y = f(x)")} has a ${m("y")}-intercept at ${m(`(0, ${Y0})`)} and passes through the point ${m(`(${x2}, ${int(Y2)})`)}. What is the value of ${m(show)}?`,
        answer: ans(target),
        slips: keep(
          sv(
            F(combine(a ** x2, b)),
            `you used ${m(`a^${x2} = ${a ** x2}`)} as ${m("a")}; take the ${x2 === 2 ? "square" : "cube"} root`
          ),
          sv(
            F(combine(a, Y0)),
            `you took ${m(`b = ${Y0}`)}, the ${m("y")}-intercept itself; at ${m("x = 0")}, ${m("a^0 = 1")} is added to ${m("b")}`
          ),
          sv(
            F(ask === "sum" ? a - b : a + b),
            `you found ${m(ask === "sum" ? "a - b" : "a + b")} instead`
          ),
          sv(F(a), `you found ${m("a")} and stopped`)
        ),
        asks: `${m(show)}, after finding both constants from the two points`,
        steps: [
          {
            label: `Use the ${m("y")}-intercept`,
            work: `${m(`f(0) = a^0 + b = 1 + b = ${Y0}`)}, so ${m(`b = ${b}`)}`,
          },
          {
            label: "Use the other point",
            work: `${m(`a^${x2} ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${int(Y2)}`)}, so ${m(`a^${x2} = ${a ** x2}`)} and ${m(`a = ${a}`)}, since ${m("a > 0")}`,
          },
          {
            label: "Combine",
            work: m(
              `${show} = ${ask === "prod" ? `${a}(${b})` : `${a} ${ask === "sum" ? (b < 0 ? "-" : "+") : b < 0 ? "+" : "-"} ${Math.abs(b)}`} = ${val}`
            ),
          },
        ],
        check: `${m(`f(x) = ${a}^{x} ${b < 0 ? "-" : "+"} ${Math.abs(b)}`)} gives ${m(`f(0) = ${Y0}`)} and ${m(`f(${x2}) = ${int(Y2)}`)}, the two points given`,
        tip: "At x = 0 an exponential term a^x equals 1, so the y-intercept of a^x + b is 1 + b, not b",
        hint: `What is ${m("a^0")}?`,
        difficulty: 5,
        isCorrect: byValue((v) => {
          // b from the intercept, a from the point (a > 0 whole), then compare.
          const bb = Y0 - 1;
          const aa = Math.round(Math.pow(Y2 - bb, 1 / x2));
          return aa ** x2 === Y2 - bb && v.eq(F(combine(aa, bb)));
        }),
      };
    }
    const asym = rng.bool(0.5);
    if (asym) {
      const mm = rng.nonzero(-9, 12);
      const b = F(rng.pick([2, 3, 0.5, 0.25, 4, 1.5, 0.8]));
      const r = rng.nonzero(-20, 20);
      need(mm + r !== r && mm !== r, "distinct");
      if (format === "spr") need(fitsBox(F(r)), "fits");
      const lead = mm === 1 ? "" : mm === -1 ? "-" : `${mm}`;
      return {
        format,
        stem: `The graph of ${m(`y = ${lead}(${fac(b)})^{x} ${r < 0 ? "-" : "+"} ${Math.abs(r)}`)} in the ${m("xy")}-plane has a horizontal asymptote at ${m("y = c")}. What is the value of ${m("c")}?`,
        answer: ans(F(r)),
        slips: keep(
          sv(F(mm + r), `you found the ${m("y")}-intercept, where ${m("x = 0")}`),
          sv(F(mm), "you used the number in front of the power"),
          sv(
            F(0),
            "you used the asymptote of the power alone; the graph is shifted by the constant"
          ),
          sv(F(-r), "you shifted the asymptote the wrong way")
        ),
        asks: "the value the graph approaches but never reaches",
        steps: [
          {
            label: "Find what the power approaches",
            work: `As ${m("x")} ${b.gt(1) ? "decreases" : "increases"} without bound, ${m(`(${fac(b)})^{x}`)} gets closer and closer to ${m("0")}`,
          },
          {
            label: "Add the constant",
            work: `So ${m("y")} gets closer and closer to ${m(`${lead === "-" ? "-" : lead}(0) ${r < 0 ? "-" : "+"} ${Math.abs(r)} = ${r}`)}`,
          },
        ],
        check: `the power is never ${m("0")}, so ${m("y")} never equals ${m(`${r}`)}, but it comes as close as you like`,
        tip: "The graph of y = ab^x + c has the horizontal asymptote y = c",
        hint: `What happens to ${m(`(${fac(b)})^{x}`)} far to one side?`,
        difficulty: 5,
        isCorrect: byValue((v) => v.eq(F(r))),
      };
    }
    const q = rng.int(2, 15);
    const mm = rng.int(2, 9);
    const r = rng.int(1, 20);
    const target = F(r, q);
    need(!target.isInt(), "fraction");
    if (format === "spr") need(fitsBox(target), "fits");
    const show = (v: Frac) => num(v);
    return {
      format,
      stem: `${m(`g(x) = \\frac{1}{${q}}\\left(${mm}(2)^{x} + ${r}\\right)`)}\n\nThe function ${m("g")} is defined by the given equation. For all values of ${m("x")}, the value of ${m("g(x)")} is greater than ${m("k")}, where ${m("k")} is a constant. What is the greatest possible value of ${m("k")}?`,
      answer: ans(target, show),
      slips: positive(
        keep(
          sv(
            F(mm + r, q),
            `you found ${m("g(0)")}; values below it are reached for negative ${m("x")}`,
            show
          ),
          sv(F(r), `you forgot to divide by ${m(`${q}`)}`, show),
          sv(F(mm, q), "you used the coefficient of the power instead of the constant", show),
          sv(
            F(r + 1, q),
            `you treated ${m(`(2)^{x}`)} as being at least ${m("1")} on its own`,
            show
          )
        )
      ),
      asks: `the largest number that ${m("g(x)")} stays above for every ${m("x")}`,
      steps: [
        {
          label: "Find what the power approaches",
          work: `${m("(2)^{x}")} is always positive and gets as close to ${m("0")} as you like as ${m("x")} decreases`,
        },
        {
          label: "Find the lower limit of g",
          work: `So ${m("g(x)")} gets as close as you like to ${m(`\\frac{1}{${q}}(0 + ${r}) = ${num(target)}`)} but stays above it`,
        },
      ],
      check: `any ${m("k")} larger than ${m(num(target))} fails, because ${m("g(x)")} drops below it when ${m("x")} is very negative`,
      tip: "An exponential term b^x with b > 0 is always positive and approaches 0, which sets the bound of the whole function",
      hint: `What value does ${m("(2)^{x}")} approach but never reach?`,
      difficulty: 6,
      isCorrect: byValue((v) => v.mul(q).eq(F(r))),
    };
  },
};

export const FORM_TEMPLATES: Template[] = [forms, constants];
