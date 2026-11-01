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
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { choiceScenes } from "@/lib/figures/engine/choices";
import { boxForWidth, buildScene } from "@/lib/figures/engine/index";
import { parseFigureSpec } from "@/lib/figures/engine/spec";
import {
  compileTailwind,
  fontFaces,
  GOLDEN,
  GROUPS,
  ROOT,
  roleCss,
  themeCss,
} from "./gallery-shared";

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
