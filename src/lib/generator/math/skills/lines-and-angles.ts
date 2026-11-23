/*
 * m-lines-and-angles: angle relationships with parallel lines and intersecting lines. Item models
 * after the bank's questions for this skill: two parallel lines cut by a transversal with one
 * angle given, the same figure with angle expressions (x = 6z - 87), and angles at one point
 * (vertical angles, linear pairs, angles on a line, complementary angles beside a right angle).
 * The check rebuilds the figure's true directions from the given angle and measures again.
 */
import type { Label, Mark, Part } from "@/lib/figures/engine/spec";
import { need } from "../core/build";
import { geometry } from "../core/figures";
import { F, type Frac } from "../core/frac";
import { lin } from "../core/tex";
import type { Draft, Slip, Template } from "../core/types";
import {
  angle,
  type Core,
  coreDraft,
  deg,
  degLabel,
  label,
  LINE_NAMES,
  lineTex,
  numSlip,
  parallelMark,
  pt,
  rightMark,
  type Rng,
  seg,
} from "./_geo1-common";

const SKILL = "m-lines-and-angles";

/** Angle measures and these unknowns are positive, so a slip that gives zero or less is no choice. */
const positive = (slips: Slip[]) => slips.filter((s) => (s.value?.toNumber() ?? 1) > 0);

// ---------------------------------------------------------------- the parallel-lines figure

type Side = "R" | "L";
type Vert = "U" | "D";
/** An angle at one of the two crossings: P on the first line (top), Q on the second. */
interface Spot {
  at: "P" | "Q";
  h: Side;
  v: Vert;
}

const sameSpot = (a: Spot, b: Spot) => a.at === b.at && a.h === b.h && a.v === b.v;

/** Direction (degrees, y up) of each ray when the transversal's upward ray points at phi. */
const rayDir = (phi: number, s: Side | Vert) =>
  s === "R" ? 0 : s === "L" ? 180 : s === "U" ? phi : phi + 180;

/** The measure of the angle at a spot, from the true directions of its two rays. */
function measureAt(phi: number, spot: Spot): number {
  const d = Math.abs(rayDir(phi, spot.h) - rayDir(phi, spot.v)) % 360;
  return d > 180 ? 360 - d : d;
}

/** The transversal direction that makes `spot` measure `g` degrees. */
function phiFor(spot: Spot, g: number): number {
  for (const phi of [g, 180 - g]) if (Math.abs(measureAt(phi, spot) - g) < 1e-9) return phi;
  throw new Error("no direction");
}

/** The pair's name, when it has one, and whether the two angles are equal. */
function relation(a: Spot, b: Spot): { name: string | null; equal: boolean } {
  const equal = ((a.h === "R") === (a.v === "U")) === ((b.h === "R") === (b.v === "U"));
  if (a.at === b.at) {
    if (a.h !== b.h && a.v !== b.v) return { name: "vertical angles", equal: true };
    return { name: "a linear pair", equal: false };
  }
  const [p, q] = a.at === "P" ? [a, b] : [b, a];
  const interior = (s: Spot) => (s.at === "P" ? s.v === "D" : s.v === "U");
  if (p.h === q.h && p.v === q.v) return { name: "corresponding angles", equal: true };
  if (interior(p) && interior(q)) {
    return p.h !== q.h
      ? { name: "alternate interior angles", equal: true }
      : { name: "same-side interior angles", equal: false };
  }
  if (!interior(p) && !interior(q) && p.h !== q.h)
    return { name: "alternate exterior angles", equal: true };
  return { name: null, equal };
}

const SPOTS: Spot[] = (["P", "Q"] as const).flatMap((at) =>
  (["R", "L"] as const).flatMap((h) => (["U", "D"] as const).map((v) => ({ at, h, v })))
);

/** Two horizontal parallel lines cut by a transversal, with labeled angles at given spots. */
function parallelFigure(
  rng: Rng,
  phi: number,
  names: readonly string[],
  angles: { spot: Spot; text: string }[]
) {
  // Drawn direction: kept between 38 and 72 degrees from the horizontal so labels fit.
  const acute = Math.min(72, Math.max(38, phi < 90 ? phi : 180 - phi));
  const drawPhi = ((phi < 90 ? acute : 180 - acute) * Math.PI) / 180;
  const H = 4.2;
  const ux = Math.cos(drawPhi);
  const uy = -Math.sin(drawPhi); // upward ray, y down
  const qx = (-H * ux) / -uy;
  const ext = 2.4;
  const left = Math.min(0, qx) - 4;
  const right = Math.max(0, qx) + 4;
  const ray: Record<string, Record<string, string>> = {
    P: { R: "p2", L: "p1", U: "t1", D: "Q" },
    Q: { R: "r2", L: "r1", U: "P", D: "t2" },
  };
  const parts: Part[] = [
    pt("p1", left, 0),
    pt("p2", right, 0),
    pt("r1", left, H),
    pt("r2", right, H),
    pt("t1", ext * ux, ext * uy),
    pt("t2", qx - ext * ux, H - ext * uy),
    pt("P", 0, 0, ["p", "t"]),
    pt("Q", qx, H, ["r", "t"]),
    seg("p", "p1", "p2"),
    seg("r", "r1", "r2"),
    seg("t", "t1", "t2"),
  ];
  const labels: Label[] = [];
  angles.forEach(({ spot, text }, i) => {
    parts.push(angle(`a${i}`, spot.at, ray[spot.at][spot.h], ray[spot.at][spot.v]));
    labels.push(label(text, `a${i}`));
  });
  const nameEnd = rng.bool(0.5);
  labels.push(
    label(names[0], nameEnd ? "p2" : "p1"),
    label(names[1], nameEnd ? "r2" : "r1"),
    label(names[2], rng.bool(0.5) ? "t1" : "t2")
  );
  const marks: Mark[] = rng.bool(0.4) ? [parallelMark(["p", "r"])] : [];
  return geometry(parts, labels, marks);
}

/** The steps that walk from the given angle to the asked one through named facts. */
function chainSteps(given: Spot, asked: Spot, g: number, names: readonly string[]) {
  const steps: { label: string; work: string }[] = [];
  let from = given;
  let value = g;
  if (given.at !== asked.at) {
    const moved: Spot = { ...given, at: asked.at };
    steps.push({
      label: "Carry the angle across",
      work: `Because line ${names[0]} is parallel to line ${names[1]}, the angle in the same position at the other crossing is a corresponding angle, so it also measures $${deg(g)}$`,
    });
    from = moved;
  }
  if (!sameSpot(from, asked)) {
    const r = relation(from, asked);
    value = r.equal ? value : 180 - value;
    steps.push({
      label: "Relate it to the unknown angle",
      work: r.equal
        ? `That angle and the unknown angle are vertical angles, so they are equal: $${deg(value)}$`
        : `That angle and the unknown angle form a linear pair, so they add to $${deg(180)}$: $180 - ${g} = ${value}$`,
    });
  }
  return { steps, value };
}

export const parallelBasic: Template = {
  id: "angles.parallel-basic",
  skill: SKILL,
  label: "Parallel lines and a transversal: find an angle from one given angle",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const names = rng.pick(LINE_NAMES);
    const [given, asked] = rng.sample(SPOTS, 2);
    const g = rng.int(25, 155);
    need(Math.abs(g - 90) >= 8, "not near a right angle");
    const phi = phiFor(given, g);
    const rel = relation(given, asked);
    const ans = rel.equal ? g : 180 - g;
    const v = rng.pick(["x", "y", "w", "z", "a"]);
    const figure = parallelFigure(rng, phi, names, [
      { spot: given, text: degLabel(g) },
      { spot: asked, text: degLabel(v) },
    ]);
    const chain = chainSteps(given, asked, g, names);
    const [n0, n1, n2] = names.map(lineTex);
    const acute = Math.min(g, 180 - g);
    const core: Core = {
      stem: `In the figure, line $${n0}$ is parallel to line $${n1}$, and line $${n2}$ intersects both lines. What is the value of $${v}$?`,
      answer: F(ans),
      slips: [
        rel.equal
          ? numSlip(180 - g, "you treated the angles as a linear pair, but they are equal")
          : numSlip(g, "you treated the angles as equal, but they add to 180 degrees"),
        numSlip(360 - g, "you subtracted from 360 instead of 180"),
        numSlip(
          Math.abs(90 - g),
          "you treated the angles as complementary; only angles in a right angle add to 90 degrees"
        ),
        numSlip(F(180 - g, 2), "you split the supplement in half"),
      ],
      asks: `the measure ${v} of the marked angle`,
      steps: chain.steps.length
        ? [...chain.steps, { label: `State ${v}`, work: `$${v} = ${ans}$` }]
        : [{ label: `State ${v}`, work: `$${v} = ${ans}$` }],
      check: `${rel.name ? `The two marked angles are ${rel.name}, so they are ${rel.equal ? "equal" : "supplementary"}. ` : ""}Every angle in the figure measures either $${deg(acute)}$ or $${deg(180 - acute)}$, and the angle marked $${v}^\\circ$ is the ${ans === acute ? "acute" : "obtuse"} one`,
      tip: "When a transversal crosses two parallel lines, every acute angle formed is equal, every obtuse angle is equal, and an acute and an obtuse angle add to 180 degrees",
      hint: `Is the angle marked $${v}^\\circ$ acute or obtuse? Compare it with the $${deg(g)}$ angle.`,
      difficulty:
        (rel.name === "vertical angles" ||
        rel.name === "a linear pair" ||
        rel.name === "corresponding angles"
          ? 1
          : 2) + (format === "spr" ? 1 : 0),
      ok: (cand) => cand.eq(F(Math.round(measureAt(phi, asked)))),
    };
    return coreDraft(format, { ...core, slips: positive(core.slips) }, figure);
  },
};

export const parallelExpressions: Template = {
  id: "angles.parallel-expressions",
  skill: SKILL,
  label: "Parallel lines and a transversal with angle expressions: solve for the variable",
  difficulty: [3, 5],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const names = rng.pick(LINE_NAMES);
    const [s1, s2] = rng.sample(SPOTS, 2);
    const rel = relation(s1, s2);
    const zName = rng.pick(["z", "k", "n", "w"]);
    const z = rng.int(4, 40);
    const a = rng.int(2, 9);
    const c = rng.int(1, 9);
    need(a !== c, "different coefficients");
    const xv = rng.int(25, 155);
    need(Math.abs(xv - 90) >= 8, "not near a right angle");
    const yv = rel.equal ? xv : 180 - xv;
    const b = xv - a * z;
    const d = yv - c * z;
    need(b !== 0 && d !== 0, "a constant in each expression");
    const phi = phiFor(s1, xv);
    const figure = parallelFigure(rng, phi, names, [
      { spot: s1, text: degLabel("x") },
      { spot: s2, text: degLabel("y") },
    ]);
    const X = lin([[a, zName]], b);
    const Y = lin([[c, zName]], d);
    const askAngle = rng.bool(0.3);
    const [n0, n1, n2] = names.map(lineTex);
    const eq = rel.equal ? `${X} = ${Y}` : `(${X}) + (${Y}) = 180`;
    const wrongRel: Frac = rel.equal ? F(180 - b - d, a + c) : F(d - b, a - c);
    const solveSteps = rel.equal
      ? [
          { label: `Collect the ${zName}-terms`, work: `$${lin([[a - c, zName]], b)} = ${d}$` },
          {
            label: `Solve for ${zName}`,
            work: `$${lin([[a - c, zName]])} = ${d - b}$, so $${zName} = ${z}$`,
          },
        ]
      : [
          { label: "Combine like terms", work: `$${lin([[a + c, zName]], b + d)} = 180$` },
          {
            label: `Solve for ${zName}`,
            work: `$${lin([[a + c, zName]])} = ${180 - b - d}$, so $${zName} = ${z}$`,
          },
        ];
    const core: Core = {
      stem: `In the figure, line $${n0}$ is parallel to line $${n1}$, and line $${n2}$ intersects both lines. If $x = ${X}$ and $y = ${Y}$, what is the value of ${askAngle ? "$x$" : `$${zName}$`}?`,
      answer: F(askAngle ? xv : z),
      slips: askAngle
        ? [
            numSlip(z, `you found ${zName}, not x`),
            numSlip(
              yv === xv ? 180 - xv : yv,
              rel.equal ? "you gave the supplement of x" : "you found y, not x"
            ),
            numSlip(
              F(a).mul(wrongRel).add(b),
              rel.equal
                ? "you set x + y equal to 180, but the angles are equal"
                : "you set x equal to y, but the angles add to 180 degrees"
            ),
            numSlip(360 - xv, "you subtracted from 360 instead of 180"),
          ]
        : [
            numSlip(
              wrongRel,
              rel.equal
                ? "you set x + y equal to 180, but these angles are equal"
                : "you set x equal to y, but these angles add to 180 degrees"
            ),
            numSlip(xv, `you found x, not ${zName}`),
            numSlip(yv, `you found y, not ${zName}`),
            numSlip(
              rel.equal ? F(d + b, a - c) : F(180 + b + d, a + c),
              "you moved a constant across the equals sign without changing its sign"
            ),
          ],
      asks: askAngle
        ? "the measure x of the first marked angle"
        : `the value of ${zName}, not the angle measures`,
      steps: [
        {
          label: "Name the angle relationship",
          work: rel.equal
            ? `The angles marked x and y are ${rel.name ?? "both acute or both obtuse"}, so they are equal`
            : `The angles marked x and y are ${rel.name ?? "one acute and one obtuse"}, so they add to $${deg(180)}$`,
        },
        { label: "Write an equation", work: `$${eq}$` },
        ...solveSteps,
        ...(askAngle
          ? [
              {
                label: "Find x",
                work: `$x = ${a}(${z}) ${b < 0 ? "-" : "+"} ${Math.abs(b)} = ${xv}$`,
              },
            ]
          : []),
      ],
      check: `With $${zName} = ${z}$, $x = ${xv}$ and $y = ${yv}$${rel.equal ? ", which are equal" : `, and $${xv} + ${yv} = 180$`}`,
      tip: "With parallel lines, decide first whether two angles are equal or supplementary, then write the equation",
      hint: "Are the two marked angles equal, or do they add to 180 degrees?",
      difficulty: (rel.name && rel.name !== "corresponding angles" ? 4 : 3) + (askAngle ? 1 : 0),
      ok: (cand) => {
        const zz = askAngle ? cand.sub(b).div(a) : cand;
        const x1 = F(a).mul(zz).add(b);
        const y1 = F(c).mul(zz).add(d);
        if (x1.n <= 0 || y1.n <= 0 || !x1.isInt() || x1.n >= 180 || y1.n >= 180) return false;
        const p = phiFor(s1, x1.n);
        return Math.abs(measureAt(p, s2) - y1.toNumber()) < 1e-9;
      },
    };
    return coreDraft(format, { ...core, slips: positive(core.slips) }, figure);
  },
};

// ---------------------------------------------------------------- angles at one point

export const atAPoint: Template = {
  id: "angles.at-a-point",
  skill: SKILL,
  label: "Angles at a point: vertical angles, linear pairs, angles on a line, complementary angles",
  difficulty: [1, 4],
  formats: ["mc", "spr"],
  make(rng, format): Draft {
    const v = rng.pick(["x", "y", "w", "z", "t"]);
    if (rng.bool(0.5)) {
      // Rays from a point on a line: a + b + x = 180, or a right angle split into x and a.
      const right = rng.bool(0.4);
      const a = rng.int(15, right ? 70 : 100);
      const b = right ? 90 - a : rng.int(15, 160 - a);
      const xv = right ? a : 180 - a - b;
      need(xv >= 15, "room for x");
      const order = rng.shuffle(["a", "b", "x"]);
      const vals: Record<string, number> = right ? { a: 90, b, x: xv } : { a, b, x: xv };
      // Rays at the cumulative directions (degrees, y up) along the upper half-plane.
      const shown = right ? ["b", "x"] : order;
      const parts: Part[] = [
        pt("L", -5, 0),
        pt("R", 5, 0),
        pt("O", 0, 0, ["line"]),
        seg("line", "L", "R"),
      ];
      const labels: Label[] = [];
      const marks: Mark[] = [];
      let dirDeg = 0;
      let prev = "R";
      const seq = right ? ["b", "x", "rest"] : shown;
      seq.forEach((key, i) => {
        const span = key === "rest" ? 90 : vals[key];
        dirDeg += span;
        const id = i === seq.length - 1 ? "L" : `E${i}`;
        if (id !== "L") {
          const drawDeg = dirDeg;
          parts.push(
            pt(
              id,
              4.2 * Math.cos((drawDeg * Math.PI) / 180),
              -4.2 * Math.sin((drawDeg * Math.PI) / 180)
            )
          );
          parts.push(seg(`s${i}`, "O", id));
        }
        parts.push(angle(`g${i}`, "O", prev, id));
        if (key === "rest") marks.push(rightMark(`g${i}`));
        else labels.push(label(key === "x" ? degLabel(v) : degLabel(vals[key]), `g${i}`));
        prev = id;
      });
      need(
        seq.every((k) => k === "rest" || vals[k] >= 15),
        "wide enough angles"
      );
      const figure = geometry(parts, labels, marks);
      const core: Core = {
        stem: right
          ? `In the figure, two rays start at a point on a line, and one of them is perpendicular to the line. What is the value of $${v}$?`
          : `In the figure, three angles are formed by rays that start at a point on a line. What is the value of $${v}$?`,
        answer: F(xv),
        slips: right
          ? [
              numSlip(180 - b, "you subtracted from 180, but the two angles fill a right angle"),
              numSlip(b, "you assumed the two angles are equal"),
              numSlip(90 + b, "you added the angle to 90 instead of subtracting it"),
            ]
          : [
              numSlip(
                360 - a - b,
                "you subtracted from 360, but angles along a line add to 180 degrees"
              ),
              numSlip(180 - a, "you subtracted only one of the given angles"),
              numSlip(180 - b, "you subtracted only one of the given angles"),
              numSlip(a + b, "you added the given angles instead of subtracting them from 180"),
            ],
        asks: `the measure ${v} of the unlabeled part`,
        steps: right
          ? [
              {
                label: "Use the right angle",
                work: `The angles marked $${deg(b)}$ and $${v}^\\circ$ make up a right angle, so they add to $${deg(90)}$`,
              },
              { label: `Find ${v}`, work: `$${v} = 90 - ${b} = ${xv}$` },
            ]
          : [
              {
                label: "Use the straight angle",
                work: `The three angles make up a straight line, so they add to $${deg(180)}$`,
              },
              { label: `Find ${v}`, work: `$${v} = 180 - ${a} - ${b} = ${xv}$` },
            ],
        check: right ? `$${b} + ${xv} = 90$` : `$${a} + ${b} + ${xv} = 180$`,
        tip: "Angles that make up a straight line add to 180 degrees; angles that make up a right angle add to 90 degrees",
        hint: right
          ? "What do the two angles beside the right angle add to?"
          : "What do angles along a straight line add to?",
        difficulty: (right ? 2 : 1) + (format === "spr" ? 1 : 0),
        ok: (cand) => (right ? cand.add(b).eq(90) : cand.add(a + b).eq(180)),
      };
      return coreDraft(format, { ...core, slips: positive(core.slips) }, figure);
    }
    // Two crossing lines with angle expressions: vertical angles are equal, a linear pair adds to 180.
    const vertical = rng.bool(0.5);
    const xv = rng.int(4, 30);
    const p = rng.int(2, 9);
    const r = rng.int(1, 9);
    need(p !== r, "different coefficients");
    const A1 = rng.int(30, 150);
    need(Math.abs(A1 - 90) >= 10, "not near a right angle");
    const A2 = vertical ? A1 : 180 - A1;
    const q = A1 - p * xv;
    const s = A2 - r * xv;
    need(q !== 0 && s !== 0, "constants");
    const E1 = lin([[p, v]], q);
    const E2 = lin([[r, v]], s);
    const drawA = (Math.min(72, Math.max(40, A1 < 90 ? A1 : 180 - A1)) * Math.PI) / 180;
    const big = A1 > 90;
    const parts: Part[] = [
      pt("A", -5, 0),
      pt("B", 5, 0),
      pt("C", -4 * Math.cos(drawA), 4 * Math.sin(drawA)),
      pt("D", 4 * Math.cos(drawA), -4 * Math.sin(drawA)),
      pt("O", 0, 0, ["AB", "CD"]),
      seg("AB", "A", "B"),
      seg("CD", "C", "D"),
      // The angle from ray OB up to ray OD is acute as drawn; the one from OD to OA is obtuse.
      angle("g1", "O", big ? "D" : "B", big ? "A" : "D"),
      vertical
        ? angle("g2", "O", big ? "C" : "A", big ? "B" : "C")
        : angle("g2", "O", big ? "B" : "D", big ? "D" : "A"),
    ];
    const figure = geometry(parts, [
      label(degLabel(`(${E1})`), "g1"),
      label(degLabel(`(${E2})`), "g2"),
    ]);
    const askAngle = rng.bool(0.35);
    const wrong = vertical ? F(180 - q - s, p + r) : F(s - q, p - r);
    const core: Core = {
      stem: `In the figure, two lines intersect at a point. What is the value of ${askAngle ? `$${E1}$` : `$${v}$`}?`,
      answer: F(askAngle ? A1 : xv),
      slips: askAngle
        ? [
            numSlip(xv, `you found ${v}, not the angle measure`),
            numSlip(180 - A1, "you found the angle beside it, not this one"),
            numSlip(
              F(p).mul(wrong).add(q),
              vertical
                ? "you set the sum equal to 180, but vertical angles are equal"
                : "you set the angles equal, but a linear pair adds to 180 degrees"
            ),
            numSlip(360 - A1, "you subtracted from 360"),
          ]
        : [
            numSlip(
              wrong,
              vertical
                ? "you set the sum equal to 180, but vertical angles are equal"
                : "you set the angles equal, but they form a linear pair, which adds to 180 degrees"
            ),
            numSlip(A1, `you found an angle measure, not ${v}`),
            numSlip(
              vertical ? F(s + q, p - r) : F(180 + q + s, p + r),
              "you moved a constant across the equals sign without changing its sign"
            ),
            numSlip(
              vertical ? F(360 - q - s, p + r) : F(360 - q - s, p + r),
              "you set the sum equal to 360"
            ),
          ],
      asks: askAngle ? `the measure of the angle marked $(${E1})^\\circ$` : `the value of ${v}`,
      steps: [
        {
          label: "Name the angle relationship",
          work: vertical
            ? "The marked angles are across from each other, so they are vertical angles and are equal"
            : "The marked angles sit side by side along a line, so they form a linear pair and add to $180^\\circ$",
        },
        {
          label: "Write an equation",
          work: vertical ? `$${E1} = ${E2}$` : `$(${E1}) + (${E2}) = 180$`,
        },
        {
          label: `Solve for ${v}`,
          work: vertical
            ? `$${lin([[p - r, v]])} = ${s - q}$, so $${v} = ${xv}$`
            : `$${lin([[p + r, v]], q + s)} = 180$, so $${v} = ${xv}$`,
        },
        ...(askAngle
          ? [
              {
                label: "Find the angle",
                work: `$${p}(${xv}) ${q < 0 ? "-" : "+"} ${Math.abs(q)} = ${A1}$`,
              },
            ]
          : []),
      ],
      check: `With $${v} = ${xv}$ the angles measure $${deg(A1)}$ and $${deg(A2)}$${vertical ? ", which are equal" : `, which add to $${deg(180)}$`}`,
      tip: "Where two lines cross, angles across from each other are equal and angles side by side add to 180 degrees",
      hint: "Are the marked angles across from each other or side by side?",
      difficulty: (vertical ? 2 : 3) + (askAngle ? 1 : 0),
      ok: (cand) => {
        const xx = askAngle ? cand.sub(q).div(p) : cand;
        const e1 = F(p).mul(xx).add(q);
        const e2 = F(r).mul(xx).add(s);
        return e1.n > 0 && e2.n > 0 && (vertical ? e1.eq(e2) : e1.add(e2).eq(180));
      },
    };
    return coreDraft(format, { ...core, slips: positive(core.slips) }, figure);
  },
};

export const TEMPLATES: Template[] = [parallelBasic, parallelExpressions, atAPoint];
