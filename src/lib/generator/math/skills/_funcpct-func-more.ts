/*
 * m-functions-and-transformations, part two: transformations (where a point moves, and the
 * rule of a shifted graph) and constants (a zero that fixes a constant, an absolute value
 * function with a negative constant). Checks work from the definitions: a candidate point
 * must satisfy the transformed rule, a candidate rule must match f(x - h) + k at many points.
 */
import { need } from "../core/build";
import { F } from "../core/frac";
import { m, paren, poly } from "../core/tex";
import type { Answer, Draft, Template } from "../core/types";
import {
  ans,
  byExpr,
  byValue,
  exprAns,
  exprSlip,
  fitsBox,
  keep,
  pickW,
  said,
  saidSlip,
  sv,
  type Vars,
} from "./_funcpct-common";

const SKILL = "m-functions-and-transformations";

type Move = "shift" | "negY" | "negX" | "scaleY" | "scaleX";

export const transform: Template = {
  id: "func.transform",
  skill: SKILL,
  label: "Transformations: where a point moves, and the rule of a shifted graph",
  difficulty: [3, 6],
  formats: ["mc"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["point", 3],
      ["rule", 2],
      ["words", 2],
    ] as const);
    if (form === "point") {
      const p = rng.nonzero(-8, 8);
      const q = rng.nonzero(-8, 8);
      const move = pickW<Move>(rng, [
        ["shift", 4],
        ["negY", 1],
        ["negX", 1],
        ["scaleY", 1],
        ["scaleX", 1],
      ]);
      const h = rng.nonzero(-6, 6);
      const k = rng.nonzero(-6, 6);
      const c = rng.pick([2, 3, 4]);
      need(move !== "scaleX" || p % c === 0, "whole point");
      let rule: string;
      let X: number;
      let Y: number;
      let wrong: [number, number, string][];
      let explain: string;
      if (move === "shift") {
        rule = `y = f(x ${h < 0 ? "+" : "-"} ${Math.abs(h)}) ${k < 0 ? "-" : "+"} ${Math.abs(k)}`;
        X = p + h;
        Y = q + k;
        wrong = [
          [
            p - h,
            q + k,
            `you moved the point ${h > 0 ? "left" : "right"}; ${m(`x ${h < 0 ? "+" : "-"} ${Math.abs(h)}`)} inside shifts the graph ${h > 0 ? "right" : "left"}`,
          ],
          [
            p + h,
            q - k,
            `you moved the point ${k > 0 ? "down" : "up"} instead of ${k > 0 ? "up" : "down"}`,
          ],
          [p - h, q - k, "you moved the point the wrong way in both directions"],
          [p + k, q + h, "you mixed up the horizontal and vertical shifts"],
        ];
        explain = `${m(`x ${h < 0 ? "+" : "-"} ${Math.abs(h)}`)} inside moves the graph ${Math.abs(h)} ${Math.abs(h) === 1 ? "unit" : "units"} ${h > 0 ? "right" : "left"}, and ${m(`${k < 0 ? "-" : "+"} ${Math.abs(k)}`)} outside moves it ${Math.abs(k)} ${Math.abs(k) === 1 ? "unit" : "units"} ${k > 0 ? "up" : "down"}`;
      } else if (move === "negY") {
        rule = "y = -f(x)";
        X = p;
        Y = -q;
        wrong = [
          [
            -p,
            q,
            "you reflected across the y-axis; a minus sign outside f reflects across the x-axis",
          ],
          [-p, -q, "you changed both signs"],
          [q, p, "you swapped the coordinates"],
        ];
        explain = `the minus sign outside ${m("f")} changes the sign of every ${m("y")}-value, a reflection across the ${m("x")}-axis`;
      } else if (move === "negX") {
        rule = "y = f(-x)";
        X = -p;
        Y = q;
        wrong = [
          [
            p,
            -q,
            "you reflected across the x-axis; a minus sign inside f reflects across the y-axis",
          ],
          [-p, -q, "you changed both signs"],
          [q, p, "you swapped the coordinates"],
        ];
        explain = `the input ${m("-x")} means the graph reaches the old height ${m(`${q}`)} at ${m(`x = ${-p}`)}, a reflection across the ${m("y")}-axis`;
      } else if (move === "scaleY") {
        rule = `y = ${c}f(x)`;
        X = p;
        Y = c * q;
        wrong = [
          [c * p, q, "you stretched the x-coordinate instead of the y-coordinate"],
          [p, q + c, `you added ${m(`${c}`)} instead of multiplying`],
          [c * p, c * q, "you multiplied both coordinates"],
        ];
        explain = `multiplying ${m("f(x)")} by ${m(`${c}`)} multiplies every ${m("y")}-value by ${m(`${c}`)}`;
      } else {
        rule = `y = f(${c}x)`;
        X = p / c;
        Y = q;
        wrong = [
          [
            c * p,
            q,
            `you multiplied the ${m("x")}-coordinate by ${m(`${c}`)}; the input ${m(`${c}x`)} reaches ${m(`${p}`)} when ${m(`x = ${p / c}`)}`,
          ],
          [p, c * q, "you stretched the y-coordinate instead"],
          [p / c, c * q, "you changed both coordinates"],
        ];
        explain = `the input ${m(`${c}x`)} equals ${m(`${p}`)} when ${m(`x = ${p / c}`)}, so the point moves to ${m(`x = ${p / c}`)} with the same height`;
      }
      const key = (x: number, y: number) => `${x},${y}`;
      const pt = (x: number, y: number) => m(`(${x}, ${y})`);
      // The check: (X, Y) is on the new graph when the original f is known only at p.
      const onNew = (x: number, y: number): boolean => {
        const fAt = (u: number) => (u === p ? q : null);
        if (move === "shift") return fAt(x - h) !== null && y === fAt(x - h)! + k;
        if (move === "negY") return fAt(x) !== null && y === -fAt(x)!;
        if (move === "negX") return fAt(-x) !== null && y === fAt(-x)!;
        if (move === "scaleY") return fAt(x) !== null && y === c * fAt(x)!;
        return fAt(c * x) !== null && y === fAt(c * x)!;
      };
      return {
        format,
        stem: `In the ${m("xy")}-plane, the graph of the function ${m("f")} passes through the point ${pt(p, q)}. Which point must lie on the graph of ${m(rule)}?`,
        answer: said(pt(X, Y), key(X, Y)),
        slips: wrong.map(([x, y, why]) => saidSlip(pt(x, y), key(x, y), why)),
        asks: `the image of ${pt(p, q)} on the graph of ${m(rule)}`,
        steps: [
          { label: "Read the transformation", work: explain },
          { label: "Move the point", work: `${pt(p, q)} moves to ${pt(X, Y)}` },
        ],
        check: `substitute: ${m(rule.replace("y = ", "").replace(/x/g, `(${X})`))} uses ${m(`f(${p}) = ${q}`)} and gives ${m(`${Y}`)}`,
        tip: "Changes inside f(x) move the graph sideways in the opposite direction of their sign; changes outside move it up and down in the same direction",
        hint: "Decide whether the change happens inside the parentheses or outside them.",
        difficulty: move === "shift" ? 4 : move === "scaleX" ? 6 : 5,
        isCorrect: (cand: Answer) => {
          const [x, y] = (cand.key ?? "").split(",").map(Number);
          return Number.isFinite(x) && Number.isFinite(y) && onNew(x, y);
        },
      };
    }
    if (form === "rule") {
      const b = rng.nonzero(-8, 8);
      const c = rng.int(-12, 12);
      const h = rng.nonzero(-5, 5);
      const k = rng.int(-9, 9);
      const f = [1, b, c];
      const shifted = (hh: number, kk: number) => [1, b - 2 * hh, hh * hh - b * hh + c + kk];
      const truth = (v: Vars) => (v.x - h) ** 2 + b * (v.x - h) + c + k;
      const g = (coeffs: number[]) => m(`g(x) = ${poly(coeffs)}`);
      const shiftText = `${m(`g(x) = f(x ${h < 0 ? "+" : "-"} ${Math.abs(h)})${k === 0 ? "" : ` ${k < 0 ? "-" : "+"} ${Math.abs(k)}`}`)}`;
      return {
        format,
        stem: `The function ${m("f")} is defined by ${m(`f(x) = ${poly(f)}`)}, and the function ${m("g")} is defined by ${shiftText}. Which equation defines ${m("g")}?`,
        answer: exprAns(g(shifted(h, k)), truth),
        slips: keep(
          exprSlip(
            g(shifted(-h, k)),
            (v) => (v.x + h) ** 2 + b * (v.x + h) + c + k,
            `you replaced ${m("x")} with ${m(`x ${h < 0 ? "-" : "+"} ${Math.abs(h)}`)}, the opposite shift`
          ),
          exprSlip(
            g([1, b, c - h + k]),
            (v) => v.x * v.x + b * v.x + c - h + k,
            `you subtracted ${m(`${h}`)} from the whole function instead of from ${m("x")}`
          ),
          k !== 0
            ? exprSlip(
                g(shifted(h, -k)),
                (v) => (v.x - h) ** 2 + b * (v.x - h) + c - k,
                `you ${k > 0 ? "subtracted" : "added"} ${m(`${Math.abs(k)}`)} instead of ${k > 0 ? "adding" : "subtracting"} it`
              )
            : null,
          exprSlip(
            g([1, b - h, c + k]),
            (v) => v.x * v.x + (b - h) * v.x + c + k,
            `you replaced only the ${m("x")} in ${m(`${b}x`)} and not the one in ${m("x^2")}`
          ),
          exprSlip(
            g([1, b - 2 * h, h * h + c + k]),
            (v) => v.x * v.x + (b - 2 * h) * v.x + h * h + c + k,
            `you did not multiply ${m(`${b}`)} by ${m(`${-h}`)} when you distributed`
          )
        ),
        asks: `the expanded rule for ${m("g")}, where every ${m("x")} in ${m("f")} becomes ${m(poly([1, -h]))}`,
        steps: [
          {
            label: "Replace x in f",
            work: m(
              `g(x) = (${poly([1, -h])})^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}(${poly([1, -h])}) ${c < 0 ? "-" : "+"} ${Math.abs(c)}${k === 0 ? "" : ` ${k < 0 ? "-" : "+"} ${Math.abs(k)}`}`
            ),
          },
          {
            label: "Expand each part",
            work: m(
              `${poly([1, -2 * h, h * h])} ${b < 0 ? "-" : "+"} ${poly([Math.abs(b), -h * Math.abs(b)]).replace(/^-/, "")} ${c + k < 0 ? "-" : "+"} ${Math.abs(c + k)}`
            ).replace("+ -", "-"),
          },
          { label: "Combine like terms", work: g(shifted(h, k)) },
        ],
        check: `at ${m(`x = ${h}`)}, ${m(`g(${h}) = f(0)${k === 0 ? "" : ` ${k < 0 ? "-" : "+"} ${Math.abs(k)}`} = ${c + k}`)}, and the answer gives ${m(`${c + k}`)} too`,
        tip: "To find f(x − h), replace every x in the rule with (x − h) in parentheses, then expand",
        hint: `Write ${m(`(${poly([1, -h])})`)} everywhere ${m("f")} has ${m("x")}.`,
        difficulty: 5 + (k !== 0 && h < 0 ? 1 : 0),
        isCorrect: byExpr(truth),
      };
    }
    // words: a named graph shifted up/down/left/right
    const base = rng.pick([
      { tex: (u: string) => `|${u}|`, f: (u: number) => Math.abs(u) },
      { tex: (u: string) => `${u}^{2}`, f: (u: number) => u * u },
      { tex: (u: string) => `2^{${u}}`, f: (u: number) => 2 ** u },
      { tex: (u: string) => `\\left(\\frac{1}{3}\\right)^{${u}}`, f: (u: number) => (1 / 3) ** u },
      { tex: (u: string) => `${u}^{3}`, f: (u: number) => u ** 3 },
    ]);
    const c0 = rng.int(-6, 6);
    const d = rng.int(2, 7);
    const dir = rng.pick(["up", "down", "left", "right"] as const);
    const plus = (t: string, c: number) =>
      c === 0 ? t : `${t} ${c < 0 ? "-" : "+"} ${Math.abs(c)}`;
    const inner = (shift: number) =>
      shift === 0 ? "x" : `(x ${shift < 0 ? "-" : "+"} ${Math.abs(shift)})`;
    const innerExp = (shift: number) =>
      shift === 0 ? "x" : `x ${shift < 0 ? "-" : "+"} ${Math.abs(shift)}`;
    const isPow = (k: string) => k.includes("^{");
    const make = (hs: number, vs: number) => {
      const isExpo = base.tex("x").startsWith("2^") || base.tex("x").includes("frac");
      const arg = isExpo ? innerExp(hs) : inner(hs);
      return m(`y = ${plus(base.tex(arg), c0 + vs)}`);
    };
    const fv = (hs: number, vs: number) => (v: Vars) => base.f(v.x + hs) + c0 + vs;
    // left d: x + d; right d: x - d; up: +d; down: -d
    const hs = dir === "left" ? d : dir === "right" ? -d : 0;
    const vs = dir === "up" ? d : dir === "down" ? -d : 0;
    const truth = fv(hs, vs);
    void isPow;
    const sideways = dir === "left" || dir === "right";
    return {
      format,
      stem: `The graph of ${make(0, 0)} in the ${m("xy")}-plane is shifted ${dir} ${d} units. What is an equation of the resulting graph?`,
      answer: exprAns(make(hs, vs), truth),
      slips: keep(
        sideways
          ? exprSlip(
              make(-hs, 0),
              fv(-hs, 0),
              `you moved the graph ${dir === "left" ? "right" : "left"}; adding inside the input moves a graph left`
            )
          : exprSlip(
              make(vs, 0),
              fv(vs, 0),
              `you changed the input, which moves the graph sideways, not ${dir}`
            ),
        sideways
          ? exprSlip(
              make(0, hs),
              fv(0, hs),
              "you changed the output, which moves the graph up or down, not sideways"
            )
          : exprSlip(
              make(0, -vs),
              fv(0, -vs),
              `you moved the graph ${dir === "up" ? "down" : "up"}`
            ),
        sideways
          ? exprSlip(make(0, -hs), fv(0, -hs), "you moved the graph up or down instead of sideways")
          : exprSlip(
              make(-vs, 0),
              fv(-vs, 0),
              `you shifted the input, which moves the graph sideways instead of ${dir}`
            ),
        exprSlip(
          m(
            `y = ${d}${base.tex("x").startsWith("|") ? base.tex("x") : `\\left(${base.tex("x")}\\right)`}${c0 === 0 ? "" : ` ${c0 < 0 ? "-" : "+"} ${Math.abs(c0)}`}`
          ),
          (v) => d * base.f(v.x) + c0,
          `you multiplied by ${m(`${d}`)}, which stretches the graph instead of shifting it`
        )
      ),
      asks: `the equation after a shift ${dir} of ${d} units`,
      steps: [
        {
          label: "Decide where the change goes",
          work: sideways
            ? `Shifting ${dir} changes the input: replace ${m("x")} with ${m(innerExp(hs))}`
            : `Shifting ${dir} changes the output: ${dir === "up" ? "add" : "subtract"} ${m(`${d}`)} after the function`,
        },
        { label: "Write the new equation", work: make(hs, vs) },
      ],
      check: sideways
        ? `the point of the original graph at ${m("x = 0")} now appears at ${m(`x = ${-hs}`)}, ${d} units ${dir}`
        : `every ${m("y")}-value is ${d} ${dir === "up" ? "more" : "less"} than before, at the same ${m("x")}`,
      tip: "y = f(x − h) + k moves the graph of y = f(x) right h units and up k units",
      hint: "Does the shift change the input or the output?",
      difficulty: sideways ? 4 : 3,
      isCorrect: byExpr(truth),
    };
  },
};

export const constants: Template = {
  id: "func.constants",
  skill: SKILL,
  label: "Find a constant from a zero, or work with |x|/a when a is negative",
  difficulty: [4, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const form = pickW(rng, [
      ["cubic", 2],
      ["quad", 2],
      ["abs", 2],
    ] as const);
    if (form === "cubic") {
      const r = rng.int(1, 8);
      const s2 = rng.pick([2, 3]);
      const s = s2 * rng.int(1, 7);
      const z = rng.nonzero(-9, 9);
      need(z !== r && z * s2 !== s && z !== 0, "z is only a zero of the first factor");
      const p = -z;
      const h0 = p * -r * -s;
      const target = F(h0);
      if (format === "spr") need(fitsBox(target), "fits");
      const rule = `h(x) = (x + p)(${poly([1, -r])})(${poly([s2, -s])})`;
      return {
        format,
        stem: `The function ${m("h")} is defined by ${m(rule)}, where ${m("p")} is a constant. In the ${m("xy")}-plane, the graph of ${m("y = h(x)")} passes through the point ${m(`(${z}, 0)`)}. What is the value of ${m("h(0)")}?`,
        answer: ans(target),
        slips: keep(
          sv(
            F(-h0),
            `you took ${m(`p = ${z}`)}; for ${m(`x = ${z}`)} to make ${m("x + p")} zero, ${m(`p = ${p}`)}`
          ),
          sv(
            F(p * -r * (-s / s2)),
            `you used ${m(`-${s / s2}`)} for the last factor at ${m("x = 0")}, as if it were ${m(`x - ${s / s2}`)}`
          ),
          sv(F(p), `you found ${m("p")} and stopped`),
          sv(F(p * r * s), "you dropped the minus signs of the constant terms")
        ),
        asks: `the output at ${m("x = 0")}, once ${m("p")} is known`,
        steps: [
          {
            label: "Use the zero to find p",
            work: `${m(`h(${z}) = 0`)}, and only ${m("x + p")} can be zero there, so ${m(`${z} + p = 0`)} and ${m(`p = ${p}`)}`,
          },
          {
            label: "Evaluate at zero",
            work: m(
              `h(0) = (0 ${p < 0 ? "-" : "+"} ${Math.abs(p)})(0 - ${r})(0 - ${s}) = (${p})(${-r})(${-s}) = ${h0}`
            ),
          },
        ],
        check: `with ${m(`p = ${p}`)}, ${m(`h(${z}) = (${z} ${p < 0 ? "-" : "+"} ${Math.abs(p)})(${z - r})(${s2 * z - s}) = 0`)}, so the graph passes through ${m(`(${z}, 0)`)}`,
        tip: "A point (z, 0) on the graph makes one factor zero at x = z; use it to find the missing constant",
        hint: `Put ${m(`x = ${z}`)} into the factors: which one can be zero?`,
        difficulty: 5,
        isCorrect: byValue((v) => {
          const pp = -z; // the only factor that can vanish at z
          return v.eq(F(pp).mul(-r).mul(-s));
        }),
      };
    }
    if (form === "quad") {
      const q = rng.int(2, 20);
      const t = rng.int(2, 30);
      need(t !== q, "distinct");
      const a = rng.pick([1, 1, 2, 3, -1, -2]);
      const T = rng.pick(["t", "k", "r", "w"]);
      const fn = rng.pick(["g", "f", "h", "p"]);
      const val = a * q * t;
      const target = F(val);
      if (format === "spr") need(fitsBox(target), "fits");
      const lead = a === 1 ? "" : a === -1 ? "-" : `${a}`;
      return {
        format,
        stem: `The function ${m(fn)} is defined by ${m(`${fn}(x) = ${lead}(x + ${q})(${T} - x)`)}, where ${m(T)} is a constant. In the ${m("xy")}-plane, the graph of ${m(`y = ${fn}(x)`)} passes through the point ${m(`(${t}, 0)`)}. What is the value of ${m(`${fn}(0)`)}?`,
        answer: ans(target),
        slips: keep(
          sv(
            F(-val),
            `you took ${m(`${T} = ${-t}`)}; ${m(`${T} - x`)} is zero when ${m(`x = ${T}`)}`
          ),
          sv(F(t), `you found ${m(T)} and stopped`),
          sv(F(a * q * (t - q)), `you used ${m(`x = ${q}`)} instead of ${m("x = 0")}`),
          a === 1 ? null : sv(F(q * t), `you left out the factor ${m(`${a}`)} in front`),
          sv(F(a * (q + t)), "you added the two factors instead of multiplying")
        ),
        asks: `the output at ${m("x = 0")}, once ${m(T)} is known`,
        steps: [
          {
            label: `Use the zero to find ${T}`,
            work: `${m(`${fn}(${t}) = ${lead}(${t} + ${q})(${T} - ${t}) = 0`)}, so ${m(`${T} = ${t}`)}`,
          },
          { label: "Evaluate at zero", work: m(`${fn}(0) = ${lead}(0 + ${q})(${t} - 0) = ${val}`) },
        ],
        check: `with ${m(`${T} = ${t}`)}, the zeros are ${m(`x = ${-q}`)} and ${m(`x = ${t}`)}, and ${m(`(${t}, 0)`)} is one of them`,
        tip: "A point (z, 0) on the graph means the function is 0 at z; set the factor with the unknown constant equal to zero",
        hint: `What value of ${m(T)} makes ${m(`${fn}(${t}) = 0`)}?`,
        difficulty: a === 1 ? 4 : 5,
        isCorrect: byValue((v) => v.eq(F(a).mul(q).mul(t))),
      };
    }
    const c = rng.int(5, 25);
    const mm = rng.int(2, 25);
    const nn = rng.int(2, 25);
    need(mm !== nn && mm !== c && nn !== c, "distinct");
    const sumAsk = rng.bool(0.3);
    const f1 = -mm - c;
    const f2 = -nn - c;
    const val = sumAsk ? f1 + f2 : f1 * f2;
    const target = F(val);
    if (format === "spr") need(fitsBox(target), "fits");
    const word = sumAsk ? "sum" : "product";
    return {
      format,
      stem: `The function ${m("f")} is defined by ${m(`f(x) = \\frac{|x|}{a} - ${c}`)}, where ${m("a < 0")}. What is the ${word} of ${m(`f(${mm}a)`)} and ${m(`f(${nn}a)`)}?`,
      answer: ans(target),
      slips: keep(
        sv(
          F(sumAsk ? mm - c + (nn - c) : (mm - c) * (nn - c)),
          `you simplified ${m(`\\frac{|${mm}a|}{a}`)} to ${m(`${mm}`)}; since ${m("a < 0")}, ${m(`|${mm}a| = -${mm}a`)}, so the quotient is ${m(`-${mm}`)}`
        ),
        sv(
          F(sumAsk ? f1 * f2 : f1 + f2),
          sumAsk
            ? "you multiplied the two values instead of adding them"
            : "you added the two values instead of multiplying them"
        ),
        sv(
          F(sumAsk ? -mm + c + (-nn + c) : (-mm + c) * (-nn + c)),
          `you added ${m(`${c}`)} instead of subtracting it`
        ),
        sv(F(f1), `you found only ${m(`f(${mm}a)`)}`)
      ),
      asks: `the ${word} of the two outputs, using ${m("a < 0")}`,
      steps: [
        {
          label: "Simplify the absolute value",
          work: `Since ${m("a < 0")}, ${m(`${mm}a`)} is negative, so ${m(`|${mm}a| = -${mm}a`)} and ${m(`\\frac{|${mm}a|}{a} = -${mm}`)}`,
        },
        {
          label: "Find both outputs",
          work: `${m(`f(${mm}a) = -${mm} - ${c} = ${f1}`)} and ${m(`f(${nn}a) = -${nn} - ${c} = ${f2}`)}`,
        },
        {
          label: `Find the ${word}`,
          work: m(`${paren(f1)} ${sumAsk ? "+" : "\\times"} ${paren(f2)} = ${val}`),
        },
      ],
      check: `try ${m("a = -1")}: ${m(`f(-${mm}) = \\frac{${mm}}{-1} - ${c} = ${f1}`)} and ${m(`f(-${nn}) = ${f2}`)}, the same values`,
      tip: "When a is negative, |ka| = −ka for positive k, so |ka| divided by a is −k",
      hint: `Is ${m(`${mm}a`)} positive or negative when ${m("a < 0")}?`,
      difficulty: sumAsk ? 6 : 7,
      isCorrect: byValue((v) => {
        const a = -1; // any negative a gives the same outputs
        const f = (x: number) => Math.abs(x) / a - c;
        return v.eq(F(sumAsk ? f(mm * a) + f(nn * a) : f(mm * a) * f(nn * a)));
      }),
    };
  },
};

export const MORE_TEMPLATES: Template[] = [transform, constants];
