/*
 * m-functions-and-transformations: Functions and transformations (Advanced Math). Function
 * notation and evaluation (including solving for an input), composition from formulas or a
 * table, reading values from a graph, and (in _funcpct-func-more.ts) transformations of points
 * and formulas and finding a constant from a zero. Every check recomputes from the definition
 * by a separate route (Horner's rule, the table itself, the graph's own vertices).
 */
import { need } from "../core/build";
import { table } from "../core/figures";
import { F, Frac } from "../core/frac";
import { int, m, num, paren, poly, times } from "../core/tex";
import type { Draft, Template } from "../core/types";
import {
  ans,
  byExpr,
  byValue,
  exprAns,
  exprSlip,
  fitsBox,
  keep,
  pickW,
  sv,
  type Vars,
} from "./_funcpct-common";
import { MORE_TEMPLATES } from "./_funcpct-func-more";

import { graphRead } from "./_funcpct-func-graph";
const SKILL = "m-functions-and-transformations";
const nn = (v: Frac) => num(v);

/** A polynomial's value by Horner's rule (the independent route). */
function horner(coeffs: readonly number[], x: Frac): Frac {
  return coeffs.reduce((acc, c) => acc.mul(x).add(c), F(0));
}

export const evaluate: Template = {
  id: "func.evaluate",
  skill: SKILL,
  label: "Evaluate a function, or find the input for an output",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["cubic", 3],
      ["quad", 2],
      ["abs", 2],
      ["solve", 2],
      ["pair", 1],
    ] as const);
    const name = rng.pick(["f", "g", "h", "p"]);
    if (form === "solve") {
      const mm = rng.nonzero(-9, 9);
      need(mm !== 1, "slope");
      const q = rng.nonzero(-20, 20);
      const r = rng.nonzero(-12, 15);
      const v = mm * r + q;
      need(v !== r && v !== 0, "distinct");
      const letter = rng.pick(["r", "k", "s", "n"]);
      const rule = `${name}(x) = ${poly([mm, q])}`;
      const target = F(r);
      if (format === "spr") need(fitsBox(target), "fits");
      return {
        format,
        stem: `The function ${m(name)} is defined by ${m(rule)}. If ${m(`${name}(${letter}) = ${v}`)}, what is the value of ${m(letter)}?`,
        answer: ans(target, nn),
        slips: keep(
          sv(
            F(mm * v + q),
            `you found ${m(`${name}(${v})`)}, the output for an input of ${m(`${v}`)}; ${m(`${v}`)} is the output here`,
            nn
          ),
          sv(
            F(v + q, mm),
            `you moved ${m(`${q}`)} to the other side without changing its sign`,
            nn
          ),
          sv(F(v - q), `you stopped before dividing by ${m(`${mm}`)}`, nn),
          sv(F(r).neg(), "you lost a negative sign along the way", nn)
        ),
        asks: `the input ${m(letter)} that gives an output of ${m(`${v}`)}`,
        steps: [
          {
            label: "Write an equation",
            work:
              m(`${poly([mm, q], letter)} = ${v}`) +
              `, because ${m(`${name}(${letter})`)} replaces ${m("x")} with ${m(letter)}`,
          },
          {
            label: `Solve for ${m(letter)}`,
            work: `${m(`${mm}${letter} = ${v - q}`)}, so ${m(`${letter} = ${r}`)}`,
          },
        ],
        check: `${m(`${name}(${r}) = ${times(mm, r)} ${q < 0 ? "-" : "+"} ${Math.abs(q)} = ${v}`)}, the output given`,
        tip: "f(k) = v means the input k gives the output v: set the rule equal to v and solve",
        hint: `Set the rule for ${m(name)} equal to ${m(`${v}`)}.`,
        difficulty: mm < 0 || r < 0 ? 3 : 2,
        isCorrect: byValue((k) => horner([mm, q], k).eq(v)),
      };
    }
    if (form === "abs") {
      const h = rng.nonzero(-9, 9);
      const k = rng.int(-12, 12);
      const coef = rng.pick([1, 1, 2, 3, -1, -2]);
      const n = rng.int(-9, 9);
      need(n - h !== 0 && n !== 0 && Math.sign(n - h) < 0, "the absolute value matters");
      const val = coef * Math.abs(n - h) + k;
      const lead = coef === 1 ? "" : coef === -1 ? "-" : `${coef}`;
      const rule = `${name}(x) = ${lead}|${poly([1, -h])}|${k === 0 ? "" : ` ${k < 0 ? "-" : "+"} ${Math.abs(k)}`}`;
      const target = F(val);
      if (format === "spr") need(fitsBox(target), "fits");
      return {
        format,
        stem: `The function ${m(name)} is defined by ${m(rule)}. What is the value of ${m(`${name}(${n})`)}?`,
        answer: ans(target, nn),
        slips: keep(
          sv(
            F(coef * (n - h) + k),
            `you dropped the absolute value bars; ${m(`|${n - h}|`)} is ${m(`${Math.abs(n - h)}`)}`,
            nn
          ),
          sv(
            F(coef * Math.abs(n + h) + k),
            `you used ${m(`x ${h < 0 ? "-" : "+"} ${Math.abs(h)}`)} instead of ${m(poly([1, -h]))}`,
            nn
          ),
          sv(
            F(coef * (Math.abs(n) - h) + k),
            `you took the absolute value of ${m(`${n}`)} alone before subtracting`,
            nn
          ),
          sv(F(coef * Math.abs(n - h)), "you forgot the constant at the end", nn)
        ),
        asks: `the output of ${m(name)} for the input ${m(`${n}`)}`,
        steps: [
          {
            label: "Substitute the input",
            work: m(
              `${name}(${n}) = ${lead}|${n} ${h < 0 ? "+" : "-"} ${Math.abs(h)}|${k === 0 ? "" : ` ${k < 0 ? "-" : "+"} ${Math.abs(k)}`}`
            ),
          },
          {
            label: "Work inside the bars first",
            work: `${m(`|${n - h}| = ${Math.abs(n - h)}`)}, so ${m(`${name}(${n}) = ${lead === "-" ? "-" : lead}${lead === "" || lead === "-" ? "" : "("}${Math.abs(n - h)}${lead === "" || lead === "-" ? "" : ")"}${k === 0 ? "" : ` ${k < 0 ? "-" : "+"} ${Math.abs(k)}`} = ${val}`)}`,
          },
        ],
        check: `${m(`${n}`)} is ${m(`${Math.abs(n - h)}`)} units from ${m(`${h}`)} on the number line, and ${m(`|x ${h < 0 ? "+" : "-"} ${Math.abs(h)}|`)} measures that distance`,
        tip: "Simplify inside absolute value bars first; the result is never negative",
        hint: `Put ${m(`${n}`)} in for ${m("x")} and simplify inside the bars first.`,
        difficulty: coef !== 1 ? 3 : 2,
        isCorrect: byValue((y) =>
          y.eq(
            F(coef)
              .mul(F(n - h).abs())
              .add(k)
          )
        ),
      };
    }
    if (form === "pair") {
      const a = rng.pick([1, 2, 3, 4, -1, -2]);
      const c = rng.int(-20, 30);
      const n = rng.int(2, 4);
      const coeffs = [a, 0, 0, c];
      const val = 2 * c;
      need(c !== 0, "nonzero");
      const target = F(val);
      if (format === "spr") need(fitsBox(target), "fits");
      const fn = horner(coeffs, F(n));
      return {
        format,
        stem: `The function ${m(name)} is defined by ${m(`${name}(x) = ${poly(coeffs)}`)}. What is the value of ${m(`${name}(${n}) + ${name}(-${n})`)}?`,
        answer: ans(target, nn),
        slips: keep(
          sv(
            fn.mul(2),
            `you assumed ${m(`${name}(-${n})`)} equals ${m(`${name}(${n})`)}; a negative number cubed is negative`,
            nn
          ),
          sv(
            F(0),
            `you assumed the two values cancel completely, but the constant ${m(`${c}`)} appears in both`,
            nn
          ),
          sv(fn, `you found only ${m(`${name}(${n})`)}`, nn),
          sv(F(c), "you counted the constant only once", nn)
        ),
        asks: `the sum of the outputs for ${m(`${n}`)} and ${m(`-${n}`)}`,
        steps: [
          {
            label: `Find ${m(`${name}(${n})`)}`,
            work: m(
              `${a === 1 ? "" : a === -1 ? "-" : a}(${n})^3 ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${int(fn.n)}`
            ),
          },
          {
            label: `Find ${m(`${name}(-${n})`)}`,
            work: m(
              `${a === 1 ? "" : a === -1 ? "-" : a}(-${n})^3 ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${int(horner(coeffs, F(-n)).n)}`
            ),
          },
          {
            label: "Add the two outputs",
            work: m(`${int(fn.n)} + ${paren(horner(coeffs, F(-n)))} = ${val}`),
          },
        ],
        check: `the cubed terms are opposites, ${m(`${a * n ** 3}`)} and ${m(`${-a * n ** 3}`)}, so only the two constants remain: ${m(`2(${c}) = ${val}`)}`,
        tip: "A negative number raised to an odd power stays negative; to an even power it becomes positive",
        hint: `What is ${m(`(-${n})^3`)}?`,
        difficulty: format === "spr" ? 4 : 3,
        isCorrect: byValue((y) => y.eq(horner(coeffs, F(n)).add(horner(coeffs, F(-n))))),
      };
    }
    if (form === "quad") {
      const a = rng.pick([1, 2, 3, -1, -2]);
      const b = rng.nonzero(-9, 9);
      const c = rng.int(-15, 15);
      const n = rng.int(-6, -1);
      const coeffs = [a, b, c];
      const val = horner(coeffs, F(n));
      if (format === "spr") need(fitsBox(val), "fits");
      return {
        format,
        stem: `The function ${m(name)} is defined by ${m(`${name}(x) = ${poly(coeffs)}`)}. What is the value of ${m(`${name}(${n})`)}?`,
        answer: ans(val, nn),
        slips: keep(
          sv(
            F(-a * n * n + b * n + c),
            `you squared ${m(`${n}`)} and kept the minus sign; ${m(`(${n})^2 = ${n * n}`)}`,
            nn
          ),
          sv(
            F(a * n * n - b * n + c),
            `you dropped the sign when multiplying ${m(`${b}`)} by ${m(`${n}`)}`,
            nn
          ),
          sv(F(a * 2 * n + b * n + c), "you doubled the input instead of squaring it", nn),
          sv(F(a * n * n + b * n), "you forgot the constant term", nn)
        ),
        asks: `the output of ${m(name)} when the input is ${m(`${n}`)}`,
        steps: [
          {
            label: "Substitute with parentheses",
            work: m(
              `${name}(${n}) = ${a === 1 ? "" : a === -1 ? "-" : a}(${n})^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}(${n})${c === 0 ? "" : ` ${c < 0 ? "-" : "+"} ${Math.abs(c)}`}`
            ),
          },
          {
            label: "Square first, then multiply",
            work: m(
              `${a === 1 ? "" : a === -1 ? "-" : a}(${n * n}) ${b * n < 0 ? "-" : "+"} ${Math.abs(b * n)}${c === 0 ? "" : ` ${c < 0 ? "-" : "+"} ${Math.abs(c)}`} = ${int(val.n)}`
            ),
          },
        ],
        check: `the same value comes from ${m(`(${a}(${n}) ${b < 0 ? "-" : "+"} ${Math.abs(b)})(${n}) ${c < 0 ? "-" : "+"} ${Math.abs(c)}`)}, grouping the first two terms`,
        tip: "Put a negative input in parentheses before squaring, so that (−3)^2 = 9",
        hint: `Write ${m(`(${n})`)} in parentheses wherever ${m("x")} appears.`,
        difficulty: a < 0 ? 3 : 2,
        isCorrect: byValue((y) => y.eq(horner(coeffs, F(n)))),
      };
    }
    const a = rng.pick([1, 1, 2, 3, 4, 5, -1, -2]);
    const c = rng.nonzero(-30, 30);
    const n = rng.pick([2, 3, 4, -2, -3, 2, 3]);
    const coeffs = [a, 0, 0, c];
    const val = horner(coeffs, F(n));
    if (format === "spr") need(fitsBox(val), "fits");
    return {
      format,
      stem: `The function ${m(name)} is defined by ${m(`${name}(x) = ${poly(coeffs)}`)}. What is the value of ${m(`${name}(${n})`)}?`,
      answer: ans(val, nn),
      slips: keep(
        sv(F(a * 3 * n + c), `you multiplied ${m(`${n}`)} by ${m("3")} instead of cubing it`, nn),
        a !== 1
          ? sv(
              F((a * n) ** 3 + c),
              `you multiplied by ${m(`${a}`)} before cubing; the power applies to ${m("x")} only`,
              nn
            )
          : null,
        sv(F(a * n ** 3), "you forgot the constant term", nn),
        sv(F(a * n * n + c), "you squared the input instead of cubing it", nn),
        sv(F(-a * n ** 3 + c), "you lost the sign of the cube", nn)
      ),
      asks: `the output of ${m(name)} for the input ${m(`${n}`)}`,
      steps: [
        {
          label: "Substitute the input",
          work: m(
            `${name}(${n}) = ${a === 1 ? "" : a === -1 ? "-" : a}(${n})^3 ${c < 0 ? "-" : "+"} ${Math.abs(c)}`
          ),
        },
        {
          label: "Cube first, then multiply and add",
          work:
            m(`(${n})^3 = ${n ** 3}`) +
            `, so ${m(`${name}(${n}) = ${a === 1 ? "" : a === -1 ? "-" : `${a}`}${a === 1 || a === -1 ? `${paren(n ** 3)}` : `(${n ** 3})`} ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${int(val.n)}`)}`,
        },
      ],
      check: `${m(`${n} \\times ${n} \\times ${n} = ${n ** 3}`)}, and ${m(`${a} \\times ${paren(n ** 3)} ${c < 0 ? "-" : "+"} ${Math.abs(c)} = ${int(val.n)}`)}`,
      tip: "In function notation, replace every x with the input in parentheses, then follow the order of operations",
      hint: `Replace ${m("x")} with ${m(`${n}`)} and do the power first.`,
      difficulty: n < 0 || a < 0 ? 2 : 1,
      isCorrect: byValue((y) => y.eq(horner(coeffs, F(n)))),
    };
  },
};

export const compose: Template = {
  id: "func.compose",
  skill: SKILL,
  label: "Composition and lookups from a table or from formulas",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["table", 3],
      ["lookup", 1],
      ["formula", 2],
      ["expr", 1],
    ] as const);
    if (form !== "formula" && format === "spr")
      throw new RangeError("typed answers use the formula form");
    if (form === "table" || form === "lookup") {
      const [FN, GN] = rng.pick([
        ["f", "g"],
        ["g", "h"],
        ["p", "q"],
        ["r", "s"],
        ["f", "h"],
        ["h", "k"],
      ]);
      const x0 = rng.int(-2, 2);
      const xs = [0, 1, 2, 3, 4].map((i) => x0 + i);
      const inRange = () => rng.pick(xs);
      const f = xs.map(() => (rng.bool(0.8) ? inRange() : rng.int(-9, 12)));
      const g = xs.map(() => (rng.bool(0.8) ? inRange() : rng.int(-9, 12)));
      const fAt = (x: number) => f[xs.indexOf(x)];
      const gAt = (x: number) => g[xs.indexOf(x)];
      const has = (x: number) => xs.includes(x);
      const figure = table(
        [m("x"), m(`${FN}(x)`), m(`${GN}(x)`)],
        xs.map((x) => [m(`${x}`), m(`${fAt(x)}`), m(`${gAt(x)}`)])
      );
      if (form === "lookup") {
        const v = rng.pick(f);
        need(f.filter((y) => y === v).length === 1, "one input");
        const r = xs[f.indexOf(v)];
        need(r !== v, "not trivial");
        return {
          format,
          stem: `The table shows some values of ${m("x")} and the corresponding values of the functions ${m(FN)} and ${m(GN)}. If ${m(`${FN}(k) = ${v}`)}, what is the value of ${m(`${GN}(k)`)}?`,
          figure,
          answer: ans(F(gAt(r)), nn),
          slips: keep(
            sv(F(r), `you found ${m("k")} and stopped; the question asks for ${m(`${GN}(k)`)}`, nn),
            has(v)
              ? sv(
                  F(gAt(v)),
                  `you used ${m(`${v}`)} as the input of ${m(GN)}; ${m(`${v}`)} is an output of ${m(FN)}`,
                  nn
                )
              : null,
            has(v)
              ? sv(
                  F(fAt(v)),
                  `you read ${m(`${FN}(${v})`)} instead of finding the input that gives ${m(`${v}`)}`,
                  nn
                )
              : null,
            sv(F(v), `you gave the output of ${m(FN)} itself`, nn)
          ),
          asks: `the value of ${m(GN)} at the input ${m("k")} for which ${m(`${FN}(k) = ${v}`)}`,
          steps: [
            {
              label: `Find ${m("k")} in the table`,
              work: `In the ${m(`${FN}(x)`)} column, ${m(`${v}`)} is in the row with ${m(`x = ${r}`)}, so ${m(`k = ${r}`)}`,
            },
            {
              label: `Read ${m(`${GN}(k)`)}`,
              work: `In that row, ${m(`${GN}(${r}) = ${gAt(r)}`)}`,
            },
          ],
          check: `${m(`${FN}(${r}) = ${v}`)} as required, and no other row has ${m(`${FN}(x) = ${v}`)}`,
          tip: "f(k) = v tells you the row: find v in the f(x) column, then read across",
          hint: `Which row of the table has ${m(`${v}`)} in the ${m(`${FN}(x)`)} column?`,
          difficulty: 3,
          isCorrect: byValue((y) => y.eq(gAt(xs[f.indexOf(v)]))),
        };
      }
      const innerIsG = rng.bool(0.5);
      const inner = innerIsG ? GN : FN;
      const k = rng.pick(xs);
      const innerAt = innerIsG ? gAt : fAt;
      const outerAt = innerIsG ? fAt : gAt;
      const mid = innerAt(k);
      need(has(mid), "inner value in the table");
      const val = outerAt(mid);
      const outer = innerIsG ? FN : GN;
      const swap = has(outerAt(k)) ? innerAt(outerAt(k)) : null;
      const target = F(val);
      return {
        format,
        stem: `The table shows some values of ${m("x")} and the corresponding values of the functions ${m(FN)} and ${m(GN)}. What is the value of ${m(`${outer}(${inner}(${k}))`)}?`,
        figure,
        answer: ans(target, nn),
        slips: keep(
          swap !== null
            ? sv(
                F(swap),
                `you worked from the outside in, finding ${m(`${inner}(${outer}(${k}))`)}`,
                nn
              )
            : null,
          sv(F(mid), `you found ${m(`${inner}(${k}) = ${mid}`)} and stopped`, nn),
          sv(F(outerAt(k)), `you found ${m(`${outer}(${k})`)}, skipping the inner function`, nn),
          sv(F(fAt(k) * gAt(k)), `you multiplied ${m(`${FN}(${k})`)} by ${m(`${GN}(${k})`)}`, nn),
          sv(F(fAt(k) + gAt(k)), `you added ${m(`${FN}(${k})`)} and ${m(`${GN}(${k})`)}`, nn)
        ),
        asks: `the output of ${m(outer)} when its input is ${m(`${inner}(${k})`)}`,
        steps: [
          {
            label: "Start with the inner function",
            work: `From the table, ${m(`${inner}(${k}) = ${mid}`)}`,
          },
          {
            label: "Use that as the outer input",
            work: `${m(`${outer}(${mid}) = ${val}`)}, so ${m(`${outer}(${inner}(${k})) = ${val}`)}`,
          },
        ],
        check: `the row ${m(`x = ${k}`)} gives ${m(`${inner}(${k}) = ${mid}`)}, and the row ${m(`x = ${mid}`)} gives ${m(`${outer}(${mid}) = ${val}`)}`,
        tip: "Work a composition from the inside out: the inner output becomes the outer input",
        hint: `Find ${m(`${inner}(${k})`)} first.`,
        difficulty: 3,
        isCorrect: byValue((y) => y.eq(outerAt(innerAt(k)))),
      };
    }
    // formulas: f(x) = px + q, g(x) = x^2 + r (or g linear)
    const p = rng.nonzero(-6, 6);
    need(p !== 1, "slope");
    const q = rng.nonzero(-12, 12);
    const r = rng.nonzero(-9, 9);
    const fC = [p, q];
    const gC = [1, 0, r];
    if (form === "expr") {
      const truth = (v: Vars) => p * (v.x * v.x + r) + q;
      const show = (coeffs: number[]) => m(poly(coeffs));
      const fg = [p, 0, p * r + q];
      const gf = [p * p, 2 * p * q, q * q + r];
      const prod = [p, q, p * r, q * r];
      const sum = [1, p, q + r];
      return {
        format,
        stem: `The functions ${m("f")} and ${m("g")} are defined by ${m(`f(x) = ${poly(fC)}`)} and ${m(`g(x) = ${poly(gC)}`)}. Which expression is equivalent to ${m("f(g(x))")}?`,
        answer: exprAns(show(fg), truth),
        slips: keep(
          exprSlip(
            show(gf),
            (v) => (p * v.x + q) ** 2 + r,
            `you found ${m("g(f(x))")}, putting ${m("f")} inside ${m("g")}`
          ),
          exprSlip(
            show(prod),
            (v) => (p * v.x + q) * (v.x * v.x + r),
            `you multiplied ${m("f(x)")} by ${m("g(x)")}`
          ),
          exprSlip(
            show(sum),
            (v) => v.x * v.x + p * v.x + q + r,
            `you added ${m("f(x)")} and ${m("g(x)")}`
          ),
          exprSlip(
            show([p, 0, r + q]),
            (v) => p * v.x * v.x + r + q,
            `you multiplied only the ${m("x^2")} term of ${m("g")} by ${m(`${p}`)}`
          )
        ),
        asks: `the rule for ${m("f")} applied to the whole expression ${m("g(x)")}`,
        steps: [
          {
            label: "Put g into f",
            work: m(
              `f(g(x)) = ${p === -1 ? "-" : p}(${poly(gC)}) ${q < 0 ? "-" : "+"} ${Math.abs(q)}`
            ),
          },
          {
            label: "Distribute and combine",
            work: m(`${poly([p, 0, p * r])} ${q < 0 ? "-" : "+"} ${Math.abs(q)} = ${poly(fg)}`),
          },
        ],
        check: `at ${m("x = 1")}, ${m(`g(1) = ${1 + r}`)} and ${m(`f(${1 + r}) = ${p * (1 + r) + q}`)}, and the expression gives ${m(`${p * (1 + r) + q}`)} too`,
        tip: "To find f(g(x)), replace every x in the rule for f with the whole expression for g(x)",
        hint: `Replace the ${m("x")} in ${m("f(x)")} with ${m(`(${poly(gC)})`)}.`,
        difficulty: 5,
        isCorrect: byExpr(truth),
      };
    }
    const k = rng.int(-5, 5);
    const gk = horner(gC, F(k));
    const val = horner(fC, gk);
    const target = val;
    if (format === "spr") need(fitsBox(target), "fits");
    const fk = horner(fC, F(k));
    return {
      format,
      stem: `The functions ${m("f")} and ${m("g")} are defined by ${m(`f(x) = ${poly(fC)}`)} and ${m(`g(x) = ${poly(gC)}`)}. What is the value of ${m(`f(g(${k}))`)}?`,
      answer: ans(target, nn),
      slips: keep(
        sv(horner(gC, fk), `you found ${m(`g(f(${k}))`)}, working from the outside in`, nn),
        sv(gk, `you found ${m(`g(${k})`)} and stopped`, nn),
        sv(fk.mul(gk), `you multiplied ${m(`f(${k})`)} by ${m(`g(${k})`)}`, nn),
        sv(fk, `you found ${m(`f(${k})`)}, skipping ${m("g")}`, nn)
      ),
      asks: `the output of ${m("f")} when its input is ${m(`g(${k})`)}`,
      steps: [
        {
          label: "Start with the inner function",
          work: m(`g(${k}) = ${paren(k)}^2 ${r < 0 ? "-" : "+"} ${Math.abs(r)} = ${int(gk.n)}`),
        },
        {
          label: "Use that as the input of f",
          work: m(
            `f(${int(gk.n)}) = ${p === -1 ? "-" : p}${paren(gk)} ${q < 0 ? "-" : "+"} ${Math.abs(q)} = ${int(val.n)}`
          ),
        },
      ],
      check: `${m("f(g(x))")} simplifies to ${m(poly([p, 0, p * r + q]))}, and at ${m(`x = ${k}`)} that is ${m(`${int(val.n)}`)}`,
      tip: "Work a composition from the inside out: the inner output becomes the outer input",
      hint: `Find ${m(`g(${k})`)} first.`,
      difficulty: k < 0 || p < 0 ? 4 : 3,
      isCorrect: byValue((y) =>
        y.eq(
          F(p)
            .mul(k * k + r)
            .add(q)
        )
      ),
    };
  },
};

export const TEMPLATES: Template[] = [evaluate, compose, graphRead, ...MORE_TEMPLATES];
