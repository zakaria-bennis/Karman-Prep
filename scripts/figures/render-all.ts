#!/usr/bin/env tsx
/**
 * Renders every figure spec in the browser, as students see it, and reports
 * what is wrong with it (figure engine spec §3 "Testing").
 *
 *   npx tsx scripts/figures/render-all.ts <input> [--base-url URL] [--out DIR] [--shots] [--only TEXT]
 *
 * <input> is either
 *   - a directory of figure.json files (searched recursively for *.json): each
 *     a bare FigureSpec, or a figure.json carrying `figure_spec` and/or
 *     `answer_choices[].choice_figure_spec` (the review lane's files and
 *     tests/fixtures/figures/golden), or
 *   - a JSON export of rows: question rows with `figure_spec` (and optionally
 *     `answer_choices[].choice_figure_spec`), and/or answer-choice rows with
 *     `question_id`, `letter` and `choice_figure_spec`, which are grouped by
 *     question.
 *
 * Every figure is opened on the dev-only page /dev/figure-render (a running
 * `npm run dev:next`, at --base-url, default http://localhost:3000) at the
 * phone, tablet and laptop widths (390, 820, 1280) in the light and dark
 * themes. On each render it checks:
 *   - overlap: two texts in one figure overlapping by more than 1px both ways;
 *   - clipped: anything drawn past its SVG's edge, or an SVG past its frame;
 *   - small_text: figure text under 12px on screen (SVG text scaled by its
 *     transform; table text by its computed size);
 *   - font: figure text not in the figure serif (--font-figure);
 *   - broken_word: a word in a table split over two lines (cells wrap only at spaces);
 *   - overflow: the page scrolling sideways;
 *   - not_drawn: the page drew no figure for the spec (invalid, or a builder threw).
 * Before the browser, each spec also runs the engine's own checks in Node
 * (checkSpec: what its builder reports, off-line points, arrowheads, clipping,
 * overlaps, and the labels against `transcribed_labels` when the file has
 * them), listed as `engine`.
 *
 * Writes <out>/issues.json (default out: tmp/figure-render) with one entry per
 * problem, and with --shots a PNG of each figure per width and theme under
 * <out>/shots/<id>/<width>-<theme>.png. Exit 0 when nothing is wrong, 1 when
 * any issue was found, 2 when the input cannot be read.
 *
 * Uses Playwright's browser directly (no test runner, so no globalSetup and
 * nothing is seeded) and never writes to the database.
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";
import { checkSpec } from "@/lib/figures/engine/checks";
import { CHOICE_BOX, choiceFrameIssues, isFramed, sharedFrame } from "@/lib/figures/engine/choices";
import type { Box } from "@/lib/figures/engine/index";
import type { SceneIssue } from "@/lib/figures/engine/scene";
import { parseFigureSpec, type FigureSpec } from "@/lib/figures/engine/spec";

export const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "laptop", width: 1280, height: 800 },
] as const;

// Site theme ids (src/lib/themes/palettes.ts): ivory is the light default, observatory the dark.
export const THEMES = [
  { name: "light", id: "ivory" },
  { name: "dark", id: "observatory" },
] as const;

const MIN_TEXT_PX = 12;

/** Page chrome that floats over content (the theme toggle, Next's dev badge), hidden in shots. */
const CHROME =
  'nextjs-portal, button[aria-label="Toggle light and dark mode"] { visibility: hidden !important; }';

type Figure = {
  id: string;
  source: string;
  figure_spec?: unknown;
  /** The original's transcription (every text printed in it), when the file has one. */
  labels?: string[];
  choices?: unknown[];
  choiceLabels?: (string[] | undefined)[];
};
export type RenderIssue = {
  id: string;
  source: string;
  code:
    | "engine"
    | "overlap"
    | "clipped"
    | "small_text"
    | "font"
    | "broken_word"
    | "overflow"
    | "not_drawn";
  detail: string;
  width?: number;
  theme?: string;
};

class InputError extends Error {}

// ---------------------------------------------------------------- input

type Doc = Record<string, unknown>;
const isDoc = (v: unknown): v is Doc => !!v && typeof v === "object" && !Array.isArray(v);

const strings = (v: unknown) =>
  Array.isArray(v) && v.every((s) => typeof s === "string") ? (v as string[]) : undefined;

/** One figure.json (or bare spec) as the figures it holds. */
function fromDoc(doc: Doc, id: string, source: string): Figure | null {
  if ("version" in doc) return { id, source, figure_spec: doc };
  const figure: Figure = { id, source };
  if (doc.figure_spec != null) {
    figure.figure_spec = doc.figure_spec;
    figure.labels = strings(doc.transcribed_labels);
  }
  const list = Array.isArray(doc.answer_choices) ? doc.answer_choices.filter(isDoc) : [];
  const sorted = [...list].sort((a, b) => String(a.letter).localeCompare(String(b.letter)));
  if (sorted.some((c) => c.choice_figure_spec != null)) {
    figure.choices = sorted.map((c) => c.choice_figure_spec ?? null);
    figure.choiceLabels = sorted.map((c) => strings(c.transcribed_labels));
  }
  return figure.figure_spec != null || figure.choices ? figure : null;
}

function jsonFiles(dir: string): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return name.startsWith(".") ? [] : jsonFiles(full);
      return name.endsWith(".json") ? [full] : [];
    });
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new InputError(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Every figure in a directory of figure.json files or a JSON export of rows. */
export function readFigures(input: string): Figure[] {
  if (statSync(input).isDirectory()) {
    return jsonFiles(input).flatMap((file) => {
      const doc = readJson(file);
      const rel = path.relative(input, file);
      // A review-lane folder's figure.json is named by its folder.
      const id = (path.basename(file) === "figure.json" ? path.dirname(rel) : rel).replace(
        /\.json$/,
        ""
      );
      const fig = isDoc(doc) ? fromDoc(doc, id.split(path.sep).join("/"), file) : null;
      return fig ? [fig] : [];
    });
  }
  const rows = readJson(input);
  if (!Array.isArray(rows))
    throw new InputError(`${input}: an export must be a JSON array of rows`);
  const byId = new Map<string, Figure>();
  const loose = new Map<string, Map<string, unknown>>();
  rows.filter(isDoc).forEach((row, i) => {
    if (
      row.question_id != null &&
      row.choice_figure_spec !== undefined &&
      row.figure_spec === undefined
    ) {
      const qid = String(row.question_id);
      const set = loose.get(qid) ?? new Map<string, unknown>();
      set.set(String(row.letter ?? set.size), row.choice_figure_spec);
      loose.set(qid, set);
      return;
    }
    const id = String(row.id ?? `row-${i + 1}`);
    const fig = fromDoc(row, id, input);
    if (fig) byId.set(id, fig);
  });
  for (const [qid, set] of loose) {
    const choices = [...set].sort(([a], [b]) => a.localeCompare(b)).map(([, s]) => s);
    if (!choices.some((c) => c != null)) continue;
    const fig = byId.get(qid) ?? { id: qid, source: input };
    fig.choices = choices;
    byId.set(qid, fig);
  }
  return [...byId.values()];
}

// ---------------------------------------------------------------- engine (Node)

/**
 * The engine's own checks (checkSpec), before any browser. With the original's
 * transcription (`transcribed_labels`) every check runs; without one, the
 * comparison with it is skipped (an invented label cannot be told apart).
 */
function checked(spec: FigureSpec, labels: string[] | undefined, box?: Box): SceneIssue[] {
  const issues = checkSpec(spec, labels ?? [], box);
  if (labels) return issues;
  return issues.filter(
    (i) => !(i.code === "missing_label" && i.detail.includes("not in original"))
  );
}

const line = (i: SceneIssue, where = "") =>
  `${where}${i.code}${i.partId ? ` (${i.partId})` : ""}: ${i.detail}`;

/** What the engine itself reports for a figure, before any browser. */
function engineIssues(fig: Figure): string[] {
  const out: string[] = [];
  const parse = (raw: unknown, where: string): FigureSpec | null => {
    const parsed = parseFigureSpec(raw);
    if (parsed.ok) return parsed.spec;
    out.push(`${where}invalid spec: ${parsed.errors.join("; ")}`);
    return null;
  };
  const run = (where: string, check: () => SceneIssue[]) => {
    try {
      out.push(...check().map((i) => line(i, where)));
    } catch (error) {
      out.push(`${where}${error instanceof Error ? error.message : String(error)}`);
    }
  };
  if (fig.figure_spec != null) {
    const spec = parse(fig.figure_spec, "");
    if (spec) run("", () => checked(spec, fig.labels));
  }
  if (fig.choices) {
    const specs = fig.choices.map((raw, i) =>
      raw == null ? null : parse(raw, `choice ${"ABCD"[i]}: `)
    );
    // Choices are drawn in one frame, so each is checked in it (as check-spec.ts does).
    const framed = specs.filter((s): s is FigureSpec => !!s && isFramed(s));
    const frame = framed.length ? sharedFrame(framed) : null;
    // A set sampled outside its shared frame is never drawn.
    run("choices: ", () => choiceFrameIssues(specs));
    specs.forEach((spec, i) => {
      if (!spec) return;
      const drawn = frame && isFramed(spec) ? { ...spec, frame } : spec;
      run(`choice ${"ABCD"[i]}: `, () => checked(drawn, fig.choiceLabels?.[i], CHOICE_BOX));
    });
  }
  return out;
}

// ---------------------------------------------------------------- browser

type PageFinding = { code: RenderIssue["code"]; detail: string };

/** The in-page checks, run on one render. Returns what is wrong. */
function inspect(minText: number): PageFinding[] {
  const out: PageFinding[] = [];
  const root = document.querySelector("[data-question-layout]");
  if (!root) return [{ code: "not_drawn", detail: "the page drew no question" }];
  const figures = [...root.querySelectorAll<SVGSVGElement>("svg[role=img]")].filter((s) =>
    s.closest("figure, [data-figure-choices]")
  );
  const tables = [...root.querySelectorAll<HTMLTableElement>("table")];
  if (!figures.length && !tables.length)
    out.push({ code: "not_drawn", detail: "no figure on the page" });

  const label = (el: Element) => `"${(el.textContent ?? "").trim().slice(0, 40)}"`;
  figures.forEach((svg, n) => {
    const where = `figure ${n + 1}`;
    const box = svg.getBoundingClientRect();
    const frame = svg.closest("figure, [data-figure-choice]")?.getBoundingClientRect();
    if (frame && (box.left < frame.left - 0.5 || box.right > frame.right + 0.5)) {
      out.push({ code: "clipped", detail: `${where}: the SVG runs past its frame` });
    }
    const texts = [...svg.querySelectorAll<SVGTextElement>("text")].filter((t) =>
      t.textContent?.trim()
    );
    const rects = texts.map((t) => t.getBoundingClientRect());
    // Every label in the figure serif (--font-figure), never the surrounding UI font.
    const serif = getComputedStyle(svg)
      .getPropertyValue("--font-figure")
      .split(",")[0]
      .trim()
      .replace(/["']/g, "");
    const off = texts.find((t) => serif && !getComputedStyle(t).fontFamily.includes(serif));
    if (off)
      out.push({ code: "font", detail: `${where}: ${label(off)} is not in the figure serif` });
    texts.forEach((t, i) => {
      const ctm = t.getScreenCTM();
      const px = parseFloat(getComputedStyle(t).fontSize) * (ctm ? Math.hypot(ctm.a, ctm.b) : 1);
      if (px < minText - 0.05) {
        out.push({ code: "small_text", detail: `${where}: ${label(t)} is ${px.toFixed(1)}px` });
      }
      for (let j = i + 1; j < texts.length; j++) {
        const a = rects[i];
        const b = rects[j];
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        // Glyph boxes include line spacing; count only real ink overlap.
        if (w > 1 && h > Math.min(a.height, b.height) * 0.35) {
          out.push({
            code: "overlap",
            detail: `${where}: ${label(t)} and ${label(texts[j])} overlap`,
          });
        }
      }
    });
    for (const el of svg.querySelectorAll<SVGGraphicsElement>("path, rect, text, circle")) {
      if (el.closest("defs, marker")) continue;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      const past = Math.max(
        box.left - r.left,
        r.right - box.right,
        box.top - r.top,
        r.bottom - box.bottom
      );
      if (past > 0.5) {
        const what =
          el.tagName === "text"
            ? label(el)
            : `a ${el.tagName}${el.dataset.part ? ` (${el.dataset.part})` : ""}`;
        out.push({
          code: "clipped",
          detail: `${where}: ${what} is drawn ${past.toFixed(1)}px past the edge`,
        });
      }
    }
  });
  tables.forEach((table, n) => {
    for (const cell of table.querySelectorAll<HTMLElement>("th, td, caption")) {
      if (!cell.textContent?.trim()) continue;
      const px = parseFloat(getComputedStyle(cell).fontSize);
      if (px < minText - 0.05) {
        out.push({
          code: "small_text",
          detail: `table ${n + 1}: ${label(cell)} is ${px.toFixed(1)}px`,
        });
      }
      // A word split over two lines ("Seign / iorage"): cells wrap only at spaces.
      const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement?.closest(".katex")) continue;
        for (const m of (node.textContent ?? "").matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(node, m.index ?? 0);
          range.setEnd(node, (m.index ?? 0) + m[0].length);
          const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
          if (lines.size > 1) {
            out.push({
              code: "broken_word",
              detail: `table ${n + 1}: "${m[0]}" breaks across lines`,
            });
          }
        }
      }
    }
  });
  const sideways = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  if (sideways > 0)
    out.push({ code: "overflow", detail: `the page scrolls ${sideways}px sideways` });
  // One problem reported once per render.
  return out.filter(
    (f, i) => out.findIndex((g) => g.code === f.code && g.detail === f.detail) === i
  );
}

/** Opens the dev page on `fig` and waits for it to be drawn in `theme` with its fonts. */
async function open(page: Page, baseUrl: string, fig: Figure, theme: (typeof THEMES)[number]) {
  await page.goto(`${baseUrl}/dev/figure-render`);
  const main = page.locator("[data-figure-render]");
  await main.waitFor();
  const shownId = await main.getAttribute("data-figure-render");
  if (shownId !== fig.id) throw new Error(`the page rendered ${shownId}, not ${fig.id}`);
  const shown = await page.evaluate(() => document.documentElement.dataset.theme);
  if (shown !== theme.id)
    throw new Error(`the page did not take the ${theme.name} theme (${shown})`);
  await page.evaluate(() => document.fonts.ready);
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args.splice(i, 2)[1] : undefined;
  };
  const baseUrl = (flag("--base-url") ?? "http://localhost:3000").replace(/\/$/, "");
  const outDir = flag("--out") ?? "tmp/figure-render";
  const only = flag("--only");
  const shotsAt = args.indexOf("--shots");
  const shots = shotsAt >= 0 && !!args.splice(shotsAt, 1);
  const input = args[0];
  if (!input)
    throw new InputError(
      "usage: npx tsx scripts/figures/render-all.ts <dir or export.json> [--base-url URL] [--out DIR] [--shots] [--only TEXT]"
    );

  const figures = readFigures(input).filter((f) => !only || f.id.includes(only));
  if (!figures.length) throw new InputError(`${input}: no figure specs found`);
  mkdirSync(outDir, { recursive: true });

  const issues: RenderIssue[] = [];
  for (const fig of figures) {
    for (const detail of engineIssues(fig))
      issues.push({ id: fig.id, source: fig.source, code: "engine", detail });
  }

  const browser = await chromium.launch();
  try {
    for (const theme of THEMES) {
      const context = await browser.newContext();
      // Replay consent declined up front, so its banner never covers a figure.
      await context.addCookies([{ name: "karman_replay_consent", value: "no", url: baseUrl }]);
      // tsx names functions with a __name helper; the in-page checks need it defined there.
      await context.addInitScript("globalThis.__name = (f) => f;");
      await context.addInitScript((id) => {
        try {
          localStorage.setItem("karman-theme:visitor", id);
          localStorage.setItem("karman-theme:active", id);
        } catch {
          /* the bootstrap falls back to the default theme */
        }
      }, theme.id);
      for (const fig of figures) {
        // A fresh page per figure, so only this figure's payload is set before load.
        const page = await context.newPage();
        const payload = { id: fig.id, figure_spec: fig.figure_spec, choices: fig.choices };
        await page.addInitScript((p) => {
          (window as unknown as { __FIGURE_RENDER__: unknown }).__FIGURE_RENDER__ = p;
        }, payload);
        for (const size of WIDTHS) {
          await page.setViewportSize({ width: size.width, height: size.height });
          await open(page, baseUrl, fig, theme);
          for (const f of await page.evaluate(inspect, MIN_TEXT_PX)) {
            issues.push({
              id: fig.id,
              source: fig.source,
              ...f,
              width: size.width,
              theme: theme.name,
            });
          }
          if (shots) {
            const dir = path.join(outDir, "shots", fig.id);
            mkdirSync(dir, { recursive: true });
            // The figure itself: the question figure, else the figure choices.
            await page
              .locator(
                "[data-question-layout] figure, [data-question-layout] [data-figure-choices]"
              )
              .first()
              .screenshot({
                path: path.join(dir, `${size.width}-${theme.name}.png`),
                style: CHROME,
              });
          }
        }
        await page.close();
        process.stderr.write(`${theme.name} ${fig.id}\n`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const report = {
    renderedAt: new Date().toISOString(),
    input,
    figures: figures.length,
    renders: figures.length * WIDTHS.length * THEMES.length,
    issues,
  };
  writeFileSync(path.join(outDir, "issues.json"), `${JSON.stringify(report, null, 2)}\n`);
  const counts = new Map<string, number>();
  for (const i of issues) counts.set(i.code, (counts.get(i.code) ?? 0) + 1);
  process.stdout.write(
    `${figures.length} figures, ${report.renders} renders, ${issues.length} issues` +
      (issues.length ? ` (${[...counts].map(([c, n]) => `${c} ${n}`).join(", ")})` : "") +
      ` → ${path.join(outDir, "issues.json")}\n`
  );
  process.exit(issues.length ? 1 : 0);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(error instanceof InputError ? 2 : 3);
});
