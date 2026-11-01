#!/usr/bin/env tsx
/**
 * Builds the figure comparison page: every golden figure three ways, side by side,
 * in the light "ivory" and dark "observatory" themes.
 *
 *   npx tsx scripts/figures/build-compare.ts [outDir]
 *
 * - Original exam figure: the real exam image the golden figure was traced or
 *   transcribed from (tests/fixtures/figures/golden/originals.json), copied into
 *   outDir/originals. Shown as scanned in the light row and inverted in the dark row.
 *   A composed figure with no exam original says so.
 * - Bluebook version: the figure engine as students see it today (FigureView, TableView).
 * - Studio version: the same scene with the opt-in studio render style
 *   (FigureView style="studio" with studioLayer, TableView style="studio").
 *
 * Every figure runs through the real engine; nothing is drawn by hand. Writes
 * outDir/index.html (default: tmp/figure-compare). Not committed output.
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { choiceScenes } from "@/lib/figures/engine/choices";
import { boxForWidth, buildScene } from "@/lib/figures/engine/index";
import type { Scene } from "@/lib/figures/engine/scene";
import { parseFigureSpec, type FigureSpec } from "@/lib/figures/engine/spec";
import { studioLayer } from "@/lib/figures/engine/studio";
import {
  compileTailwind,
  fontFaces,
  GOLDEN,
  GROUPS,
  ROOT,
  roleCss,
  themeCss,
} from "./gallery-shared";

type Style = "bluebook" | "studio";
type Views = {
  FigureView: typeof import("@/components/learn/figures/FigureView").default;
  TableView: typeof import("@/components/learn/figures/TableView").default;
};
type Original = { figureId: string; path: string } | null;

/** A short name for each figure, above its one-line caption. */
const TITLES: Record<string, string> = {
  "plane-line-ray-segment": "Line, ray and segment",
  "plane-parabola-points": "Parabola with marked points",
  "plane-rational-asymptotes": "Curve with asymptotes",
  "plane-linear-region": "Shaded half-plane",
  "plane-nonlinear-region": "Region above a parabola",
  "plane-system-region": "System of inequalities",
  "plane-circle-arc-polygon": "Circle with inscribed triangle",
  "geo-circle-chord": "Circle and chord",
  "geo-equal-ticks-arcs": "Equal sides and angles",
  "geo-parallel-segments": "Parallel sides",
  "geo-parallel-transversal": "Parallel lines and a transversal",
  "geo-rays-angle": "Rays and angles",
  "geo-right-triangle": "Right triangle",
  "geo-similar-triangles": "Similar triangles",
  "solid-cone": "Cone",
  "solid-cylinder": "Cylinder",
  "solid-prism": "Rectangular prism",
  "solid-pyramid": "Square pyramid",
  "solid-sphere": "Sphere",
  "solid-sat-cone-flat-a": "Wide cone (exam art 1)",
  "solid-sat-cone-flat-b": "Wide cone (exam art 2)",
  "solid-sat-cone-flat-c": "Wide cone (exam art 3)",
  "solid-sat-cone-tall": "Tall cone",
  "solid-sat-cylinder-plain": "Plain cylinder",
  "solid-sat-cylinder-r-h": "Cylinder with r and h",
  "solid-sat-pyramid-a": "Pyramid (exam art 1)",
  "solid-sat-pyramid-b": "Pyramid (exam art 2)",
  "solid-sat-pyramid-c": "Pyramid (exam art 3)",
  "solid-sat-pyramid-level": "Pyramid seen level",
  "bar-trees-planted": "Trees planted",
  "bar-painting-correlation": "Painting ratings",
  "bar-lake-ice-grouped": "Lake ice, grouped bars",
  "line-function-stars": "Star counts",
  "line-graph-growth": "Growth over time",
  "line-population-census": "Census population",
  "scatter-points": "Scatterplot",
  "scatter-best-fit": "Scatterplot with best fit",
  "scatter-best-fit-wide": "Wide scatterplot with best fit",
  "dot-plot-pets": "Pets per student",
  "dot-plot-scores": "Quiz scores",
  "dot-plot-titled": "Titled dot plot",
  "histogram-commute": "Commute times",
  "histogram-heights": "Plant heights",
  "histogram-unit-bins": "Unit bins",
  "box-bass-length": "Bass lengths",
  "box-two-classes": "Two classes",
  "box-units-sold": "Units sold",
  "table-coins-decimals": "US coins",
  "table-grouped-math": "Two data sets",
  "table-hours-note": "Hours, with a source note",
  "choices-line-graphs": "Answer choices: line graphs",
  "choices-right-triangles": "Answer choices: triangles",
};

// ---------------------------------------------------------------- rendering

let idCount = 0;
/** Each static render restarts React's id counter, so every figure's ids are made unique here. */
const uniqueIds = (markup: string) => {
  const n = ++idCount;
  return markup.replace(/figure-arrow-[A-Za-z0-9_-]+/g, (id) => `${id}-c${n}`);
};

const readJson = (name: string) =>
  JSON.parse(readFileSync(path.join(GOLDEN, `${name}.json`), "utf8")) as Record<string, unknown>;

function parsed(raw: unknown, where: string): FigureSpec {
  const result = parseFigureSpec(raw);
  if (!result.ok) throw new Error(`${where}: ${result.errors.join("; ")}`);
  return result.spec;
}

function svgOf(views: Views, spec: FigureSpec, scene: Scene, style: Style, className?: string) {
  const studio = style === "studio" ? studioLayer(spec, scene) : undefined;
  return renderToStaticMarkup(createElement(views.FigureView, { scene, className, style, studio }));
}

function renderFile(file: string, views: Views, style: Style): string {
  const doc = readJson(file);
  if (Array.isArray(doc.answer_choices)) {
    const choices = (doc.answer_choices as Record<string, unknown>[])
      .slice()
      .sort((a, b) => String(a.letter).localeCompare(String(b.letter)));
    const specs = choices.map((c, i) => parsed(c.choice_figure_spec, `${file} ${i}`));
    const scenes = choiceScenes(choices.map((c) => c.choice_figure_spec));
    const cells = choices.map((c, i) => {
      const scene = scenes[i];
      if (!scene) throw new Error(`${file}: a choice was not drawn`);
      const svg = svgOf(views, specs[i], scene, style);
      return `<div class="choice"><span class="badge">${String(c.letter)}</span><div class="choice-fig">${svg}</div></div>`;
    });
    return uniqueIds(`<div class="choices">${cells.join("")}</div>`);
  }
  const spec = parsed(doc.figure_spec, file);
  if (spec.type === "table") {
    return uniqueIds(renderToStaticMarkup(createElement(views.TableView, { spec, style })));
  }
  const scene = buildScene(spec, boxForWidth(spec, null));
  const svg = svgOf(views, spec, scene, style, "mx-auto block h-auto w-full max-w-full");
  return uniqueIds(`<div class="figure">${svg}</div>`);
}

// ---------------------------------------------------------------- page

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const THEMES = [
  { id: "ivory", mode: "light", label: "Light (ivory)" },
  { id: "observatory", mode: "dark", label: "Dark (observatory)" },
] as const;

const PAGE_CSS = `
*{box-sizing:border-box}
html{scroll-padding-top:120px}
body{margin:0;background:#eeece6;color:#23332f;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.5}
.bar{position:sticky;top:0;z-index:10;background:rgba(250,249,245,.94);backdrop-filter:blur(8px);border-bottom:1px solid #d6d2c6}
.bar-in{max-width:1560px;margin:0 auto;padding:10px 16px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center}
.bar h1{font-size:16px;margin:0;white-space:nowrap}
.links{display:flex;flex-wrap:wrap;gap:4px 12px;flex:1;min-width:0;font-size:13px}
.links a{color:#2e5a4c;text-decoration:none;white-space:nowrap}
.links a:hover{text-decoration:underline}
.toggle{display:flex;border:1px solid #b9b4a6;border-radius:8px;overflow:hidden}
.toggle button{font:600 13px/1 system-ui,sans-serif;border:0;background:transparent;padding:8px 12px;cursor:pointer;color:#23332f}
.toggle button+button{border-left:1px solid #b9b4a6}
.toggle button[aria-pressed="true"]{background:#23332f;color:#fafaf5}
.page{max-width:1560px;margin:0 auto;padding:24px 16px 80px}
.intro{margin:0 0 8px;color:#4a5a52;max-width:78ch}
h2{font-size:22px;margin:48px 0 8px;padding-top:16px;border-top:1px solid #c9c5b8}
.item{margin:0 0 40px}
.item h3{font-size:18px;margin:24px 0 2px}
.caption{margin:0 0 10px;font-size:15px;color:#3b4a44}
.heads,.row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.heads{margin-bottom:6px}
.heads p{margin:0;font:700 12px/1.2 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#56645d}
.row{margin-bottom:12px}
.cell{border-radius:12px;border:1px solid rgb(var(--k-bronze) / .6);padding:12px;min-width:0;display:flex;flex-direction:column}
.cell-label{font:600 11px/1 system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;margin:0 0 8px;opacity:.7}
.mobile-head{display:none}
.cell-body{flex:1;display:flex;align-items:center;justify-content:center;min-width:0}
.cell-body>*{min-width:0;max-width:100%}
.figure{width:100%}
.cell-body figure{margin:0}
.original .cell-body{flex-direction:column}
.original img{display:block;max-width:100%;max-height:520px;height:auto;margin:0 auto;border-radius:6px;background:#fff}
.dark-row .original img{filter:invert(1) hue-rotate(180deg)}
.no-original{font-size:14px;opacity:.75;text-align:center;padding:24px 8px;margin:0}
.original-id{font-size:11px;opacity:.6;margin:8px 0 0;text-align:center;word-break:break-all}
.choices{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%}
.choice{display:flex;align-items:flex-start;gap:6px;border:1px solid rgb(var(--k-bronze) / .5);border-radius:10px;padding:6px;background:rgb(var(--k-surface))}
.choice-fig{flex:1;min-width:0}
.choice-fig svg{display:block;width:100%;height:auto}
.badge{flex:none;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 12px/1 system-ui,sans-serif;background:rgb(var(--k-surface-raised));color:rgb(var(--k-ivory))}
body.only-light .dark-row,body.only-dark .light-row{display:none}
@media (max-width:700px){
  .heads{display:none}
  .row{grid-template-columns:1fr}
  .mobile-head{display:block}
  .bar h1{display:none}
  .links{order:2;flex-basis:100%;overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px}
  .page{padding-top:16px}
  .choices{grid-template-columns:1fr 1fr}
}
`;

const SCRIPT = `
(function(){
  var modes={both:"",light:"only-light",dark:"only-dark"};
  var buttons=document.querySelectorAll(".toggle button");
  function set(m){
    document.body.className=modes[m];
    buttons.forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.mode===m))});
    try{localStorage.setItem("figure-compare-mode",m)}catch(e){}
  }
  buttons.forEach(function(b){b.addEventListener("click",function(){set(b.dataset.mode)})});
  var saved=null;try{saved=localStorage.getItem("figure-compare-mode")}catch(e){}
  set(saved&&modes.hasOwnProperty(saved)?saved:"both");
})();`;

async function main() {
  const outDir = path.resolve(process.argv[2] ?? path.join(ROOT, "tmp/figure-compare"));
  (Module as unknown as { _extensions: Record<string, () => void> })._extensions[".css"] = () => {};
  const views: Views = {
    FigureView: (await import("@/components/learn/figures/FigureView")).default,
    TableView: (await import("@/components/learn/figures/TableView")).default,
  };
  const originals = JSON.parse(readFileSync(path.join(GOLDEN, "originals.json"), "utf8")) as Record<
    string,
    Original
  >;
  mkdirSync(path.join(outDir, "originals"), { recursive: true });
  // KaTeX, as the app loads it, for table cells typeset with MathText; its fonts beside the page.
  const katexDir = path.join(ROOT, "node_modules/katex/dist");
  cpSync(path.join(katexDir, "fonts"), path.join(outDir, "fonts"), { recursive: true });
  const katexCss = readFileSync(path.join(katexDir, "katex.min.css"), "utf8");

  let withOriginal = 0;
  let total = 0;
  let sections = "";
  for (const group of GROUPS) {
    sections += `<section id="group-${slug(group.title)}"><h2>${esc(group.title)}</h2>`;
    for (const item of group.items) {
      total++;
      const title = TITLES[item.file] ?? item.file;
      const original = originals[item.file];
      let originalHtml: string;
      if (original && existsSync(original.path)) {
        withOriginal++;
        const rel = `originals/${item.file}${path.extname(original.path)}`;
        // Copied out of the read-only pipeline folder; the source is never written.
        copyFileSync(original.path, path.join(outDir, rel));
        originalHtml =
          `<img src="${rel}" alt="Original exam figure for ${esc(title)}">` +
          `<p class="original-id">${esc(original.figureId)}</p>`;
      } else {
        originalHtml = `<p class="no-original">Composed example: no exam original.</p>`;
      }
      const rows = THEMES.map((t) => {
        // Rendered once per theme: a gradient's colors come from the theme around its own
        // definition, so each theme's figure needs its own ids.
        const bluebook = renderFile(item.file, views, "bluebook");
        const studio = renderFile(item.file, views, "studio");
        const cell = (label: string, body: string, extra = "") =>
          `<div class="cell theme theme-${t.id} ${extra}"><p class="cell-label"><span class="mobile-head">${label} · </span>${t.label}</p><div class="cell-body">${body}</div></div>`;
        return (
          `<div class="row ${t.mode}-row">` +
          cell("Original exam figure", originalHtml, "original") +
          cell("Bluebook version", bluebook) +
          cell("Studio version", studio) +
          `</div>`
        );
      }).join("");
      sections +=
        `<div class="item" id="${item.file}"><h3>${esc(title)}</h3><p class="caption">${esc(item.caption)}</p>` +
        `<div class="heads"><p>Original exam figure</p><p>Bluebook version</p><p>Studio version</p></div>` +
        rows +
        `</div>`;
    }
    sections += `</section>`;
  }

  const links = GROUPS.map((g) => `<a href="#group-${slug(g.title)}">${esc(g.title)}</a>`).join("");
  const body =
    `<header class="bar"><div class="bar-in"><h1>Figure comparison</h1><nav class="links" aria-label="Figure groups">${links}</nav>` +
    `<div class="toggle" role="group" aria-label="Theme"><button type="button" data-mode="light">Light</button><button type="button" data-mode="dark">Dark</button><button type="button" data-mode="both" aria-pressed="true">Both</button></div></div></header>` +
    `<main class="page"><p class="intro">All ${total} golden figures, three ways: the real exam figure (where one exists; ${withOriginal} of ${total} do), the Bluebook-style engine figure students see today, and the experimental studio look. Every figure is drawn by the real figure engine. In the dark rows the scanned originals are shown inverted.</p>` +
    sections +
    `</main>`;
  const tailwind = compileTailwind(body);
  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>Figure comparison</title><style>${katexCss}${tailwind}${fontFaces()}${themeCss()}${roleCss()}${PAGE_CSS}</style></head>` +
    `<body>${body}<script>${SCRIPT}</script></body></html>`;
  writeFileSync(path.join(outDir, "index.html"), html);
  console.log(`${total} figures, ${withOriginal} with an exam original`);
  console.log(`wrote ${path.join(outDir, "index.html")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
