// Rendered checks of every live question (the live-question QA audit, step 2).
//
// Opens /dev/qa-render?id=<id> (the real catalog question screen, dark, nothing chosen) for
// every live row of the full QA export (one page load per worker, then each question is
// swapped in by window.__qaLoad and mounts fresh), at a 1280x800 laptop and a 390x844 phone, in one
// browser with a few reused pages. Scroll containers inside the question are opened up first
// (as figure-snapshot.mjs does), so the screenshot shows the whole passage, figure, stem and
// choices. Per question and viewport it records:
//   console_error / page_error    React or other errors logged while rendering
//   katex_error                   .katex-error spans
//   page_overflow                 document scrollWidth > clientWidth (sideways page scroll)
//   element_overflow              an element sticking out past the question card
//   inner_horizontal_scroll       a box that has to be scrolled sideways to read it
//   image_failed                  an <img> that did not load, or a failed image request
//   figure_missing / figure_empty a figure the row has but the screen does not draw, or draws at zero size
//   text_overlap                  choice text under the choice tool buttons, or block siblings overlapping
//   empty_column                  the figure/passage column is laid out but empty
//   render_failed                 the route did not render (HTTP error, timeout)
// Screenshots: <out>/render/<id>.png (laptop) and <out>/render-mobile/<id>.png (phone).
// Results go to <out>/render-results.jsonl as they finish, so a stopped run resumes where it
// left off (--redo renders again); <out>/render-report.json is rebuilt at the end.
//
// usage: node scripts/import-tools/qa/render-audit.mjs --export <live-full.json> --out <qa dir>
//          --base http://127.0.0.1:<port> [--concurrency 5] [--ids a,b] [--limit n] [--redo]
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inspectPage } from "./render-inspect.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");
const sharp = require("sharp");

function args(argv) {
  const a = { concurrency: 5, limit: Infinity, redo: false, ids: null };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--redo") a.redo = true;
    else if (k === "--export") a.export = argv[++i];
    else if (k === "--out") a.out = argv[++i];
    else if (k === "--base") a.base = argv[++i].replace(/\/$/, "");
    else if (k === "--concurrency") a.concurrency = Math.max(1, Math.min(8, Number(argv[++i])));
    else if (k === "--limit") a.limit = Number(argv[++i]);
    else if (k === "--ids") a.ids = argv[++i].split(",").filter(Boolean);
    else throw new Error(`unknown argument ${k}`);
  }
  if (!a.export || !a.out || !a.base) throw new Error("need --export, --out and --base");
  return a;
}

const VIEWS = [
  { name: "laptop", dir: "render", viewport: { width: 1280, height: 800 }, isMobile: false },
  { name: "phone", dir: "render-mobile", viewport: { width: 390, height: 844 }, isMobile: true },
];
const RECYCLE = 250;

const opt = args(process.argv.slice(2));
const doc = JSON.parse(readFileSync(opt.export, "utf8"));
const live = new Map(doc.rows.filter((r) => r.is_live === true).map((r) => [r.id, r]));
for (const v of VIEWS) mkdirSync(path.join(opt.out, v.dir), { recursive: true });
const resultsFile = path.join(opt.out, "render-results.jsonl");

function readResults() {
  const byId = new Map();
  if (!existsSync(resultsFile)) return byId;
  for (const line of readFileSync(resultsFile, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      byId.set(r.id, r);
    } catch {
      /* a line cut off by a stopped run */
    }
  }
  return byId;
}

const done = readResults();
let ids = opt.ids ?? [...live.keys()].sort();
ids = ids.filter((id) => live.has(id));
const todo = ids
  .filter(
    (id) =>
      opt.redo ||
      !done.has(id) ||
      done.get(id).render_failed ||
      !VIEWS.every((v) => existsSync(path.join(opt.out, v.dir, `${id}.png`)))
  )
  .slice(0, opt.limit);
console.log(JSON.stringify({ live: live.size, selected: ids.length, todo: todo.length }));

/** What the row should show as a figure, from its columns (the screen must draw it). */
function expectedFigure(row) {
  if (row.figure_kind === "table" && row.figure_table_data) return "table";
  if (row.figure_kind === "chart" && row.figure_chart_data) return "chart";
  if (row.figure_kind === "geometric" && row.figure_geometry_data) return "geometry";
  if (row.image_url) return "image";
  if (row.figure_kind === "image" && row.figure_svg) return "svg";
  return null;
}

const browser = await chromium.launch();
const contexts = await Promise.all(
  VIEWS.map((v) =>
    browser.newContext({
      viewport: v.viewport,
      deviceScaleFactor: 1,
      isMobile: v.isMobile,
      hasTouch: v.isMobile,
      colorScheme: "dark",
      reducedMotion: "reduce",
    })
  )
);

async function newPage(ctx) {
  const page = await ctx.newPage();
  page.qa = { console: [], errors: [], badRequests: [] };
  page.on("console", (m) => {
    if (m.type() === "error") page.qa.console.push(m.text().slice(0, 400));
  });
  page.on("pageerror", (e) => page.qa.errors.push(String(e.message || e).slice(0, 400)));
  page.on("requestfailed", (r) => {
    if (r.resourceType() === "image")
      page.qa.badRequests.push(`${r.url().slice(0, 160)} ${r.failure()?.errorText ?? ""}`);
  });
  page.on("response", (r) => {
    if (r.request().resourceType() === "image" && r.status() >= 400)
      page.qa.badRequests.push(`${r.url().slice(0, 160)} HTTP ${r.status()}`);
  });
  // Not part of the question: the analytics consent banner and Next's dev indicator.
  await page.addInitScript(() => {
    const css = document.createElement("style");
    css.textContent =
      "[aria-labelledby='replay-consent-title'], nextjs-portal { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => document.head.appendChild(css));
  });
  return page;
}

async function smallPng(buf) {
  return sharp(buf).png({ palette: true, quality: 85, compressionLevel: 9, effort: 4 }).toBuffer();
}

async function renderOne(page, view, row) {
  page.qa.console.length = page.qa.errors.length = page.qa.badRequests.length = 0;
  await page.setViewportSize(view.viewport);
  // The first question loads the page; later ones are swapped in without a reload.
  const swapped =
    page.qa.loaded && (await page.evaluate((id) => window.__qaLoad?.(id) ?? false, row.id));
  if (!swapped) {
    const res = await page.goto(`${opt.base}/dev/qa-render?id=${encodeURIComponent(row.id)}`, {
      waitUntil: "load",
      timeout: 120000,
    });
    if (!res || !res.ok()) throw new Error(`render route ${res ? res.status() : "no response"}`);
    page.qa.loaded = true;
  }
  await page.waitForSelector(`#qa-render[data-qa-id="${row.id}"] [data-catalog-question-id]`, {
    timeout: 30000,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((i) =>
        i.complete ? null : new Promise((r) => ((i.onload = i.onerror = r), setTimeout(r, 15000)))
      )
    );
  });
  // FigureFrame fetches and inlines SVG files after mount.
  await page.waitForTimeout(250);
  const found = await page.evaluate(inspectPage, { expected: expectedFigure(row) });
  const box = await page.locator("#qa-render").boundingBox();
  if (box && box.height + box.y + 16 > view.viewport.height)
    await page.setViewportSize({
      width: view.viewport.width,
      height: Math.ceil(box.y + box.height + 16),
    });
  const shot = await page.locator("#qa-render").screenshot({ type: "png", animations: "disabled" });
  writeFileSync(path.join(opt.out, view.dir, `${row.id}.png`), await smallPng(shot));
  const failures = { ...found.failures };
  const put = (k, v) => (failures[k] ??= []).push(v);
  for (const e of page.qa.errors) put("page_error", e);
  for (const e of page.qa.console) put("console_error", e);
  for (const e of page.qa.badRequests) put("image_failed", e);
  return { failures, info: found.info };
}

let finished = 0;
const started = Date.now();
async function worker(queue) {
  const pages = await Promise.all(contexts.map(newPage));
  let n = 0;
  while (queue.length) {
    const id = queue.shift();
    const row = live.get(id);
    const result = { id, views: {}, failures: {} };
    for (let v = 0; v < VIEWS.length; v++) {
      const view = VIEWS[v];
      let attempt = 0;
      for (;;) {
        try {
          const r = await renderOne(pages[v], view, row);
          result.views[view.name] = r.info;
          for (const [k, list] of Object.entries(r.failures))
            for (const d of list) (result.failures[k] ??= []).push(`${view.name}: ${d}`);
          break;
        } catch (e) {
          await pages[v].close().catch(() => undefined);
          pages[v] = await newPage(contexts[v]);
          if (++attempt < 2) continue;
          (result.failures.render_failed ??= []).push(
            `${view.name}: ${String(e.message || e).split("\n")[0]}`
          );
          result.render_failed = true;
          break;
        }
      }
    }
    appendFileSync(resultsFile, JSON.stringify(result) + "\n");
    finished++;
    if (finished % 100 === 0) {
      const rate = finished / ((Date.now() - started) / 1000);
      console.log(JSON.stringify({ finished, of: todo.length, per_second: +rate.toFixed(2) }));
    }
    if (++n % RECYCLE === 0) {
      for (let v = 0; v < pages.length; v++) {
        await pages[v].close().catch(() => undefined);
        pages[v] = await newPage(contexts[v]);
      }
    }
  }
  await Promise.all(pages.map((p) => p.close().catch(() => undefined)));
}

const queue = [...todo];
await Promise.all(Array.from({ length: opt.concurrency }, () => worker(queue)));
await browser.close();

// The report always covers every live id of the export (whatever this run selected).
ids = [...live.keys()].sort();
const all = readResults();
const checks = {};
const questions = {};
let renderFailed = 0;
let rendered = 0;
for (const id of ids) {
  const r = all.get(id);
  if (!r) continue;
  rendered += r.render_failed ? 0 : 1;
  renderFailed += r.render_failed ? 1 : 0;
  if (Object.keys(r.failures).length) questions[id] = { failures: r.failures, views: r.views };
  for (const k of Object.keys(r.failures)) {
    checks[k] ??= { count: 0, ids: [] };
    checks[k].count++;
    checks[k].ids.push(id);
  }
}
const report = {
  export: opt.export,
  base: opt.base,
  totals: {
    expected: ids.length,
    with_result: ids.filter((id) => all.has(id)).length,
    rendered,
    render_failed: renderFailed,
    failing: Object.keys(questions).length,
  },
  checks,
  questions,
};
writeFileSync(path.join(opt.out, "render-report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report.totals));
