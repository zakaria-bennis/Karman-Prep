#!/usr/bin/env node

// ============================================================
// benchmark-figure-extraction — Pre-9A model comparison.
//
// Picks N figure crops from source_assets, downloads each PNG
// from R2, and runs:
//
//   1. CLASSIFICATION
//      Gemini 2.5 Flash, Gemini 2.5 Pro, Claude Sonnet 4.6 vision
//      each asked to categorize: table | chart | graph | geometric
//      | 3d_shape | other.
//
//   2. STRUCTURED EXTRACTION (per kind)
//      For tables → row/col JSON
//      For charts → type + data + axes JSON
//      For graphs → function or plotted points JSON
//      For geometric → shapes + annotations + relationships JSON
//
// Saves a Markdown report so a human can eyeball results
// alongside the original screenshot URLs.
//
// USAGE
//   node --env-file=.env.local \
//     scripts/v2-phase9/benchmark-figure-extraction.mjs \
//     [--limit 10] [--source-pdf 202406asiav2.pdf] [--asset-id <uuid>]
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// Defensive env override BEFORE importing llm-providers (which reads
// process.env at module load). Same pattern as
// scripts/v2-phase8/resume-from-stage.mjs — handles environments
// where ANTHROPIC_API_KEY is pre-set to "" (Claude Code's bash
// sandbox does this for safety). Node's --env-file won't override
// existing parent entries, so we read .env.local ourselves and
// override any empty values.
function loadEnvFromDotEnvLocal() {
  if (!existsSync(".env.local")) return;
  const text = readFileSync(".env.local", "utf-8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, key, value] = m;
    const stripped = value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    if (!process.env[key] && stripped) process.env[key] = stripped;
  }
}
loadEnvFromDotEnvLocal();

// llm-providers reads keys at module load, so this import MUST come
// after loadEnvFromDotEnvLocal().
const { callClaude, callGemini } = await import("../lib/llm-providers.mjs");

const args = process.argv.slice(2);
const LIMIT_IDX = args.indexOf("--limit");
const LIMIT = LIMIT_IDX >= 0 && args[LIMIT_IDX + 1] ? Number(args[LIMIT_IDX + 1]) : 10;
const SOURCE_PDF_IDX = args.indexOf("--source-pdf");
const SOURCE_PDF =
  SOURCE_PDF_IDX >= 0 && args[SOURCE_PDF_IDX + 1] ? args[SOURCE_PDF_IDX + 1] : null;
const ASSET_ID_IDX = args.indexOf("--asset-id");
const ASSET_ID = ASSET_ID_IDX >= 0 && args[ASSET_ID_IDX + 1] ? args[ASSET_ID_IDX + 1] : null;
const REPORT_OUT = args.includes("--out")
  ? args[args.indexOf("--out") + 1]
  : `/tmp/phase9-benchmark-${new Date().toISOString().replace(/[:.]/g, "-")}.md`;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Figure types Stage 6 (visual relevance) marks as actually-relevant
// (avoids burning $$ on calculator-icon artifacts).
const RELEVANT_VISUAL_TYPES = ["figure_crop", "table_crop", "chart_crop", "graph_crop"];

// ── Load asset rows + question context ─────────────────────────
async function loadAssets() {
  let q = supabase
    .from("source_assets")
    .select(
      "id, question_id, source_pdf, page_number, asset_type, public_url, relevance, use_in_solving"
    )
    .in("asset_type", RELEVANT_VISUAL_TYPES)
    .not("public_url", "is", null);
  if (SOURCE_PDF) q = q.eq("source_pdf", SOURCE_PDF);
  if (ASSET_ID) q = q.eq("id", ASSET_ID);
  q = q.limit(LIMIT * 2); // overshoot, filter by relevance below
  const { data, error } = await q;
  if (error) throw error;
  // Prefer relevance=required + use_in_solving (real problem visuals)
  const sorted = (data ?? []).sort((a, b) => {
    const aScore = (a.relevance === "required" ? 2 : 0) + (a.use_in_solving ? 1 : 0);
    const bScore = (b.relevance === "required" ? 2 : 0) + (b.use_in_solving ? 1 : 0);
    return bScore - aScore;
  });
  return sorted.slice(0, LIMIT);
}

async function loadQuestionText(questionId) {
  if (!questionId) return null;
  const { data } = await supabase
    .from("quiz_questions")
    .select("question_text, subject, answer_format, domain")
    .eq("id", questionId)
    .maybeSingle();
  return data;
}

// ── Download asset PNG to disk for inline upload to models ──────
async function fetchPng(url, dest) {
  if (existsSync(dest)) return dest;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return dest;
}

// ── Prompts ────────────────────────────────────────────────────

const CLASSIFY_PROMPT = `You are looking at a figure cropped from an SAT practice test.

Classify it into ONE of these categories:
  · table             — a data table with rows and columns
  · chart             — bar / line / pie / scatter / boxplot
  · graph             — coordinate plane with axes; function plot OR plotted points
  · geometric         — 2D geometry: triangles, quadrilaterals, circles, line segments, angle/length markings
  · 3d_shape          — cubes, cylinders, pyramids, spheres, nets of solids
  · other             — none of the above; describe what you actually see

Return JSON only:
{
  "figure_kind": "table" | "chart" | "graph" | "geometric" | "3d_shape" | "other",
  "chart_subtype": "bar" | "line" | "pie" | "scatter" | "boxplot" | null,
  "confidence": 0..1,
  "model_called_it_a": "a short free-form description, e.g. 'right triangle with two labeled points'"
}`;

const TABLE_EXTRACT_PROMPT = `Extract this table as JSON. Return only:
{
  "headers": ["col1 label", "col2 label", ...],
  "rows": [["cell1", "cell2"], ...],
  "caption": "table caption text if visible, else null"
}`;

const CHART_EXTRACT_PROMPT = `Extract this chart's structured data. Return only:
{
  "type": "bar" | "line" | "pie" | "scatter" | "boxplot",
  "data": [
    {"x": "category or numeric x", "y": "numeric y", "label": "optional label"}
  ],
  "axes": {
    "x_label": "x axis label",
    "y_label": "y axis label",
    "x_unit": "unit if shown",
    "y_unit": "unit if shown"
  },
  "legend": ["series 1", ...] or null,
  "key_observations": "1 sentence summarizing what the chart shows"
}`;

const GEOMETRIC_EXTRACT_PROMPT = `Extract this geometric figure's structure. Return only:
{
  "shapes": [
    {"kind": "triangle" | "quadrilateral" | "circle" | "line_segment" | "point" | "other",
     "vertices_or_points": [{"label": "A", "x": 0, "y": 0}, ...]}
  ],
  "angle_markings": [{"at_vertex": "A", "measure": "30°" or null, "right_angle": false}],
  "length_markings": [{"on_segment": ["A", "B"], "value": "5"}],
  "relationships": [{"kind": "parallel" | "shared_edge" | "similar", "between": [...]}]
}`;

// ── Three providers, parallel ──────────────────────────────────

async function runProvider({ name, callFn }) {
  try {
    const t0 = Date.now();
    const resp = await callFn();
    const dur = Date.now() - t0;
    return { ok: true, response: resp, duration_ms: dur, error: null };
  } catch (err) {
    return { ok: false, response: null, duration_ms: 0, error: err?.message ?? String(err) };
  }
}

async function benchmarkOne(asset) {
  const png = await fetchPng(asset.public_url, join(tmpdir(), `phase9-bench-${asset.id}.png`));
  const imgBuf = readFileSync(png);
  const question = await loadQuestionText(asset.question_id);
  const questionSnippet = question?.question_text?.slice(0, 200) ?? "(no question context)";

  const contextLine = `Question context: ${questionSnippet}`;

  // ── Classification ──
  const cls = {
    flash: await runProvider({
      name: "gemini-flash",
      callFn: () =>
        callGemini({
          prompt: `${CLASSIFY_PROMPT}\n\n${contextLine}`,
          image: { mime: "image/png", buf: imgBuf },
          model: "gemini-2.5-flash",
          json: true,
          maxOutputTokens: 512,
          thinkingBudget: 0,
        }),
    }),
    pro: await runProvider({
      name: "gemini-pro",
      callFn: () =>
        callGemini({
          prompt: `${CLASSIFY_PROMPT}\n\n${contextLine}`,
          image: { mime: "image/png", buf: imgBuf },
          model: "gemini-2.5-pro",
          json: true,
          maxOutputTokens: 512,
        }),
    }),
    sonnet: await runProvider({
      name: "claude-sonnet-4-6",
      callFn: () =>
        callClaude({
          prompt: `${CLASSIFY_PROMPT}\n\n${contextLine}`,
          image: { mime: "image/png", buf: imgBuf },
          model: "claude-sonnet-4-6",
          maxTokens: 512,
        }),
    }),
  };

  // ── Extraction (based on Sonnet's classification, as a tie-breaker;
  //    if Sonnet differs from Flash we still run extraction so we can
  //    eyeball both) ──
  const consensusKind =
    cls.flash.response?.figure_kind ??
    cls.pro.response?.figure_kind ??
    cls.sonnet.response?.figure_kind ??
    "other";

  let extractPrompt = null;
  if (consensusKind === "table") extractPrompt = TABLE_EXTRACT_PROMPT;
  else if (consensusKind === "chart") extractPrompt = CHART_EXTRACT_PROMPT;
  else if (consensusKind === "geometric") extractPrompt = GEOMETRIC_EXTRACT_PROMPT;
  // graph + 3d + other: skipping structured extraction for v1 benchmark

  const extract = extractPrompt
    ? {
        pro: await runProvider({
          name: "gemini-pro",
          callFn: () =>
            callGemini({
              prompt: extractPrompt,
              image: { mime: "image/png", buf: imgBuf },
              model: "gemini-2.5-pro",
              json: true,
              maxOutputTokens: 4096,
            }),
        }),
        sonnet: await runProvider({
          name: "claude-sonnet-4-6",
          callFn: () =>
            callClaude({
              prompt: extractPrompt,
              image: { mime: "image/png", buf: imgBuf },
              model: "claude-sonnet-4-6",
              maxTokens: 4096,
            }),
        }),
      }
    : null;

  return {
    asset,
    question_subject: question?.subject ?? null,
    classification: cls,
    consensus_kind: consensusKind,
    extraction: extract,
  };
}

// ── Render Markdown report ─────────────────────────────────────

function renderJson(obj) {
  if (!obj) return "(null)";
  try {
    return "```json\n" + JSON.stringify(obj, null, 2) + "\n```";
  } catch {
    return "(unserializable)";
  }
}

function renderReport(results) {
  const lines = [];
  lines.push(`# Phase 9 — Figure Extraction Benchmark`);
  lines.push(``);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Figures benchmarked:** ${results.length}`);
  if (SOURCE_PDF) lines.push(`**Source PDF filter:** \`${SOURCE_PDF}\``);
  lines.push(``);

  // Summary table
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| # | Asset | Subject | Flash → kind | Pro → kind | Sonnet → kind | Agree? |`);
  lines.push(`|---|---|---|---|---|---|---|`);
  results.forEach((r, i) => {
    const flashKind = r.classification.flash.response?.figure_kind ?? "✗";
    const proKind = r.classification.pro.response?.figure_kind ?? "✗";
    const sonnetKind = r.classification.sonnet.response?.figure_kind ?? "✗";
    const agree = flashKind === proKind && proKind === sonnetKind ? "✓" : "✗";
    lines.push(
      `| ${i + 1} | \`${r.asset.id.slice(0, 8)}\` (p${r.asset.page_number}) | ${r.question_subject ?? "?"} | ${flashKind} | ${proKind} | ${sonnetKind} | ${agree} |`
    );
  });
  lines.push(``);

  // Per-figure detail
  results.forEach((r, i) => {
    lines.push(`---`);
    lines.push(``);
    lines.push(`## Figure ${i + 1} — \`${r.asset.id.slice(0, 8)}\` (page ${r.asset.page_number})`);
    lines.push(``);
    lines.push(`**Asset URL:** [view PNG](${r.asset.public_url})`);
    lines.push(``);
    lines.push(`**Consensus kind:** \`${r.consensus_kind}\``);
    lines.push(``);

    lines.push(`### Classification`);
    lines.push(``);
    for (const [name, result] of Object.entries(r.classification)) {
      lines.push(`#### ${name} ${result.ok ? `(${result.duration_ms}ms)` : "FAILED"}`);
      lines.push(``);
      if (result.ok) {
        lines.push(renderJson(result.response));
      } else {
        lines.push(`> ERROR: ${result.error}`);
      }
      lines.push(``);
    }

    if (r.extraction) {
      lines.push(`### Structured extraction`);
      lines.push(``);
      for (const [name, result] of Object.entries(r.extraction)) {
        lines.push(`#### ${name} ${result.ok ? `(${result.duration_ms}ms)` : "FAILED"}`);
        lines.push(``);
        if (result.ok) {
          lines.push(renderJson(result.response));
        } else {
          lines.push(`> ERROR: ${result.error}`);
        }
        lines.push(``);
      }
    } else {
      lines.push(
        `> Extraction skipped: consensus kind \`${r.consensus_kind}\` is screenshot-first in v1.`
      );
      lines.push(``);
    }
  });

  return lines.join("\n");
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("Phase 9 figure extraction benchmark");
  console.log(
    `  filters: limit=${LIMIT} source_pdf=${SOURCE_PDF ?? "<any>"} asset_id=${ASSET_ID ?? "<any>"}`
  );

  mkdirSync(tmpdir(), { recursive: true });

  const assets = await loadAssets();
  console.log(`Loaded ${assets.length} assets to benchmark`);
  if (assets.length === 0) {
    console.error("No assets matched filters. Try without --source-pdf or pick a different one.");
    process.exit(1);
  }

  const results = [];
  for (const [i, asset] of assets.entries()) {
    console.log(
      `[${i + 1}/${assets.length}] benchmarking ${asset.id.slice(0, 8)} (page ${asset.page_number})…`
    );
    const result = await benchmarkOne(asset);
    results.push(result);
  }

  const report = renderReport(results);
  writeFileSync(REPORT_OUT, report);
  console.log("");
  console.log(`Report written to: ${REPORT_OUT}`);
  console.log(`Open it in a Markdown viewer for side-by-side review.`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
