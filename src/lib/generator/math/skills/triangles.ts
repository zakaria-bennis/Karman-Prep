/*
 * m-triangles: angle sums, similar triangles and the triangle inequality. Item models after the
 * bank's questions for this skill: a missing angle (two angles given, isosceles, an exterior
 * angle, an angle written as an expression), similar triangles (corresponding sides in words, a
 * segment parallel to a side in a figure, dilations, perimeter and area ratios), and the
 * possible lengths of a third side. Each check substitutes back, cross-multiplies, or tests the
 * three inequalities one by one.
 */
import type { Label, Mark, Part } from "@/lib/figures/engine/spec";
import { need } from "../core/build";
import { geometry } from "../core/figures";
import { F, gcd } from "../core/frac";
import { num } from "../core/tex";
import type { Draft, Slip, Template } from "../core/types";
import {
  angle,
  type Core,
  coreDraft,
  deg,
  degLabel,
  label,
  numSlip,
  parallelMark,
  polygon,
  pt,
  type Rng,
  seg,
  tickMark,
  TRIANGLE_NAMES,
  TRIANGLE_PAIRS,
  UNITS,
} from "./_geo1-common";
import { inequality } from "./_geo1-tri-inequality";

const SKILL = "m-triangles";

/** Angle measures and lengths are positive, so a slip that gives zero or less is no choice. */
const positive = (slips: Slip[]) => slips.filter((s) => (s.value?.toNumber() ?? 1) > 0);

const rad = (d: number) => (d * Math.PI) / 180;

/** Corners of a triangle drawn with its true angles at A (left) and B (right), base 10 long. */
function corners(
  aDeg: number,
  bDeg: number
): { A: [number, number]; B: [number, number]; C: [number, number] } {
  const cDeg = 180 - aDeg - bDeg;
  const ac = (10 * Math.sin(rad(bDeg))) / Math.sin(rad(cDeg));
  const C: [number, number] = [ac * Math.cos(rad(aDeg)), -ac * Math.sin(rad(aDeg))];
  return { A: [0, 0], B: [10, 0], C };
}

// ---------------------------------------------------------------- missing angles

function angleCore(rng: Rng, format: "mc" | "spr"): { core: Core; figure?: Draft["figure"] } {
  const [nA, nB, nC] = rng.pick(TRIANGLE_NAMES);
  const mode = rng.pick([
    "two",
    "two",
    "isoVertex",
    "isoBase",
    "exterior",
    "exterior",
    "half",
  ] as const);
  const v = rng.pick(["x", "y", "w", "z"]);
  if (mode === "two" || mode === "half") {
    const a = rng.int(20, 110);
    const b = rng.int(20, 150 - a);
    const c = 180 - a - b;
    need(c >= 15, "room for the third angle");
    const half = mode === "half";
    const useFig = !half && rng.bool(0.5) && Math.min(a, b, c) >= 28;
    let figure: Draft["figure"] | undefined;
    if (useFig) {
      const { A, B, C } = corners(a, b);
      figure = geometry(
        [
          pt("A", ...A),
          pt("B", ...B),
          pt("C", ...C),
          polygon("T", ["A", "B", "C"]),
          angle("gA", "A", "B", "C"),
          angle("gB", "B", "C", "A"),
          angle("gC", "C", "A", "B"),
        ],
        [
          label(nA, "A"),
          label(nB, "B"),
          label(nC, "C"),
          label(degLabel(a), "gA"),
          label(degLabel(b), "gB"),
          label(degLabel(v), "gC"),
        ]
      );
    }
    const target = half ? 2 * c : c;
    return {
      figure,
      core: {
        stem: half
          ? `In triangle $${nA}${nB}${nC}$, the measure of angle $${nA}$ is $${deg(a)}$, the measure of angle $${nB}$ is $${deg(b)}$, and the measure of angle $${nC}$ is $\\left(\\frac{k}{2}\\right)^\\circ$. What is the value of $k$?`
          : useFig
            ? `In triangle $${nA}${nB}${nC}$ shown, what is the value of $${v}$?`
            : `In triangle $${nA}${nB}${nC}$, the measure of angle $${nA}$ is $${deg(a)}$ and the measure of angle $${nB}$ is $${deg(b)}$. What is the measure, in degrees, of angle $${nC}$?`,
        answer: F(target),
        slips: half
          ? [
              numSlip(c, `you found the measure of angle ${nC}, which is half of k`),
              numSlip(F(c, 2), "you halved the angle instead of doubling it"),
              numSlip(
                2 * (180 - a),
                "you subtracted only one of the given angles from 180 before doubling"
              ),
              numSlip(a + b, "you added the two given angles and stopped"),
            ]
          : [
              numSlip(a + b, "you added the two given angles and stopped"),
              numSlip(180 - a, "you subtracted only one of the given angles from 180"),
              numSlip(360 - a - b, "you used 360 degrees, the angle sum of a quadrilateral"),
              numSlip(180 - b, "you subtracted only one of the given angles from 180"),
            ],
        asks: half
          ? `the value of k, where angle ${nC} measures half of k degrees`
          : `the measure of the third angle`,
        steps: [
          { label: "Use the angle sum", work: `The angles of a triangle add to $${deg(180)}$` },
          { label: "Find the third angle", work: `$180 - ${a} - ${b} = ${c}$` },
          ...(half ? [{ label: "Find k", work: `$\\frac{k}{2} = ${c}$, so $k = ${2 * c}$` }] : []),
        ],
        check: `$${a} + ${b} + ${c} = 180$`,
        tip: "The three angles of any triangle add to 180 degrees",
        hint: "What do the three angles of a triangle add to?",
        difficulty: (half ? 2 : 1) + (format === "spr" ? 1 : 0),
        ok: (cand) => (half ? cand.div(2) : cand).add(a + b).eq(180),
      },
    };
  }
  if (mode === "isoVertex" || mode === "isoBase") {
    const base = rng.int(20, 80);
    const vertex = 180 - 2 * base;
    const askBase = mode === "isoVertex";
    const useFig = rng.bool(0.6) && base >= 28 && vertex >= 28;
    let figure: Draft["figure"] | undefined;
    if (useFig) {
      const { A, B, C } = corners(base, base);
      const parts: Part[] = [
        pt("A", ...A),
        pt("B", ...B),
        pt("C", ...C),
        seg("AB", "A", "B"),
        seg("BC", "B", "C"),
        seg("CA", "C", "A"),
        angle("gA", "A", "B", "C"),
        angle("gC", "C", "A", "B"),
      ];
      const labels: Label[] = [
        label(nA, "A"),
        label(nB, "B"),
        label(nC, "C"),
        label(askBase ? degLabel(v) : degLabel(base), "gA"),
        label(askBase ? degLabel(vertex) : degLabel(v), "gC"),
      ];
      const marks: Mark[] = [tickMark(["BC", "CA"])];
      figure = geometry(parts, labels, marks);
    }
    const given = askBase ? vertex : base;
    const ans = askBase ? base : vertex;
    const what = askBase ? `angle $${nA}$` : `angle $${nC}$`;
    return {
      figure,
      core: {
        stem: useFig
          ? `In the triangle shown, $${nA}${nC} = ${nB}${nC}$. What is the value of $${v}$?`
          : `In triangle $${nA}${nB}${nC}$, $${nA}${nC} = ${nB}${nC}$, and the measure of angle $${askBase ? nC : nA}$ is $${deg(given)}$. What is the measure, in degrees, of ${what}?`,
        answer: F(ans),
        slips: askBase
          ? [
              numSlip(180 - vertex, "you found the sum of the two base angles, not one of them"),
              numSlip(vertex, "you assumed all three angles are equal"),
              numSlip(F(vertex, 2), "you halved the given angle instead of what is left"),
              numSlip(90 - vertex, "you subtracted from 90 instead of 180"),
            ]
          : [
              numSlip(180 - base, "you subtracted only one base angle from 180"),
              numSlip(base, "you assumed all three angles are equal"),
              numSlip(
                F(180 - base, 2),
                "you treated the given angle as the angle between the equal sides"
              ),
              numSlip(90 - base, "you subtracted from 90 instead of 180"),
            ],
        asks: `the measure of ${what}`,
        steps: [
          {
            label: "Find the equal angles",
            work: `Sides $${nA}${nC}$ and $${nB}${nC}$ are equal, so the angles across from them, at $${nB}$ and $${nA}$, are equal`,
          },
          askBase
            ? {
                label: "Split what is left",
                work: `$180 - ${vertex} = ${2 * base}$ for the two equal angles, so each is $${2 * base} \\div 2 = ${base}$`,
              }
            : {
                label: "Subtract both equal angles",
                work: `$180 - ${base} - ${base} = ${vertex}$`,
              },
        ],
        check: `$${base} + ${base} + ${vertex} = 180$`,
        tip: "In an isosceles triangle, the angles across from the equal sides are equal",
        hint: "Which two angles are equal, and where are they?",
        difficulty: (askBase ? 3 : 2) + (format === "spr" ? 1 : 0),
        ok: (cand) => (askBase ? cand.mul(2).add(vertex) : cand.add(2 * base)).eq(180),
      },
    };
  }
  // Exterior angle: side AB extended past B to D.
  const a = rng.int(28, 90);
  const c = rng.int(28, 150 - a);
  const b = 180 - a - c;
  need(b >= 25, "room at B");
  const ext = a + c;
  const askExt = rng.bool(0.5);
  const { A, B, C } = corners(a, b);
  const nD = rng.pick(["D", "S", "E"].filter((n) => ![nA, nB, nC].includes(n)));
  const figure = geometry(
    [
      pt("A", ...A),
      pt("B", ...B, ["AD"]),
      pt("C", ...C),
      pt("D", 14, 0),
      seg("AD", "A", "D"),
      seg("BC", "B", "C"),
      seg("CA", "C", "A"),
      angle("gA", "A", "B", "C"),
      angle("gC", "C", "A", "B"),
      angle("gE", "B", "D", "C"),
    ],
    [
      label(nA, "A"),
      label(nB, "B"),
      label(nC, "C"),
      label(nD, "D"),
      label(degLabel(a), "gA"),
      label(askExt ? degLabel(c) : degLabel(v), "gC"),
      label(askExt ? degLabel(v) : degLabel(ext), "gE"),
    ]
  );
  const ans = askExt ? ext : c;
  return {
    figure,
    core: {
      stem: `In the figure, side $${nA}${nB}$ of triangle $${nA}${nB}${nC}$ is extended to point $${nD}$. What is the value of $${v}$?`,
      answer: F(ans),
      slips: askExt
        ? [
            numSlip(
              b,
              `you found the angle inside the triangle at $${nB}$, not the exterior angle`
            ),
            numSlip(
              180 - a,
              "you subtracted one angle from 180 instead of adding the two far angles"
            ),
            numSlip(360 - a - c, "you subtracted from 360"),
            numSlip(Math.abs(c - a), "you subtracted the two far angles instead of adding them"),
          ]
        : [
            numSlip(180 - ext, `you found the angle inside the triangle at $${nB}$`),
            numSlip(ext + a, "you added the given angles instead of subtracting"),
            numSlip(180 - c, "you subtracted the wrong angle from 180"),
            numSlip(F(ext, 2), "you split the exterior angle in half"),
          ],
      asks: askExt
        ? "the measure of the exterior angle"
        : "the measure of the angle inside the triangle at the top",
      steps: [
        {
          label: "Find the angle at the base",
          work: `The angle inside the triangle at $${nB}$ and the exterior angle form a linear pair, so the inside angle is $${askExt ? `180 - ${v}` : `180 - ${ext} = ${b}`}$`,
        },
        askExt
          ? {
              label: "Use the exterior angle rule",
              work: `An exterior angle equals the sum of the two far inside angles: $${v} = ${a} + ${c} = ${ext}$`,
            }
          : { label: "Use the angle sum", work: `$${v} = 180 - ${a} - ${b} = ${c}$` },
      ],
      check: askExt
        ? `The inside angle at $${nB}$ is $180 - ${ext} = ${b}$, and $${a} + ${c} + ${b} = 180$`
        : `By the exterior angle rule, $${a} + ${c} = ${ext}$`,
      tip: "An exterior angle of a triangle equals the sum of the two inside angles that are not next to it",
      hint: "Find the angle inside the triangle next to the exterior angle first.",
      difficulty: (askExt ? 3 : 4) + (format === "spr" ? 1 : 0),
      ok: (cand) => {
        const inside = askExt ? F(180).sub(cand) : F(180 - ext);
        const top = askExt ? F(c) : cand;
        return inside.add(top).add(a).eq(180);
      },
    },
  };
}

export const missingAngle: Template = {
  id: "tri.missing-angle",
  skill: SKILL,
  label: "A missing angle: the angle sum, isosceles triangles, exterior angles",
  difficulty: [1, 5],
  formats: ["mc", "spr"],
  make(rng, format) {
    const { core, figure } = angleCore(rng, format);
    return coreDraft(format, { ...core, slips: positive(core.slips) }, figure);
  },
};

// ---------------------------------------------------------------- similar triangles

function similarCore(rng: Rng, format: "mc" | "spr"): { core: Core; figure?: Draft["figure"] } {
  const mode = rng.pick([
    "words",
    "words",
    "parallel",
    "parallel",
    "dilation",
    "perimeter",
    "area",
  ] as const);
  const u = rng.pick(UNITS).many;
  if (mode === "words") {
    const [P, Q] = rng.pick(TRIANGLE_PAIRS);
    const s1 = rng.int(3, 40);
    const s2 = rng.int(3, 40);
    need(s1 !== s2, "different sides");
    const f = rng.pick([F(2), F(3), F(4), F(5), F(6), F(10), F(3, 2), F(5, 2), F(4, 3)]);
    const AB = f.mul(s1);
    const BC = f.mul(s2);
    need(AB.isInt() && BC.isInt(), "whole sides");
    const flip = rng.bool(0.5); // ask for the larger triangle's side instead
    const [big, small] = flip ? [Q, P] : [P, Q];
    const side = (t: string, i: number, j: number) => `${t[i]}${t[j]}`;
    const known1 = side(big, 0, 1);
    const known2 = side(big, 1, 2);
    const given = side(small, 1, 2);
    const asked = side(small, 0, 1);
    return {
      core: {
        stem: `Triangle $${big}$ is similar to triangle $${small}$, where $${big[0]}$, $${big[1]}$, and $${big[2]}$ correspond to $${small[0]}$, $${small[1]}$, and $${small[2]}$, respectively. In triangle $${big}$, $${known1} = ${num(AB)}$ and $${known2} = ${num(BC)}$. In triangle $${small}$, $${given} = ${s2}$. What is the length of $\\overline{${asked}}$?`,
        answer: F(s1),
        slips: [
          numSlip(
            F(s2 * s2, s1),
            `you paired $${given}$ with $${known1}$; $${given}$ corresponds to $${known2}$`
          ),
          numSlip(f.mul(f).mul(s1), "you multiplied by the scale factor instead of dividing by it"),
          numSlip(
            AB.sub(BC.sub(s2)),
            "you subtracted the same amount from each side instead of scaling"
          ),
          numSlip(s2, "you assumed the two sides are equal"),
        ].filter((sl) => (sl.value?.toNumber() ?? 1) > 0),
        asks: `the length of side ${asked} in the smaller triangle`,
        steps: [
          {
            label: "Match the sides",
            work: `$${known1}$ corresponds to $${asked}$, and $${known2}$ corresponds to $${given}$`,
          },
          {
            label: "Write a proportion",
            work: `$\\frac{${asked}}{${num(AB)}} = \\frac{${s2}}{${num(BC)}}$`,
          },
          {
            label: `Solve for ${asked}`,
            work: `$${asked} = ${num(AB)} \\times \\frac{${s2}}{${num(BC)}} = ${s1}$`,
          },
        ],
        check: `Cross-multiplying, $${s1} \\times ${num(BC)} = ${num(F(s1).mul(BC))}$ and $${num(AB)} \\times ${s2} = ${num(AB.mul(s2))}$, which match`,
        tip: "Match corresponding sides by the order of the letters, then set up a proportion",
        hint: "Which side of the second triangle matches each side of the first?",
        difficulty: rng.pick([2, 3]) + (format === "spr" ? 1 : 0),
        ok: (cand) => cand.mul(BC).eq(AB.mul(s2)),
      },
    };
  }
  if (mode === "parallel") {
    const [nA, nB, nC] = rng.pick(TRIANGLE_NAMES);
    const others = ["D", "E", "M", "N", "P", "Q", "U", "V"].filter(
      (n) => ![nA, nB, nC].includes(n)
    );
    const [nD, nE] = rng.sample(others, 2).sort();
    const ad = rng.int(2, 20);
    const db = rng.int(2, 20);
    // BC = DE(AD + DB)/AD is whole when DE is a multiple of AD over the common factor.
    const q = ad / gcd(ad, ad + db);
    const de = q * rng.int(1, Math.max(1, Math.floor(40 / q)));
    need(de !== ad, "a less trivial proportion");
    const bc = (de * (ad + db)) / ad;
    const t = Math.min(0.75, Math.max(0.3, ad / (ad + db)));
    const apexX = rng.int(3, 7);
    const A: [number, number] = [apexX, 0];
    const B: [number, number] = [0, 7];
    const C: [number, number] = [10, 7];
    const lerp = (p: [number, number], q: [number, number]): [number, number] => [
      p[0] + (q[0] - p[0]) * t,
      p[1] + (q[1] - p[1]) * t,
    ];
    const figure = geometry(
      [
        pt("A", ...A),
        pt("B", ...B),
        pt("C", ...C),
        pt("D", ...lerp(A, B)),
        pt("E", ...lerp(A, C)),
        seg("AD", "A", "D"),
        seg("DB", "D", "B"),
        seg("AE", "A", "E"),
        seg("EC", "E", "C"),
        seg("BC", "B", "C"),
        seg("DE", "D", "E"),
      ],
      [
        label(nA, "A"),
        label(nB, "B"),
        label(nC, "C"),
        label(nD, "D"),
        label(nE, "E"),
        label(String(ad), "AD"),
        label(String(db), "DB"),
        label(String(de), "DE"),
      ],
      [parallelMark(["DE", "BC"])]
    );
    return {
      figure,
      core: {
        stem: `In the figure, $\\overline{${nD}${nE}}$ is parallel to $\\overline{${nB}${nC}}$. What is the length of $\\overline{${nB}${nC}}$?`,
        answer: F(bc),
        slips: [
          numSlip(
            F(de * db, ad),
            `you used $${nD}${nB}$ instead of the whole side $${nA}${nB}$ in the proportion`
          ),
          numSlip(de + db, "you added instead of scaling"),
          numSlip(F(de * ad, ad + db), "you turned the ratio upside down"),
          numSlip(de, "you assumed the parallel segments are equal"),
        ],
        asks: `the length of the base ${nB}${nC} of the large triangle`,
        steps: [
          {
            label: "Spot the similar triangles",
            work: `Because $${nD}${nE}$ is parallel to $${nB}${nC}$, triangle $${nA}${nD}${nE}$ is similar to triangle $${nA}${nB}${nC}$ (they share angle $${nA}$ and have equal corresponding angles)`,
          },
          { label: "Find the whole side", work: `$${nA}${nB} = ${ad} + ${db} = ${ad + db}$` },
          {
            label: "Write a proportion",
            work: `$\\frac{${nB}${nC}}{${de}} = \\frac{${ad + db}}{${ad}}$, so $${nB}${nC} = ${num(bc)}$`,
          },
        ],
        check: `The extra length of $${nB}${nC}$ beyond $${nD}${nE}$ compares to $${nD}${nE}$ as $${nD}${nB}$ compares to $${nA}${nD}$: $\\frac{${num(bc)} - ${de}}{${de}} = \\frac{${num(bc - de)}}{${de}}$, and $${num(bc - de)} \\times ${ad} = ${de} \\times ${db}$`,
        tip: "A segment parallel to one side of a triangle cuts off a smaller triangle similar to the whole one; compare whole sides, not pieces",
        hint: `Compare the small triangle at $${nA}$ with the whole triangle.`,
        difficulty: rng.pick([3, 4]) + (format === "spr" ? 1 : 0),
        ok: (cand) =>
          cand
            .sub(de)
            .mul(ad)
            .eq(de * db),
      },
    };
  }
  if (mode === "dilation") {
    const k = rng.int(2, 9);
    const s = rng.int(3, 50);
    const [nA, nB, nC] = rng.pick(TRIANGLE_NAMES);
    return {
      core: {
        stem: `Triangle $${nA}${nB}${nC}$ is dilated by a scale factor of ${k} to form triangle $${nA}'${nB}'${nC}'$. If the length of $\\overline{${nA}${nB}}$ is ${s}, what is the length of $\\overline{${nA}'${nB}'}$?`,
        answer: F(s * k),
        slips: [
          numSlip(s + k, "you added the scale factor instead of multiplying by it"),
          numSlip(F(s, k), "you divided by the scale factor"),
          numSlip(s * k * k, "you squared the scale factor, which is how areas change"),
          numSlip(k, "you gave the scale factor, not the length"),
        ],
        asks: "the length of the image of the side after the dilation",
        steps: [
          {
            label: "Multiply by the scale factor",
            work: `Every length is multiplied by ${k}: $${s} \\times ${k} = ${s * k}$`,
          },
        ],
        check: `$${s * k} \\div ${s} = ${k}$, the scale factor`,
        tip: "A dilation multiplies every length by the scale factor and keeps every angle the same",
        hint: "What does a scale factor do to each length?",
        difficulty: 1 + (format === "spr" ? 1 : 0),
        ok: (cand) => cand.div(s).eq(k),
      },
    };
  }
  const [P, Q] = rng.pick(TRIANGLE_PAIRS);
  if (mode === "perimeter") {
    const k = rng.pick([F(2), F(3), F(4), F(5), F(3, 2), F(5, 2), F(4, 3), F(5, 3)]);
    const p1 = rng.int(6, 60);
    const s1 = rng.int(2, Math.max(3, Math.floor(p1 / 2) - 1));
    const p2 = k.mul(p1);
    const s2 = k.mul(s1);
    need(p2.isInt() && s2.isInt(), "whole numbers");
    const side1 = `${P[0]}${P[1]}`;
    const side2 = `${Q[0]}${Q[1]}`;
    return {
      core: {
        stem: `Triangles $${P}$ and $${Q}$ are similar, and $\\overline{${side1}}$ corresponds to $\\overline{${side2}}$. The perimeter of triangle $${P}$ is ${p1} ${u}, and the perimeter of triangle $${Q}$ is ${num(p2)} ${u}. If $${side1} = ${s1}$ ${u}, what is $${side2}$, in ${u}?`,
        answer: s2,
        slips: [
          numSlip(F(s1).div(k), "you turned the ratio of the perimeters upside down"),
          numSlip(p2.sub(p1).add(s1), "you added the difference in perimeters to the side"),
          numSlip(k.mul(k).mul(s1), "you squared the ratio, which is how areas compare"),
          numSlip(F(s1), "you assumed corresponding sides are equal"),
        ],
        asks: `the length of side ${side2}`,
        steps: [
          {
            label: "Find the scale factor",
            work: `Perimeters of similar triangles compare like their sides: $\\frac{${num(p2)}}{${p1}} = ${num(k)}$`,
          },
          {
            label: "Scale the side",
            work: `$${side2} = ${s1} \\times ${num(k)} = ${num(s2)}$ ${u}`,
          },
        ],
        check: `$\\frac{${num(s2)}}{${s1}} = \\frac{${num(p2)}}{${p1}}$ because $${num(s2)} \\times ${p1} = ${s1} \\times ${num(p2)}$`,
        tip: "The perimeters of similar triangles have the same ratio as their corresponding sides",
        hint: "How many times larger is one perimeter than the other?",
        difficulty: rng.pick([3, 4]),
        ok: (cand) => cand.mul(p1).eq(p2.mul(s1)),
      },
    };
  }
  const k = rng.int(2, 6);
  const A = rng.int(10, 300);
  need(format === "mc" || F(A, k * k).isInt() || `${A}/${k * k}`.length <= 5, "fits the box");
  return {
    core: {
      stem: `Triangles $${P}$ and $${Q}$ are similar. Each side length of triangle $${P}$ is ${k} times the corresponding side length of triangle $${Q}$. The area of triangle $${P}$ is ${A} square ${u}. What is the area, in square ${u}, of triangle $${Q}$?`,
      answer: F(A, k * k),
      slips: [
        numSlip(F(A, k), "you divided by the scale factor; areas compare by its square"),
        numSlip(A * k * k, "you multiplied instead of dividing; triangle Q is the smaller one"),
        numSlip(F(A, 2 * k), "you divided by twice the scale factor instead of its square"),
        numSlip(F(A, k ** 3), "you divided by the cube of the scale factor, as for volume"),
      ],
      asks: `the area of the smaller triangle, ${Q}`,
      steps: [
        {
          label: "Find the area factor",
          work: `Sides compare as ${k} to 1, so areas compare as $${k}^2 = ${k * k}$ to 1`,
        },
        {
          label: "Scale the area down",
          work: `$${A} \\div ${k * k} = ${num(F(A, k * k))}$ square ${u}`,
        },
      ],
      check: `Multiplying back, $${num(F(A, k * k))} \\times ${k * k} = ${A}$`,
      tip: "When corresponding sides compare as k to 1, areas compare as k squared to 1",
      hint: "If each side is k times as long, how many times as large is the area?",
      difficulty: rng.pick([4, 5]),
      ok: (cand) => cand.mul(k * k).eq(A),
    },
  };
}

export const similar: Template = {
  id: "tri.similar",
  skill: SKILL,
  label:
    "Similar triangles: corresponding sides, a parallel segment, dilations, perimeter and area ratios",
  difficulty: [1, 5],
  formats: ["mc", "spr"],
  make(rng, format) {
    const { core, figure } = similarCore(rng, format);
    return coreDraft(format, core, figure);
  },
};

export const TEMPLATES: Template[] = [missingAngle, similar, inequality];
