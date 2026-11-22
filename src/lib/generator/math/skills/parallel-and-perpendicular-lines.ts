/*
 * m-parallel-and-perpendicular-lines: how the slopes of two lines relate. Item models after the
 * bank's own questions: the slope of a line parallel or perpendicular to a given line (in any
 * form, or graphed); the parallel or perpendicular line through a point (its equation, its
 * y-intercept, or a point on it through the origin); and the harder ones where a perpendicular
 * line fixes an unknown coordinate or an intersection. The given line's slope is always found
 * again from two points of the equation as printed, and the checks test slopes and points.
 */
import { need, numAnswer, Retry } from "../core/build";
import { F, Frac } from "../core/frac";
import { frame, line, plane, point } from "../core/figures";
import type { Rng } from "../core/rng";
import { lin, m, n, num, pair, paren, signed, term } from "../core/tex";
import type { Draft, Slip, Step, Template } from "../core/types";
import {
  eqAnswer,
  eqSlip,
  eqThrough,
  fitsBox,
  isValue,
  slip,
  slopeEq,
  weighted,
  type Eq2,
} from "./_lines-shared";

const SKILL = "m-parallel-and-perpendicular-lines";
const br = (v: Frac) => `(${num(v)})`;

/** The slope of A x + B y = C, found from two of its points (x = 0 and x = 1). */
function slopeOf(e: Eq2): Frac {
  const y = (x: Frac) => e.C.sub(e.A.mul(x)).div(e.B);
  return y(F(1)).sub(y(F(0)));
}

interface Given {
  /** How the line is introduced: "is defined by $...$" or "is shown in the xy-plane". */
  intro: string;
  eq: Eq2;
  s: Frac;
  /** How to read the slope off this form, for the first step. */
  read: string;
  figure?: ReturnType<typeof plane>;
  difficulty: number;
}

const NICE = [
  F(2),
  F(3),
  F(4),
  F(5),
  F(-2),
  F(-3),
  F(-4),
  F(6),
  F(-5),
  F(1, 2),
  F(1, 3),
  F(-1, 2),
  F(2, 3),
  F(-2, 3),
  F(3, 4),
  F(-3, 4),
  F(3, 2),
  F(-4, 3),
  F(5, 2),
  F(2, 5),
];

/** A line in one of the forms the SAT uses. */
function givenLine(rng: Rng, allowGraph: boolean, name: string): Given {
  const form = weighted(rng, [
    [2, "slope"],
    [2.2, "standard"],
    [1, "zero"],
    [0.8, "odd"],
    [allowGraph ? 1.5 : 0, "graph"],
  ] as const);
  if (form === "slope") {
    const s = rng.pick(NICE);
    const b = F(rng.nonzero(-20, 20), rng.pick([1, 1, 1, 2, 3]));
    const tex = `y = ${lin([[s, "x"]], b)}`;
    return {
      intro: `Line ${m(name)} is defined by ${m(tex)}`,
      eq: slopeEq(s, b),
      s,
      read: `${m(tex)} is in slope-intercept form, so its slope is the coefficient of ${m("x")}: ${n(s)}`,
      difficulty: 1,
    };
  }
  if (form === "standard" || form === "zero") {
    const zero = form === "zero";
    const A = zero ? F(1, rng.int(2, 6)) : F(rng.nonzero(-9, 9));
    const B = zero ? F(rng.pick([1, -1]), rng.int(2, 7)) : F(rng.nonzero(-13, 13));
    need(!A.abs().eq(1) || zero, "coefficient 1");
    need(!A.abs().eq(B.abs()), "slope of 1 or -1 is too plain here");
    const C = F(rng.nonzero(-60, 60));
    const s = A.neg().div(B);
    const tex = zero
      ? `${lin(
          [
            [A, "x"],
            [B, "y"],
          ],
          C.neg()
        )} = 0`
      : `${lin([
          [A, "x"],
          [B, "y"],
        ])} = ${num(C)}`;
    return {
      intro: `Line ${m(name)} is defined by ${m(tex)}`,
      eq: { A, B, C },
      s,
      read: `solve for ${m("y")}: ${m(`${term(B, "y")} = ${lin([[A.neg(), "x"]], C)}`)}, so ${m(`y = ${lin([[s, "x"]], C.div(B))}`)} and the slope is ${n(s)}`,
      difficulty: zero ? 3 : 2,
    };
  }
  if (form === "odd") {
    const s = F(rng.pick([2, 3, 4, 5, 6, 7, -2, -3, -5]));
    const c = F(rng.nonzero(-20, 20));
    const tex = `y ${signed(c)} = ${term(s, "x")}`;
    return {
      intro: `Line ${m(name)} is defined by ${m(tex)}`,
      eq: { A: s.neg(), B: F(1), C: c.neg() },
      s,
      read: `${moveC(c)}: ${m(`y = ${lin([[s, "x"]], c.neg())}`)}, so the slope is ${n(s)}`,
      difficulty: 3,
    };
  }
  const q = rng.pick([1, 2, 3]);
  const p = rng.nonzero(-4, 4);
  const s = F(p, q);
  need(s.d === q && !s.abs().eq(1), "drawn run");
  const b = F(rng.nonzero(-6, 6));
  need(Math.abs(b.n + p) <= 9, "grid");
  const fr = frame([-10, 10], [-10, 10], { step: 1, labelStep: 2 });
  return {
    intro: `Line ${m(name)} is shown in the ${m("xy")}-plane`,
    eq: slopeEq(s, b),
    s,
    read: `the line passes through the grid points ${m(pair(0, b))} and ${m(pair(q, b.add(p)))}, a rise of ${n(F(p))} over a run of ${n(F(q))}, so its slope is ${n(s)}`,
    figure: plane(fr, [
      line(name, `y=${lin([[s, "x"]], b)}`, s.toNumber(), b.toNumber(), fr),
      point("A", 0, b.toNumber(), [name]),
      point("B", q, b.add(p).toNumber(), [name]),
    ]),
    difficulty: 2,
  };
}

const moveC = (c: Frac) =>
  c.n > 0 ? `subtract ${n(c)} from both sides` : `add ${n(c.neg())} to both sides`;

const RULE = {
  parallel: "Parallel lines have equal slopes",
  perpendicular:
    "Perpendicular lines have slopes whose product is -1, so each is the negative reciprocal of the other",
};

// ------------------------------------------------------------------ the slope of a related line

export const relatedSlope: Template = {
  id: "pp.related-slope",
  skill: SKILL,
  label: "The slope of a line parallel or perpendicular to a given line",
  difficulty: [1, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const [j, k] = rng.pick([
      ["j", "k"],
      ["r", "s"],
      ["k", "j"],
      ["q", "r"],
      ["t", "s"],
      ["h", "j"],
    ]);
    const g = givenLine(rng, format === "mc", j);
    const perp = rng.bool(0.55);
    const ans = perp ? g.s.inv().neg() : g.s;
    if (format === "spr" && !fitsBox(ans)) throw new Retry("box");
    const yint = g.eq.C.div(g.eq.B);
    const slips: Slip[] = perp
      ? [
          slip(g.s, "you gave the slope of a parallel line"),
          slip(g.s.inv(), "you took the reciprocal but kept the sign"),
          slip(g.s.neg(), "you changed the sign but did not take the reciprocal"),
          ...(yint.isZero() || g.figure
            ? []
            : [slip(yint.inv().neg(), `you used the ${m("y")}-intercept in place of the slope`)]),
        ]
      : [
          slip(
            g.s.inv().neg(),
            "you used the perpendicular slope; parallel lines have equal slopes"
          ),
          slip(g.s.neg(), "you lost the sign of the slope"),
          slip(g.s.inv(), "you took the reciprocal of the slope"),
          ...(yint.isZero() || g.figure
            ? []
            : [slip(yint, `you gave the ${m("y")}-intercept, not the slope`)]),
        ];
    const steps: Step[] = [
      { label: `Find the slope of line ${m(j)}`, work: g.read },
      perp
        ? {
            label: "Take the negative reciprocal",
            work: `the slopes of perpendicular lines multiply to ${m("-1")}, so line ${m(k)} has slope ${n(ans)}`,
          }
        : {
            label: "Keep the same slope",
            work: `the slopes of parallel lines are equal, so line ${m(k)} has slope ${n(ans)}`,
          },
    ];
    return {
      format,
      stem: `${g.intro}. Line ${m(k)}${g.figure ? " (not shown)" : ""} is ${perp ? "perpendicular" : "parallel"} to line ${m(j)} in the ${m("xy")}-plane. What is the slope of line ${m(k)}?`,
      figure: g.figure,
      answer: numAnswer(ans, m(num(ans))),
      slips,
      asks: `the slope of the line ${perp ? "perpendicular" : "parallel"} to line ${m(j)}`,
      steps,
      check: perp
        ? `the product of the two slopes is ${m(`${paren(g.s)}${br(ans)} = -1`)}, as perpendicular slopes must be`
        : `two points on line ${m(j)} one unit apart in ${m("x")} differ by ${n(g.s)} in ${m("y")}, the same rise per unit as line ${m(k)}`,
      tip: perp ? `${RULE.perpendicular.replace("-1", m("-1"))}` : RULE.parallel,
      hint: `Find the slope of line ${m(j)} first.`,
      difficulty: Math.min(
        5,
        g.difficulty + (perp ? 1 : 0) + (perp && !g.s.isInt() && g.difficulty >= 3 ? 1 : 0)
      ),
      isCorrect: (cand) =>
        isValue(cand, (v) => (perp ? v.mul(slopeOf(g.eq)).eq(-1) : v.eq(slopeOf(g.eq)))),
    };
  },
};

// ------------------------------------------------------------------ the related line through a point

export const throughPoint: Template = {
  id: "pp.through-point",
  skill: SKILL,
  label: "The parallel or perpendicular line through a point: its equation, intercept or a point",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const [j, k] = rng.pick([
      ["k", "j"],
      ["j", "k"],
      ["k", "n"],
      ["r", "s"],
      ["t", "h"],
    ]);
    const g = givenLine(rng, format === "mc", j);
    const perp = rng.bool(0.55);
    const s2 = perp ? g.s.inv().neg() : g.s;
    const wrongS = perp ? g.s : g.s.inv().neg();
    const ask =
      format === "mc"
        ? rng.pick(["eq", "eq", "yint", "origin"] as const)
        : rng.pick(["yint", "origin"] as const);
    const rel = perp ? "perpendicular" : "parallel";
    const steps: Step[] = [
      { label: `Find the slope of line ${m(j)}`, work: g.read },
      {
        label: `Find the slope of line ${m(k)}`,
        work: perp
          ? `the slopes of perpendicular lines multiply to ${m("-1")}, so line ${m(k)} has slope ${n(s2)}`
          : `the slopes of parallel lines are equal, so line ${m(k)} has slope ${n(s2)}`,
      },
    ];
    const common = {
      format,
      figure: g.figure,
      tip: `Get the new slope from the old one first (${perp ? "negative reciprocal" : "the same slope"}), then use the point to find the rest`,
      hint: `What slope does a line ${rel} to line ${m(j)} have?`,
    };
    if (ask === "origin") {
      const a = F(rng.nonzero(-12, 18) * s2.d);
      const d = s2.mul(a);
      if (format === "spr") need(fitsBox(d), "box");
      const b0 = g.eq.C.div(g.eq.B);
      steps.push({
        label: "Use the line through the origin",
        work: `the equation of line ${m(k)} is ${m(`y = ${lin([[s2, "x"]])}`)}, so ${m(`d = ${paren(s2)}${br(a)} = ${num(d)}`)}`,
      });
      return {
        ...common,
        stem: `${g.intro}. In the ${m("xy")}-plane, line ${m(k)}${g.figure ? " (not shown)" : ""} passes through the point ${m("(0, 0)")} and is ${rel} to line ${m(j)}. If line ${m(k)} also passes through the point ${m(`(${num(a)}, d)`)}, what is the value of ${m("d")}?`,
        answer: numAnswer(d, m(num(d))),
        slips: [
          slip(wrongS.mul(a), `you used the ${perp ? "parallel" : "perpendicular"} slope`),
          ...(b0.isZero() || g.figure
            ? []
            : [
                slip(
                  d.add(b0),
                  `you kept line ${m(j)}'s ${m("y")}-intercept, but line ${m(k)} passes through the origin`
                ),
              ]),
          slip(a.div(s2), "you divided by the slope instead of multiplying"),
          slip(d.neg(), "you lost a sign"),
        ],
        asks: `the ${m("y")}-coordinate of the point on line ${m(k)} where ${m(`x = ${num(a)}`)}`,
        steps,
        check: `the slope from ${m("(0, 0)")} to ${m(pair(a, d))} is ${m(`\\frac{${num(d)}}{${num(a)}} = ${num(s2)}`)}, the slope line ${m(k)} needs`,
        difficulty: Math.min(5, 3 + (perp ? 1 : 0) + (g.difficulty >= 3 ? 1 : 0)),
        isCorrect: (cand) =>
          isValue(cand, (v) => v.div(a).eq(perp ? F(-1).div(slopeOf(g.eq)) : slopeOf(g.eq))),
      };
    }
    const x0 = F(rng.nonzero(-9, 12) * s2.d);
    const y0 = F(rng.int(-15, 20));
    const b2 = y0.sub(s2.mul(x0));
    if (format === "spr") need(fitsBox(b2), "box");
    steps.push({
      label: "Use the point to find the intercept",
      work: `${m(`${num(y0)} = ${paren(s2)}${br(x0)} + b`)}, so ${m(`b = ${num(y0)} ${s2.mul(x0).n <= 0 ? "+" : "-"} ${num(s2.mul(x0).abs())} = ${num(b2)}`)}`,
    });
    const p2: [Frac, Frac] = [x0.add(s2.d), y0.add(s2.n)];
    const relStem = `${g.intro}. Line ${m(k)}${g.figure ? " (not shown)" : ""} is ${rel} to line ${m(j)} and passes through the point ${m(pair(x0, y0))}.`;
    const checkText = `the point fits, ${m(`${paren(s2)}${br(x0)} ${b2.n < 0 ? "-" : "+"} ${num(b2.abs())} = ${num(y0)}`)}, and the slopes ${n(g.s)} and ${n(s2)} ${perp ? `multiply to ${m("-1")}` : "are equal"}`;
    if (ask === "yint") {
      return {
        ...common,
        stem: `${relStem} What is the ${m("y")}-coordinate of the ${m("y")}-intercept of line ${m(k)}?`,
        answer: numAnswer(b2, m(num(b2))),
        slips: [
          slip(
            y0,
            `you used the ${m("y")}-coordinate of the point; the point is not on the ${m("y")}-axis`
          ),
          slip(
            y0.add(s2.mul(x0)),
            `you added ${m(`${paren(s2)}${br(x0)}`)} instead of subtracting it`
          ),
          slip(y0.sub(wrongS.mul(x0)), `you used the ${perp ? "parallel" : "perpendicular"} slope`),
          ...(g.figure
            ? []
            : [slip(g.eq.C.div(g.eq.B), `you gave line ${m(j)}'s ${m("y")}-intercept`)]),
        ],
        asks: `where line ${m(k)} crosses the ${m("y")}-axis`,
        steps,
        check: checkText,
        difficulty: Math.min(5, 2 + (perp ? 1 : 0) + (g.difficulty >= 2 ? 1 : 0)),
        isCorrect: (cand) =>
          isValue(cand, (v) => {
            const sv = y0.sub(v).div(x0);
            return perp ? sv.mul(slopeOf(g.eq)).eq(-1) : sv.eq(slopeOf(g.eq));
          }),
      };
    }
    const text = (mm: Frac, bb: Frac) => m(`y = ${lin([[mm, "x"]], bb)}`);
    steps.push({ label: "Write the equation", work: text(s2, b2) });
    return {
      ...common,
      stem: `${relStem} Which equation defines line ${m(k)}?`,
      answer: eqAnswer(text(s2, b2), slopeEq(s2, b2)),
      slips: [
        eqSlip(
          text(wrongS, y0.sub(wrongS.mul(x0))),
          slopeEq(wrongS, y0.sub(wrongS.mul(x0))),
          `you used the ${perp ? "parallel" : "perpendicular"} slope`
        ),
        eqSlip(
          text(s2, y0),
          slopeEq(s2, y0),
          `you used the point's ${m("y")}-coordinate as the ${m("y")}-intercept`
        ),
        eqSlip(
          text(s2.neg(), y0.add(s2.mul(x0))),
          slopeEq(s2.neg(), y0.add(s2.mul(x0))),
          "you lost the sign of the slope"
        ),
        eqSlip(
          text(s2, y0.add(s2.mul(x0))),
          slopeEq(s2, y0.add(s2.mul(x0))),
          `you added ${m(`${paren(s2)}${br(x0)}`)} instead of subtracting it`
        ),
      ],
      asks: `the equation of the line ${rel} to line ${m(j)} through ${m(pair(x0, y0))}`,
      steps,
      check: checkText,
      difficulty: Math.min(5, 2 + (perp ? 1 : 0) + (g.difficulty >= 2 ? 1 : 0)),
      isCorrect: (cand) => {
        const sj = slopeOf(g.eq);
        const want = perp ? F(-1).div(sj) : sj;
        return want.eq(s2) && eqThrough(cand, [[x0, y0], p2]);
      },
    };
  },
};

// ------------------------------------------------------------------ unknowns fixed by a perpendicular

interface Hard {
  stem: string;
  answer: Frac;
  slips: Slip[];
  steps: Step[];
  check: string;
  test: (v: Frac) => boolean;
  difficulty: number;
  asks: string;
}

/** Line s: ax + by = c; t perpendicular through (k, 0) and (P, -k): k = uP/(u - 1). */
function unknownPair(rng: Rng): Hard {
  const a = F(rng.pick([1, 1, 2, 3, 4, 5]));
  const b = F(rng.pick([-2, -3, -4, -5, -6, 2, 3, 4, 5]));
  need(!a.eq(b.abs()), "slope 1");
  const c = F(rng.nonzero(-40, 40));
  const s = a.neg().div(b);
  const u = s.inv().neg();
  need(!u.eq(1), "u = 1");
  const P = F(rng.int(2, 30) * 6);
  const k = u.mul(P).div(u.sub(1));
  need(!k.eq(P), "same x");
  const kw = (v: Frac) => (v.sub(1).isZero() ? null : v.mul(P).div(v.sub(1)));
  const par = kw(s);
  const slips: Slip[] = [
    ...(par && !par.eq(P)
      ? [
          slip(
            par,
            `you used the slope of line ${m("s")} itself instead of its negative reciprocal`
          ),
        ]
      : []),
    ...(kw(u.neg()) && !u.neg().eq(1)
      ? [slip(kw(u.neg())!, "you took the reciprocal but lost the negative sign")]
      : []),
    slip(k.neg(), "you lost a sign when collecting the terms"),
    slip(u.mul(P), `you did not move the ${m("k")}-terms to one side before solving`),
  ];
  const sTex = `${lin([
    [a, "x"],
    [b, "y"],
  ])} = ${num(c)}`;
  return {
    stem: `Line ${m("s")} is defined by ${m(sTex)}. Line ${m("t")} is perpendicular to line ${m("s")} in the ${m("xy")}-plane and passes through the points ${m("(k, 0)")} and ${m(`(${num(P)}, -k)`)}. What is the value of ${m("k")}?`,
    answer: k,
    slips,
    steps: [
      {
        label: `Find the slope of line ${m("s")}`,
        work: `${m(`y = ${lin([[s, "x"]], c.div(b))}`)}, so the slope is ${n(s)}`,
      },
      { label: `Find the slope of line ${m("t")}`, work: `the negative reciprocal: ${n(u)}` },
      {
        label: "Write the slope with the points",
        work: `${m(`\\frac{-k - 0}{${num(P)} - k} = ${num(u)}`)}, so ${m(
          `-k = ${lin([
            [u.mul(P), ""],
            [u.neg(), "k"],
          ])}`
        )}`,
      },
      {
        label: `Solve for ${m("k")}`,
        work: `${m(`${lin([[u.sub(1), "k"]])} = ${num(u.mul(P))}`)}, so ${m(`k = ${num(k)}`)}`,
      },
    ],
    check: `the points are ${m(pair(k, 0))} and ${m(pair(P, k.neg()))}, with slope ${m(`\\frac{${num(k.neg())}}{${num(P.sub(k))}} = ${num(u)}`)}, and ${m(`${paren(u)}${br(s)} = -1`)}`,
    test: (v) => {
      if (v.eq(P)) return false;
      const st = v.neg().div(P.sub(v));
      return st.mul(slopeOf({ A: a, B: b, C: c })).eq(-1);
    },
    difficulty: rng.pick([6, 7]),
    asks: `the value of ${m("k")} that makes the line through the two points perpendicular to line ${m("s")}`,
  };
}

/** Line s: ax + by = 0; t perpendicular through (h, 0) and (k, w): k = h + w/u. */
function unknownX(rng: Rng): Hard {
  const a = F(rng.int(2, 9));
  const b = F(rng.pick([1, 2, 3, -2]));
  need(!a.eq(b.abs()), "slope");
  const s = a.neg().div(b);
  const u = s.inv().neg();
  const h = F(rng.int(2, 12));
  const k = h.add(F(rng.int(1, 9)).mul(rng.sign()));
  const w = u.mul(k.sub(h));
  need(!w.isZero(), "w");
  const sTex = `${lin([
    [a, "x"],
    [b, "y"],
  ])} = 0`;
  return {
    stem: `Line ${m("s")} in the ${m("xy")}-plane is defined by ${m(sTex)}. Line ${m("t")} is perpendicular to line ${m("s")} and passes through the points ${m(pair(h, 0))} and ${m(`\\left(k, ${num(w)}\\right)`)}. What is the value of ${m("k")}?`,
    answer: k,
    slips: [
      slip(
        h.add(w.div(s)),
        `you used the slope of line ${m("s")} instead of its negative reciprocal`
      ),
      slip(h.sub(w.div(u)), "you subtracted the run instead of adding it"),
      slip(w.div(u), `you found the run and forgot to add ${n(h)}`),
      slip(h.add(w.mul(u)), "you multiplied by the slope instead of dividing"),
    ],
    steps: [
      {
        label: `Find the slope of line ${m("s")}`,
        work: `${m(`${term(b, "y")} = ${lin([[a.neg(), "x"]])}`)}, so the slope is ${n(s)}`,
      },
      { label: `Find the slope of line ${m("t")}`, work: `the negative reciprocal: ${n(u)}` },
      {
        label: `Solve for ${m("k")}`,
        work: `${m(`\\frac{${num(w)} - 0}{k - ${num(h)}} = ${num(u)}`)}, so ${m(`k - ${num(h)} = ${num(w.div(u))}`)} and ${m(`k = ${num(k)}`)}`,
      },
    ],
    check: `the slope from ${m(pair(h, 0))} to ${m(pair(k, w))} is ${m(`\\frac{${num(w)}}{${num(k.sub(h))}} = ${num(u)}`)}, and ${m(`${paren(u)}${br(s)} = -1`)}`,
    test: (v) =>
      !v.eq(h) &&
      w
        .div(v.sub(h))
        .mul(slopeOf({ A: a, B: b, C: F(0) }))
        .eq(-1),
    difficulty: rng.pick([5, 6]),
    asks: `the ${m("x")}-coordinate that puts the second point on the perpendicular line`,
  };
}

/** j through (p, 0) and (0, q); k through the origin, perpendicular: x = pq^2 / (p^2 + q^2). */
function footOfPerpendicular(rng: Rng): Hard {
  const p = F(rng.int(2, 16));
  const q = F(rng.int(2, 16));
  need(!p.eq(q), "same intercepts");
  const den = p.mul(p).add(q.mul(q));
  const x = p.mul(q).mul(q).div(den);
  const y = p.mul(x).div(q);
  return {
    stem: `Line ${m("j")} in the ${m("xy")}-plane passes through the points ${m(pair(p, 0))} and ${m(pair(0, q))}. Line ${m("k")} passes through the origin and is perpendicular to line ${m("j")}. What is the ${m("x")}-coordinate of the point where lines ${m("j")} and ${m("k")} intersect?`,
    answer: x,
    slips: [
      slip(y, `you found the ${m("y")}-coordinate of the intersection`),
      ...(q.gt(p)
        ? [
            slip(
              p
                .mul(q)
                .mul(q)
                .div(q.mul(q).sub(p.mul(p))),
              `you gave line ${m("k")} the slope ${n(p.neg().div(q))}, forgetting to change the sign`
            ),
          ]
        : []),
      slip(
        p.div(2),
        `you gave line ${m("k")} the slope ${n(q.div(p))}, the reciprocal of the wrong slope`
      ),
      slip(p, `you gave the ${m("x")}-intercept of line ${m("j")}`),
    ],
    steps: [
      {
        label: `Write line ${m("j")}`,
        work: `the slope is ${m(`\\frac{${num(q)} - 0}{0 - ${num(p)}} = ${num(q.neg().div(p))}`)}, so ${m(`y = ${lin([[q.neg().div(p), "x"]], q)}`)}`,
      },
      {
        label: `Write line ${m("k")}`,
        work: `the negative reciprocal slope is ${n(p.div(q))}, through the origin: ${m(`y = ${lin([[p.div(q), "x"]])}`)}`,
      },
      {
        label: "Set the equations equal",
        work: `${m(`${lin([[p.div(q), "x"]])} = ${lin([[q.neg().div(p), "x"]], q)}`)}, so ${m(`${lin([[p.div(q).add(q.div(p)), "x"]])} = ${num(q)}`)} and ${m(`x = ${num(x)}`)}`,
      },
    ],
    check: `at ${m(`x = ${num(x)}`)} both lines give ${m(`y = ${num(y)}`)}, and the slopes ${n(q.neg().div(p))} and ${n(p.div(q))} multiply to ${m("-1")}`,
    test: (v) => {
      // The point of line j above x = v must be perpendicular to j's direction, seen from the origin.
      const yv = q.sub(q.div(p).mul(v));
      return p.mul(v).sub(q.mul(yv)).isZero();
    },
    difficulty: 7,
    asks: `the ${m("x")}-coordinate of the foot of the perpendicular from the origin to line ${m("j")}`,
  };
}

/** j through the origin and (x0, y0); k perpendicular there, through (p, 0): p = x0 + y0^2/x0. */
function meetAtPoint(rng: Rng): Hard {
  const x0 = F(rng.int(2, 12));
  const y0 = F(rng.int(3, 40));
  need(!x0.eq(y0), "slope 1");
  const p = x0.add(y0.mul(y0).div(x0));
  return {
    stem: `In the ${m("xy")}-plane, lines ${m("k")} and ${m("j")} are perpendicular and intersect at the point ${m(pair(x0, y0))}. Line ${m("j")} passes through the origin, and line ${m("k")} passes through the point ${m("(p, 0)")}, where ${m("p")} is a constant. What is the value of ${m("p")}?`,
    answer: p,
    slips: [
      slip(x0.sub(y0.mul(y0).div(x0)), "you forgot the negative sign in the perpendicular slope"),
      slip(
        y0.mul(y0).div(x0),
        `you found the run from ${m(pair(x0, y0))} and forgot to add ${n(x0)}`
      ),
      slip(
        x0.mul(2),
        `you changed the sign of line ${m("j")}'s slope but did not take the reciprocal`
      ),
      slip(x0.add(y0), `you added the coordinates of the intersection`),
    ],
    steps: [
      {
        label: `Find the slope of line ${m("j")}`,
        work: `from the origin to ${m(pair(x0, y0))}, the slope is ${n(y0.div(x0))}`,
      },
      {
        label: `Find the slope of line ${m("k")}`,
        work: `the negative reciprocal is ${n(x0.neg().div(y0))}`,
      },
      {
        label: `Solve for ${m("p")}`,
        work: `${m(`\\frac{0 - ${num(y0)}}{p - ${num(x0)}} = ${num(x0.neg().div(y0))}`)}, so ${m(`p - ${num(x0)} = ${num(y0.mul(y0).div(x0))}`)} and ${m(`p = ${num(p)}`)}`,
      },
    ],
    check: `the slope from ${m(pair(x0, y0))} to ${m(pair(p, 0))} is ${m(`\\frac{${num(y0.neg())}}{${num(p.sub(x0))}} = ${num(y0.neg().div(p.sub(x0)))}`)}, and it times ${n(y0.div(x0))} is ${m("-1")}`,
    test: (v) => x0.sub(v).mul(x0).add(y0.mul(y0)).isZero(),
    difficulty: 6,
    asks: `where line ${m("k")} crosses the ${m("x")}-axis`,
  };
}

export const perpendicularUnknown: Template = {
  id: "pp.perpendicular-unknown",
  skill: SKILL,
  label: "A perpendicular line fixes an unknown coordinate or an intersection",
  difficulty: [5, 7],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const h = weighted(rng, [
      [1.2, unknownPair],
      [1.2, unknownX],
      [0.6, footOfPerpendicular],
      [1, meetAtPoint],
    ] as const)(rng);
    if (format === "spr" && !fitsBox(h.answer)) throw new Retry("box");
    return {
      format,
      stem: h.stem,
      answer: numAnswer(h.answer, m(num(h.answer))),
      slips: h.slips,
      asks: h.asks,
      steps: h.steps,
      check: h.check,
      tip: "Turn the perpendicular condition into a slope (the negative reciprocal), then write that slope using the points that hold the unknown",
      hint: "Find the slope the perpendicular line must have.",
      difficulty: h.difficulty,
      isCorrect: (cand) => isValue(cand, h.test),
    };
  },
};

export const TEMPLATES: Template[] = [relatedSlope, throughPoint, perpendicularUnknown];
