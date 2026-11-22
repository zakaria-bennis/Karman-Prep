/*
 * m-area-and-perimeter: flat shapes, including composite ones. Item models after the bank's own
 * questions for this skill: rectangles and squares from words (area, perimeter, a missing side),
 * shapes in a figure (triangles with a height, trapezoids, parallelograms, L-shapes), and scaling
 * (area grows by the square of the scale factor; similar prisms, volume by its cube).
 * Every check recomputes the answer another way: dividing back, the shoelace formula on the
 * shape's true corners, or cross-multiplied ratios.
 */
import { need } from "../core/build";
import { F } from "../core/frac";
import { num } from "../core/tex";
import type { Template } from "../core/types";
import {
  numSlip,
  pn,
  RECT_OBJECTS,
  unitNamed,
  UNITS,
  tx,
  coreDraft,
  TIP_AREA_PERIM,
  type Core,
  type Rng,
} from "./_geo1-common";
import { figureArea } from "./_geo1-area-figure";
import { scaling } from "./_geo1-area-scale";

const SKILL = "m-area-and-perimeter";

/** "rectangle" / "the rectangle" or "rectangular garden" / "the garden", with fitting units. */
function rectSubject(rng: Rng) {
  if (rng.bool(0.5)) {
    return { what: "rectangle", the: "the rectangle", u: rng.pick(UNITS).many };
  }
  const o = rng.pick(RECT_OBJECTS);
  return {
    what: `rectangular ${o.noun}`,
    the: `the ${o.noun}`,
    u: unitNamed(rng.pick(o.units)).many,
  };
}

// ---------------------------------------------------------------- rectangles and squares in words

function rectFromSides(rng: Rng): Core {
  const s = rectSubject(rng);
  const u = s.u;
  const longer = rng.bool(0.5);
  const W = rng.int(2, 30);
  const d = rng.int(3, 50);
  const L = longer ? W + d : rng.int(W + 1, 60);
  const A = L * W;
  const P = 2 * (L + W);
  const area = rng.bool(0.6);
  const given = longer
    ? rng.pick([
        `The width of a ${s.what} is ${W} ${u}, and its length is ${d} ${u} greater than its width.`,
        `A ${s.what} is ${W} ${u} wide. Its length is ${d} ${u} more than its width.`,
      ])
    : `A ${s.what} has a length of ${L} ${u} and a width of ${W} ${u}.`;
  const ask = area
    ? `What is the area, in square ${u}, of ${s.the}?`
    : `What is the perimeter, in ${u}, of ${s.the}?`;
  const lengthStep = longer
    ? [
        {
          label: "Find the length",
          work: `The length is ${d} more than the width: $${W} + ${d} = ${L}$`,
        },
      ]
    : [];
  if (area) {
    return {
      stem: `${given} ${ask}`,
      answer: F(A),
      slips: [
        numSlip(P, "you found the perimeter, not the area"),
        ...(longer
          ? [
              numSlip(
                W * d,
                `you multiplied the width by ${d}, but the length is ${W} + ${d}, not ${d}`
              ),
              numSlip(L, "you found the length, not the area"),
            ]
          : []),
        numSlip(L + W, "you added the length and the width instead of multiplying them"),
        numSlip(
          2 * A,
          "you doubled the product, mixing the area formula with the perimeter formula"
        ),
      ],
      asks: `the area of ${s.the}: the square ${u} inside it`,
      steps: [
        ...lengthStep,
        {
          label: "Multiply length by width",
          work: `$A = \\ell w = ${tx(L, W)} = ${num(A)}$ square ${u}`,
        },
      ],
      check: `Dividing $${num(A)}$ by the width, $${W}$, gives back the length, $${L}$`,
      tip: TIP_AREA_PERIM,
      hint: longer
        ? "Find the length first, then use length times width."
        : "The area of a rectangle is length times width.",
      difficulty: longer ? rng.pick([1, 2]) : 1,
      ok: (v) => v.div(W).eq(L),
    };
  }
  return {
    stem: `${given} ${ask}`,
    answer: F(P),
    slips: [
      numSlip(A, "you found the area, not the perimeter"),
      numSlip(L + W, "you added one length and one width; a rectangle has two of each"),
      ...(longer
        ? [numSlip(2 * (W + d), `you used ${d} as the length; the length is ${W} + ${d}`)]
        : []),
      numSlip(2 * L + W, "you left out one of the two widths"),
      numSlip(4 * L, "you used the length for all four sides"),
    ],
    asks: `the perimeter of ${s.the}: the distance around all four sides`,
    steps: [
      ...lengthStep,
      {
        label: "Add all four sides",
        work: `$P = 2\\ell + 2w = 2(${L}) + 2(${W}) = ${num(P)}$ ${u}`,
      },
    ],
    check: `Half the perimeter is $${L + W}$, and taking away the width, $${W}$, leaves the length, $${L}$`,
    tip: TIP_AREA_PERIM,
    hint: "A rectangle has two lengths and two widths.",
    difficulty: longer ? 2 : 1,
    ok: (v) => v.div(2).sub(W).eq(L),
  };
}

function squareSide(rng: Rng): Core {
  const u = rng.pick(UNITS).many;
  const s = rng.int(3, 30);
  const mode = rng.pick(["area", "perimeter", "perimeterToArea", "areaToPerimeter"] as const);
  if (mode === "area" || mode === "perimeter") {
    const area = mode === "area";
    return {
      stem: `A square has a side length of ${s} ${u}. What is the ${area ? `area, in square ${u},` : `perimeter, in ${u},`} of the square?`,
      answer: F(area ? s * s : 4 * s),
      slips: area
        ? [
            numSlip(4 * s, "you found the perimeter, not the area"),
            numSlip(2 * s, "you multiplied the side length by 2 instead of by itself"),
            numSlip(4 * s * s, "you doubled the side length before squaring it"),
          ]
        : [
            numSlip(s * s, "you found the area, not the perimeter"),
            numSlip(2 * s, "you counted only two of the four sides"),
            numSlip(3 * s, "you counted only three of the four sides"),
          ],
      asks: area ? "the area of the square" : "the perimeter of the square",
      steps: [
        area
          ? {
              label: "Square the side length",
              work: `$A = s^2 = ${tx(s, s)} = ${s * s}$ square ${u}`,
            }
          : { label: "Add the four equal sides", work: `$P = 4s = 4(${s}) = ${4 * s}$ ${u}` },
      ],
      check: area
        ? `$${s * s} \\div ${s} = ${s}$, the side length`
        : `$${s} + ${s} + ${s} + ${s} = ${4 * s}$`,
      tip: TIP_AREA_PERIM,
      hint: area
        ? "All four sides of a square are equal; area is side times side."
        : "A square has four equal sides.",
      difficulty: 1,
      ok: (v) => (area ? v.div(s).eq(s) : v.div(4).eq(s)),
    };
  }
  if (mode === "perimeterToArea") {
    const P = 4 * s;
    return {
      stem: `A square has a perimeter of ${P} ${u}. What is the area, in square ${u}, of the square?`,
      answer: F(s * s),
      slips: [
        numSlip(s, "you found the side length, not the area"),
        numSlip(4 * s * s, "you divided the perimeter by 2 to get a side; a square has four sides"),
        numSlip(P * P, "you squared the perimeter instead of the side length"),
        numSlip(P, "you gave the perimeter, not the area"),
      ],
      asks: "the area of the square, found from its perimeter",
      steps: [
        {
          label: "Find the side length",
          work: `The four sides are equal, so each is $${P} \\div 4 = ${s}$ ${u}`,
        },
        { label: "Square the side length", work: `$A = ${tx(s, s)} = ${s * s}$ square ${u}` },
      ],
      check: `A square with side ${s} has perimeter $4(${s}) = ${P}$, as given`,
      tip: "From a square's perimeter, divide by 4 to get the side; from its area, take the square root",
      hint: "Find the length of one side first.",
      difficulty: 2,
      ok: (v) => v.div(s).eq(s),
    };
  }
  const A = s * s;
  return {
    stem: `A square has an area of ${A} square ${u}. What is the perimeter, in ${u}, of the square?`,
    answer: F(4 * s),
    slips: [
      numSlip(4 * A, "you multiplied the area by 4 before finding the side length"),
      numSlip(s, "you found the side length, not the perimeter"),
      numSlip(2 * s, "you counted only two of the four sides"),
      numSlip(F(A, 4), "you divided the area by 4"),
    ],
    asks: "the perimeter of the square, found from its area",
    steps: [
      {
        label: "Find the side length",
        work: `The side length is the square root of the area: $\\sqrt{${A}} = ${s}$ ${u}`,
      },
      { label: "Add the four sides", work: `$P = 4(${s}) = ${4 * s}$ ${u}` },
    ],
    check: `A square with side ${s} has area $${tx(s, s)} = ${A}$, as given`,
    tip: "From a square's perimeter, divide by 4 to get the side; from its area, take the square root",
    hint: "What side length gives this area?",
    difficulty: 2,
    ok: (v) => v.div(4).mul(v.div(4)).eq(A),
  };
}

function missingSide(rng: Rng): Core {
  const s = rectSubject(rng);
  const u = s.u;
  const mode = rng.pick(["area", "perimeter", "triangle", "perimeterToArea"] as const);
  if (mode === "area") {
    const L = rng.int(6, 40);
    const W = rng.int(2, L - 1);
    const A = L * W;
    return {
      stem: rng.bool(0.5)
        ? `The area of a ${s.what} is ${pn(A)} square ${u}. The length of the longest side of ${s.the} is ${L} ${u}. What is the length, in ${u}, of the shortest side?`
        : `A ${s.what} has an area of ${pn(A)} square ${u} and a length of ${L} ${u}. What is the width, in ${u}, of ${s.the}?`,
      answer: F(W),
      slips: [
        numSlip(A - L, "you subtracted the length from the area instead of dividing"),
        numSlip(F(2 * A, L), "you doubled the area first, as in the formula for a triangle"),
        ...(A / 2 - L > 0
          ? [numSlip(F(A, 2).sub(L), "you treated the area as if it were the perimeter")]
          : []),
        numSlip(L, "you gave the side that was already known"),
      ],
      asks: `the missing side of ${s.the}, given its area and one side`,
      steps: [
        { label: "Write the area formula", work: `$A = \\ell w$, so $${num(A)} = ${L}w$` },
        { label: "Divide by the known side", work: `$w = ${num(A)} \\div ${L} = ${W}$ ${u}` },
      ],
      check: `$${tx(L, W)} = ${num(A)}$, the given area`,
      tip: "When the area and one side of a rectangle are known, divide the area by that side",
      hint: "Area is length times width. Which number times the length gives the area?",
      difficulty: A > 300 ? 2 : 1,
      ok: (v) => v.mul(L).eq(A),
    };
  }
  if (mode === "perimeter") {
    const L = rng.int(6, 50);
    const W = rng.int(2, L - 1);
    const P = 2 * (L + W);
    return {
      stem: `The perimeter of a ${s.what} is ${P} ${u}, and its length is ${L} ${u}. What is the width, in ${u}, of ${s.the}?`,
      answer: F(W),
      slips: [
        numSlip(P - L, "you subtracted the length only once; the perimeter includes two lengths"),
        numSlip(
          P - 2 * L,
          "you subtracted both lengths but did not split what was left between the two widths"
        ),
        numSlip(P / 2, "you halved the perimeter and stopped"),
        numSlip(F(P, L), "you divided the perimeter by the length as if it were an area"),
      ],
      asks: `the width of ${s.the}, given its perimeter and length`,
      steps: [
        {
          label: "Take away both lengths",
          work: `$${P} - 2(${L}) = ${P - 2 * L}$, the total of the two widths`,
        },
        { label: "Split between the widths", work: `$${P - 2 * L} \\div 2 = ${W}$ ${u}` },
      ],
      check: `$2(${L}) + 2(${W}) = ${P}$, the given perimeter`,
      tip: "A rectangle's perimeter is 2 lengths plus 2 widths, so half the perimeter is one length plus one width",
      hint: "The perimeter counts the length twice and the width twice.",
      difficulty: 2,
      ok: (v) =>
        v
          .mul(2)
          .add(2 * L)
          .eq(P),
    };
  }
  if (mode === "perimeterToArea") {
    const L = rng.int(6, 40);
    const W = rng.int(2, L - 1);
    const P = 2 * (L + W);
    return {
      stem: `A ${s.what} has a perimeter of ${P} ${u} and a length of ${L} ${u}. What is the area, in square ${u}, of ${s.the}?`,
      answer: F(L * W),
      slips: [
        numSlip(W, "you found the width, not the area"),
        numSlip(
          L * (P - L),
          "you subtracted the length from the whole perimeter, not from half of it"
        ),
        numSlip(
          L * (P - 2 * L),
          "you subtracted both lengths but did not divide what was left by 2"
        ),
        numSlip(L * (L + W), "you multiplied the length by half the perimeter"),
      ],
      asks: `the area of ${s.the}, which needs its width first`,
      steps: [
        {
          label: "Find the width",
          work: `Half the perimeter is $${P / 2}$, so the width is $${P / 2} - ${L} = ${W}$ ${u}`,
        },
        {
          label: "Multiply length by width",
          work: `$A = ${tx(L, W)} = ${num(L * W)}$ square ${u}`,
        },
      ],
      check: `With sides ${L} and ${W}, the perimeter is $2(${L} + ${W}) = ${P}$, as given`,
      tip: "When a question gives the perimeter but asks for the area, find the missing side first",
      hint: "Use the perimeter to find the width.",
      difficulty: 3,
      ok: (v) => v.div(L).add(L).mul(2).eq(P),
    };
  }
  const b = rng.int(3, 40);
  const h = rng.int(2, 40);
  need((b * h) % 2 === 0, "whole area");
  const A = (b * h) / 2;
  return {
    stem: `A triangle has an area of ${pn(A)} square ${u}. The length of its base is ${b} ${u}. What is the height, in ${u}, of the triangle?`,
    answer: F(h),
    slips: [
      numSlip(F(A, b), "you forgot that a triangle's area is half of base times height"),
      numSlip(A - b, "you subtracted the base from the area instead of dividing"),
      numSlip(F(A, 2 * b), "you halved the area instead of doubling it"),
      numSlip(2 * A - b, "you doubled the area but then subtracted the base instead of dividing"),
    ],
    asks: "the height of the triangle, given its area and base",
    steps: [
      {
        label: "Write the area formula",
        work: `$A = \\frac{1}{2}bh$, so $${num(A)} = \\frac{1}{2}(${b})h$`,
      },
      { label: "Undo the one half", work: `Multiply both sides by 2: $${num(2 * A)} = ${b}h$` },
      { label: "Divide by the base", work: `$h = ${num(2 * A)} \\div ${b} = ${h}$ ${u}` },
    ],
    check: `$\\frac{1}{2}(${b})(${h}) = ${num(A)}$, the given area`,
    tip: "A triangle's area is half of base times height, so double the area before dividing by the base",
    hint: "Write the triangle area formula with the numbers you know.",
    difficulty: rng.pick([2, 3]),
    ok: (v) => v.mul(b).div(2).eq(A),
  };
}

export const rectangleWords: Template = {
  id: "area.rectangle-words",
  skill: SKILL,
  label: "Rectangles, squares and triangles from words: area, perimeter, a missing side",
  difficulty: [1, 3],
  formats: ["mc", "spr"],
  make(rng, format) {
    const kind = rng.pick(["sides", "sides", "square", "missing", "missing"] as const);
    const core =
      kind === "sides"
        ? rectFromSides(rng)
        : kind === "square"
          ? squareSide(rng)
          : missingSide(rng);
    return coreDraft(format, core);
  },
};

export const TEMPLATES: Template[] = [rectangleWords, figureArea, scaling];
