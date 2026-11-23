/*
 * m-area-and-perimeter, shapes in a figure: triangles with a height, trapezoids, parallelograms
 * and L-shapes. Each check is the shoelace formula on the shape's true corners.
 */
import { need } from "../core/build";
import { geometry } from "../core/figures";
import { F } from "../core/frac";
import { num } from "../core/tex";
import type { Draft, Template } from "../core/types";
import {
  angle,
  dashedMark,
  label,
  numSlip,
  pt,
  rightMark,
  seg,
  shoelace,
  triple,
  UNITS,
  tx,
  coreDraft,
  type Core,
  type Rng,
} from "./_geo1-common";

const SKILL = "m-area-and-perimeter";

// ---------------------------------------------------------------- shapes in a figure

/** Drawn y size for a true height h against a true width b, kept readable. */
const drawnH = (h: number, b: number) => 10 * Math.min(0.9, Math.max(0.4, h / b));

function triangleFigure(rng: Rng, u: string): { core: Core; fig: Draft["figure"] } {
  if (rng.bool(0.4)) {
    // A right triangle: legs labeled, sometimes the hypotenuse too.
    const withHyp = rng.bool(0.5);
    const [p, q, c] = withHyp ? triple(rng, 60) : [rng.int(3, 40), rng.int(3, 40), 0];
    const [a, b] = rng.bool(0.5) ? [p, q] : [q, p];
    need((a * b) % 2 === 0, "whole area");
    const A = (a * b) / 2;
    const dh = drawnH(a, b);
    const flip = rng.bool(0.5);
    const X = (v: number) => (flip ? 10 - v : v);
    const fig = geometry(
      [
        pt("R", X(0), dh),
        pt("T", X(0), 0),
        pt("B", X(10), dh),
        seg("RT", "R", "T"),
        seg("RB", "R", "B"),
        seg("TB", "T", "B"),
        angle("aR", "R", "B", "T"),
      ],
      [
        label(String(a), "RT"),
        label(String(b), "RB"),
        ...(withHyp ? [label(String(c), "TB")] : []),
      ],
      [rightMark("aR")]
    );
    return {
      fig,
      core: {
        stem: `The right triangle shown has the dimensions given, in ${u}. What is the area, in square ${u}, of the triangle?`,
        answer: F(A),
        slips: [
          numSlip(a * b, "you multiplied the legs but did not take half"),
          ...(withHyp
            ? [
                numSlip(
                  F(a * c, 2),
                  "you used the hypotenuse as one of the two sides; the base and height are the legs"
                ),
                numSlip(a + b + c, "you found the perimeter, not the area"),
              ]
            : [numSlip(a + b, "you added the legs instead of multiplying them")]),
          numSlip(F(a + b, 2), "you averaged the legs instead of multiplying them"),
        ],
        asks: "the area of the right triangle",
        steps: [
          {
            label: "Pick the base and height",
            work: `The legs meet at the right angle, so they are the base and height: ${b} and ${a}`,
          },
          {
            label: "Take half of base times height",
            work: `$A = \\frac{1}{2}(${b})(${a}) = ${num(A)}$ square ${u}`,
          },
        ],
        check: `The triangle is half of a ${b} by ${a} rectangle, whose area is $${num(a * b)}$; half of that is $${num(A)}$`,
        tip: "In a right triangle the two legs are a base and its height, so the area is half their product",
        hint: "Which two sides meet at the right angle?",
        difficulty: withHyp ? 2 : 1,
        ok: (v) =>
          v.eq(
            shoelace([
              [0, 0],
              [b, 0],
              [0, a],
            ])
          ),
      },
    };
  }
  // A triangle with a dashed height and one slanted side labeled.
  const [p, q, s] = triple(rng, 40);
  const [ad, h] = rng.bool(0.5) ? [p, q] : [q, p];
  const db = rng.int(2, 30);
  const b = ad + db;
  need((b * h) % 2 === 0, "whole area");
  const A = (b * h) / 2;
  const sx = 10 / b;
  const dh = drawnH(h, b);
  const fig = geometry(
    [
      pt("A", 0, dh),
      pt("B", 10, dh),
      pt("C", ad * sx, 0),
      pt("D", ad * sx, dh, ["AB"]),
      seg("AB", "A", "B"),
      seg("BC", "B", "C"),
      seg("CA", "C", "A"),
      seg("CD", "C", "D"),
      angle("aD", "D", "B", "C"),
    ],
    [label(String(b), "AB"), label(String(h), "CD"), label(String(s), "CA")],
    [rightMark("aD"), dashedMark("CD")]
  );
  return {
    fig,
    core: {
      stem: `In the triangle shown, the dashed segment is a height of the triangle. The lengths shown are in ${u}. What is the area, in square ${u}, of the triangle?`,
      answer: F(A),
      slips: [
        numSlip(b * h, "you multiplied the base by the height but did not take half"),
        numSlip(
          F(b * s, 2),
          `you used the slanted side, ${s}, as the height; the height meets the base at a right angle`
        ),
        numSlip(b * s, "you multiplied the base by the slanted side and did not take half"),
        numSlip(b + h + s, "you added the lengths instead of finding the area"),
      ],
      asks: "the area of the triangle, using the base and the height drawn to it",
      steps: [
        {
          label: "Pick the base and height",
          work: `The base is ${b}, and the dashed height that meets it at a right angle is ${h}`,
        },
        {
          label: "Take half of base times height",
          work: `$A = \\frac{1}{2}(${b})(${h}) = ${num(A)}$ square ${u}`,
        },
      ],
      check: `The height splits the triangle into two right triangles with areas $\\frac{1}{2}(${ad})(${h})$ and $\\frac{1}{2}(${db})(${h})$, which add to $${num(A)}$`,
      tip: "A triangle's height always meets the base at a right angle; a slanted side is not the height",
      hint: "Which segment meets the base at a right angle?",
      difficulty: rng.pick([2, 3]),
      ok: (v) =>
        v.eq(
          shoelace([
            [0, 0],
            [b, 0],
            [ad, h],
          ])
        ),
    },
  };
}

function quadFigure(rng: Rng, u: string): { core: Core; fig: Draft["figure"] } {
  const [p, q, s] = triple(rng, 30);
  const [e, h] = rng.bool(0.5) ? [p, q] : [q, p];
  const para = rng.bool(0.4);
  const b1 = rng.int(3, 30);
  const g = para ? 0 : rng.int(0, 12);
  const b2 = para ? b1 : e + b1 + g;
  const showSlant = rng.bool(0.6);
  const total = para ? b1 + e : b2;
  const sx = 10 / total;
  const dh = drawnH(h, total);
  const top0 = e * sx;
  const top1 = (e + b1) * sx;
  const bottom1 = b2 * sx;
  const fig = geometry(
    [
      pt("A", 0, dh),
      pt("B", bottom1, dh),
      pt("C", top1, 0),
      pt("D", top0, 0),
      pt("F", top0, dh, ["AB"]),
      seg("AB", "A", "B"),
      seg("BC", "B", "C"),
      seg("CD", "C", "D"),
      seg("DA", "D", "A"),
      seg("DF", "D", "F"),
      angle("aF", "F", "B", "D"),
    ],
    [
      label(String(b2), "AB"),
      ...(para ? [] : [label(String(b1), "CD")]),
      label(String(h), "DF"),
      ...(showSlant ? [label(String(s), "DA")] : []),
    ],
    [rightMark("aF"), dashedMark("DF")]
  );
  const corners: [number, number][] = [
    [0, 0],
    [b2, 0],
    [e + b1, h],
    [e, h],
  ];
  if (para) {
    const A = b1 * h;
    return {
      fig,
      core: {
        stem: `The figure shows a parallelogram and one of its heights (dashed). The lengths shown are in ${u}. What is the area, in square ${u}, of the parallelogram?`,
        answer: F(A),
        slips: [
          ...(showSlant
            ? [numSlip(b1 * s, `you multiplied by the slanted side, ${s}, instead of the height`)]
            : []),
          numSlip(
            F(A, 2),
            "you took half, as for a triangle; a parallelogram's area is base times height"
          ),
          numSlip(2 * (b1 + s), "you found the perimeter, not the area"),
          numSlip(b1 + h, "you added the base and height instead of multiplying them"),
        ],
        asks: "the area of the parallelogram",
        steps: [
          {
            label: "Pick the base and height",
            work: `The base is ${b1}; the height, which meets the base at a right angle, is ${h}`,
          },
          {
            label: "Multiply base by height",
            work: `$A = bh = ${tx(b1, h)} = ${num(A)}$ square ${u}`,
          },
        ],
        check: `Moving the right triangle at one end to the other end makes a ${b1} by ${h} rectangle, with area $${num(A)}$`,
        tip: "A parallelogram's area is base times height, where the height meets the base at a right angle",
        hint: "Which length meets the base at a right angle?",
        difficulty: showSlant ? 3 : 2,
        ok: (v) =>
          v.eq(
            shoelace([
              [0, 0],
              [b1, 0],
              [b1 + e, h],
              [e, h],
            ])
          ),
      },
    };
  }
  const twice = (b1 + b2) * h;
  need(twice % 2 === 0, "whole area");
  const A = twice / 2;
  return {
    fig,
    core: {
      stem: `The figure shows a trapezoid with parallel sides of lengths ${b1} and ${b2} and a height drawn dashed. The lengths shown are in ${u}. What is the area, in square ${u}, of the trapezoid?`,
      answer: F(A),
      slips: [
        numSlip(twice, "you added the bases and multiplied by the height but did not take half"),
        numSlip(b2 * h, "you used only the longer base, as if the shape were a rectangle"),
        ...(showSlant
          ? [numSlip(F((b1 + b2) * s, 2), `you used the slanted side, ${s}, instead of the height`)]
          : []),
        numSlip(b1 * h, "you used only the shorter base"),
        numSlip(
          F(b2 * h, 2),
          "you took half of the longer base times the height, as for a triangle"
        ),
      ],
      asks: "the area of the trapezoid",
      steps: [
        {
          label: "Average the parallel sides",
          work: `$\\frac{${b1} + ${b2}}{2} = ${num(F(b1 + b2, 2))}$`,
        },
        {
          label: "Multiply by the height",
          work: `$A = ${num(F(b1 + b2, 2))} \\times ${h} = ${num(A)}$ square ${u}`,
        },
      ],
      check: `Cutting along the heights gives triangles and a rectangle: $\\frac{1}{2}(${e})(${h}) + ${tx(b1, h)}${g ? ` + \\frac{1}{2}(${g})(${h})` : ""} = ${num(A)}$`,
      tip: "A trapezoid's area is the average of the two parallel sides times the height",
      hint: "Use the two parallel sides and the dashed height.",
      difficulty: showSlant ? rng.pick([3, 4]) : 3,
      ok: (v) => v.eq(shoelace(corners)),
    },
  };
}

function lShapeFigure(rng: Rng, u: string): { core: Core; fig: Draft["figure"] } {
  const A = rng.int(8, 40);
  const B = rng.int(6, 30);
  const a = rng.int(2, A - 3);
  const b = rng.int(2, B - 3);
  const labelsOuter = rng.bool(0.6);
  const area = rng.bool(0.6);
  const dw = 10;
  const dhh = 10 * Math.min(1.1, Math.max(0.55, B / A));
  const nx = (a / A) * dw;
  const ny = (b / B) * dhh;
  const fx = rng.bool(0.5);
  const X = (v: number) => (fx ? dw - v : v);
  const fig = geometry(
    [
      pt("P1", X(0), 0),
      pt("P2", X(dw - nx), 0),
      pt("P3", X(dw - nx), ny),
      pt("P4", X(dw), ny),
      pt("P5", X(dw), dhh),
      pt("P6", X(0), dhh),
      seg("s12", "P1", "P2"),
      seg("s23", "P2", "P3"),
      seg("s34", "P3", "P4"),
      seg("s45", "P4", "P5"),
      seg("s56", "P5", "P6"),
      seg("s61", "P6", "P1"),
    ],
    labelsOuter
      ? [
          label(String(A), "s56"),
          label(String(B), "s61"),
          label(String(A - a), "s12"),
          label(String(B - b), "s45"),
        ]
      : [
          label(String(A), "s56"),
          label(String(B), "s61"),
          label(String(a), "s34"),
          label(String(b), "s23"),
        ],
    [],
    true
  );
  const corners: [number, number][] = [
    [0, 0],
    [A - a, 0],
    [A - a, b],
    [A, b],
    [A, B],
    [0, B],
  ];
  const stem = `In the figure shown, all angles are right angles, and the lengths are in ${u}. What is the ${area ? `area, in square ${u},` : `perimeter, in ${u},`} of the figure?`;
  const findNotch = labelsOuter
    ? [
        {
          label: "Find the missing corner",
          work: `The cut-out corner is $${A} - ${A - a} = ${a}$ wide and $${B} - ${B - b} = ${b}$ tall`,
        },
      ]
    : [];
  const labeledSum = labelsOuter ? A + B + (A - a) + (B - b) : A + B + a + b;
  if (area) {
    const ans = A * B - a * b;
    return {
      fig,
      core: {
        stem,
        answer: F(ans),
        slips: [
          numSlip(
            A * B,
            "you found the area of the whole rectangle and did not subtract the missing corner"
          ),
          numSlip(A * B - 2 * a * b, "you subtracted the missing corner twice"),
          numSlip(2 * (A + B), "you found the perimeter, not the area"),
          numSlip(labeledSum, "you added the labeled lengths instead of finding the area"),
        ],
        asks: "the area of the L-shaped figure",
        steps: [
          ...findNotch,
          { label: "Find the full rectangle's area", work: `$${tx(A, B)} = ${num(A * B)}$` },
          {
            label: "Subtract the missing corner",
            work: `$${num(A * B)} - ${tx(a, b)} = ${num(ans)}$ square ${u}`,
          },
        ],
        check: `Cutting the figure into two rectangles instead gives $${tx(A - a, B)} + ${tx(a, B - b)} = ${num((A - a) * B)} + ${num(a * (B - b))} = ${num(ans)}$`,
        tip: "For an L-shape, find the area of the full rectangle and subtract the missing corner, or cut it into two rectangles",
        hint: "Picture the full rectangle the shape fits in.",
        difficulty: labelsOuter ? 4 : 3,
        ok: (v) => v.eq(shoelace(corners)),
      },
    };
  }
  const per = 2 * (A + B);
  const unlabeled = labelsOuter ? a + b : A - a + (B - b);
  return {
    fig,
    core: {
      stem,
      answer: F(per),
      slips: [
        numSlip(labeledSum, "you added only the labeled sides and left out the two unlabeled ones"),
        numSlip(A * B - a * b, "you found the area, not the perimeter"),
        numSlip(
          per - 2 * (a + b),
          "you subtracted the corner's sides; the two inner sides replace the missing pieces of the edge"
        ),
        numSlip(
          per + a + b,
          "you added the corner's sides on top of the full rectangle's perimeter"
        ),
      ],
      asks: "the perimeter of the L-shaped figure: the distance around all six sides",
      steps: [
        {
          label: "Find the unlabeled sides",
          work: labelsOuter
            ? `The inner sides are $${A} - ${A - a} = ${a}$ and $${B} - ${B - b} = ${b}$`
            : `The top is $${A} - ${a} = ${A - a}$ and the short side is $${B} - ${b} = ${B - b}$`,
        },
        {
          label: "Add all six sides",
          work: `$${labeledSum} + ${unlabeled} = ${per}$ ${u}`,
        },
      ],
      check: `The horizontal sides add to $2(${A})$ and the vertical sides to $2(${B})$, the same as a full ${A} by ${B} rectangle: $${per}$`,
      tip: "For a shape with only right angles, the horizontal sides on top add to the bottom side, and the same goes for the vertical sides",
      hint: "Find the two sides that have no label.",
      difficulty: labelsOuter ? 5 : 4,
      ok: (v) => v.eq(per),
    },
  };
}

export const figureArea: Template = {
  id: "area.figure",
  skill: SKILL,
  label:
    "Area or perimeter of a shape in a figure: triangles, trapezoids, parallelograms, L-shapes",
  difficulty: [1, 5],
  formats: ["mc", "spr"],
  make(rng, format) {
    const u = rng.pick(UNITS).many;
    const kind = rng.pick(["triangle", "triangle", "quad", "quad", "l", "l"] as const);
    const { core, fig } =
      kind === "triangle"
        ? triangleFigure(rng, u)
        : kind === "quad"
          ? quadFigure(rng, u)
          : lShapeFigure(rng, u);
    return coreDraft(format, core, fig);
  },
};
