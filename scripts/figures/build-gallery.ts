#!/usr/bin/env tsx
/**
 * Builds a one-file figure gallery: one example of every figure type the figure
 * engine draws, side by side in the light "ivory" and dark "observatory" themes.
 *
 *   npx tsx scripts/figures/build-gallery.ts [outDir]
 *
 * Every figure is a golden spec (tests/fixtures/figures/golden) run through the real
 * engine (parseFigureSpec, buildScene or choiceScenes, FigureView, TableView) and
 * rendered to static markup. Nothing is drawn by hand. Colors come from
 * themeCssVariables (src/lib/themes/palettes.ts) and the role mapping in
 * figure-roles.css; the figure serif (STIX Two Text) is embedded as base64 so the
 * page renders from disk. Writes <outDir>/index.html (default: tmp/figure-gallery).
 * Not committed output: the HTML is regenerated whenever it is wanted.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import Module from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { choiceScenes } from "@/lib/figures/engine/choices";
import { boxForWidth, buildScene } from "@/lib/figures/engine/index";
import { parseFigureSpec } from "@/lib/figures/engine/spec";
import { SITE_THEMES, themeCssVariables } from "@/lib/themes/palettes";

const ROOT = process.cwd();
const GOLDEN = path.join(ROOT, "tests/fixtures/figures/golden");

type Item = { file: string; caption: string };
const GROUPS: { title: string; items: Item[] }[] = [
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

// ---------------------------------------------------------------- rendering

let arrowCount = 0;
/** Each static render restarts React's id counter, so the arrowhead marker ids are made unique here. */
const uniqueIds = (markup: string) => {
  const n = ++arrowCount;
  return markup.replace(/figure-arrow-[A-Za-z0-9_-]+/g, (id) => `${id}-g${n}`);
};

type Views = {
  FigureView: typeof import("@/components/learn/figures/FigureView").default;
  TableView: typeof import("@/components/learn/figures/TableView").default;
};

const readJson = (name: string) =>
  JSON.parse(readFileSync(path.join(GOLDEN, `${name}.json`), "utf8")) as Record<string, unknown>;

function renderFile(file: string, views: Views): string {
  const doc = readJson(file);
  const { FigureView, TableView } = views;
  if (Array.isArray(doc.answer_choices)) {
    const choices = (doc.answer_choices as Record<string, unknown>[])
      .slice()
      .sort((a, b) => String(a.letter).localeCompare(String(b.letter)));
    const scenes = choiceScenes(choices.map((c) => c.choice_figure_spec));
    if (scenes.some((s) => !s)) throw new Error(`${file}: a choice was not drawn`);
    const cells = choices.map((c, i) => {
      const svg = renderToStaticMarkup(createElement(FigureView, { scene: scenes[i]! }));
      return `<div class="choice"><span class="badge">${String(c.letter)}</span><div class="choice-fig">${svg}</div></div>`;
    });
    return uniqueIds(`<div class="choices">${cells.join("")}</div>`);
  }
  const parsed = parseFigureSpec(doc.figure_spec);
  if (!parsed.ok) throw new Error(`${file}: ${parsed.errors.join("; ")}`);
  const spec = parsed.spec;
  if (spec.type === "table")
    return uniqueIds(renderToStaticMarkup(createElement(TableView, { spec })));
  const scene = buildScene(spec, boxForWidth(spec, null));
  const svg = renderToStaticMarkup(
    createElement(FigureView, { scene, className: "mx-auto block h-auto w-full max-w-full" })
  );
  return uniqueIds(`<div class="figure">${svg}</div>`);
}

// ---------------------------------------------------------------- styles

const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const font64 = (name: string) =>
  readFileSync(path.join(ROOT, "src/app/fonts/stix-two-text", name)).toString("base64");

const fontFaces = () => `
@font-face{font-family:"STIX Two Text";font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${font64("stix-two-text-latin-400-normal.woff2")}) format("woff2")}
@font-face{font-family:"STIX Two Text";font-style:italic;font-weight:400;src:url(data:font/woff2;base64,${font64("stix-two-text-latin-400-italic.woff2")}) format("woff2")}`;

/** figure-roles.css and figure-font.css, re-scoped from :root to the theme wrapper. */
function roleCss() {
  const roles = read("src/components/learn/figures/figure-roles.css").replace(
    /:root:root/g,
    ".theme"
  );
  const font = read("src/app/figure-font.css").replace(
    /var\(--font-figure, "Times New Roman"\)/g,
    '"STIX Two Text"'
  );
  // The globals.css figure tokens TableView reads (--figure-surface), under the wrapper.
  const globals = `.theme{--figure-surface:rgb(var(--k-surface));--figure-background:rgb(var(--k-night))}`;
  return `${roles}\n${font}\n${globals}`;
}

function themeCss() {
  const pick = (id: string) => {
    const theme = SITE_THEMES.find((t) => t.id === id);
    if (!theme) throw new Error(`theme ${id} not found`);
    const vars = Object.entries(themeCssVariables(theme))
      .map(([k, v]) => `${k}:${v}`)
      .join(";");
    return `.theme-${id}{${vars};color-scheme:${theme.dark ? "dark" : "light"};background:${theme.canvas};color:${theme.text}}`;
  };
  return `${pick("ivory")}\n${pick("observatory")}`;
}

const PAGE_CSS = `
*{box-sizing:border-box}
body{margin:0;background:#f4f2ec;color:#23332f;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5}
.page{max-width:1240px;margin:0 auto;padding:32px 16px 64px}
h1{font-size:28px;margin:0 0 8px}
.intro{margin:0 0 32px;color:#4a5a52;max-width:60ch}
h2{font-size:22px;margin:48px 0 16px;padding-top:16px;border-top:1px solid #c9c5b8}
.item{margin:0 0 28px}
.caption{margin:0 0 8px;font-size:15px;color:#2d3b36}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cell{border-radius:10px;border:1px solid rgb(var(--k-bronze));padding:12px;min-width:0;display:flex;flex-direction:column}
.cell-label{font:600 11px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px;opacity:.7}
.cell-body{flex:1;display:flex;align-items:center;justify-content:center;min-width:0}
.cell-body>*{min-width:0;max-width:100%}
.figure{width:100%}
.cell-body figure{margin:0}
.choices{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}
.choice{display:flex;align-items:flex-start;gap:8px;border:1px solid rgb(var(--k-bronze));border-radius:10px;padding:8px;background:rgb(var(--k-surface))}
.choice-fig{flex:1;min-width:0;max-width:22rem;margin-inline:auto}
.choice-fig svg{display:block;width:100%;height:auto}
.badge{flex:none;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 13px/1 system-ui,sans-serif;background:rgb(var(--k-surface-raised));color:rgb(var(--k-ivory))}
@media (max-width:700px){.pair{grid-template-columns:1fr}.choices{grid-template-columns:1fr}.page{padding-top:20px}}
`;

function compileTailwind(bodyHtml: string): string {
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

// ---------------------------------------------------------------- main

async function main() {
  const outDir = path.resolve(process.argv[2] ?? path.join(ROOT, "tmp/figure-gallery"));
  // The components import stylesheets for the app's bundler; Node needs them ignored.
  (Module as unknown as { _extensions: Record<string, () => void> })._extensions[".css"] = () => {};
  const views: Views = {
    FigureView: (await import("@/components/learn/figures/FigureView")).default,
    TableView: (await import("@/components/learn/figures/TableView")).default,
  };

  const counts: string[] = [];
  let sections = "";
  for (const group of GROUPS) {
    counts.push(`${group.title}: ${group.items.length}`);
    sections += `<section><h2>${group.title}</h2>`;
    for (const item of group.items) {
      const markup = renderFile(item.file, views);
      const side = (id: string, label: string) =>
        `<div class="cell theme theme-${id}"><p class="cell-label">${label}</p><div class="cell-body">${markup}</div></div>`;
      sections +=
        `<div class="item"><p class="caption">${item.caption}</p><div class="pair">` +
        side("ivory", "Light (ivory)") +
        side("observatory", "Dark (observatory)") +
        `</div></div>`;
    }
    sections += `</section>`;
  }

  const body =
    `<div class="page"><h1>Figure gallery</h1>` +
    `<p class="intro">One example of every kind of figure the Karman figure engine draws, shown in the light and dark themes exactly as students see them.</p>` +
    sections +
    `</div>`;
  const tailwind = compileTailwind(body);
  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>Figure gallery</title><style>${tailwind}${fontFaces()}${themeCss()}${roleCss()}${PAGE_CSS}</style></head><body>${body}</body></html>`;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "index.html"), html);
  console.log(counts.join("\n"));
  console.log(`wrote ${path.join(outDir, "index.html")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
