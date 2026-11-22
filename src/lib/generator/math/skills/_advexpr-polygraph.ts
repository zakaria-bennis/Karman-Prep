/*
 * m-polynomials, continued (re-exported by polynomials.ts): coefficients and other zeros from
 * known zeros (checked by putting each zero back in), and reading the graph of a polynomial.
 * The figure is drawn from the right function; every check reads the figure's own samples, so a
 * choice is right only when it passes through the drawn curve (or vanishes where it meets the
 * x-axis), never because it matches how the question was built.
 */
import { need, numAnswer } from "../core/build";
import { F, Frac } from "../core/frac";
import { curve, frame, plane } from "../core/figures";
import { block, dec, m, n, num } from "../core/tex";
import type { Rng } from "../core/rng";
import type { Answer, Draft, Format, Slip, Template } from "../core/types";
import { MPoly, factored, numSlip, product, valueOf, type PolyAnswer } from "./_advexpr-poly";

const SKILL = "m-polynomials";
type Part = Omit<Draft, "format">;
type Pt = [number, number];

/** The drawn curve's height at x, by straight-line interpolation of its samples (null off the figure). */
function heightAt(runs: Pt[][], x: number): number | null {
  for (const run of runs) {
    for (let i = 0; i + 1 < run.length; i++) {
      const [a, b] = [run[i], run[i + 1]];
      if (x >= a[0] - 1e-9 && x <= b[0] + 1e-9) {
        const t = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]);
        return a[1] + t * (b[1] - a[1]);
      }
    }
  }
  return null;
}

interface Graph {
  zs: number[];
  mult: number[];
  lead: Frac;
  facs: [MPoly, number][];
  P: MPoly;
  figure: ReturnType<typeof plane>;
  runs: Pt[][];
}

function drawGraph(rng: Rng): Graph {
  const count = rng.pick([2, 3, 3]);
  const zs: number[] = [];
  while (zs.length < count) {
    const z = rng.nonzero(-4, 4);
    if (!zs.includes(z)) zs.push(z);
  }
  zs.sort((a, b) => a - b);
  const double = rng.bool(0.65) ? rng.int(0, count - 1) : -1;
  const mult = zs.map((_, i) => (i === double ? 2 : 1));
  const facs: [MPoly, number][] = zs.map((z, i) => [MPoly.lin(1, -z), mult[i]]);
  const base = product(1, facs);
  let M = 0;
  for (let x = zs[0]; x <= zs[zs.length - 1]; x += 0.05)
    M = Math.max(M, Math.abs(base.eval({ x })));
  if (count === 2 && double === -1)
    M = Math.max(M, Math.abs(base.eval({ x: (zs[0] + zs[1]) / 2 })));
  const k = [F(2), F(1), F(1, 2), F(1, 4), F(1, 8)].find((q) => q.toNumber() * M <= 7.5);
  need(k && k.toNumber() * M >= 1.5, "a readable height");
  const lead = k!.mul(rng.sign());
  const P = product(lead, facs);
  const fr = frame([-6, 6], [-8, 8], { step: 1, labelStep: 2 });
  const part = curve("f", "y=f(x)", (x) => P.eval({ x }), fr);
  const figure = plane(fr, [part]);
  const runs = (part as { samples: Pt[][] }).samples;
  return { zs, mult, lead, facs, P, figure, runs };
}

const crossText = (g: Graph) => {
  const cross = g.zs.filter((_, i) => g.mult[i] === 1);
  const touch = g.zs.filter((_, i) => g.mult[i] === 2);
  const parts = [];
  if (cross.length)
    parts.push(`crosses the ${m("x")}-axis at ${cross.map((z) => m(`x = ${z}`)).join(" and ")}`);
  if (touch.length) parts.push(`touches it without crossing at ${m(`x = ${touch[0]}`)}`);
  return parts.join(" and ");
};

function defineFromGraph(rng: Rng): Part {
  const g = drawGraph(rng);
  const f = rng.pick(["f", "g", "h", "p"]);
  const ch = (lead: Frac, facs: [MPoly, number][], why: string): PolyAnswer => {
    const P = product(MPoly.c(lead), facs);
    return {
      text: m(`${f}(x) = ${factored(MPoly.c(lead), facs)}`),
      expr: (v) => P.eval(v),
      poly: P,
      why,
    };
  };
  const flipped: [MPoly, number][] = g.zs.map((z, i) => [MPoly.lin(1, z), g.mult[i]]);
  const slips: Slip[] = [
    ch(
      g.lead,
      flipped,
      `you used the sign of each ${m("x")}-intercept inside its factor; a zero at ${m(`x = ${g.zs[0]}`)} gives the factor ${m(MPoly.lin(1, -g.zs[0]).tex())}`
    ),
  ];
  const di = g.mult.indexOf(2);
  if (di >= 0) {
    const moved = (di + 1) % g.zs.length;
    slips.push(
      ch(
        g.lead,
        g.zs.map((z, i) => [MPoly.lin(1, -z), i === moved ? 2 : 1]),
        `the graph touches the axis at ${m(`x = ${g.zs[di]}`)}, so the squared factor is ${m(MPoly.lin(1, -g.zs[di]).tex())}, not ${m(MPoly.lin(1, -g.zs[moved]).tex())}`
      )
    );
    slips.push(
      ch(
        g.lead,
        g.zs.map((z) => [MPoly.lin(1, -z), 1]),
        `the graph only touches the axis at ${m(`x = ${g.zs[di]}`)}, which needs a squared factor`
      )
    );
  } else {
    slips.push(
      ch(
        g.lead,
        g.zs.map((z, i) => [MPoly.lin(1, -z), i === 0 ? 2 : 1]),
        `the graph crosses the axis at ${m(`x = ${g.zs[0]}`)}, so that factor is not squared`
      )
    );
  }
  const far = g.P.eval({ x: 10 }) > 0 ? "above" : "below";
  slips.push(
    ch(
      g.lead.neg(),
      g.facs,
      `the sign is wrong: to the right of every zero the graph is ${far} the ${m("x")}-axis`
    )
  );
  const mid = (g.zs[0] + g.zs[1]) / 2;
  const midVal = g.P.at({ x: F(Math.round(mid * 2), 2) });
  return {
    stem: `The graph of ${m(`y = ${f}(x)`)} is shown, where ${m(f)} is a polynomial function. Which of the following could define ${m(f)}?`,
    figure: g.figure,
    answer: ch(g.lead, g.facs, ""),
    slips,
    asks: `the equation whose zeros, crossings and sign match the graph`,
    steps: [
      {
        label: `Read the ${m("x")}-intercepts`,
        work: `The graph meets the ${m("x")}-axis at ${g.zs
          .map((z) => m(`x = ${z}`))
          .join(", ")
          .replace(/, ([^,]*)$/, " and $1")}, so the factors are ${g.zs
          .map((z) => m(MPoly.lin(1, -z).tex()))
          .join(", ")
          .replace(/, ([^,]*)$/, " and $1")}`,
      },
      {
        label: "Crossing or touching",
        work: `The graph ${crossText(g)}; a factor that appears an even number of times touches the axis, an odd number of times crosses it`,
      },
      {
        label: "Check the sign",
        work: `To the right of every zero the graph is ${far} the ${m("x")}-axis, so the leading coefficient is ${g.lead.sign() > 0 ? "positive" : "negative"}`,
      },
    ],
    check: `At ${m(`x = ${num(F(Math.round(mid * 2), 2))}`)}, the answer gives ${n(midVal)}, which is ${midVal.sign() > 0 ? "above" : "below"} the ${m("x")}-axis, as the graph is there`,
    tip: `Read a polynomial's graph in three passes: the ${m("x")}-intercepts give the factors, crossing or touching gives odd or even powers, and the right end gives the sign`,
    hint: `Where does the graph meet the ${m("x")}-axis, and does it cross or bounce there?`,
    difficulty: g.zs.length === 3 || g.lead.sign() < 0 ? 6 : 5,
    isCorrect: (c: Answer) =>
      !!c.expr &&
      g.runs
        .flat()
        .filter(([, y]) => Math.abs(y) < 7.9)
        .every(([x, y]) => Math.abs(c.expr!({ x }) - y) <= 1e-3 * Math.max(1, Math.abs(y)) + 1e-3),
  };
}

function factorFromGraph(rng: Rng): Part {
  const g = drawGraph(rng);
  const f = rng.pick(["f", "g", "h", "p"]);
  const r = rng.pick(g.zs);
  const fac = (t: number, why = ""): Slip => ({
    text: m(MPoly.lin(1, -t).tex()),
    key: String(t),
    why,
  });
  const slips: Slip[] = g.zs
    .filter((z) => !g.zs.includes(-z))
    .map((z) =>
      fac(
        -z,
        `you kept the sign of the intercept ${m(`(${z}, 0)`)}; it gives the factor ${m(MPoly.lin(1, -z).tex())}`
      )
    );
  const y0 = g.P.at({ x: 0 });
  if (y0.isInt() && !y0.isZero() && !g.zs.includes(y0.n))
    slips.push(
      fac(y0.n, `you used the ${m("y")}-intercept, but a factor comes from an ${m("x")}-intercept`)
    );
  for (const t of [5, -5, 6, -6])
    if (!g.zs.includes(t))
      slips.push(fac(t, `the graph does not meet the ${m("x")}-axis at ${m(`x = ${t}`)}`));
  return {
    stem: `The graph of ${m(`y = ${f}(x)`)} is shown, where ${m(f)} is a polynomial function. Which of the following must be a factor of ${m(`${f}(x)`)}?`,
    figure: g.figure,
    answer: fac(r),
    slips,
    asks: `a factor that the graph's ${m("x")}-intercepts guarantee`,
    steps: [
      {
        label: `Read the ${m("x")}-intercepts`,
        work: `The graph meets the ${m("x")}-axis at ${g.zs
          .map((z) => m(`(${z}, 0)`))
          .join(", ")
          .replace(/, ([^,]*)$/, " and $1")}`,
      },
      {
        label: "Turn a zero into a factor",
        work: `Since ${m(`${f}(${r}) = 0`)}, ${m(MPoly.lin(1, -r).tex())} is a factor of ${m(`${f}(x)`)}`,
      },
    ],
    check: `${m(MPoly.lin(1, -r).tex())} is $0$ at ${m(`x = ${r}`)}, exactly where the graph crosses or touches the ${m("x")}-axis`,
    tip: `Each ${m("x")}-intercept ${m("(c, 0)")} of a polynomial's graph gives a factor ${m("x - c")}`,
    hint: `Where does the graph meet the ${m("x")}-axis?`,
    difficulty: rng.bool(0.5) ? 4 : 3,
    isCorrect: (c: Answer) => {
      if (c.key === undefined) return false;
      const y = heightAt(g.runs, Number(c.key));
      return y !== null && Math.abs(y) < 0.02;
    },
  };
}

const NAMES = ["f", "g", "h", "p", "q", "r"];
const list = (items: string[]) =>
  items.length === 2
    ? `${items[0]} and ${items[1]}`
    : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;

/** Distinct nonzero whole numbers, none the negative of another. */
function zeros(rng: Rng, k: number, lo = -9, hi = 9): number[] {
  const out: number[] = [];
  for (let guard = 0; out.length < k; guard++) {
    need(guard < 100, "zeros");
    const z = rng.nonzero(lo, hi);
    if (!out.includes(z) && !out.includes(-z)) out.push(z);
  }
  return out;
}

/* ---------------------------------------------------------------- zeros to coefficients */

function cubicCoefficient(rng: Rng): Part {
  const g = rng.pick(NAMES);
  const zs = zeros(rng, 3);
  const lead = rng.pick([1, 1, 1, 2, 3]);
  const P = product(
    lead,
    zs.map((z) => MPoly.lin(1, -z))
  );
  const which = rng.pick(["a", "a", "b", "c"]) as "a" | "b" | "c";
  const pos = { a: 2, b: 1, c: 0 }[which];
  const value = P.coef(pos === 0 ? {} : { x: pos });
  const sum = zs.reduce((s, z) => s + z, 0);
  const pairs = zs[0] * zs[1] + zs[0] * zs[2] + zs[1] * zs[2];
  const prod3 = zs[0] * zs[1] * zs[2];
  const slips: Slip[] =
    which === "a"
      ? [
          numSlip(lead * sum, "you added the zeros but did not change the sign"),
          numSlip(
            -lead * prod3,
            "you used the product of the zeros, which gives the constant term"
          ),
          numSlip(lead * prod3, "you multiplied the zeros"),
          ...(lead > 1
            ? [numSlip(-sum, `you did not multiply by the leading coefficient ${n(lead)}`)]
            : []),
        ]
      : which === "b"
        ? [
            numSlip(-lead * pairs, "you gave the sum of the paired products the wrong sign"),
            numSlip(-lead * sum, `you found the ${m("x^2")}-coefficient instead`),
            numSlip(
              lead * (zs[0] * zs[1] + zs[1] * zs[2]),
              "you left out one of the three paired products"
            ),
            ...(lead > 1
              ? [numSlip(pairs, `you did not multiply by the leading coefficient ${n(lead)}`)]
              : []),
          ]
        : [
            numSlip(lead * prod3, "you multiplied the zeros but did not change the sign"),
            numSlip(-lead * sum, `you found the ${m("x^2")}-coefficient instead`),
            numSlip(lead * pairs, `you found the ${m("x")}-coefficient instead`),
            ...(lead > 1
              ? [numSlip(-prod3, `you did not multiply by the leading coefficient ${n(lead)}`)]
              : []),
          ];
  const head = lead === 1 ? "x^3" : `${lead}x^3`;
  const facs = zs.map((z) => MPoly.lin(1, -z));
  return {
    stem: `${block(`${g}(x) = ${head} + ax^2 + bx + c`)}\nThe function ${m(g)} is defined by the given equation, where ${m("a")}, ${m("b")}, and ${m("c")} are integer constants. The zeros of the function are ${list(zs.map((z) => n(z)))}. What is the value of ${m(which)}?`,
    answer: numAnswer(value, m(num(value))),
    slips,
    asks: `the coefficient ${m(which)} of the polynomial with these zeros`,
    steps: [
      {
        label: "Write the factors",
        work: `Each zero ${m("r")} gives a factor ${m("x - r")}, so ${m(`${g}(x) = ${factored(lead, facs)}`)}`,
      },
      { label: "Multiply out", work: m(`${factored(lead, facs)} = ${P.tex()}`) },
      {
        label: `Read ${m(which)}`,
        work: `Match the coefficients with ${m(`${head} + ax^2 + bx + c`)}: ${m(`${which} = ${num(value)}`)}`,
      },
    ],
    check: `With these coefficients, ${list(zs.map((z) => m(`${g}(${z}) = 0`)))}`,
    tip: `Turn zeros into factors ${m("(x - r)")}, multiply them out, and match coefficients; keep the leading coefficient in front`,
    hint: "Write the function as a product of factors from its zeros.",
    difficulty: which === "a" ? (lead > 1 ? 6 : 5) : lead > 1 ? 7 : 6,
    isCorrect: (cand) => {
      const v = valueOf(cand);
      if (!v) return false;
      const Q = MPoly.from(
        P.terms()
          .filter((t) => (t.e.x ?? 0) !== pos)
          .map((t) => [t.c, t.e] as const)
      ).add(MPoly.v("x", v, pos));
      return zs.every((z) => Q.at({ x: z }).isZero());
    },
  };
}

function symmetricZero(rng: Rng): Part {
  const f = rng.pick(NAMES.slice(0, 3));
  const z1 = F(-rng.int(8, 60), 4);
  const h = F(rng.int(-30, 30), 4);
  need(h.gt(z1), "vertex right of the zero");
  const c = h.mul(2).sub(z1);
  need(c.sign() > 0 && !c.eq(h) && c.mul(4).isInt(), "a positive other zero");
  const show = (q: Frac) => dec(q);
  return {
    stem: `The quadratic function ${m(f)} has a factor of ${m(`(x + ${show(z1.neg())})`)} and a zero at ${m("x = c")}, where ${m("c")} is a positive constant. The graph of ${m(`y = ${f}(x)`)} in the ${m("xy")}-plane has its vertex at ${m(`(${show(h)}, -d)`)}, where ${m("d")} is a positive constant. What is the value of ${m("c")}?`,
    answer: numAnswer(c, m(show(c))),
    slips: [
      numSlip(h, "you gave the vertex's x-coordinate".replace("x-", "$x$-")),
      numSlip(h.sub(z1), "you gave the distance from the known zero to the vertex"),
      numSlip(z1.neg(), "you used the number in the factor as the zero"),
      numSlip(h.mul(2).add(z1), "you gave the known zero the wrong sign before reflecting it"),
    ].map((s) => ({ ...s, text: m(show(s.value!.asRat()!)) })),
    asks: `the other zero of ${m(f)}`,
    steps: [
      {
        label: "Find the known zero",
        work: `The factor ${m(`(x + ${show(z1.neg())})`)} is $0$ when ${m(`x = ${show(z1)}`)}`,
      },
      {
        label: "Use the axis of symmetry",
        work: `The zeros of a quadratic sit the same distance from the vertex's ${m("x")}-coordinate ${m(show(h))}; the known zero is ${m(show(h.sub(z1)))} to its left`,
      },
      { label: "Reflect the zero", work: m(`c = ${show(h)} + ${show(h.sub(z1))} = ${show(c)}`) },
    ],
    check: `The midpoint of the zeros is ${m(`\\frac{${show(z1)} + ${show(c)}}{2} = ${show(h)}`)}, the vertex's ${m("x")}-coordinate`,
    tip: "The two zeros of a quadratic are mirror images across the vertical line through the vertex",
    hint: "The vertex sits halfway between the two zeros.",
    difficulty: 7,
    isCorrect: (cand) => {
      const v = valueOf(cand);
      return !!v && v.add(z1).div(2).eq(h);
    },
  };
}

export const vieta: Template = {
  id: "poly.zeros-coefficients",
  skill: SKILL,
  label: "Coefficients and other zeros from known zeros",
  difficulty: [5, 7],
  formats: ["mc", "spr"],
  make(rng, format: Format): Draft {
    const part = rng.pick([cubicCoefficient, cubicCoefficient, cubicCoefficient, symmetricZero])(
      rng
    );
    return { format, ...part };
  },
};

export const POLY_GRAPH: Template = {
  id: "poly.graph",
  skill: SKILL,
  label: "Read the graph of a polynomial: its factors, crossings and sign",
  difficulty: [3, 6],
  formats: ["mc"],
  make(rng, format: Format): Draft {
    const part = rng.bool(0.6) ? defineFromGraph(rng) : factorFromGraph(rng);
    return { format, ...part };
  },
};
