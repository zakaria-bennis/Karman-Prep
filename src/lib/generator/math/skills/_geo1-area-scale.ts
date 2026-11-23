/*
 * m-area-and-perimeter, scaling: areas by the square of the scale factor, similar prisms' volumes
 * by its cube. Each check cross-multiplies the ratios.
 */
import { need } from "../core/build";
import { F } from "../core/frac";
import { num } from "../core/tex";
import type { Format, Template } from "../core/types";
import { numSlip, pn, RECT_PAIRS, UNITS, coreDraft, type Core, type Rng } from "./_geo1-common";

const SKILL = "m-area-and-perimeter";

// ---------------------------------------------------------------- scaling

const SIMILAR_SHAPES = ["rectangles", "triangles", "parallelograms", "trapezoids", "hexagons"];

function scaleCore(rng: Rng, format: Format): Core {
  const mode = rng.pick([
    "area",
    "area",
    "side",
    "circle",
    "percent",
    "model",
    "prism",
    "prism",
  ] as const);
  const u = rng.pick(UNITS.filter((v) => v.many !== "units")).many;
  if (mode === "area") {
    const [n1, n2] = rng.pick(RECT_PAIRS);
    const shape = rng.pick(SIMILAR_SHAPES);
    const k = rng.int(2, 10);
    const A = rng.int(3, 150);
    const ans = A * k * k;
    need(format === "mc" || ans <= 99999, "fits the box");
    return {
      stem: `${shape[0].toUpperCase()}${shape.slice(1)} $${n1}$ and $${n2}$ are similar. The length of each side of $${n2}$ is ${k} times the length of the corresponding side of $${n1}$. The area of $${n1}$ is ${A} square ${u}. What is the area, in square ${u}, of $${n2}$?`,
      answer: F(ans),
      slips: [
        numSlip(
          A * k,
          "you multiplied the area by the scale factor; area grows by the square of it"
        ),
        numSlip(A * k ** 3, "you cubed the scale factor, which is how volume grows"),
        numSlip(A * 2 * k, "you doubled the scale factor instead of squaring it"),
        numSlip(k * k, "you found how many times larger the area is, not the area"),
      ],
      asks: `the area of the larger figure, $${n2}$`,
      steps: [
        {
          label: "Find the area scale factor",
          work: `Each length is ${k} times as long, so each area is $${k}^2 = ${k * k}$ times as large`,
        },
        { label: "Scale the area", work: `$${A} \\times ${k * k} = ${num(ans)}$ square ${u}` },
      ],
      check: `A ${A} by 1 rectangle scaled by ${k} becomes ${A * k} by ${k}, with area $${num(ans)}$`,
      tip: "When every length of a figure is multiplied by k, its area is multiplied by k squared",
      hint: "If each side is k times as long, how does a length times a length change?",
      difficulty: k <= 4 ? 3 : 4,
      ok: (v) => v.eq(F(A * k).mul(k)),
    };
  }
  if (mode === "side") {
    const [n1, n2] = rng.pick(RECT_PAIRS);
    const k = rng.int(2, 6);
    const small = rng.int(3, 40);
    const A2 = small;
    const A1 = small * k * k;
    const s1 = k * rng.int(2, 15);
    return {
      stem: `Rectangle $${n1}$ is similar to rectangle $${n2}$. The area of $${n1}$ is ${pn(A1)} square ${u}, and the area of $${n2}$ is ${A2} square ${u}. The length of the longest side of $${n1}$ is ${s1} ${u}. What is the length, in ${u}, of the longest side of $${n2}$?`,
      answer: F(s1, k),
      slips: [
        numSlip(
          F(s1, k * k),
          "you scaled the side by the ratio of the areas; sides scale by its square root"
        ),
        numSlip(k * k, "you found the ratio of the areas and stopped"),
        numSlip(s1 * k, "you multiplied by the scale factor instead of dividing"),
        numSlip(s1, "you assumed the corresponding sides are equal"),
      ],
      asks: `the longest side of the smaller rectangle, $${n2}$`,
      steps: [
        {
          label: "Compare the areas",
          work: `$${num(A1)} \\div ${A2} = ${k * k}$, so $${n1}$ has ${k * k} times the area`,
        },
        {
          label: "Find the length scale factor",
          work: `Lengths scale by the square root: $\\sqrt{${k * k}} = ${k}$`,
        },
        { label: "Scale the side", work: `$${s1} \\div ${k} = ${s1 / k}$ ${u}` },
      ],
      check: `The ratio of sides, $\\frac{${s1 / k}}{${s1}}$, squared is $\\frac{1}{${k * k}}$, which matches $\\frac{${A2}}{${num(A1)}}$`,
      tip: "For similar figures, the ratio of areas is the square of the ratio of corresponding lengths",
      hint: "How many times larger is one area than the other? Lengths change by less.",
      difficulty: 5,
      ok: (v) =>
        v
          .mul(v)
          .mul(A1)
          .eq(F(s1 * s1 * A2)),
    };
  }
  if (mode === "circle") {
    const a = rng.int(1, 9);
    const r = rng.int(2, 25);
    const b = a * r;
    const ra = a === 1 ? "x" : `${a}x`;
    return {
      stem: `Circle $A$ has a radius of $${ra}$ and circle $B$ has a radius of $${b}x$, where $x > 0$. The area of circle $B$ is how many times the area of circle $A$?`,
      answer: F(r * r),
      slips: [
        numSlip(r, "you compared the radii, not the areas"),
        numSlip(2 * r, "you doubled the ratio of the radii instead of squaring it"),
        numSlip(r ** 3, "you cubed the ratio of the radii"),
        numSlip(b * b, `you squared ${b} without dividing by circle $A$'s radius`),
      ],
      asks: "how many times the area of circle A fits in the area of circle B",
      steps: [
        {
          label: "Compare the radii",
          work: `$\\frac{${b}x}{${ra}} = ${r}$, so circle $B$'s radius is ${r} times as long`,
        },
        {
          label: "Square the ratio",
          work: `Area is $\\pi r^2$, so the areas compare as $${r}^2 = ${r * r}$`,
        },
      ],
      check: `$\\frac{\\pi(${b}x)^2}{\\pi(${ra})^2} = \\frac{${b * b}x^2}{${a * a === 1 ? "" : a * a}x^2} = ${r * r}$`,
      tip: "Areas of similar figures compare as the square of corresponding lengths, so pi and x cancel",
      hint: "Write both areas with the formula for a circle, then divide.",
      difficulty: 4,
      ok: (v) => v.mul(a * a).eq(b * b),
    };
  }
  if (mode === "percent") {
    const p = rng.pick([10, 20, 25, 40, 50, 60, 80]);
    const f = F(100 + p, 100);
    const L = 20 * rng.int(2, 12);
    const W = 20 * rng.int(1, 10);
    const A = L * W;
    const ans = F(L).mul(f).mul(F(W).mul(f));
    need(ans.isInt(), "whole area");
    need(format === "mc" || ans.n <= 99999, "fits the box");
    const obj = rng.pick(["banner", "poster", "rug", "photograph", "garden"]);
    return {
      stem: `A rectangular ${obj} has an area of ${pn(A)} square ${u}. A larger copy of the ${obj} is made in which the length and the width of the original are each increased by ${p}%. What is the area, in square ${u}, of the copy?`,
      answer: ans,
      slips: [
        numSlip(
          F(A).mul(f),
          "you applied the increase only once, but both the length and the width grew"
        ),
        numSlip(A + p, "you added the percent to the area as a number"),
        numSlip(A + 2 * p, "you added the percent twice as a number"),
        numSlip(
          F(A).mul(F(100 + 2 * p, 100)),
          `you added the two increases to get ${2 * p}%; the two factors multiply`
        ),
      ],
      asks: `the area of the copy after both dimensions grow by ${p}%`,
      steps: [
        {
          label: "Write each change as a factor",
          work: `Increasing by ${p}% multiplies a length by $${num(f, { decimal: true })}$`,
        },
        {
          label: "Apply it to both dimensions",
          work: `The area is multiplied by $${num(f, { decimal: true })}^2 = ${num(f.mul(f), { decimal: true })}$`,
        },
        {
          label: "Scale the area",
          work: `$${num(A)} \\times ${num(f.mul(f), { decimal: true })} = ${num(ans)}$ square ${u}`,
        },
      ],
      check: `A ${L} by ${W} ${obj} has area $${num(A)}$; its copy is $${num(F(L).mul(f), { decimal: true })}$ by $${num(F(W).mul(f), { decimal: true })}$, with area $${num(ans)}$`,
      tip: "When both dimensions grow by the same percent, multiply the area by the growth factor twice",
      hint: "What happens to the length, and what happens to the width?",
      difficulty: rng.pick([5, 6]),
      ok: (v) => v.eq(F(L).mul(f).mul(F(W).mul(f))),
    };
  }
  if (mode === "model") {
    const n = rng.pick([2, 4, 5, 8, 10, 12, 20, 25]);
    const q = rng.int(2, 40);
    const A = n * n * q;
    const room = rng.pick([
      "the floor of a store",
      "a city park",
      "the floor of a museum",
      "a parking lot",
      "a soccer field",
    ]);
    const unit = rng.pick(["feet", "meters"]);
    return {
      stem: `${room[0].toUpperCase()}${room.slice(1)} has an area of ${pn(A)} square ${unit}. A scale model is made in which each length is $\\frac{1}{${n}}$ of the corresponding actual length. What is the area, in square ${unit}, of the model?`,
      answer: F(q),
      slips: [
        numSlip(F(A, n), "you divided by the scale factor; areas shrink by its square"),
        numSlip(F(A, 2 * n), "you divided by twice the scale factor instead of its square"),
        numSlip(F(A, n ** 3), "you divided by the cube of the scale factor, as for a volume"),
        numSlip(A * n * n, "you multiplied by the square of the scale factor instead of dividing"),
      ],
      asks: "the area of the scale model",
      steps: [
        {
          label: "Find the area factor",
          work: `Each length is $\\frac{1}{${n}}$ as long, so each area is $\\left(\\frac{1}{${n}}\\right)^2 = \\frac{1}{${n * n}}$ as large`,
        },
        { label: "Scale the area", work: `$${num(A)} \\div ${n * n} = ${q}$ square ${unit}` },
      ],
      check: `Scaling the model's area back up by $${n * n}$ gives $${q} \\times ${n * n} = ${num(A)}$`,
      tip: "A scale factor applies to lengths; square it for areas",
      hint: "Each length shrinks by the same factor. What happens to length times width?",
      difficulty: 5,
      ok: (v) => v.mul(n * n).eq(A),
    };
  }
  // Similar prisms: surface areas give the length ratio, which cubes for volume.
  const k = rng.pick([2, 3, 4, 5]);
  const S1 = rng.int(20, 80);
  const S2 = S1 * k * k;
  const sum = rng.bool(0.4);
  const head = `Right rectangular prism X is similar to right rectangular prism Y. The surface area of prism X is ${S1} square centimeters, and the surface area of prism Y is ${pn(S2)} square centimeters.`;
  const ratioSteps = [
    {
      label: "Find the length ratio",
      work: `$\\frac{${num(S2)}}{${S1}} = ${k * k}$, so each length of Y is $\\sqrt{${k * k}} = ${k}$ times as long`,
    },
    {
      label: "Find the volume ratio",
      work: `Volume grows by the cube of the length ratio: $${k}^3 = ${k ** 3}$`,
    },
  ];
  if (sum) {
    const V1 = rng.int(4, 60);
    const V2 = V1 * k ** 3;
    need(V1 + V2 <= 99999, "fits");
    return {
      stem: `${head} The volume of prism Y is ${pn(V2)} cubic centimeters. What is the sum of the volumes, in cubic centimeters, of the two prisms?`,
      answer: F(V1 + V2),
      slips: [
        numSlip(V1, "you found the volume of X but did not add the volume of Y"),
        numSlip(
          F(V2).add(F(V2, k * k)),
          "you divided Y's volume by the surface-area ratio; volume scales by the cube of the length ratio"
        ),
        numSlip(
          F(V2).add(F(V2, k)),
          "you divided Y's volume by the length ratio instead of its cube"
        ),
        numSlip(2 * V2, "you treated the prisms as having equal volumes"),
      ],
      asks: "the volume of X plus the volume of Y",
      steps: [
        ...ratioSteps,
        {
          label: "Find the volume of X",
          work: `$${num(V2)} \\div ${k ** 3} = ${V1}$ cubic centimeters`,
        },
        { label: "Add the volumes", work: `$${V1} + ${num(V2)} = ${num(V1 + V2)}$` },
      ],
      check: `The volume ratio squared, $${k ** 3}^2$, equals the surface-area ratio cubed, $${k * k}^3$, as it must for similar solids`,
      tip: "For similar solids with length ratio k, areas scale by k squared and volumes by k cubed",
      hint: "Use the surface areas to find how many times longer each edge of Y is.",
      difficulty: 7,
      ok: (v) => {
        const vx = v.sub(V2);
        return F(V2).div(vx).pow(2).eq(F(S2, S1).pow(3));
      },
    };
  }
  const V1 =
    k === 3
      ? F(rng.int(2, 40))
      : k === 5
        ? F(2 * rng.int(1, 150), 10)
        : F(10 * rng.int(1, 30) + 5, 10);
  const V2 = V1.mul(k ** 3);
  need(V2.n <= 99999, "fits");
  return {
    stem: `${head} The volume of prism X is ${pn(V1)} cubic centimeters. What is the volume, in cubic centimeters, of prism Y?`,
    answer: V2,
    slips: [
      numSlip(
        V1.mul(k * k),
        "you scaled the volume by the surface-area ratio; volume scales by the cube of the length ratio"
      ),
      numSlip(V1.mul(k), "you scaled the volume by the length ratio instead of its cube"),
      numSlip(V1.mul(k ** 6), "you cubed the surface-area ratio instead of the length ratio"),
      numSlip(V1.add(S2 - S1), "you added the difference in surface areas to the volume"),
    ],
    asks: "the volume of prism Y",
    steps: [
      ...ratioSteps,
      {
        label: "Scale the volume",
        work: `$${num(V1, { decimal: true })} \\times ${k ** 3} = ${num(V2)}$ cubic centimeters`,
      },
    ],
    check: `The volume ratio squared, $${k ** 3}^2$, equals the surface-area ratio cubed, $${k * k}^3$, as it must for similar solids`,
    tip: "For similar solids with length ratio k, areas scale by k squared and volumes by k cubed",
    hint: "Use the surface areas to find how many times longer each edge of Y is.",
    difficulty: 6,
    ok: (v) => v.div(V1).pow(2).eq(F(S2, S1).pow(3)),
  };
}

export const scaling: Template = {
  id: "area.scale",
  skill: SKILL,
  label: "Scaling: areas by the square of the scale factor, similar prisms' volumes by its cube",
  difficulty: [3, 7],
  formats: ["mc", "spr"],
  make(rng, format) {
    return coreDraft(format, scaleCore(rng, format));
  },
};
