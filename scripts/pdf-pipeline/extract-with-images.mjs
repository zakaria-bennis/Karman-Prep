// ============================================================
// extract-with-images — Stage 1 question extractor, IMAGE path.
//
// An alternative to extract-with-gemini.mjs (the TEXT path). Instead of
// feeding Kimi Moonshot's file-extract TEXT — which silently drops pages
// when the source PDF has a damaged xref — this renders the PDF to page
// images and sends them to Kimi K2.5's vision model in batches. The page
// renderer (pdftoppm) reconstructs the broken xref, so the images bypass
// every xref-sensitive parser in the chain.
//
// Flow:
//   1. Render the PDF to page PNGs with pdftoppm (or reuse --pages-dir).
//   2. Batch the pages (default 10/call, 1-page overlap for questions
//      that straddle a batch boundary).
//   3. Call kimi-k2.5 vision per batch, with bounded concurrency — each
//      returns the questions visible in its pages.
//   4. Merge: dedup by (section, module, question_number), keeping the
//      most complete copy; sort by page; reassign a global
//      extraction_order.
//   5. Normalize (deriveTopicClusters) + validate (validateExtraction),
//      same as the text path.
//
// USAGE
//   node --env-file=.env.local scripts/pdf-pipeline/extract-with-images.mjs \
//     <pdf> [--pages-dir <dir>] [--batch 10] [--overlap 1] [--concurrency 5]
//
// Output: /tmp/<stem>-images-extracted.json
// ============================================================

import { readFileSync, writeFileSync, readdirSync, mkdtempSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import {
  callMoonshotVision,
  callOpenAIVision,
  QuotaExhaustedError,
} from "../lib/llm-providers.mjs";
import { buildPageBatchUserPrompt, loadStage1SystemPrompt } from "../lib/extraction-prompt.mjs";
import {
  deriveTopicClusters,
  validateExtraction,
  flagRowsNeedingReview,
  formatValidationReport,
} from "../lib/extraction-validation.mjs";

// ── args ──
const argv = process.argv.slice(2);
const pdfArg = argv.find((a) => !a.startsWith("--"));
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
if (!pdfArg) {
  console.error(
    "Usage: node scripts/pdf-pipeline/extract-with-images.mjs <pdf> [--pages-dir <dir>] [--batch 10] [--overlap 1] [--concurrency 5]"
  );
  process.exit(1);
}
const BATCH = parseInt(flag("batch", "10"), 10);
const OVERLAP = parseInt(flag("overlap", "1"), 10);
const CONCURRENCY = parseInt(flag("concurrency", "5"), 10);
const pagesDir = flag("pages-dir", null);
const PROVIDER = flag("provider", "moonshot"); // "moonshot" (kimi-k2.5) | "openai" (gpt-5.5)
const MODEL = flag("model", PROVIDER === "openai" ? "gpt-5.5" : "kimi-k2.5");
const visionCall = PROVIDER === "openai" ? callOpenAIVision : callMoonshotVision;
const MAX_OUTPUT = PROVIDER === "openai" ? 32768 : 16384;
const pdfName = basename(pdfArg);

// ── 1. page images ──
const naturalSortPngs = (dir) =>
  readdirSync(dir)
    .filter((f) => /\.png$/i.test(f))
    .sort((a, b) => {
      const na = parseInt((a.match(/(\d+)/) || [])[1] ?? "0", 10);
      const nb = parseInt((b.match(/(\d+)/) || [])[1] ?? "0", 10);
      return na - nb;
    })
    .map((f) => join(dir, f));

let pngPaths;
if (pagesDir) {
  console.log(`Using pre-rendered pages from ${pagesDir}`);
  pngPaths = naturalSortPngs(pagesDir);
} else {
  const outDir = mkdtempSync(join(tmpdir(), "pages-"));
  console.log(`Rendering ${pdfName} → PNGs (pdftoppm, 150 DPI) in ${outDir} …`);
  execFileSync("pdftoppm", ["-png", "-r", "150", pdfArg, join(outDir, "page")], {
    stdio: "inherit",
  });
  pngPaths = naturalSortPngs(outDir);
}
if (pngPaths.length === 0) {
  console.error("No page images found.");
  process.exit(1);
}
console.log(`${pngPaths.length} page image(s).`);

// ── 2. batches (sliding window with overlap) ──
const stride = Math.max(1, BATCH - OVERLAP);
const batches = [];
for (let start = 0; start < pngPaths.length; start += stride) {
  const slice = pngPaths
    .slice(start, start + BATCH)
    .map((path, idx) => ({ path, page: start + idx + 1 }));
  batches.push(slice);
  if (start + BATCH >= pngPaths.length) break;
}
console.log(`${batches.length} batch(es) of up to ${BATCH} pages (overlap ${OVERLAP}).`);

const systemPrompt = loadStage1SystemPrompt();

// ── 3. vision calls, bounded concurrency ──
async function runBatch(batch, i, attempt = 1) {
  const pages = batch.map((b) => b.page);
  const label = `pages ${pages[0]}-${pages[pages.length - 1]}`;
  const images = batch.map((b) => ({ buffer: readFileSync(b.path), mimeType: "image/png" }));
  try {
    const result = await visionCall({
      prompt: buildPageBatchUserPrompt(pages),
      images,
      systemPrompt,
      model: MODEL,
      maxOutputTokens: MAX_OUTPUT,
    });
    const qs = Array.isArray(result)
      ? result
      : Array.isArray(result?.questions)
        ? result.questions
        : [];
    console.log(`  batch ${i + 1}/${batches.length} (${label}): ${qs.length} questions`);
    return qs;
  } catch (err) {
    // Rate-limit / quota errors are often transient TPM throttling
    // (large image batches burn tokens-per-minute fast). Back off and
    // retry so a throttled batch doesn't silently drop ~10 questions.
    // insufficient_quota (out of credits / billing) is TERMINAL — retrying
    // is futile. Only transient rate-limits (429 TPM throttling) are worth
    // backing off and retrying.
    const terminalQuota =
      err instanceof QuotaExhaustedError && /insufficient_quota|billing/i.test(err.message);
    if (err instanceof QuotaExhaustedError && !terminalQuota && attempt <= 5) {
      const delay = 20000 * attempt; // 20s, 40s, 60s, 80s, 100s
      console.error(
        `  batch ${i + 1} (${label}): ${PROVIDER} rate-limited — retry ${attempt}/5 in ${delay / 1000}s`
      );
      await new Promise((r) => setTimeout(r, delay));
      return runBatch(batch, i, attempt + 1);
    }
    const why = terminalQuota
      ? `${PROVIDER} out of quota/credits (insufficient_quota) — not retryable, add credits`
      : err instanceof QuotaExhaustedError
        ? `${PROVIDER} rate-limit still exhausted after retries`
        : err.message;
    console.error(`  batch ${i + 1} (${label}) FAILED: ${why}`);
    return [];
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

console.log(
  `Calling ${MODEL} (${PROVIDER}) vision on ${batches.length} batches (concurrency ${CONCURRENCY}) …`
);
const t0 = Date.now();
const batchResults = await mapLimit(batches, CONCURRENCY, runBatch);
console.log(`All batches done in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);

// ── 4. merge + dedup ──
const completeness = (r) =>
  [
    "question_text",
    "choice_a",
    "choice_b",
    "choice_c",
    "choice_d",
    "correct_answer",
    "passage",
  ].filter((k) => (r?.[k] ?? "").toString().trim() !== "").length;

const raw = batchResults.flat().filter((r) => r && typeof r === "object");
const byKey = new Map();
for (const r of raw) {
  const qnum = Number.isInteger(r.question_number) ? r.question_number : null;
  const key =
    qnum != null
      ? `${r.section}|${r.module_number}|${qnum}`
      : `p${r.source_page}|${(r.question_text ?? "").slice(0, 40)}`;
  const existing = byKey.get(key);
  if (!existing || completeness(r) > completeness(existing)) byKey.set(key, r);
}
const rows = [...byKey.values()];
rows.sort(
  (a, b) =>
    (Number(a.source_page) || 0) - (Number(b.source_page) || 0) ||
    (Number(a.question_number) || 0) - (Number(b.question_number) || 0)
);
rows.forEach((r, i) => {
  r.extraction_order = i + 1;
});
console.log(`Merged ${raw.length} raw rows → ${rows.length} unique questions.`);

if (rows.length === 0) {
  console.error("0 questions after merge. Aborting.");
  process.exit(4);
}

// ── 5. normalize + validate (shared with the text path) ──
const topicClustersFixed = deriveTopicClusters(rows);
if (topicClustersFixed > 0) {
  console.log(`Normalized topic_cluster from domain on ${topicClustersFixed} row(s).`);
}
const validation = validateExtraction(rows);
const newlyFlagged = flagRowsNeedingReview(rows, validation);

const stem = pdfName.replace(/\.pdf$/i, "");
const outPath = `/tmp/${stem}-images-${PROVIDER}-extracted.json`;
writeFileSync(outPath, JSON.stringify(rows, null, 2));
console.log(`Wrote ${rows.length} questions to ${outPath}`);

console.log("");
console.log("VALIDATION".padEnd(72, "─"));
console.log(formatValidationReport(validation));
if (newlyFlagged > 0) {
  console.log(`  → flagged ${newlyFlagged} additional row(s) needs_review from validation`);
}
console.log("");
console.log(`Inspect: cat ${outPath} | jq '.[0]'`);
