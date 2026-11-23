/*
 * m-linear-functions: evaluating f(x), finding the input for an output, defining a linear
 * function from two values (or a table), and building one from a situation. Item models after
 * the bank's own questions for this skill. Each check works from the original definition or
 * from the given values, never from the steps that built the answer.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { table } from "../core/figures";
import { block, lin, m, money, n, num, signed, times } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import { contextBuild } from "./_systems-lf-context";
import { addWord, fitsBox, near, numSlip, undoAdd, valueOf } from "./_systems-common";

const SKILL = "m-linear-functions";
const NAMES = ["f", "g", "h", "p", "k"] as const;

/** A linear function given as a x + b, k(x + h) or (x + h)/k. */
type Form =
  | { kind: "lin"; a: Frac; b: Frac }
  | { kind: "scaled"; k: Frac; h: Frac }
  | { kind: "over"; k: number; h: Frac };

function formTex(f: Form, v = "x"): string {
  if (f.kind === "lin") return lin([[f.a, v]], f.b);
  const inside = lin([[1, v]], f.h);
  if (f.kind === "over") return `\\frac{${inside}}{${f.k}}`;
  const head = f.k.eq(-1) ? "-" : num(f.k);
  return `${head}(${inside})`;
}

function formAt(f: Form, x: Frac): Frac {
  if (f.kind === "lin") return f.a.mul(x).add(f.b);
  if (f.kind === "scaled") return f.k.mul(x.add(f.h));
  return x.add(f.h).div(f.k);
}

export const evaluate: Template = {
  id: "lin-fn.evaluate",
  skill: SKILL,
  label: "Evaluate a linear function at a value",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const name = rng.pick(NAMES);
    const shape = rng.pick(["lin", "lin", "lin", "scaled", "over", "combo"] as const);
    const c = F(rng.nonzero(-9, 12));
    const at = m(`${name}(${num(c)})`);
    let form: Form | null = null;
    let value: Frac;
    let def: string;
    const slips: Slip[] = [];
    let steps: Draft["steps"];
    let check: string;
    let difficulty: number;
    let isRight: (v: Frac) => boolean;
    let stem: string;

    if (shape === "combo") {
      const p = F(rng.nonzero(-9, 9));
      const q = F(rng.int(2, 9));
      const s = F(rng.int(2, 9));
      const sign = rng.pick([1, -1]);
      const fc = c.add(p);
      const gc = q.mul(c);
      value = s.mul(fc).add(gc.mul(sign));
      const expr = `${num(s)}f(${num(c)}) ${sign > 0 ? "+" : "-"} g(${num(c)})`;
      def = `f(x) = ${lin([[1, "x"]], p)}`;
      stem = `If ${m(def)} and ${m(`g(x) = ${lin([[q, "x"]])}`)}, what is the value of ${m(expr)}?`;
      slips.push(
        numSlip(
          s.mul(c).add(p).add(gc.mul(sign)),
          `you multiplied only ${n(c)} by ${n(s)}, not all of ${m(`f(${num(c)})`)}`
        ),
        numSlip(
          s.mul(fc).sub(gc.mul(sign)),
          `you ${sign > 0 ? "subtracted" : "added"} ${m(`g(${num(c)})`)} instead of ${sign > 0 ? "adding" : "subtracting"} it`
        ),
        numSlip(fc.add(gc.mul(sign)), `you left out the factor ${n(s)} in front of ${m("f")}`),
        numSlip(
          s.mul(c.neg().add(p)).add(q.mul(c.neg()).mul(sign)),
          `you used ${n(c.neg())} instead of ${n(c)}`
        )
      );
      steps = [
        {
          label: "Find each function's value",
          work: `${m(`f(${num(c)}) = ${num(c)} ${signed(p)} = ${num(fc)}`)} and ${m(`g(${num(c)}) = ${times(q, c)} = ${num(gc)}`)}`,
        },
        {
          label: "Combine them as written",
          work: m(
            `${times(s, fc)} ${sign > 0 ? "+" : "-"} ${gc.n < 0 ? `(${num(gc)})` : num(gc)} = ${num(value)}`
          ),
        },
      ];
      const k1 = s.add(q.mul(sign));
      check = `Combine the definitions first: ${m(`${num(s)}(x ${signed(p)}) ${sign > 0 ? "+" : "-"} ${lin([[q, "x"]])} = ${lin([[k1, "x"]], s.mul(p))}`)}. At ${m(`x = ${num(c)}`)} this is ${m(num(value))}`;
      difficulty = c.n < 0 || sign < 0 ? 3 : 2;
      isRight = (v) => k1.mul(c).add(s.mul(p)).eq(v);
    } else {
      if (shape === "lin") {
        const a = F(rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 100, -2, -3, -4, -5, -6]));
        form = { kind: "lin", a, b: F(rng.nonzero(-30, 30)) };
      } else if (shape === "scaled") {
        const half = rng.bool(0.4);
        const k = half ? F(1, rng.pick([2, 3, 4])) : F(rng.pick([2, 3, 4, 5, 6, -2, -3]));
        const h = F(rng.nonzero(-12, 12));
        need(k.mul(c.add(h)).isInt() && !c.add(h).isZero(), "whole value");
        form = { kind: "scaled", k, h };
      } else {
        const k = rng.pick([2, 3, 4, 5, 6]);
        const h = F(rng.nonzero(-15, 15));
        need(c.add(h).div(k).isInt() && !c.add(h).isZero(), "whole value");
        form = { kind: "over", k, h };
      }
      const f = form;
      value = formAt(f, c);
      def = `${name}(x) = ${formTex(f)}`;
      stem = rng.pick([
        `The function ${m(name)} is defined by ${m(def)}. What is the value of ${at}?`,
        `${block(def)}\nFor the function ${m(name)} defined by the given equation, what is the value of ${at}?`,
        `If ${m(def)}, what is the value of ${m(`${name}(x)`)} when ${m(`x = ${num(c)}`)}?`,
      ]);
      if (f.kind === "lin") {
        const { a, b } = f;
        slips.push(
          numSlip(a.mul(c), `you multiplied ${n(a)} by ${n(c)} but did not ${addWord(b)}`),
          numSlip(
            a.mul(c.add(b)),
            `you combined ${n(c)} and ${n(b)} before multiplying by ${n(a)}`
          ),
          numSlip(
            a.mul(c).sub(b),
            `you ${b.n > 0 ? "subtracted" : "added"} ${n(b.abs())} instead of ${b.n > 0 ? "adding" : "subtracting"} it`
          ),
          numSlip(a.add(c).add(b), `you added ${n(c)} to ${n(a)} instead of multiplying`)
        );
        if (c.n < 0)
          slips.splice(
            1,
            0,
            numSlip(a.mul(c.neg()).add(b), `you used ${n(c.neg())} instead of ${n(c)}`)
          );
        steps = [
          {
            label: "Substitute the input",
            work: `Replace ${m("x")} with ${n(c)}: ${m(`${name}(${num(c)}) = ${times(a, c)} ${signed(b)}`)}`,
          },
          {
            label: "Work out the value",
            work: `Multiply first, then ${addWord(b).split(" ")[0]}: ${m(`${num(a.mul(c))} ${signed(b)} = ${num(value)}`)}`,
          },
        ];
        check = `Work backward from ${n(value)}: ${m(`${num(value)} ${signed(b.neg())} = ${num(value.sub(b))}`)}, and ${m(`${num(value.sub(b))} \\div ${a.n < 0 ? `(${num(a)})` : num(a)} = ${num(c)}`)}, the input you started with`;
        difficulty = a.n < 0 || c.n < 0 ? 2 : 1;
        isRight = (v) => v.sub(b).div(a).eq(c);
      } else if (f.kind === "scaled") {
        const { k, h } = f;
        const inner = c.add(h);
        slips.push(
          numSlip(
            k.mul(c).add(h),
            `you multiplied only ${n(c)} by ${n(k)}, not the ${n(h)} as well`
          ),
          numSlip(inner, `you added inside the parentheses but did not multiply by ${n(k)}`),
          numSlip(inner.div(k), `you divided by ${n(k)} instead of multiplying`),
          numSlip(k.mul(c.sub(h)), `you made a sign slip with the ${n(h)}`)
        );
        steps = [
          {
            label: "Substitute the input",
            work: m(`${name}(${num(c)}) = ${k.eq(-1) ? "-" : num(k)}(${num(c)} ${signed(h)})`),
          },
          {
            label: "Work inside the parentheses first",
            work: m(`${num(c)} ${signed(h)} = ${num(inner)}`),
          },
          {
            label: "Multiply by the outside factor",
            work: m(`${times(k, inner)} = ${num(value)}`),
          },
        ];
        check = `Distribute first: ${m(`${formTex(f)} = ${lin([[k, "x"]], k.mul(h))}`)}, and ${m(`${times(k, c)} ${signed(k.mul(h))} = ${num(value)}`)}`;
        difficulty = k.isInt() && k.n > 0 && inner.n > 0 ? 1 : 2;
        isRight = (v) => k.mul(c).add(k.mul(h)).eq(v);
      } else {
        const { k, h } = f;
        const inner = c.add(h);
        slips.push(
          numSlip(inner, `you added in the numerator but did not divide by ${k}`),
          numSlip(inner.mul(k), `you multiplied by ${k} instead of dividing`),
          numSlip(c.div(k).add(h), `you divided only ${n(c)} by ${k}, not the whole numerator`),
          numSlip(c.sub(h).div(k), `you made a sign slip with the ${n(h)}`)
        );
        steps = [
          {
            label: "Substitute the input",
            work: m(`${name}(${num(c)}) = \\frac{${num(c)} ${signed(h)}}{${k}}`),
          },
          { label: "Simplify the numerator", work: m(`${num(c)} ${signed(h)} = ${num(inner)}`) },
          {
            label: "Divide by the denominator",
            work: m(`\\frac{${num(inner)}}{${k}} = ${num(value)}`),
          },
        ];
        check = `Multiply back: ${m(`${times(k, value)} = ${num(inner)}`)}, and ${m(`${num(inner)} ${signed(h.neg())} = ${num(c)}`)}, the input`;
        difficulty = 2;
        isRight = (v) => v.mul(k).sub(h).eq(c);
      }
    }
    return {
      format,
      stem,
      answer: numAnswer(value, m(num(value))),
      slips,
      asks:
        shape === "combo"
          ? `the value of the whole expression, built from ${m("f")} and ${m("g")} at ${m(`x = ${num(c)}`)}`
          : `the output of ${m(name)} when the input is ${n(c)}`,
      steps,
      check,
      tip: `To evaluate a function, put the input in parentheses in place of every ${m("x")}, then follow the order of operations`,
      hint: `Replace ${m("x")} with ${n(c)} in the definition.`,
      difficulty,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && isRight(v);
      },
    };
  },
};

const CLUBS = [
  ["A student council", "car stickers"],
  ["A craft club", "candles"],
  ["A robotics team", "T-shirts"],
  ["A photography club", "calendars"],
  ["A garden club", "potted plants"],
  ["An art class", "tote bags"],
  ["A cooking club", "cookbooks"],
  ["A choir", "concert posters"],
] as const;

export const solveInput: Template = {
  id: "lin-fn.solve-input",
  skill: SKILL,
  label: "Find the input that gives an output",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const shape = rng.pick(["lin", "lin", "scaled", "over", "profit"] as const);
    const name = rng.pick(NAMES);
    const letter = rng.pick(["a", "b", "t", "w", "r"]);
    let f: Form;
    let x0: Frac;
    if (shape === "profit") {
      const P = rng.pick([3, 4, 5, 6, 8, 10, 12, 15]);
      const C = rng.int(8, 60) * 5;
      x0 = F(rng.int(Math.ceil(C / P) + 5, Math.ceil(C / P) + 120));
      f = { kind: "lin", a: F(P), b: F(-C) };
    } else if (shape === "lin") {
      f = {
        kind: "lin",
        a: F(rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 12, 20, -2, -3, -4, -5])),
        b: F(rng.nonzero(-25, 25)),
      };
      x0 = F(rng.nonzero(-12, 15));
    } else if (shape === "scaled") {
      f = { kind: "scaled", k: F(rng.pick([2, 3, 4, 5, 6, 8])), h: F(rng.nonzero(-9, 9)) };
      x0 = F(rng.nonzero(-10, 12));
    } else {
      f = { kind: "over", k: rng.pick([2, 3, 4, 5, 6, 7]), h: F(rng.nonzero(-15, 15)) };
      x0 = F(rng.nonzero(-40, 40));
    }
    const target = formAt(f, x0);
    need(!target.isZero() && !target.eq(x0), "trivial target");
    const def = `${shape === "profit" ? "p" : name}(x) = ${formTex(f)}`;
    let stem: string;
    let asks: string;
    const slips: Slip[] = [];
    let steps: Draft["steps"];
    let difficulty: number;
    const unknown = shape === "over" ? letter : "x";
    if (shape === "profit" && f.kind === "lin") {
      const [club, item] = rng.pick(CLUBS);
      const P = f.a;
      const C = f.b.neg();
      stem = `${club} is selling ${item} to raise money. The function ${m(def)} gives the club's profit ${m("p(x)")}, in dollars, from selling ${m("x")} ${item}. How many ${item} must the club sell to make a profit of ${m(money(target))}?`;
      asks = `the number of ${item} that gives a profit of ${m(money(target))}`;
      slips.push(
        numSlip(P.mul(target).sub(C), `you found the profit from selling ${n(target)} ${item}`),
        numSlip(
          target.add(C),
          `you found the sales needed, in dollars, but did not divide by ${n(P)}`
        ),
        numSlip(target.sub(C).div(P), `you subtracted ${n(C)} instead of adding it`),
        numSlip(target.div(P), `you left out the ${m(money(C))} in costs`)
      );
      steps = [
        { label: "Set the profit equal to the goal", work: m(`${formTex(f)} = ${num(target)}`) },
        {
          label: `Get the ${m("x")}-term alone`,
          work: `Add ${n(C)} to both sides: ${m(`${num(P)}x = ${num(target.add(C))}`)}`,
        },
        { label: `Find ${m("x")}`, work: `Divide both sides by ${n(P)}: ${m(`x = ${num(x0)}`)}` },
      ];
      difficulty = format === "spr" ? 3 : 2;
    } else {
      const call = m(`${name}(${unknown}) = ${num(target)}`);
      stem =
        shape === "over"
          ? `The function ${m(name)} is defined by ${m(def)}, and ${call}, where ${m(letter)} is a constant. What is the value of ${m(letter)}?`
          : rng.pick([
              `The function ${m(name)} is defined by ${m(def)}. For what value of ${m("x")} does ${call}?`,
              `${block(def)}\nFor the given function ${m(name)}, what value of ${m("x")} gives ${call}?`,
            ]);
      asks = `the input ${m(unknown)} that makes the output of ${m(name)} equal ${n(target)}`;
      slips.push(
        numSlip(
          formAt(f, target),
          `you found ${m(`${name}(${num(target)})`)} instead of the input that gives ${n(target)}`
        )
      );
      if (f.kind === "lin") {
        const { a, b } = f;
        slips.push(
          numSlip(
            target.add(b).div(a),
            `you ${b.n > 0 ? "added" : "subtracted"} ${n(b.abs())} on both sides instead of ${b.n > 0 ? "subtracting" : "adding"} it`
          ),
          numSlip(
            target.sub(b),
            `you stopped at ${m(`${num(a)}x = ${num(target.sub(b))}`)} without dividing by ${n(a)}`
          ),
          numSlip(target.div(a).sub(b), `you divided by ${n(a)} before moving the constant`),
          numSlip(x0.neg(), "you lost a negative sign along the way")
        );
        steps = [
          {
            label: "Set the function equal to the output",
            work: m(`${formTex(f)} = ${num(target)}`),
          },
          {
            label: `Get the ${m("x")}-term alone`,
            work: `${undoAdd(b)}: ${m(`${num(a)}x = ${num(target.sub(b))}`)}`,
          },
          { label: `Find ${m("x")}`, work: `Divide both sides by ${n(a)}: ${m(`x = ${num(x0)}`)}` },
        ];
        difficulty = a.n < 0 || x0.n < 0 ? 2 : 1;
      } else if (f.kind === "scaled") {
        const { k, h } = f;
        slips.push(
          numSlip(
            target.sub(h).div(k),
            `you multiplied only the ${m("x")} by ${n(k)}, not the ${n(h)}`
          ),
          numSlip(target.div(k).add(h), `you made a sign slip moving the ${n(h)}`),
          numSlip(target.sub(h.mul(k)), `you did not divide by ${n(k)}`)
        );
        steps = [
          {
            label: "Set the function equal to the output",
            work: m(`${formTex(f)} = ${num(target)}`),
          },
          {
            label: "Undo the outside factor",
            work: `Divide both sides by ${n(k)}: ${m(`${lin([[1, "x"]], h)} = ${num(target.div(k))}`)}`,
          },
          { label: `Find ${m("x")}`, work: `${undoAdd(h)}: ${m(`x = ${num(x0)}`)}` },
        ];
        difficulty = x0.n < 0 ? 2 : 1;
      } else {
        const k = f.k;
        const h = f.h;
        slips.push(
          numSlip(target.div(k).sub(h), `you divided by ${k} instead of multiplying`),
          numSlip(target.mul(k).add(h), `you made a sign slip moving the ${n(h)}`),
          numSlip(target.mul(k), `you cleared the fraction but forgot the ${n(h)}`)
        );
        steps = [
          {
            label: "Set up the equation",
            work: m(`\\frac{${lin([[1, letter]], h)}}{${k}} = ${num(target)}`),
          },
          {
            label: "Clear the fraction",
            work: `Multiply both sides by ${k}: ${m(`${lin([[1, letter]], h)} = ${num(target.mul(k))}`)}`,
          },
          { label: `Find ${m(letter)}`, work: `${undoAdd(h)}: ${m(`${letter} = ${num(x0)}`)}` },
        ];
        difficulty = target.n < 0 || x0.n < 0 ? 4 : 3;
      }
      if (format === "spr" && difficulty < 3) difficulty++;
    }
    const subst =
      f.kind === "over"
        ? m(`\\frac{${num(x0)} ${signed(f.h)}}{${f.k}} = ${num(target)}`)
        : f.kind === "scaled"
          ? m(`${num(f.k)}(${num(x0)} ${signed(f.h)}) = ${num(target)}`)
          : m(`${times(f.a, x0)} ${signed(f.b)} = ${num(target)}`);
    return {
      format,
      stem,
      answer: numAnswer(x0, m(num(x0))),
      slips,
      asks,
      steps,
      check: `Put ${n(x0)} back in: ${subst}, which is the output you were given`,
      tip: "When the output is given, set the function's rule equal to it and solve; do not put the output into the function",
      hint: `Set the rule for ${m(shape === "profit" ? "p(x)" : `${name}(x)`)} equal to ${n(target)}.`,
      difficulty,
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && formAt(f, v).eq(target);
      },
    };
  },
};

/** f(x) = slope x + b as an expression answer. */
function fnAns(name: string, slope: Frac, b: Frac): Answer {
  return {
    text: m(`${name}(x) = ${lin([[slope, "x"]], b)}`),
    expr: (P) => slope.toNumber() * P.x + b.toNumber(),
  };
}
const fnSlip = (name: string, slope: Frac, b: Frac, why: string): Slip => ({
  ...fnAns(name, slope, b),
  why,
});

export const twoValues: Template = {
  id: "lin-fn.two-values",
  skill: SKILL,
  label: "A linear function from two values or a table",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const name = rng.pick(NAMES);
    const special =
      format === "spr" ? "none" : rng.pick(["none", "none", "none", "constant", "origin"] as const);
    const d = special === "constant" ? 1 : rng.pick([1, 1, 2, 3, 4, 5]);
    const slope = special === "constant" ? F(0) : F(rng.nonzero(-6, 6), d);
    need(special === "constant" || slope.d === d, "lowest terms");
    const b =
      special === "origin"
        ? F(0)
        : F(special === "constant" ? rng.nonzero(-12, 12) : rng.int(-12, 12));
    const xs = rng
      .sample(
        [-8, -6, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 8, 9, 10, 12]
          .map((x) => x * d)
          .filter((x) => Math.abs(x) <= 15),
        3
      )
      .sort((p, q) => p - q);
    const pts = (special === "none" ? xs : [0, ...xs.slice(1)])
      .map((x) => [F(x), slope.mul(x).add(b)] as const)
      .sort((p, q) => p[0].cmp(q[0]));
    const [[x1, y1], [x2, y2]] = pts;
    const useTable = rng.bool(0.35);
    const ask =
      special !== "none" || (format === "mc" && rng.bool(0.5))
        ? "eq"
        : rng.pick(["slope", "third"] as const);
    const fx = (x: Frac) => `${name}(${num(x)})`;
    const given = useTable
      ? `The table shows some values of ${m("x")} and their corresponding values of ${m(`${name}(x)`)} for the linear function ${m(name)}.`
      : `For the linear function ${m(name)}, ${m(`${fx(x1)} = ${num(y1)}`)} and ${m(`${fx(x2)} = ${num(y2)}`)}.`;
    const figure = useTable
      ? table(
          ["$x$", `$${name}(x)$`],
          pts.map(([x, y]) => [`$${num(x)}$`, `$${num(y)}$`])
        )
      : undefined;
    const dy = y2.sub(y1);
    const dx = x2.sub(x1);
    const slopeStep = {
      label: "Find the slope",
      work: `${m(`\\frac{${num(y2)} ${signed(y1.neg())}}{${num(x2)} ${signed(x1.neg())}} = \\frac{${num(dy)}}{${num(dx)}} = ${num(slope)}`)}: the change in output over the change in input`,
    };
    const bStep = {
      label: "Find the y-intercept",
      work: x1.isZero()
        ? `The output at ${m("x = 0")} is ${n(b)}`
        : `${m(`${num(y1)} = ${times(slope, x1)} + b`)}, so ${m(`b = ${num(b)}`)}`,
    };
    const [xc, yc] = pts.find(([x]) => !x.isZero() && !x.eq(x1)) ?? [x2, y2];
    let answer: Answer;
    let slips: Slip[];
    let asks: string;
    let steps: Draft["steps"];
    let check: string;
    let difficulty: number;
    let isRight: (cand: Answer) => boolean;
    let stem: string;
    if (ask === "eq") {
      stem = `${given} Which equation defines ${m(name)}?`;
      answer = fnAns(name, slope, b);
      if (special === "constant") {
        slips = [
          fnSlip(name, F(1), b, "you assumed a slope of 1, but the output never changes"),
          fnSlip(name, F(0), x2, "you used an input value as the output"),
          fnSlip(name, F(0), F(0), "you took the slope, 0, as the whole function"),
          fnSlip(name, F(0), b.neg(), "you lost the sign of the output"),
        ];
      } else {
        slips = [
          ...(slope.abs().eq(1)
            ? []
            : [
                fnSlip(
                  name,
                  slope.inv(),
                  b,
                  "you divided the change in input by the change in output"
                ),
              ]),
          fnSlip(
            name,
            slope.neg(),
            b,
            "you subtracted the outputs and the inputs in opposite orders"
          ),
          ...(x1.isZero()
            ? [fnSlip(name, slope, y2, `you used ${m(fx(x2))} as the y-intercept`)]
            : [
                fnSlip(
                  name,
                  slope,
                  y1,
                  `you used ${m(fx(x1))} as the y-intercept, but the y-intercept is the output at ${m("x = 0")}`
                ),
              ]),
          ...(b.isZero()
            ? [fnSlip(name, slope.inv(), x2, "you flipped the slope and added an input value")]
            : [fnSlip(name, slope, b.neg(), "you made a sign slip finding the y-intercept")]),
          ...(b.isZero() || b.eq(slope)
            ? []
            : [fnSlip(name, b, slope, "you swapped the slope and the y-intercept")]),
        ];
      }
      asks = `the rule for ${m(name)}: its slope and its y-intercept`;
      steps =
        special === "constant"
          ? [
              {
                label: "Compare the outputs",
                work: `Both outputs are ${n(b)}, so the output does not change: the slope is ${m("0")}`,
              },
              { label: "Write the function", work: m(`${name}(x) = ${num(b)}`) },
            ]
          : [
              slopeStep,
              bStep,
              { label: "Write the function", work: m(`${name}(x) = ${lin([[slope, "x"]], b)}`) },
            ];
      check =
        special === "constant"
          ? `The rule ${m(`${name}(x) = ${num(b)}`)} gives ${n(b)} for every input, so it gives both values in the question`
          : `${m(`${fx(xc)} = ${lin([[slope, `(${num(xc)})`]], b)} = ${num(yc)}`)}, which matches the given value`;
      difficulty =
        special === "constant" ? 2 : special === "origin" ? 3 : slope.isInt() && !useTable ? 3 : 4;
      isRight = (cand) =>
        !!cand.expr && pts.every(([x, y]) => near(cand.expr!({ x: x.toNumber() }), y.toNumber()));
    } else if (ask === "slope") {
      stem = useTable
        ? `${given} If ${m(`${name}(x) = ax + b`)}, where ${m("a")} and ${m("b")} are constants, what is the value of ${m("a")}?`
        : `A linear function ${m(name)} is defined by ${m(`${name}(x) = ax + b`)}, where ${m("a")} and ${m("b")} are constants. If ${m(`${fx(x1)} = ${num(y1)}`)} and ${m(`${fx(x2)} = ${num(y2)}`)}, what is the value of ${m("a")}?`;
      answer = numAnswer(slope, m(num(slope)));
      slips = [
        numSlip(dx.div(dy), "you divided the change in input by the change in output"),
        numSlip(slope.neg(), "you subtracted the outputs and the inputs in opposite orders"),
        numSlip(b, `you found ${m("b")}, the y-intercept, not ${m("a")}`),
        numSlip(
          y2.div(x2),
          "you divided one output by its input, which works only when the line passes through the origin"
        ),
        numSlip(dy, "you found the change in output but did not divide by the change in input"),
      ];
      asks = `the slope ${m("a")} of the linear function`;
      steps = [
        slopeStep,
        {
          label: `Read off ${m("a")}`,
          work: `In ${m(`${name}(x) = ax + b`)}, ${m("a")} is the slope, so ${m(`a = ${num(slope)}`)}`,
        },
      ];
      check = `From ${m(`x = ${num(x1)}`)} to ${m(`x = ${num(x2)}`)} the input rises by ${n(dx)}, and ${m(`${num(y1)} + ${times(slope, dx)} = ${num(y2)}`)}`;
      difficulty = x1.n < 0 || y1.n < 0 || !slope.isInt() ? 4 : 3;
      isRight = (cand) => {
        const v = valueOf(cand);
        return v !== null && y1.add(v.mul(dx)).eq(y2);
      };
    } else {
      const x3 = F(
        rng.pick(
          [-10, -7, -5, 7, 11, 14, 15, 16, 20]
            .map((x) => x * d)
            .filter((x) => !xs.includes(x) && Math.abs(x) <= 40)
        )
      );
      const y3 = slope.mul(x3).add(b);
      stem = `${given} What is the value of ${m(fx(x3))}?`;
      answer = numAnswer(y3, m(num(y3)));
      slips = [
        numSlip(slope.mul(x3), "you multiplied by the slope but left out the y-intercept"),
        numSlip(y1.add(x3.sub(x1)), "you assumed the output rises by 1 for each 1 the input rises"),
        numSlip(slope.mul(x3).sub(b), "you made a sign slip with the y-intercept"),
        numSlip(slope.neg().mul(x3).add(b), "you used the slope with the wrong sign"),
      ];
      asks = `the output of ${m(name)} at a third input, ${n(x3)}`;
      steps = [
        slopeStep,
        bStep,
        {
          label: "Evaluate at the new input",
          work: m(`${fx(x3)} = ${times(slope, x3)} ${signed(b)} = ${num(y3)}`),
        },
      ];
      check = `Step from ${m(`x = ${num(x2)}`)}: the input changes by ${n(x3.sub(x2))}, so the output changes by ${m(slope.eq(1) ? num(x3.sub(x2)) : `${times(slope, x3.sub(x2))} = ${num(slope.mul(x3.sub(x2)))}`)}, and ${m(`${num(y2)} ${signed(slope.mul(x3.sub(x2)))} = ${num(y3)}`)}`;
      difficulty = slope.isInt() ? 4 : 5;
      isRight = (cand) => {
        const v = valueOf(cand);
        return v !== null && dy.mul(x3.sub(x1)).eq(v.sub(y1).mul(dx));
      };
    }
    if (format === "spr") need(answer.value && fitsBox(answer.value.asRat()!), "fits the box");
    return {
      format,
      stem,
      ...(figure ? { figure } : {}),
      answer,
      slips,
      asks,
      steps,
      check,
      tip: "For a linear function, the slope is the change in output divided by the change in input, and the y-intercept is the output when the input is 0",
      hint:
        special === "constant"
          ? "Compare the two outputs."
          : "Find the slope from the two pairs of values first.",
      difficulty,
      isCorrect: isRight,
    };
  },
};

export const TEMPLATES: Template[] = [evaluate, solveInput, twoValues, contextBuild];
