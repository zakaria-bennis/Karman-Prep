// ============================================================
// extract-figures — second-pass companion to extract-with-gemini.mjs.
//
// PIPELINE
//   1. Reads a Gemini-extracted JSON file (the output of
//      extract-with-gemini.mjs).
//   2. For every row where has_figure=true:
//      a. Renders the source_page to PNG at 200 DPI via pdftoppm.
//      b. Sends the rendered page back to Gemini, asks for the
//         pixel bounding box of THIS question's figure (using the
//         figure_alt seed and question_text as context).
//      c. Crops the rendered page with sharp.
//      d. Polishes (normalise = autocontrast, sharpen, white pad,
//         resize cap at 1500 px). Matches KarmanGPT §14 polish_figure.
//      e. Uploads the polished PNG to R2.
//      f. Writes the public URL back to the row's image_url and the
//         alt-text seed to image_alt.
//   3. Persists the updated JSON in place + writes a side-by-side
//      log of every figure attempted.
//
// FALLBACK (per KarmanGPT §14 Step 3)
//   If bbox detection fails OR the crop looks degenerate, fall back
//   to whole-page rendering at 150 DPI as the image bytes and flag
//   the row needs_review with "whole-page fallback used".
//
// USAGE
//   node --env-file=.env.local \
//     scripts/pdf-pipeline/extract-figures.mjs \
//     question-imports/done/202603asiav1.pdf \
//     /tmp/202603asiav1-gemini-extracted.json
//
// COST
//   ~$0.001 per figure on gemini-3.5-flash. For a typical PDF with
//   ~30 figures: ~$0.03. For 100 PDFs: ~$3 in figure-extraction
//   API costs.
// ============================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, resolve, join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { callGemini, QuotaExhaustedError } from "../lib/llm-providers.mjs";

const [, , pdfArg, jsonArg] = process.argv;
if (!pdfArg || !jsonArg) {
  console.error(
    "Usage: node scripts/pdf-pipeline/extract-figures.mjs <pdf-path> <gemini-json-path>"
  );
  process.exit(1);
}
const pdfPath = resolve(pdfArg);
const jsonPath = resolve(jsonArg);
const pdfName = basename(pdfPath);
const pdfStem = pdfName.replace(/\.pdf$/i, "");

// ── Config ──────────────────────────────────────────────────
const RENDER_DPI = 200; // matches KarmanGPT §14 Step 2 default
const FALLBACK_DPI = 150; // §14 Step 3 whole-page fallback
const POLISH_PAD = 24; // matches §14 polish_figure(pad=24)
const MAX_LONGEST_SIDE = 1500; // §14 polish thumbnail cap
const R2_KEY_PREFIX = "question-figures";

// ── Env / R2 ────────────────────────────────────────────────
const required = [
  "GEMINI_API_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(", ")}`);
  process.exit(1);
}
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC = process.env.R2_PUBLIC_URL.replace(/\/$/, "");
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// ── Workdir for rendered pages ──────────────────────────────
const workdir = join(tmpdir(), `figure-extract-${pdfStem}-${Date.now()}`);
mkdirSync(workdir, { recursive: true });

// ── Read input JSON + identify candidates ───────────────────
const rows = JSON.parse(readFileSync(jsonPath, "utf-8"));
const candidates = rows.filter((r) => r.has_figure === true);
console.log(`Loaded ${rows.length} rows from ${jsonArg}`);
console.log(`Figure-bearing candidates: ${candidates.length}`);
if (candidates.length === 0) {
  console.log("Nothing to do — no rows flagged has_figure=true.");
  process.exit(0);
}

// ── Page render cache (avoid re-rendering same page) ────────
const pageRenderCache = new Map(); // source_page → {path, width, height}

function renderPage(page, dpi) {
  const cacheKey = `${page}@${dpi}`;
  if (pageRenderCache.has(cacheKey)) return pageRenderCache.get(cacheKey);
  const outPrefix = join(workdir, `page-${page}-${dpi}dpi`);
  // pdftoppm writes <prefix>-<N>.png by default. We render a single
  // page, so the output is <prefix>-<page>.png.
  const result = spawnSync(
    "pdftoppm",
    ["-f", String(page), "-l", String(page), "-r", String(dpi), "-png", pdfPath, outPrefix],
    { stdio: "pipe" }
  );
  if (result.status !== 0) {
    throw new Error(
      `pdftoppm failed for page ${page}: ${result.stderr?.toString() ?? "(no stderr)"}`
    );
  }
  // pdftoppm zero-pads the page suffix based on the total page count,
  // not the page number alone. Find the actual file it wrote.
  const padded = String(page).padStart(2, "0");
  const candidates = [
    `${outPrefix}-${page}.png`,
    `${outPrefix}-${padded}.png`,
    `${outPrefix}-${String(page).padStart(3, "0")}.png`,
  ];
  const pagePath = candidates.find((p) => existsSync(p));
  if (!pagePath) {
    throw new Error(`pdftoppm output not found. Tried: ${candidates.join(", ")}`);
  }
  return (async () => {
    const meta = await sharp(pagePath).metadata();
    const entry = { path: pagePath, width: meta.width, height: meta.height };
    pageRenderCache.set(cacheKey, entry);
    return entry;
  })();
}

// ── Bbox detection prompt builder ───────────────────────────
//
// Uses Gemini's documented NORMALIZED bbox format: [y_min, x_min,
// y_max, x_max] in a 0-1000 coordinate space. The model internally
// downscales the image, so absolute pixel coordinates don't work
// reliably; the normalized format is what Gemini is trained on for
// object/region detection. We convert to pixel coordinates on the
// caller side using actual image dimensions.
function buildBboxPrompt(row) {
  return `Identify the tight bounding box around the SAT question figure on this page.

QUESTION CONTEXT
question_text: ${(row.question_text ?? "").slice(0, 280)}
figure description: ${row.figure_alt ?? "(none)"}

WHAT TO BOUND
The figure is a chart, table, graph, geometry diagram, or coordinate plane that this specific question depends on.

  · INCLUDE: axis labels, tick marks, scales, legends, title, units, annotations on the figure.
  · EXCLUDE: question stem text, the four answer choices (A, B, C, D), page header/footer, page number, "Mark for Review" UI, module label, decorative whitespace beyond ~3% of the page.

If the page contains MULTIPLE figures, pick the one matching the figure description above.

OUTPUT FORMAT — Gemini's normalized bounding-box convention.

Return coordinates normalized to 0-1000 (NOT pixels). (0, 0) is top-left. Values 0-1000 represent fractions of the image dimensions × 1000.

Field order: y_min, x_min, y_max, x_max (y BEFORE x — this is Gemini's standard).

Constraints: 0 ≤ y_min < y_max ≤ 1000, 0 ≤ x_min < x_max ≤ 1000.

Return: { "y_min": <int>, "x_min": <int>, "y_max": <int>, "x_max": <int>, "confidence": <"high"|"medium"|"low">, "notes": <one-sentence note if uncertain> }.`;
}

// ── Polish helper (sharp equivalent of KarmanGPT polish_figure) ─
async function polishImage(buffer) {
  return await sharp(buffer)
    .normalise() // autocontrast equivalent (cutoff=1ish)
    .sharpen({ sigma: 1, m1: 1, m2: 1.2, x1: 3 }) // gentle unsharp mask
    .extend({
      top: POLISH_PAD,
      bottom: POLISH_PAD,
      left: POLISH_PAD,
      right: POLISH_PAD,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .resize(MAX_LONGEST_SIDE, MAX_LONGEST_SIDE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// ── R2 upload ───────────────────────────────────────────────
async function uploadToR2(key, buffer) {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return `${R2_PUBLIC}/${key}`;
}

// ── Main loop ───────────────────────────────────────────────
const summary = { ok: 0, fallback: 0, errored: 0 };
const figureLog = [];

for (let i = 0; i < candidates.length; i++) {
  const row = candidates[i];
  const slot = `[${i + 1}/${candidates.length}] p${row.source_page}`;
  process.stdout.write(`${slot} (${row.concept_slug})… `);

  try {
    // 1) Render the page
    const { path: pagePath, width, height } = await renderPage(row.source_page, RENDER_DPI);
    const pageBuf = readFileSync(pagePath);

    // 2) Ask Gemini for the bbox (in Gemini's 0-1000 normalized space)
    let bboxResult;
    try {
      bboxResult = await callGemini({
        prompt: buildBboxPrompt(row),
        model: "gemini-3.5-flash",
        image: { buf: pageBuf, mime: "image/png" },
        responseSchema: {
          type: "OBJECT",
          properties: {
            y_min: { type: "INTEGER" },
            x_min: { type: "INTEGER" },
            y_max: { type: "INTEGER" },
            x_max: { type: "INTEGER" },
            confidence: { type: "STRING", enum: ["high", "medium", "low"] },
            notes: { type: "STRING" },
          },
          required: ["y_min", "x_min", "y_max", "x_max", "confidence"],
        },
        thinkingBudget: 0,
        maxOutputTokens: 1024,
      });
    } catch (err) {
      if (err instanceof QuotaExhaustedError) {
        console.log("QUOTA EXHAUSTED — stopping");
        break;
      }
      throw err;
    }

    // 3) Convert 0-1000 normalized → absolute pixels using actual page dims
    const { y_min: ny1, x_min: nx1, y_max: ny2, x_max: nx2, confidence } = bboxResult;
    const x1 = Math.round((nx1 / 1000) * width);
    const y1 = Math.round((ny1 / 1000) * height);
    const x2 = Math.round((nx2 / 1000) * width);
    const y2 = Math.round((ny2 / 1000) * height);

    const validBbox =
      Number.isFinite(x1) &&
      Number.isFinite(y1) &&
      Number.isFinite(x2) &&
      Number.isFinite(y2) &&
      x1 >= 0 &&
      y1 >= 0 &&
      x2 > x1 &&
      y2 > y1 &&
      x2 <= width &&
      y2 <= height &&
      x2 - x1 >= 60 &&
      y2 - y1 >= 60;

    let polishedBuf;
    let usedFallback = false;
    if (validBbox && confidence !== "low") {
      // 4a) Tight crop + polish
      const cropped = await sharp(pageBuf)
        .extract({
          left: x1,
          top: y1,
          width: x2 - x1,
          height: y2 - y1,
        })
        .toBuffer();
      polishedBuf = await polishImage(cropped);
    } else {
      // 4b) Whole-page fallback (KarmanGPT §14 Step 3)
      usedFallback = true;
      const fallbackPage = await renderPage(row.source_page, FALLBACK_DPI);
      const fallbackBuf = readFileSync(fallbackPage.path);
      polishedBuf = await polishImage(fallbackBuf);
      row.import_status = "needs_review";
      row.import_flag_reason = `whole-page figure fallback used (bbox confidence=${confidence ?? "n/a"}, valid=${validBbox})`;
    }

    // 5) Upload to R2
    const key = `${R2_KEY_PREFIX}/${pdfStem}/p${row.source_page}-${i + 1}.png`;
    const url = await uploadToR2(key, polishedBuf);

    // 6) Attach back to the row
    row.image_url = url;
    row.image_alt = row.figure_alt || `Figure on page ${row.source_page}`;

    summary[usedFallback ? "fallback" : "ok"]++;
    figureLog.push({
      page: row.source_page,
      method: usedFallback ? "whole-page-fallback" : "vision-crop",
      confidence: confidence ?? "n/a",
      bbox: validBbox ? { x1, y1, x2, y2 } : null,
      bytes: polishedBuf.length,
      url,
    });

    console.log(
      `${usedFallback ? "FALLBACK" : "OK"} (${(polishedBuf.length / 1024).toFixed(0)} KB)${
        usedFallback ? "" : `, bbox=${x2 - x1}x${y2 - y1}`
      }`
    );
  } catch (err) {
    summary.errored++;
    console.log(`ERROR ${err instanceof Error ? err.message.slice(0, 80) : err}`);
    figureLog.push({ page: row.source_page, error: String(err).slice(0, 120) });
    if (row.import_status === "ok") {
      row.import_status = "needs_review";
      row.import_flag_reason = `figure extraction failed: ${String(err).slice(0, 100)}`;
    }
  }
}

// ── Persist updated JSON + log ──────────────────────────────
writeFileSync(jsonPath, JSON.stringify(rows, null, 2));
const logPath = jsonPath.replace(/\.json$/, "-figures-log.json");
writeFileSync(logPath, JSON.stringify(figureLog, null, 2));

console.log("");
console.log("═".repeat(72));
console.log(
  `Figures: ${summary.ok} tight crops, ${summary.fallback} whole-page fallbacks, ${summary.errored} errored`
);
console.log(`Updated JSON: ${jsonPath}`);
console.log(`Figure log:   ${logPath}`);
console.log(`Workdir (rendered pages): ${workdir}`);
