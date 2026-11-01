/**
 * What the figure gallery (build-gallery.ts) and the figure comparison page
 * (build-compare.ts) share: the golden figures grouped by kind with a plain
 * caption each, the embedded figure font, the two themes' variables, the
 * figure role styles, and Tailwind compiled for the markup a page uses.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { SITE_THEMES, themeCssVariables } from "@/lib/themes/palettes";

export const ROOT = process.cwd();
export const GOLDEN = path.join(ROOT, "tests/fixtures/figures/golden");

export type Item = { file: string; caption: string };
export const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Graphs on a coordinate grid",
    items: [
      {
        file: "plane-line-ray-segment",
        caption: "A line, a ray and a segment drawn on one coordinate plane.",
      },
      {
        file: "plane-parabola-points",
        caption: "A parabola with its vertex and intercepts marked.",
      },
      { file: "plane-rational-asymptotes", caption: "A curve with its two dashed asymptotes." },
    ],
  },
  {
    title: "Shaded regions and circles",
    items: [
      { file: "plane-linear-region", caption: "The region below a solid line is shaded." },
      { file: "plane-nonlinear-region", caption: "The region above a parabola is shaded." },
      {
        file: "plane-system-region",
        caption: "The overlap of two inequalities, with dashed boundaries and the region labelled.",
      },
      {
        file: "plane-circle-arc-polygon",
        caption: "A circle on the grid with a triangle inscribed in it.",
      },
    ],
  },
  {
    title: "Geometry (triangles, angles, parallel lines…)",
    items: [
      {
        file: "geo-circle-chord",
        caption:
          "A circle with a chord, a radius and the dashed distance from the center to the chord.",
      },
      {
        file: "geo-equal-ticks-arcs",
        caption: "A triangle with equal-side tick marks and equal-angle arcs.",
      },
      {
        file: "geo-parallel-segments",
        caption: "A four-sided shape with two parallel sides, marked with matching arrows.",
      },
      { file: "geo-parallel-transversal", caption: "Two parallel lines cut by a transversal." },
      {
        file: "geo-rays-angle",
        caption: "Three rays from one point, with a 40 degree angle and an unknown angle x.",
      },
      { file: "geo-right-triangle", caption: "A right triangle with the right-angle mark." },
      {
        file: "geo-similar-triangles",
        caption:
          "Two similar triangles side by side, one smaller, with a side and an angle labelled.",
      },
    ],
  },
  {
    title: "3D solids",
    items: [
      { file: "solid-cone", caption: "Right circular cone with radius and height." },
      { file: "solid-cylinder", caption: "Right circular cylinder with radius and height." },
      { file: "solid-prism", caption: "Right rectangular prism with its three edge lengths." },
      { file: "solid-pyramid", caption: "Right square pyramid with base and height." },
      { file: "solid-sphere", caption: "Sphere with its radius." },
      {
        file: "solid-sat-cone-flat-a",
        caption: "SAT-style wide cone, apex A and a point B on the base circle (variant 1 of 3).",
      },
      {
        file: "solid-sat-cone-flat-b",
        caption: "SAT-style wide cone, apex A and a point B on the base circle (variant 2 of 3).",
      },
      {
        file: "solid-sat-cone-flat-c",
        caption: "SAT-style wide cone, apex A and a point B on the base circle (variant 3 of 3).",
      },
      {
        file: "solid-sat-cone-tall",
        caption: "SAT-style tall cone with vertex V and the radius drawn from the center.",
      },
      {
        file: "solid-sat-cylinder-plain",
        caption: "SAT-style plain cylinder, back of the bottom circle dashed.",
      },
      {
        file: "solid-sat-cylinder-r-h",
        caption: "SAT-style cylinder with radius r across the top and height h beside it.",
      },
      {
        file: "solid-sat-pyramid-a",
        caption:
          "SAT-style pyramid with l and w on the front edges and a dashed height h (view 1 of 3).",
      },
      {
        file: "solid-sat-pyramid-b",
        caption:
          "SAT-style pyramid with l and w on the front edges and a dashed height h (view 2 of 3).",
      },
      {
        file: "solid-sat-pyramid-c",
        caption:
          "SAT-style pyramid with l and w on the front edges and a dashed height h (view 3 of 3).",
      },
      {
        file: "solid-sat-pyramid-level",
        caption: "SAT-style pyramid seen level from the front corner.",
      },
    ],
  },
  {
    title: "Bar charts",
    items: [
      { file: "bar-trees-planted", caption: "A simple bar chart with one bar per category." },
      {
        file: "bar-painting-correlation",
        caption: "A titled bar chart of ratings by painting style.",
      },
      {
        file: "bar-lake-ice-grouped",
        caption: "A grouped bar chart with a legend, comparing lakes across years.",
      },
    ],
  },
  {
    title: "Line graphs",
    items: [
      {
        file: "line-function-stars",
        caption: "A line graph of a straight line sloping down, with titled axes.",
      },
      { file: "line-graph-growth", caption: "A line graph showing growth over time." },
      { file: "line-population-census", caption: "A line graph of census population counts." },
    ],
  },
  {
    title: "Scatterplots",
    items: [
      { file: "scatter-points", caption: "A scatterplot of points with no line." },
      { file: "scatter-best-fit", caption: "A scatterplot with a line of best fit." },
      { file: "scatter-best-fit-wide", caption: "A wider scatterplot with a line of best fit." },
    ],
  },
  {
    title: "Dot plots",
    items: [
      { file: "dot-plot-pets", caption: "A dot plot of the number of pets per student." },
      { file: "dot-plot-scores", caption: "A dot plot of quiz scores from 4 to 10." },
      {
        file: "dot-plot-titled",
        caption: "A dot plot with a title and a value axis counted in tens.",
      },
    ],
  },
  {
    title: "Histograms",
    items: [
      { file: "histogram-commute", caption: "A histogram of commute times." },
      { file: "histogram-heights", caption: "A histogram of plant heights in 5 cm bins." },
      { file: "histogram-unit-bins", caption: "A histogram whose bins are one unit wide." },
    ],
  },
  {
    title: "Box plots",
    items: [
      { file: "box-bass-length", caption: "A box plot of bass lengths." },
      { file: "box-two-classes", caption: "Two box plots stacked, one per class." },
      { file: "box-units-sold", caption: "A box plot of units sold." },
    ],
  },
  {
    title: "Tables",
    items: [
      {
        file: "table-coins-decimals",
        caption: "A titled table whose decimals line up on the point.",
      },
      { file: "table-grouped-math", caption: "A table with merged group headings." },
      { file: "table-hours-note", caption: "A table with a title and a source note under it." },
    ],
  },
  {
    title: "Answer choices drawn as figures",
    items: [
      {
        file: "choices-line-graphs",
        caption: "Four answer choices, each a line on the same grid.",
      },
      {
        file: "choices-right-triangles",
        caption: "Four answer choices, each a triangle drawn at one shared scale.",
      },
    ],
  },
];

// ---------------------------------------------------------------- styles

const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const font64 = (name: string) =>
  readFileSync(path.join(ROOT, "src/app/fonts/stix-two-text", name)).toString("base64");

export const fontFaces = () => `
@font-face{font-family:"STIX Two Text";font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${font64("stix-two-text-latin-400-normal.woff2")}) format("woff2")}
@font-face{font-family:"STIX Two Text";font-style:italic;font-weight:400;src:url(data:font/woff2;base64,${font64("stix-two-text-latin-400-italic.woff2")}) format("woff2")}`;

/** figure-roles.css, figure-studio.css and figure-font.css, re-scoped from :root to the theme wrapper. */
export function roleCss() {
  const roles = [
    read("src/components/learn/figures/figure-roles.css"),
    read("src/components/learn/figures/figure-studio.css"),
  ]
    .join("\n")
    .replace(/:root:root/g, ".theme");
  const font = read("src/app/figure-font.css").replace(
    /var\(--font-figure, "Times New Roman"\)/g,
    '"STIX Two Text"'
  );
  // The globals.css figure tokens TableView reads (--figure-surface), under the wrapper.
  const globals = `.theme{--figure-surface:rgb(var(--k-surface));--figure-background:rgb(var(--k-night))}`;
  return `${roles}\n${font}\n${globals}`;
}

export function themeCss(ids: string[] = ["ivory", "observatory"]) {
  const pick = (id: string) => {
    const theme = SITE_THEMES.find((t) => t.id === id);
    if (!theme) throw new Error(`theme ${id} not found`);
    const vars = Object.entries(themeCssVariables(theme))
      .map(([k, v]) => `${k}:${v}`)
      .join(";");
    return `.theme-${id}{${vars};color-scheme:${theme.dark ? "dark" : "light"};background:${theme.canvas};color:${theme.text}}`;
  };
  return ids.map(pick).join("\n");
}

export function compileTailwind(bodyHtml: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "gallery-tw-"));
  const html = path.join(dir, "content.html");
  const input = path.join(dir, "in.css");
  writeFileSync(html, bodyHtml);
  writeFileSync(input, "@tailwind base;\n@tailwind utilities;\n");
  const config = path.join(dir, "tailwind.config.cjs");
  const base = path.join(ROOT, "tailwind.config.ts");
  writeFileSync(
    config,
    `const base = require(${JSON.stringify(base)});` +
      `const cfg = base.default ?? base;` +
      `module.exports = { ...cfg, content: [${JSON.stringify(html)}] };`
  );
  return execFileSync(
    path.join(ROOT, "node_modules/.bin/tailwindcss"),
    ["-c", config, "-i", input, "--minify"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 }
  );
}
