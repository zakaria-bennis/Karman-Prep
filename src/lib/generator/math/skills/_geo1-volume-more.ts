/*
 * m-volume-and-surface-area, the harder models: a missing dimension from a volume or surface area,
 * scaling (volume by the cube of the scale factor), and cones and pyramids with slant heights.
 * Each check rebuilds the solid from the candidate and compares with what was given.
 */
import type { FigureSpec } from "@/lib/figures/engine/spec";
import { need } from "../core/build";
import { F } from "../core/frac";
import { num } from "../core/tex";
import type { Format, Template } from "../core/types";
import {
  clampDims,
  type Core,
  coreDraft,
  numSlip,
  pn,
  type Rng,
  solidUnit,
  tx,
} from "./_geo1-common";

const SKILL = "m-volume-and-surface-area";

// ---------------------------------------------------------------- a missing dimension

function missingCore(rng: Rng): Core {
  const u = solidUnit(rng);
  const mode = rng.pick([
    "squarePrism",
    "triPrism",
    "cylRadius",
    "coneHeight",
    "sphereRadius",
    "cubeEdge",
    "cylDouble",
  ] as const);
  if (mode === "squarePrism") {
    const s = rng.int(2, 30);
    const h = rng.int(2, 30);
    const V = s * s * h;
    return {
      stem: `A right square prism has a height of ${h} ${u} and a volume of ${pn(V)} cubic ${u}. What is the length, in ${u}, of an edge of the base?`,
      answer: F(s),
      slips: [
        numSlip(s * s, "you found the area of the base, not the length of its edge"),
        numSlip(F(s * s, 2), "you halved the base area instead of taking its square root"),
        numSlip(F(s * s, 4), "you divided the base area by 4, as if it were a perimeter"),
        numSlip(F(V, 3 * h), "you divided by three times the height, as for a pyramid"),
      ],
      asks: "the edge length of the square base",
      steps: [
        { label: "Find the base area", work: `$V = Bh$, so $B = ${num(V)} \\div ${h} = ${s * s}$` },
        {
          label: "Find the edge",
          work: `The base is a square, so its edge is $\\sqrt{${s * s}} = ${s}$ ${u}`,
        },
      ],
      check: `$${s} \\times ${s} \\times ${h} = ${num(V)}$, the given volume`,
      tip: "Volume is base area times height; for a square base, the edge is the square root of the base area",
      hint: "First find the area of the base.",
      difficulty: 3,
      ok: (v) => v.mul(v).mul(h).eq(V),
    };
  }
  if (mode === "triPrism") {
    const B = rng.int(4, 150);
    const h = rng.int(2, 30);
    const V = B * h;
    return {
      stem: `A triangular prism has a height of ${h} ${u} and a volume of ${pn(V)} cubic ${u}. What is the area, in square ${u}, of the base of the prism? (The volume of a triangular prism is equal to $Bh$, where $B$ is the area of the base and $h$ is the height of the prism.)`,
      answer: F(B),
      slips: [
        numSlip(F(B, 2), "you took half again, but B is already the area of the triangle"),
        numSlip(2 * B, "you doubled, as if finding a triangle's height from its area"),
        numSlip(V - h, "you subtracted the height from the volume instead of dividing"),
        numSlip(F(B, 3), "you divided by three times the height, as for a pyramid"),
      ],
      asks: "the area B of the triangular base",
      steps: [
        { label: "Write the volume formula", work: `$${num(V)} = B(${h})$` },
        { label: "Divide by the height", work: `$B = ${num(V)} \\div ${h} = ${B}$ square ${u}` },
      ],
      check: `$${tx(B, h)} = ${num(V)}$, the given volume`,
      tip: "Any prism's volume is the area of its base times its height",
      hint: "Put the numbers you know into $V = Bh$.",
      difficulty: 2,
      ok: (v) => v.mul(h).eq(V),
    };
  }
  if (mode === "cylRadius" || mode === "cylDouble") {
    const r = rng.int(2, 24);
    const dbl = mode === "cylDouble";
    const h = dbl ? 2 * r : rng.int(2, 30);
    const k = r * r * h;
    return {
      stem: dbl
        ? `${rng.pick(["A right circular cylinder", "A cylindrical tank", "A cylindrical can", "A cylindrical vase"])} has a volume of $${num(k)}\\pi$ cubic ${u}. Its height is 2 times its radius. What is the radius, in ${u}, of the cylinder?`
        : `A right circular cylinder has a volume of $${num(k)}\\pi$ cubic ${u} and a height of ${h} ${u}. What is the radius, in ${u}, of the cylinder?`,
      answer: F(r),
      slips: dbl
        ? [
            numSlip(r * r * r, "you found the cube of the radius and did not take its cube root"),
            numSlip(2 * r, "you found the height, not the radius"),
            numSlip(r * r, "you found the square of the radius"),
            numSlip(F(k, 2), "you divided by 2 and stopped"),
          ]
        : [
            numSlip(r * r, "you found the square of the radius and did not take its square root"),
            numSlip(2 * r, "you found the diameter, not the radius"),
            numSlip(
              F(r * r, 2),
              "you halved the square of the radius instead of taking its square root"
            ),
            numSlip(
              F(k, 2 * h),
              "you divided by twice the height, mixing in the area of the curved side"
            ),
          ],
      asks: "the radius of the cylinder",
      steps: dbl
        ? [
            {
              label: "Write the volume with r only",
              work: `$V = \\pi r^2 h = \\pi r^2(2r) = 2\\pi r^3$`,
            },
            {
              label: "Solve for the cube",
              work: `$2\\pi r^3 = ${num(k)}\\pi$, so $r^3 = ${num(k / 2)}$`,
            },
            { label: "Take the cube root", work: `$r = ${r}$ ${u}` },
          ]
        : [
            { label: "Write the volume formula", work: `$\\pi r^2(${h}) = ${num(k)}\\pi$` },
            { label: "Solve for the square", work: `$r^2 = ${num(k)} \\div ${h} = ${r * r}$` },
            { label: "Take the square root", work: `$r = ${r}$ ${u}` },
          ],
      check: `$\\pi(${r})^2(${h}) = ${num(k)}\\pi$, the given volume`,
      tip: "To find a radius from a volume, solve the formula for r and take the root that undoes the power",
      hint: "Write $V = \\pi r^2 h$ with the numbers you know.",
      difficulty: dbl ? 4 : 3,
      ok: (v) =>
        v
          .mul(v)
          .mul(dbl ? v.mul(2) : F(h))
          .eq(k),
    };
  }
  if (mode === "coneHeight") {
    const r = rng.int(2, 24);
    const h = rng.int(2, 45);
    const k = F(r * r * h, 3);
    need(k.isInt(), "whole coefficient");
    return {
      stem: `A right circular cone has a radius of ${r} ${u} and a volume of $${num(k)}\\pi$ cubic ${u}. What is the height, in ${u}, of the cone?`,
      answer: F(h),
      slips: [
        numSlip(F(h, 3), "you left out the one third in the cone formula"),
        numSlip(r * h, "you did not square the radius"),
        numSlip(3 * h, "you multiplied by 3 twice"),
        numSlip(F(h * r, 3), "you divided by the radius only once and left out the factor of 3"),
      ],
      asks: "the height of the cone",
      steps: [
        { label: "Write the volume formula", work: `$\\frac{1}{3}\\pi(${r})^2 h = ${num(k)}\\pi$` },
        { label: "Clear the one third", work: `$${r * r}h = ${num(k.mul(3))}$` },
        { label: "Divide by the base", work: `$h = ${num(k.mul(3))} \\div ${r * r} = ${h}$ ${u}` },
      ],
      check: `$\\frac{1}{3}\\pi(${r})^2(${h}) = ${num(k)}\\pi$, the given volume`,
      tip: "Multiply both sides by 3 first to clear the one third in a cone's volume",
      hint: "Write $V = \\frac{1}{3}\\pi r^2 h$ with the numbers you know.",
      difficulty: 4,
      ok: (v) =>
        v
          .mul(r * r)
          .div(3)
          .eq(k),
    };
  }
  if (mode === "sphereRadius") {
    const r = rng.int(2, 18);
    const k = F(4 * r ** 3, 3);
    return {
      stem: `${rng.pick(["A sphere", "A spherical tank", "A solid ball", "A spherical ornament"])} has a volume of $${num(k)}\\pi$ cubic ${u}. What is the radius, in ${u}, of the sphere?`,
      answer: F(r),
      slips: [
        numSlip(r ** 3, "you found the cube of the radius and did not take its cube root"),
        numSlip(2 * r, "you found the diameter, not the radius"),
        numSlip(F(r ** 3, 3), "you divided by 4 but not by one third"),
        numSlip(r * r, "you took a square root instead of a cube root"),
      ],
      asks: "the radius of the sphere",
      steps: [
        { label: "Write the volume formula", work: `$\\frac{4}{3}\\pi r^3 = ${num(k)}\\pi$` },
        {
          label: "Solve for the cube",
          work: `$r^3 = ${num(k)} \\times \\frac{3}{4} = ${num(r ** 3)}$`,
        },
        { label: "Take the cube root", work: `$r = ${r}$ ${u}` },
      ],
      check: `$\\frac{4}{3}\\pi(${r})^3 = \\frac{4}{3}\\pi(${num(r ** 3)}) = ${num(k)}\\pi$`,
      tip: "A sphere's volume uses the radius cubed, so undo it with a cube root",
      hint: "Divide out $\\frac{4}{3}\\pi$ first.",
      difficulty: 5,
      ok: (v) => v.pow(3).mul(F(4, 3)).eq(k),
    };
  }
  const s = rng.int(2, 30);
  const bySurface = rng.bool(0.4);
  const given = bySurface ? 6 * s * s : s ** 3;
  return {
    stem: `${rng.pick(["A cube", "A cube-shaped box", "A cube-shaped block", "A cube-shaped storage bin"])} has a ${bySurface ? "surface area" : "volume"} of ${pn(given)} ${bySurface ? "square" : "cubic"} ${u}. What is the length, in ${u}, of an edge of the cube?`,
    answer: F(s),
    slips: bySurface
      ? [
          numSlip(s * s, "you found the area of one face, not the edge length"),
          numSlip(F(given, 4), "you divided by 4 faces instead of 6"),
          numSlip(
            F(given, 6 * 2),
            "you halved the area of one face instead of taking its square root"
          ),
        ]
      : [
          numSlip(F(given, 3), "you divided the volume by 3 instead of taking the cube root"),
          numSlip(s * s, "you found the area of one face"),
          numSlip(F(given, 6), "you divided by the six faces"),
        ],
    asks: "the edge length of the cube",
    steps: bySurface
      ? [
          {
            label: "Find one face's area",
            work: `A cube has 6 equal faces: $${num(given)} \\div 6 = ${s * s}$`,
          },
          { label: "Find the edge", work: `$\\sqrt{${s * s}} = ${s}$ ${u}` },
        ]
      : [
          {
            label: "Take the cube root",
            work: `$V = s^3$, so $s = \\sqrt[3]{${num(given)}} = ${s}$ ${u}`,
          },
        ],
    check: bySurface
      ? `$6(${s})^2 = ${num(given)}$`
      : `$${s} \\times ${s} \\times ${s} = ${num(given)}$`,
    tip: "A cube's volume is $s^3$ and its surface area is $6s^2$; undo the power to find the edge",
    hint: bySurface
      ? "How many faces does a cube have?"
      : "What number times itself three times gives the volume?",
    difficulty: bySurface ? 4 : 3,
    ok: (v) => (bySurface ? v.mul(v).mul(6) : v.pow(3)).eq(given),
  };
}

export const missingDimension: Template = {
  id: "vol.missing-dimension",
  skill: SKILL,
  label: "A missing edge, radius, height or base area from a solid's volume or surface area",
  difficulty: [2, 5],
  formats: ["mc", "spr"],
  make(rng, format) {
    return coreDraft(format, missingCore(rng));
  },
};

// ---------------------------------------------------------------- scaling and slant heights

function harderCore(rng: Rng, format: Format): Core & { figure?: FigureSpec } {
  const mode = rng.pick([
    "similar",
    "cubeK",
    "cylChange",
    "coneK",
    "coneK",
    "coneSlant",
    "pyramid",
  ] as const);
  const u = solidUnit(rng);
  if (mode === "similar") {
    const k = rng.int(2, 6);
    const V = rng.int(3, 90);
    const solid = rng.pick([
      "right circular cylinders",
      "rectangular prisms",
      "square pyramids",
      "right circular cones",
    ]);
    need(format === "mc" || V * k ** 3 <= 99999, "fits");
    return {
      stem: `Two ${solid}, A and B, are similar. Each linear dimension of solid B is ${k} times the corresponding dimension of solid A. The volume of solid A is ${V} cubic ${u}. What is the volume, in cubic ${u}, of solid B?`,
      answer: F(V * k ** 3),
      slips: [
        numSlip(V * k, "you multiplied the volume by the scale factor; volume grows by its cube"),
        numSlip(V * k * k, "you squared the scale factor, which is how area grows"),
        numSlip(3 * V * k, "you multiplied by 3 times the scale factor instead of cubing it"),
      ],
      asks: "the volume of solid B",
      steps: [
        {
          label: "Find the volume factor",
          work: `Three dimensions each grow by ${k}: $${k}^3 = ${k ** 3}$`,
        },
        {
          label: "Scale the volume",
          work: `$${V} \\times ${k ** 3} = ${num(V * k ** 3)}$ cubic ${u}`,
        },
      ],
      check: `A ${V} by 1 by 1 box scaled by ${k} is ${V * k} by ${k} by ${k}, with volume $${num(V * k ** 3)}$`,
      tip: "When every length is multiplied by k, area is multiplied by k squared and volume by k cubed",
      hint: "How many dimensions does a volume multiply together?",
      difficulty: 4,
      ok: (v) =>
        v.eq(
          F(V * k)
            .mul(k)
            .mul(k)
        ),
    };
  }
  if (mode === "cubeK") {
    const k = rng.int(2, 8);
    const s = rng.int(2, 12);
    const VB = s ** 3;
    const VA = (k * s) ** 3;
    return {
      stem: `Cube B has a volume of ${pn(VB)} cubic ${u}. The length of each edge of cube A is $k$ times the length of each edge of cube B. If cube A has a volume of ${pn(VA)} cubic ${u}, what is the value of $k$?`,
      answer: F(k),
      slips: [
        numSlip(k ** 3, "you found the ratio of the volumes, not of the edges"),
        numSlip(k * k, "you took a square root of the volume ratio instead of a cube root"),
        numSlip(F(k ** 3, 3), "you divided the volume ratio by 3 instead of taking its cube root"),
        numSlip(k * s, "you found the edge of cube A, not the scale factor"),
      ],
      asks: "the scale factor k between the edges",
      steps: [
        {
          label: "Find each edge",
          work: `Cube B: $\\sqrt[3]{${num(VB)}} = ${s}$; cube A: $\\sqrt[3]{${num(VA)}} = ${k * s}$`,
        },
        { label: "Compare the edges", work: `$k = ${k * s} \\div ${s} = ${k}$` },
      ],
      check: `The volume ratio is $${num(VA)} \\div ${num(VB)} = ${k ** 3}$, and $${k}^3 = ${k ** 3}$`,
      tip: "Volumes of similar solids compare as the cube of their edge ratio",
      hint: "Find the edge length of each cube.",
      difficulty: 5,
      ok: (v) => v.pow(3).eq(F(VA, VB)),
    };
  }
  if (mode === "cylChange") {
    const a = rng.int(2, 6);
    const c = rng.int(2, 9);
    const b = rng.bool(0.6) ? F(c) : F(1, c);
    need(!b.eq(a), "different factors");
    const solid = rng.pick(["right circular cylinder", "right circular cone"]);
    const hText = b.isInt() ? `multiplied by ${c}` : `divided by ${c}`;
    return {
      stem: `The radius of a ${solid} is multiplied by ${a}, and its height is ${hText}. The volume of the new ${solid.split(" ").pop()} is how many times the volume of the original?`,
      answer: b.mul(a * a),
      slips: [
        numSlip(
          b.mul(a),
          "you multiplied the two factors, but the radius is squared in the formula"
        ),
        numSlip(b.mul(2 * a), "you doubled the radius factor instead of squaring it"),
        numSlip(b.mul(b).mul(a), "you squared the height factor instead of the radius factor"),
        numSlip(F(a * a), "you left out the change in the height"),
      ],
      asks: "the factor by which the volume changes",
      steps: [
        {
          label: "Look at the formula",
          work: `The volume has $r^2 h$ in it (the constant stays the same)`,
        },
        {
          label: "Apply both changes",
          work: `$(${a}r)^2\\left(${num(b)}h\\right) = ${a * a} \\times ${num(b)} \\times r^2 h$, which is $${num(b.mul(a * a))}$ times $r^2 h$`,
        },
      ],
      check: `With $r = 1$ and $h = 1$, $r^2 h = 1$; with $r = ${a}$ and $h = ${num(b)}$, $r^2 h = ${num(b.mul(a * a))}$`,
      tip: "To see how a formula scales, put the multiplied values into it: a squared factor is squared",
      hint: "Which dimension is squared in the volume formula?",
      difficulty: rng.pick([5, 6]),
      ok: (v) => v.div(b).eq(F(a).pow(2)),
    };
  }
  if (mode === "coneK") {
    const h = rng.int(3, 30);
    const s = rng.int(h + 1, h + 30);
    const r2 = s * s - h * h;
    const k = F(r2 * h, 3);
    need(k.isInt(), "whole k");
    need(format === "mc" || k.n <= 99999, "fits");
    const angleAt = rng.pick([200, 232, 250, 290, 310]);
    const figure: FigureSpec = {
      version: "figure-spec/1",
      type: "solid3d",
      parts: [
        {
          kind: "solid",
          id: "s",
          shape: "cone",
          dims: clampDims({ radius: Math.sqrt(r2), height: h }),
          points: [
            { at: "apex", id: "A" },
            { at: "rim", id: "B", angle: angleAt },
          ],
        },
      ],
      labels: [
        { text: "A", on: "s.A" },
        { text: "B", on: "s.B" },
      ],
      marks: [],
      notToScale: true,
    };
    return {
      figure,
      stem: `For the right circular cone shown, $A$ is the vertex and $B$ is a point on the circumference of the base. The length of segment $AB$ (not shown) is ${s} ${u}, and the height of the cone is ${h} ${u}. If the volume of the cone is $k\\pi$ cubic ${u}, what is the value of $k$?`,
      answer: k,
      slips: [
        numSlip(F(s * s * h, 3), "you used AB as the radius; AB is the slant height"),
        numSlip(r2 * h, "you left out the one third in the cone formula"),
        numSlip(
          F((s * s + h * h) * h, 3),
          "you added the squares, but AB is the hypotenuse, so subtract"
        ),
        numSlip(F((s - h) ** 2 * h, 3), "you subtracted the lengths before squaring them"),
      ],
      asks: "the number k in the cone's volume $k\\pi$",
      steps: [
        {
          label: "Find the radius squared",
          work: `The height, a radius and AB form a right triangle with hypotenuse AB: $r^2 = ${s}^2 - ${h}^2 = ${r2}$`,
        },
        {
          label: "Use the cone formula",
          work: `$V = \\frac{1}{3}\\pi r^2 h = \\frac{1}{3}\\pi(${r2})(${h}) = ${num(k)}\\pi$`,
        },
        { label: "Read off k", work: `$k = ${num(k)}$` },
      ],
      check: `$${r2} + ${h}^2 = ${r2 + h * h} = ${s}^2$, so the right triangle checks, and $\\frac{1}{3}(${r2})(${h}) = ${num(k)}$`,
      tip: "In a cone, the height, a radius and the slant height form a right triangle with the slant height as hypotenuse",
      hint: "Which right triangle connects the height, the radius and AB?",
      difficulty: rng.pick([5, 6]),
      ok: (v) =>
        v
          .mul(3)
          .div(h)
          .add(h * h)
          .eq(s * s),
    };
  }
  const [a0, b0, c0] = rng.pick([
    [3, 4, 5],
    [5, 12, 13],
    [8, 15, 17],
    [7, 24, 25],
    [20, 21, 29],
    [12, 35, 37],
    [9, 40, 41],
    [13, 84, 85],
  ] as const);
  const sc = rng.int(1, Math.max(1, Math.floor(90 / c0)));
  if (mode === "coneSlant") {
    const [r, h] = rng.bool(0.5) ? [a0 * sc, b0 * sc] : [b0 * sc, a0 * sc];
    const l = c0 * sc;
    const k = F(r * r * h, 3);
    need(k.isInt(), "whole coefficient");
    return {
      stem: `A right circular cone has a volume of $${num(k)}\\pi$ cubic ${u}, and the area of its base is $${num(r * r)}\\pi$ square ${u}. What is the slant height, in ${u}, of the cone?`,
      answer: F(l),
      slips: [
        numSlip(h, "you found the height, not the slant height"),
        numSlip(r, "you found the radius, not the slant height"),
        numSlip(
          r + h,
          "you added the radius and height; the slant height comes from the Pythagorean theorem"
        ),
        numSlip(F(h, 3), "you divided the volume by the base area and left out the factor of 3"),
      ],
      asks: "the slant height of the cone",
      steps: [
        { label: "Find the radius", work: `$\\pi r^2 = ${num(r * r)}\\pi$, so $r = ${r}$` },
        {
          label: "Find the height",
          work: `$\\frac{1}{3}(${num(r * r)}\\pi)h = ${num(k)}\\pi$, so $h = ${h}$`,
        },
        {
          label: "Use the Pythagorean theorem",
          work: `$\\ell = \\sqrt{${r}^2 + ${h}^2} = \\sqrt{${num(l * l)}} = ${l}$ ${u}`,
        },
      ],
      check: `$${r}^2 + ${h}^2 = ${num(r * r + h * h)} = ${l}^2$`,
      tip: "The slant height of a cone is the hypotenuse of the right triangle formed by the radius and the height",
      hint: "Find the radius and the height first.",
      difficulty: 6,
      ok: (v) => v.mul(v).eq(r * r + h * h),
    };
  }
  // A square pyramid's height from its total and lateral surface areas.
  const [half, h] = rng.bool(0.5) ? [a0 * sc, b0 * sc] : [b0 * sc, a0 * sc];
  const sl = c0 * sc;
  const side = 2 * half;
  const lateral = 2 * side * sl;
  const total = lateral + side * side;
  return {
    stem: `A right square pyramid has a total surface area of ${pn(total)} square ${u}, and the combined area of its four triangular faces is ${pn(lateral)} square ${u}. What is the height, in ${u}, of the pyramid?`,
    answer: F(h),
    slips: [
      numSlip(sl, "you found the slant height of a face, not the height of the pyramid"),
      numSlip(side, "you found the edge of the base"),
      numSlip(half, "you found half the edge of the base"),
      numSlip(F(lateral, 4 * side), "you forgot the one half in each triangle's area"),
    ],
    asks: "the height of the pyramid, from its apex straight down to the center of the base",
    steps: [
      {
        label: "Find the base edge",
        work: `The base area is $${num(total)} - ${num(lateral)} = ${num(side * side)}$, so each edge is ${side}`,
      },
      {
        label: "Find the slant height",
        work: `Each face has area $${num(lateral)} \\div 4 = ${num(lateral / 4)} = \\frac{1}{2}(${side})\\ell$, so $\\ell = ${sl}$`,
      },
      {
        label: "Use the Pythagorean theorem",
        work: `The height, half an edge (${half}) and the slant height form a right triangle: $h = \\sqrt{${sl}^2 - ${half}^2} = ${h}$ ${u}`,
      },
    ],
    check: `$${h}^2 + ${half}^2 = ${num(h * h + half * half)} = ${sl}^2$, and $${num(side * side)} + 4 \\times \\frac{1}{2}(${side})(${sl}) = ${num(total)}$`,
    tip: "Inside a square pyramid, the height, half a base edge and a face's slant height form a right triangle",
    hint: "Subtract to find the area of the base first.",
    difficulty: 7,
    ok: (v) =>
      v
        .mul(v)
        .add(half * half)
        .eq(sl * sl),
  };
}

export const scaleAndSlant: Template = {
  id: "vol.scale-and-slant",
  skill: SKILL,
  label: "Scaling a solid's volume, and cones and pyramids with slant heights",
  difficulty: [4, 7],
  formats: ["mc", "spr"],
  make(rng, format) {
    const c = harderCore(rng, format);
    return coreDraft(format, c, c.figure);
  },
};
