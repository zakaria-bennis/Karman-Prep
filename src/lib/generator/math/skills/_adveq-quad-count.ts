/*
 * m-solving-quadratics, continued: how many real solutions a quadratic has, and the constant
 * that gives exactly one, none, or a boundary value. The checks count solutions from the value
 * at the vertex (countByVertex), never from the discriminant the work uses.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { block, m, n, num, paren, poly, signed } from "../core/tex";
import type { Answer, Draft, Slip, Template } from "../core/types";
import {
  type Count,
  countAnswer,
  countByVertex,
  countOf,
  countSlip,
  isqrt,
  slip,
  sqrtRat,
  valueOf,
} from "./_adveq-common";

const SKILL = "m-solving-quadratics";
const VARS = ["x", "x", "x", "t", "n", "w"];

const COUNTS: Count[] = [0, 1, 2, "inf"];

export const countSolutions: Template = {
  id: "quad.count-solutions",
  skill: SKILL,
  label: "How many distinct real solutions a quadratic equation has",
  difficulty: [1, 5],
  formats: ["mc"],
  make(rng, format): Draft {
    const v = rng.pick(VARS);
    const form = rng.pick(["sq", "shift", "vertex", "vertex", "std", "std", "moved"] as const);
    let eq = "";
    let zero: [Frac, Frac, Frac];
    let difficulty = 3;
    let special = false;
    const steps: { label: string; work: string }[] = [];
    let check = "";
    if (form === "sq" || form === "shift" || form === "vertex") {
      // (v - h)^2 = r after the squared part is alone.
      const s = rng.int(2, form === "sq" ? 40 : 15);
      const sign = rng.pick(form === "vertex" ? [-1, 0, 1, 1] : [-1, -1, 0, 1, 1, 1]);
      const square = rng.bool(0.6);
      const r = sign === 0 ? 0 : sign * (square ? s * s : s * s + rng.int(1, 2 * s));
      let lhs: string;
      let piece: string;
      if (form === "vertex") {
        const h = rng.nonzero(-9, 9);
        const a = rng.pick([1, 2, 3, 4, -2, -3]);
        const cst = rng.nonzero(-40, 40);
        special = r === 0 && rng.bool(0.6);
        const d = special ? cst : cst + a * r;
        piece = `(${poly([1, -h], v)})^2`;
        lhs = `${a === 1 ? "" : a === -1 ? "-" : a}${piece} ${signed(cst)}`;
        eq = `${lhs} = ${num(d)}`;
        zero = [F(a), F(-2 * a * h), F(a * h * h + cst - d)];
        steps.push({
          label: "Get the squared part alone",
          work: `${cst < 0 ? `Add ${n(-cst)} to` : `Subtract ${n(cst)} from`} both sides${a === 1 ? "" : ` and divide by ${n(a)}`}: ${m(`${piece} = ${r}`)}`,
        });
        difficulty = special ? 4 : 3;
      } else {
        piece = `${v}^2`;
        if (form === "sq") eq = `${piece} = ${num(r)}`;
        else eq = r === 0 ? `${piece} = 0` : `${piece} ${signed(-r)} = 0`;
        zero = [F(1), F(0), F(-r)];
        if (form === "shift" && r !== 0)
          steps.push({
            label: "Get the squared term alone",
            work: `${r > 0 ? `Add ${n(r)} to` : `Subtract ${n(-r)} from`} both sides: ${m(`${piece} = ${r}`)}`,
          });
        difficulty = form === "sq" ? 1 : 2;
      }
      const root = sqrtRat(F(Math.abs(r)));
      const rootTex = root ? num(root) : `\\sqrt{${Math.abs(r)}}`;
      steps.push({
        label: "Count the square roots",
        work:
          r < 0
            ? `No real number squared is negative, so ${m(`${piece} = ${r}`)} has no real solution`
            : r === 0
              ? `Only $0$ squared is $0$, so the base must be $0$, which happens for exactly one value of ${m(v)}`
              : `Both ${m(rootTex)} and ${m(`-${rootTex}`)} square to ${n(r)}, so the base has two possible values, which give two values of ${m(v)}`,
      });
      check =
        r < 0
          ? `Any real ${m(v)} makes ${m(piece)} zero or positive, so the left side can never reach ${n(r)}`
          : r === 0
            ? `The squared part is $0$ only when its base is $0$, and that base is $0$ for one value of ${m(v)}`
            : `${m(`(${rootTex})^2`)} and ${m(`(-${rootTex})^2`)} both equal ${n(r)}, so both give a solution`;
    } else {
      const a = rng.pick([1, 1, 2, 3, 4, -1, -2]);
      const target = rng.pick([0, 1, 2, 2]);
      let b: number;
      let c: number;
      if (target === 1) {
        const h = rng.nonzero(-9, 9);
        b = -2 * a * h;
        c = a * h * h;
      } else {
        b = rng.nonzero(-15, 15);
        c = rng.nonzero(-30, 30);
      }
      const D = b * b - 4 * a * c;
      need(target === 1 ? D === 0 : target === 2 ? D > 0 : D < 0, "discriminant sign");
      zero = [F(a), F(b), F(c)];
      if (form === "moved") {
        eq = `${poly([a, 0, c], v)} = ${poly([-b, 0], v)}`;
        steps.push({
          label: "Get $0$ on one side",
          work: `${b < 0 ? "Subtract" : "Add"} ${m(poly([Math.abs(b), 0], v))} ${b < 0 ? "from" : "to"} both sides: ${m(`${poly([a, b, c], v)} = 0`)}`,
        });
      } else eq = `${poly([a, b, c], v)} = 0`;
      steps.push({
        label: "Find the discriminant",
        work: m(
          `b^2 - 4ac = ${paren(b)}^2 - 4(${a})(${c}) = ${b * b} ${signed(-4 * a * c)} = ${D}`
        ),
      });
      steps.push({
        label: "Read the count from its sign",
        work:
          D > 0
            ? "A positive discriminant gives two distinct real solutions"
            : D === 0
              ? "A discriminant of $0$ gives exactly one real solution"
              : "A negative discriminant gives no real solutions",
      });
      const h = F(-b, 2 * a);
      const k = F(a).mul(h).mul(h).add(F(b).mul(h)).add(c);
      check = `The graph of ${m(`y = ${poly([a, b, c], v.replace(/./, "x"))}`)} has its vertex at ${m(`x = ${num(h)}`)}, where ${m(`y = ${num(k)}`)}. It opens ${a > 0 ? "up" : "down"}, so it ${k.isZero() ? "touches the x-axis once" : k.sign() === Math.sign(a) ? "never reaches the x-axis" : "crosses the x-axis twice"}`;
      difficulty = form === "moved" ? 5 : target === 1 && a === 1 ? 3 : 4;
    }
    const truth = countByVertex(...zero);
    const why = (wrong: Count): string => {
      if (wrong === "inf")
        return special
          ? "you saw the same number on both sides and thought every value works, but the squared part must still equal $0$"
          : "you mixed up an equation with a fixed number of solutions with one that is true for every value";
      if (truth === 0)
        return wrong === 2
          ? form === "std" || form === "moved"
            ? "you computed the discriminant as $b^2 + 4ac$, which is positive"
            : "you solved as if the squared part could equal a negative number"
          : "you treated a negative value as one solution; exactly one solution needs the squared part (or discriminant) to equal $0$";
      if (truth === 1)
        return wrong === 2
          ? "you expected two solutions from the plus or minus sign, but the square root of $0$ is only $0$"
          : "you treated $0$ as if it were negative; a squared part (or discriminant) of $0$ still gives one solution";
      return wrong === 1
        ? "you took only the positive square root and forgot the negative one"
        : form === "std" || form === "moved"
          ? "you made a sign slip in the discriminant and got a negative value"
          : "you saw a minus sign and thought no real number works, but a positive number has two square roots";
    };
    const slips: Slip[] = COUNTS.filter((x) => x !== truth).map((x) => countSlip(x, why(x)));
    return {
      format,
      stem: `${block(eq)}\nHow many distinct real solutions does the given equation have?`,
      answer: countAnswer(truth),
      slips,
      asks: "how many different real numbers make the equation true",
      steps,
      check,
      tip: "Get the squared part alone or compute $b^2 - 4ac$: a positive value gives two real solutions, $0$ gives one, and a negative value gives none",
      hint:
        form === "std" || form === "moved"
          ? "Write the equation as $ax^2 + bx + c = 0$ and look at $b^2 - 4ac$."
          : "Get the squared part by itself and look at the sign of the other side.",
      difficulty,
      isCorrect: (cand) => countOf(cand) === truth,
    };
  },
};

export const constantForCount: Template = {
  id: "quad.constant-for-count",
  skill: SKILL,
  label: "The constant that gives a quadratic one or no real solutions",
  difficulty: [4, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const v = rng.pick(VARS);
    const variant =
      format === "mc"
        ? rng.pick(["none", "one", "one", "bound"] as const)
        : rng.pick(["one", "bound"] as const);
    if (variant === "none") {
      const a = rng.pick([2, 3, 4, 5, 6]);
      const cst = rng.bool(0.5) ? 0 : rng.nonzero(-12, 12);
      const lhs = `${poly([a, 0, cst], v)}`;
      // a v^2 + cst = k has no real solution when k < cst.
      const k = cst - a * rng.int(1, 12);
      const zeroK = cst;
      const twoA = cst + a * rng.pick([4, 9, 16, 25]);
      const twoB = cst + rng.int(1, 9);
      const ok = (cand: Answer) => {
        const x = valueOf(cand);
        return x !== null && countByVertex(a, 0, F(cst).sub(x)) === 0;
      };
      return {
        format,
        stem: `${block(`${lhs} = k`)}\nIn the given equation, ${m("k")} is a constant. The equation has no real solution. Which of the following could be the value of ${m("k")}?`,
        answer: numAnswer(k, m(num(k))),
        slips: [
          slip(
            zeroK,
            `that value gives ${m(`${a}${v}^2 = 0`)}, which has exactly one solution, ${m(`${v} = 0`)}`
          ),
          slip(
            twoA,
            `that value leaves a positive number for ${m(`${a}${v}^2`)} to equal, which gives two solutions`
          ),
          slip(
            twoB,
            `that value still leaves ${m(`${a}${v}^2`)} equal to a positive number, so there are two solutions`
          ),
        ],
        asks: `a value of ${m("k")} for which no real number makes the equation true`,
        steps: [
          {
            label: "Get the squared term alone",
            work:
              cst === 0
                ? `Divide both sides by ${a}: ${m(`${v}^2 = \\frac{k}{${a}}`)}`
                : `${cst < 0 ? "Add" : "Subtract"} ${n(Math.abs(cst))} ${cst < 0 ? "to" : "from"} both sides and divide by ${a}: ${m(`${v}^2 = \\frac{k ${signed(-cst)}}{${a}}`)}`,
          },
          {
            label: "Make the right side negative",
            work: `${m(`${v}^2`)} is never negative, so there is no real solution exactly when ${m(`k < ${cst}`)}. Of the choices, only ${n(k)} is less than ${n(cst)}`,
          },
        ],
        check: `With ${m(`k = ${k}`)}, the equation becomes ${m(`${v}^2 = ${num(F(k - cst, a))}`)}, and no real number squared is negative`,
        tip: "A squared term is never negative, so an equation that sets one equal to a negative number has no real solution",
        hint: `Get ${m(`${v}^2`)} by itself. What sign must the other side have?`,
        difficulty: 4,
        isCorrect: ok,
      };
    }
    if (variant === "one") {
      // a v^2 + c = d v + r has one solution when a v^2 - d v + (c - r) is a perfect square.
      const a = rng.pick([1, 2, 3, 4, 5]);
      const h = rng.nonzero(-9, 9);
      const d = 2 * a * h;
      const c = rng.nonzero(-40, 40);
      const r = c - a * h * h;
      need(r !== 0 && Math.abs(r) <= 400, "size");
      const eq = `${poly([a, 0, c], v)} = ${poly([d, 0], v)} + r`;
      const sat = (x: Frac) => countByVertex(a, -d, F(c).sub(x)) === 1;
      const slips = [
        slip(c + a * h * h, "you moved $r$ to the other side without changing its sign"),
        slip(h, `you found the one solution, ${m(`${v} = ${h}`)}, instead of ${m("r")}`),
        slip(
          c - (d * d) / 4,
          `you set ${m(`${c} - r`)} equal to ${m(`\\left(\\frac{b}{2}\\right)^2`)} without dividing by ${m(`a = ${a}`)}`
        ),
        slip(c - 4 * a * h * h, "you set $b^2$ equal to $ac$ and left out the 4 in $4ac$"),
      ];
      return {
        format,
        stem: `${block(eq)}\nIn the given equation, ${m("r")} is a constant. The equation has exactly one real solution. What is the value of ${m("r")}?`,
        answer: numAnswer(r, m(num(r))),
        slips: a === 1 ? slips.filter((_, i) => i !== 2) : slips,
        asks: `the value of ${m("r")} that leaves exactly one real solution`,
        steps: [
          {
            label: "Get $0$ on one side",
            work: `Subtract ${m(`${poly([d, 0], v)} + r`)} from both sides: ${m(`${poly([a, -d, 0], v)} + (${c} - r) = 0`)}`,
          },
          {
            label: "Set the discriminant to $0$",
            work: `Exactly one solution means ${m(`b^2 - 4ac = 0`)}: ${m(`${paren(-d)}^2 - 4(${a})(${c} - r) = 0`)}, so ${m(`${c} - r = \\frac{${d * d}}{${4 * a}} = ${a * h * h}`)}`,
          },
          { label: `Solve for ${m("r")}`, work: m(`r = ${c} - ${a * h * h} = ${r}`) },
        ],
        check: `With ${m(`r = ${r}`)}, the equation becomes ${m(`${poly([a, -d, a * h * h], v)} = 0`)}, which is ${m(`${a === 1 ? "" : a}(${poly([1, -h], v)})^2 = 0`)}, true only for ${m(`${v} = ${h}`)}`,
        tip: "For exactly one real solution, move every term to one side and set $b^2 - 4ac$ equal to $0$",
        hint: "Move every term to one side, then think about the discriminant.",
        difficulty: format === "spr" ? 6 : a === 1 ? 5 : 6,
        isCorrect: (cand) => {
          const x = valueOf(cand);
          return x !== null && sat(x);
        },
      };
    }
    // bound: a v^2 + q v + w = 0, or a v^2 + q v = s v - w, has no real solutions; extreme q.
    const a = rng.pick([1, 1, 2, 3, -1, -2]);
    const s = rng.bool(0.5) ? 0 : rng.nonzero(-9, 9);
    const w = Math.sign(a) * rng.int(10, 120);
    // zero side: a v^2 + (q - s) v + w; no real solution when (q - s)^2 < 4aw.
    const M = 4 * a * w;
    const root = isqrt(M);
    const G = root * root === M ? root - 1 : root;
    need(G >= 2, "range");
    const greatest = rng.bool(0.5);
    const ans = greatest ? s + G : s - G;
    const lead = poly([a, 0, 0], v);
    const eq =
      s === 0 ? `${lead} + q${v} ${signed(w)} = 0` : `${lead} + q${v} = ${poly([s, -w], v)}`;
    const qs = s === 0 ? "q" : `(q ${signed(-s)})`;
    const qIn = s === 0 ? "q" : `q ${signed(-s)}`;
    const zeroSide = (q: number): [number, number, number] => [a, q - s, w];
    const sat = (x: Frac) =>
      x.isInt() &&
      countByVertex(...zeroSide(x.n)) === 0 &&
      countByVertex(...zeroSide(x.n + (greatest ? 1 : -1))) > 0;
    const word = greatest ? "greatest" : "least";
    const next = greatest ? ans + 1 : ans - 1;
    const half = isqrt(Math.abs(a * w));
    return {
      format,
      stem: `${block(eq)}\nIn the given equation, ${m("q")} is an integer constant. The equation has no real solutions. What is the ${word} possible value of ${m("q")}?`,
      answer: numAnswer(ans, m(num(ans))),
      slips: [
        slip(
          next,
          root * root === M
            ? "that value makes the discriminant $0$, which gives one solution"
            : "that value makes the discriminant positive, so there are two solutions"
        ),
        ...(s === 0
          ? []
          : [
              slip(
                greatest ? G : -G,
                `you found the limit for ${m(qIn)} and forgot to ${s > 0 ? "add" : "subtract"} ${n(Math.abs(s))}`
              ),
            ]),
        slip(
          greatest ? s - G : s + G,
          `you found the ${greatest ? "least" : "greatest"} value, not the ${word}`
        ),
        slip(
          greatest ? s + half : s - half,
          "you compared $b^2$ with $ac$ and left out the 4 in $4ac$"
        ),
      ],
      asks: `the ${word} integer ${m("q")} that leaves the equation with no real solutions`,
      steps: [
        {
          label: "Get $0$ on one side",
          work: `${s === 0 ? "It already equals $0$" : `Subtract ${m(poly([s, -w], v))} from both sides`}: ${m(`${lead} + ${qs}${v} ${signed(w)} = 0`)}`,
        },
        {
          label: "Make the discriminant negative",
          work: `No real solutions means ${m(`${qs}^2 - 4(${a})(${w}) < 0`)}, so ${m(`${qs}^2 < ${M}`)}`,
        },
        {
          label: "Find the integer limit",
          work: `${root * root === M ? `${m(`${root}^2 = ${M}`)} is not less than ${M}` : `${m(`${G}^2 = ${G * G}`)} and ${m(`${G + 1}^2 = ${(G + 1) * (G + 1)}`)}`}, so ${m(`${-G} \\le ${qIn} \\le ${G}`)}. The ${word} value is ${m(`q = ${ans}`)}`,
        },
      ],
      check: `With ${m(`q = ${ans}`)} the discriminant is ${m(`${(ans - s) ** 2} - ${M} = ${(ans - s) ** 2 - M}`)}, which is negative, while ${m(`q = ${next}`)} gives ${m(`${(next - s) ** 2} - ${M} = ${(next - s) ** 2 - M}`)}, which is not`,
      tip: "No real solutions means $b^2 - 4ac < 0$; for an integer limit, test the integers on each side of the boundary",
      hint: "Move every term to one side and write the discriminant in terms of $q$.",
      difficulty: 7,
      isCorrect: (cand) => {
        const x = valueOf(cand);
        return x !== null && sat(x);
      },
    };
  },
};
