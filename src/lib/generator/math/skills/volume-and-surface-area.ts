/*
 * m-volume-and-surface-area: prisms, cubes, cylinders, cones, spheres and pyramids. Item models
 * after the bank's questions for this skill: a volume or surface area from the dimensions (pi kept
 * exact, or asked as "k pi, what is k?"), a missing dimension from the volume, and harder ones:
 * scaling (volume grows by the cube of the scale factor) and slant heights by the Pythagorean
 * theorem. Each check rebuilds the solid from the candidate or recomputes by another route.
 */
import type { FigureSpec } from "@/lib/figures/engine/spec";
import { need } from "../core/build";
import { F, type Frac } from "../core/frac";
import { Sym } from "../core/sym";
import { num, sym } from "../core/tex";
import type { Draft, Format, Slip, Template } from "../core/types";
import {
  clampDims,
  numSlip,
  pi,
  ratAnswer,
  type Rng,
  solidUnit,
  symAnswer,
  symSlip,
  tx,
  valueOf,
} from "./_geo1-common";
import { missingDimension, scaleAndSlant } from "./_geo1-volume-more";

const SKILL = "m-volume-and-surface-area";

/** A one-solid figure in the engine's format; dims are drawing sizes, labels the true ones. */
function solidFigure(
  shape: "prism" | "cylinder" | "cone" | "sphere" | "pyramid",
  dims: Record<string, number>,
  labels: Record<string, string>,
  squared = false
): FigureSpec {
  return {
    version: "figure-spec/1",
    type: "solid3d",
    parts: [{ kind: "solid", id: "s", shape, dims }],
    labels: Object.entries(labels).map(([k, text]) => ({ text, on: `s.${k}` })),
    marks: squared ? [{ kind: "right_angle", on: ["s.height"] }] : [],
    notToScale: true,
  };
}

/** The coefficient c of an exact value c*pi, or null. */
function piCoef(s: Sym): Frac | null {
  const e = s.entries();
  if (e.length !== 1 || e[0][0].pi !== 1 || e[0][0].rad !== 1) return null;
  return e[0][1];
}

interface SolidCore {
  stem: string;
  /** For a typed answer when the value is k*pi: the stem asking for k. */
  kStem?: string;
  answer: Sym;
  slips: Slip[];
  asks: string;
  steps: { label: string; work: string }[];
  check: string;
  tip: string;
  hint: string;
  difficulty: number;
  ok: (v: Sym) => boolean;
  figure?: FigureSpec;
}

function solidDraft(format: Format, c: SolidCore): Draft {
  const k = piCoef(c.answer);
  if (format === "spr" && !c.answer.isRat()) {
    need(k && c.kStem, "a typed answer needs a rational value");
    const coef = k!;
    return {
      format,
      stem: c.kStem!,
      ...(c.figure ? { figure: c.figure } : {}),
      answer: ratAnswer(coef),
      slips: c.slips.flatMap((s) => {
        const sk = s.value ? piCoef(s.value) : null;
        return sk ? [numSlip(sk, s.why)] : [];
      }),
      asks: `${c.asks}, written as a number times $\\pi$`,
      steps: c.steps,
      check: c.check,
      tip: c.tip,
      hint: c.hint,
      difficulty: Math.min(7, c.difficulty + 1),
      isCorrect: (cand) => {
        const v = valueOf(cand);
        return v !== null && c.ok(Sym.pi(v));
      },
    };
  }
  return {
    format,
    stem: c.stem,
    ...(c.figure ? { figure: c.figure } : {}),
    answer: c.answer.isRat() ? ratAnswer(c.answer.asRat()!) : symAnswer(c.answer),
    slips: c.slips,
    asks: c.asks,
    steps: c.steps,
    check: c.check,
    tip: c.tip,
    hint: c.hint,
    difficulty: c.difficulty,
    isCorrect: (cand) => !!cand.value && c.ok(cand.value),
  };
}

const rat = (q: Frac | number) => Sym.rat(F(q));

// ---------------------------------------------------------------- volume and surface area from dimensions

function boxCore(rng: Rng, u: string): SolidCore {
  const cube = rng.bool(0.35);
  const l = rng.int(2, 20);
  const w = cube ? l : rng.int(2, 20);
  const h = cube ? l : rng.int(2, 20);
  need(cube || (l !== w && w !== h && l !== h), "three different edges");
  const vol = rng.bool(0.55);
  const V = l * w * h;
  const faces = [l * w, l * w, l * h, l * h, w * h, w * h];
  const SA = faces.reduce((a, b) => a + b, 0);
  const showFig = rng.bool(0.5);
  const figure = showFig
    ? solidFigure(
        "prism",
        clampDims({ length: l, width: w, height: h }),
        cube ? { length: String(l) } : { length: String(l), width: String(w), height: String(h) }
      )
    : undefined;
  const lead = cube
    ? showFig
      ? `The cube shown has an edge length of ${l} ${u}.`
      : `A cube has an edge length of ${l} ${u}.`
    : showFig
      ? `The right rectangular prism shown has the dimensions given, in ${u}.`
      : `A right rectangular prism has a length of ${l} ${u}, a width of ${w} ${u}, and a height of ${h} ${u}.`;
  if (vol) {
    return {
      stem: `${lead} What is the volume, in cubic ${u}, of the ${cube ? "cube" : "prism"}?`,
      answer: rat(V),
      slips: cube
        ? [
            numSlip(3 * l, "you multiplied the edge by 3 instead of cubing it"),
            numSlip(l * l, "you found the area of one face, not the volume"),
            numSlip(SA, "you found the surface area, not the volume"),
          ]
        : [
            numSlip(SA, "you found the surface area, not the volume"),
            numSlip(l + w + h, "you added the three dimensions instead of multiplying them"),
            numSlip(l * w, "you found the area of the base and did not multiply by the height"),
            numSlip(
              SA / 2,
              "you added the areas of three faces instead of multiplying the dimensions"
            ),
          ],
      asks: `the volume of the ${cube ? "cube" : "prism"}: the cubic ${u} it holds`,
      steps: [
        {
          label: "Multiply the three dimensions",
          work: cube
            ? `$V = s^3 = ${l}^3 = ${num(V)}$ cubic ${u}`
            : `$V = \\ell wh = ${l} \\times ${w} \\times ${h} = ${num(V)}$ cubic ${u}`,
        },
      ],
      check: `The base has area $${tx(l, w)} = ${l * w}$, and ${h} layers of that make $${num(V)}$`,
      tip: "Volume multiplies three lengths (cubic units); surface area adds the areas of the faces (square units)",
      hint: cube
        ? "Every edge of a cube has the same length."
        : "Volume is length times width times height.",
      difficulty: 2,
      ok: (v) => v.eq(rat(l * w).mul(h)),
      figure,
    };
  }
  return {
    stem: `${lead} What is the surface area, in square ${u}, of the ${cube ? "cube" : "prism"}?`,
    answer: rat(SA),
    slips: cube
      ? [
          numSlip(V, "you found the volume, not the surface area"),
          numSlip(4 * l * l, "you counted only the four side faces"),
          numSlip(6 * l, "you multiplied the edge by 6 but did not square it"),
        ]
      : [
          numSlip(V, "you found the volume, not the surface area"),
          numSlip(SA / 2, "you counted each pair of matching faces once; a box has two of each"),
          numSlip(SA - l * w, "you left out the top face"),
          numSlip(6 * l * w, "you used the base's area for all six faces"),
        ],
    asks: `the surface area of the ${cube ? "cube" : "prism"}: the total area of its six faces`,
    steps: cube
      ? [
          { label: "Find one face's area", work: `Each face is a square: $${l}^2 = ${l * l}$` },
          { label: "Add the six faces", work: `$6 \\times ${l * l} = ${num(SA)}$ square ${u}` },
        ]
      : [
          {
            label: "Find each pair of faces",
            work: `Top and bottom: $2(${tx(l, w)}) = ${2 * l * w}$; front and back: $2(${tx(l, h)}) = ${2 * l * h}$; the two ends: $2(${tx(w, h)}) = ${2 * w * h}$`,
          },
          {
            label: "Add the six faces",
            work: `$${2 * l * w} + ${2 * l * h} + ${2 * w * h} = ${num(SA)}$ square ${u}`,
          },
        ],
    check: `Unfolding the ${cube ? "cube" : "box"} into a flat net gives six rectangles with the same total, $${num(SA)}$`,
    tip: "Surface area is the sum of the areas of every face; a box has three pairs of matching faces",
    hint: "Picture the box opened flat. How many faces are there?",
    difficulty: 3,
    ok: (v) => v.eq(rat(faces.reduce((a, b) => a + b, 0))),
    figure,
  };
}

function roundCore(rng: Rng, u: string): SolidCore {
  const shape = rng.pick(["cylinder", "cylinder", "cone", "sphere", "hemisphere"] as const);
  const r = rng.int(2, 15);
  const h = rng.int(2, 20);
  const byDiameter = rng.bool(0.35);
  const sizeText = byDiameter ? `a diameter of ${2 * r} ${u}` : `a radius of ${r} ${u}`;
  const radiusStep = byDiameter
    ? [
        {
          label: "Find the radius",
          work: `The radius is half the diameter: $${2 * r} \\div 2 = ${r}$`,
        },
      ]
    : [];
  const showFig = !byDiameter && shape !== "hemisphere" && rng.bool(0.5);
  const kAsk = (what: string) =>
    `What is the value of $k$?`.replace("What", `If the ${what} is $k\\pi$ cubic ${u}, what`);
  const bump = byDiameter ? 1 : 0;
  if (shape === "cylinder") {
    const surface = rng.bool(0.3);
    const lead = showFig
      ? `The right circular cylinder shown has a radius of ${r} ${u} and a height of ${h} ${u}.`
      : `A right circular cylinder has ${sizeText} and a height of ${h} ${u}.`;
    const figure = showFig
      ? solidFigure("cylinder", clampDims({ radius: r, height: h }), {
          radius: String(r),
          height: String(h),
        })
      : undefined;
    if (surface) {
      const ans = pi(2 * r * r + 2 * r * h);
      return {
        stem: `${lead} What is the total surface area, in square ${u}, of the cylinder?`,
        kStem: `${lead} The total surface area of the cylinder is $k\\pi$ square ${u}. What is the value of $k$?`,
        answer: ans,
        slips: [
          symSlip(
            pi(2 * r * h),
            "you found only the curved side and left out the two circular bases"
          ),
          symSlip(pi(r * r + 2 * r * h), "you included only one of the two circular bases"),
          symSlip(pi(r * r * h), "you found the volume, not the surface area"),
          ...(byDiameter
            ? [symSlip(pi(8 * r * r + 4 * r * h), "you used the diameter as the radius")]
            : []),
        ],
        asks: "the total surface area of the cylinder: two circles plus the curved side",
        steps: [
          ...radiusStep,
          {
            label: "Find the two bases",
            work: `$2\\pi r^2 = 2\\pi(${r})^2 = ${sym(pi(2 * r * r))}$`,
          },
          {
            label: "Find the curved side",
            work: `It unrolls to a rectangle: $2\\pi rh = 2\\pi(${r})(${h}) = ${sym(pi(2 * r * h))}$`,
          },
          {
            label: "Add the parts",
            work: `$${sym(pi(2 * r * r))} + ${sym(pi(2 * r * h))} = ${sym(ans)}$ square ${u}`,
          },
        ],
        check: `Factoring gives $2\\pi r(r + h) = 2\\pi(${r})(${r + h}) = ${sym(ans)}$`,
        tip: "A cylinder's surface is two circles (each $\\pi r^2$) and a rectangle as wide as the circumference ($2\\pi rh$)",
        hint: "Count the pieces: two circles and one curved side.",
        difficulty: 4 + bump,
        ok: (v) => v.eq(pi(2 * r).mul(r + h)),
        figure,
      };
    }
    const ans = pi(r * r * h);
    return {
      stem: `${lead} What is the volume, in cubic ${u}, of the cylinder?`,
      kStem: `${lead} ${kAsk("volume of the cylinder")}`,
      answer: ans,
      slips: [
        ...(byDiameter ? [symSlip(pi(4 * r * r * h), "you used the diameter as the radius")] : []),
        symSlip(pi(2 * r * h), "you found the area of the curved side, not the volume"),
        symSlip(pi(r * h), "you did not square the radius"),
        symSlip(
          pi(F(r * r * h, 3)),
          "you used the formula for a cone, which has a factor of one third"
        ),
        symSlip(pi(r * r), "you found the area of the base and did not multiply by the height"),
      ],
      asks: "the volume of the cylinder",
      steps: [
        ...radiusStep,
        { label: "Find the base area", work: `$\\pi r^2 = \\pi(${r})^2 = ${sym(pi(r * r))}$` },
        {
          label: "Multiply by the height",
          work: `$V = ${sym(pi(r * r))} \\times ${h} = ${sym(ans)}$ cubic ${u}`,
        },
      ],
      check: `Each of the ${h} layers is a circle of area $${sym(pi(r * r))}$; ${h} of them make $${sym(ans)}$`,
      tip: "The volume of a cylinder is the area of its circular base times its height: $V = \\pi r^2 h$",
      hint: byDiameter
        ? "Find the radius before using the formula."
        : "Find the area of the circular base first.",
      difficulty: 3 + bump,
      ok: (v) => v.eq(pi(r * r).mul(h)),
      figure,
    };
  }
  if (shape === "cone") {
    const lead = showFig
      ? `The right circular cone shown has a radius of ${r} ${u} and a height of ${h} ${u}.`
      : `A right circular cone has ${sizeText} and a height of ${h} ${u}.`;
    const ans = pi(F(r * r * h, 3));
    return {
      stem: `${lead} What is the volume, in cubic ${u}, of the cone?`,
      kStem: `${lead} ${kAsk("volume of the cone")}`,
      answer: ans,
      slips: [
        symSlip(pi(r * r * h), "you left out the one third in the cone formula"),
        ...(byDiameter
          ? [symSlip(pi(F(4 * r * r * h, 3)), "you used the diameter as the radius")]
          : []),
        symSlip(pi(F(r * h, 3)), "you did not square the radius"),
        symSlip(pi(F(r * h * h, 3)), "you squared the height instead of the radius"),
      ],
      asks: "the volume of the cone",
      steps: [
        ...radiusStep,
        { label: "Find the base area", work: `$\\pi r^2 = \\pi(${r})^2 = ${sym(pi(r * r))}$` },
        {
          label: "Take one third of base times height",
          work: `$V = \\frac{1}{3}(${sym(pi(r * r))})(${h}) = ${sym(ans)}$ cubic ${u}`,
        },
      ],
      check: `A cylinder with the same base and height holds $${sym(pi(r * r * h))}$; a cone holds one third of that, $${sym(ans)}$`,
      tip: "A cone holds one third of the cylinder with the same base and height: $V = \\frac{1}{3}\\pi r^2 h$",
      hint: "Start with the cylinder that has the same base and height.",
      difficulty: 3 + bump,
      ok: (v) => v.mul(3).eq(pi(r * r * h)),
      figure: showFig
        ? solidFigure(
            "cone",
            clampDims({ radius: r, height: h }),
            { radius: String(r), height: String(h) },
            true
          )
        : undefined,
    };
  }
  const half = shape === "hemisphere";
  const ans = pi(F(half ? 2 : 4, 3).mul(r ** 3));
  const lead = half
    ? `A hemisphere is half of a sphere. A hemisphere has ${sizeText}.`
    : showFig
      ? `The sphere shown has a radius of ${r} ${u}.`
      : `A sphere has ${sizeText}.`;
  return {
    stem: `${lead} What is the volume, in cubic ${u}, of the ${shape}?`,
    kStem: `${lead} ${kAsk(`volume of the ${shape}`)}`,
    answer: ans,
    slips: half
      ? [
          symSlip(
            pi(F(4, 3).mul(r ** 3)),
            "you found the volume of the whole sphere, not half of it"
          ),
          symSlip(pi(F(2, 3).mul(r * r)), "you squared the radius instead of cubing it"),
          symSlip(pi(2 * r ** 3), "you left out the one third in the sphere formula"),
          ...(byDiameter
            ? [symSlip(pi(F(16, 3).mul(r ** 3)), "you used the diameter as the radius")]
            : []),
        ]
      : [
          symSlip(pi(4 * r * r), "you found the surface area, not the volume"),
          symSlip(pi(F(4, 3).mul(r * r)), "you squared the radius instead of cubing it"),
          symSlip(pi(4 * r ** 3), "you left out the one third in the formula"),
          ...(byDiameter
            ? [symSlip(pi(F(32, 3).mul(r ** 3)), "you used the diameter as the radius")]
            : []),
        ],
    asks: `the volume of the ${shape}`,
    steps: [
      ...radiusStep,
      {
        label: "Use the sphere formula",
        work: `$\\frac{4}{3}\\pi r^3 = \\frac{4}{3}\\pi(${r})^3 = ${sym(pi(F(4, 3).mul(r ** 3)))}$`,
      },
      ...(half
        ? [
            {
              label: "Take half of it",
              work: `$\\frac{1}{2} \\times ${sym(pi(F(4, 3).mul(r ** 3)))} = ${sym(ans)}$ cubic ${u}`,
            },
          ]
        : []),
    ],
    check: `A sphere's volume is also its surface area times $\\frac{r}{3}$: $${sym(pi(4 * r * r))} \\times \\frac{${r}}{3}${half ? " \\div 2" : ""} = ${sym(ans)}$`,
    tip: "A sphere's volume is $\\frac{4}{3}\\pi r^3$ (the radius cubed); its surface area is $4\\pi r^2$",
    hint: "Write the sphere volume formula and put in the radius.",
    difficulty: (half ? 4 : 3) + bump,
    ok: (v) => v.mul(half ? 2 : 1).eq(pi(4 * r * r).mul(F(r, 3))),
    figure:
      showFig && !half ? solidFigure("sphere", { radius: r }, { radius: String(r) }) : undefined,
  };
}

export const fromDimensions: Template = {
  id: "vol.from-dimensions",
  skill: SKILL,
  label: "Volume or surface area of a prism, cube, cylinder, cone, sphere or hemisphere",
  difficulty: [2, 6],
  formats: ["mc", "spr"],
  make(rng, format) {
    const u = solidUnit(rng);
    return solidDraft(format, rng.bool(0.4) ? boxCore(rng, u) : roundCore(rng, u));
  },
};

export const TEMPLATES: Template[] = [fromDimensions, missingDimension, scaleAndSlant];
