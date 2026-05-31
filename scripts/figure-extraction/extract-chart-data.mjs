// ============================================================
// extract-chart-data — Phase 4d backfill (manual).
//
// For every quiz_question with image_url set AND figure_chart_data
// still null AND figure_kind in {null, image}, call Gemini Pro
// vision to decide whether the figure is a COORDINATE-PLANE CHART
// (scatterplot / line graph / bar chart / function plot).
//
// If yes, extract a ChartFigure JSON (src/types/chart.ts) and:
//   · confidence >= 0.8  → write figure_chart_data + set
//                          figure_kind='chart' (auto-publish to
//                          students; ChartFigure renderer replaces
//                          the raster screenshot)
//   · confidence <  0.8  → write figure_chart_data BUT leave
//                          figure_kind='image' (Inspector flags the
//                          row for review; screenshot keeps showing)
//
// If not a chart, set figure_kind='image' so we don't re-call on
// re-runs (mirrors extract-table-data.mjs's pattern).
//
// NOTE: for NEW imports this is now done inline by the Stage 6.5
// pass (scripts/pdf-pipeline/extract-figure-structure.mjs, Phase 9B)
// — both share the prompt + validator from
// scripts/lib/figure-chart-logic.mjs so they can't drift. This script
// remains the manual backfill for the existing bank.
//
// USAGE
//   node --env-file=.env.local scripts/figure-extraction/extract-chart-data.mjs
//   LIMIT=10 node --env-file=.env.local ...    # cap for testing
//   node --env-file=.env.local ... --dry-run   # don't write, just print
//
// COST
//   Gemini Pro free tier: 25 RPD. Chart extraction needs spatial
//   reasoning that Flash often misses, so this uses Pro directly.
// ============================================================

import { fetchImageBuffer } from "../lib/fetch-image.mjs";
import {
  CHART_EXTRACT_PROMPT,
  validateChartData,
  stampChartProvenance,
} from "../lib/figure-chart-logic.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;
const AUTO_PUBLISH_THRESHOLD = 0.8;

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!SUPA_URL || !SUPA_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!GEMINI_KEY) {
  console.error("Set GEMINI_API_KEY.");
  process.exit(1);
}

const PRO_MODEL = "gemini-2.5-pro";
const EXTRACTOR_VERSION = `${PRO_MODEL}@2026-05-19`;

async function geminiVision(parts) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${PRO_MODEL}:generateContent` +
    `?key=${encodeURIComponent(GEMINI_KEY)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        // Slightly higher than the grader (0.1) — chart extraction
        // benefits from a touch of variety in axis-range guesses.
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    if (res.status === 429) throw new Error(`QUOTA: ${errBody.slice(0, 200)}`);
    throw new Error(`HTTP ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

const { createClient } = await import("@supabase/supabase-js");
const supabase = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

async function main() {
  console.log("Loading candidates…");
  let q = supabase
    .from("quiz_questions")
    .select(
      "id, source_pdf, source_page, subject, image_url, figure_kind, figure_chart_data, figure_table_data"
    )
    .not("image_url", "is", null);
  // Skip rows already classified as table (Phase 4a handled them)
  // or as svg, or that already have chart data.
  q = q.or("figure_kind.is.null,figure_kind.eq.image");
  q = q.is("figure_chart_data", null);
  q = q.is("figure_table_data", null);
  const { data, error } = await q;
  if (error) throw error;

  let rows = data ?? [];
  if (LIMIT) rows = rows.slice(0, LIMIT);
  console.log(`Candidates: ${rows.length}`);
  console.log(`Auto-publish threshold: confidence ≥ ${AUTO_PUBLISH_THRESHOLD}`);
  if (rows.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let autoPublished = 0;
  let savedForReview = 0;
  let nonCharts = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(
      `[${i + 1}/${rows.length}] ${row.source_pdf ?? "(?)"} p${row.source_page ?? "?"}… `
    );
    const fetched = await fetchImageBuffer(row.image_url);
    if (!fetched.ok) {
      console.log("could not fetch image");
      errors++;
      continue;
    }
    const img = { mime: fetched.mime, buf: fetched.buf };
    let raw;
    try {
      raw = await geminiVision([
        { inline_data: { mime_type: img.mime, data: img.buf.toString("base64") } },
        { text: CHART_EXTRACT_PROMPT },
      ]);
    } catch (err) {
      const msg = String(err).slice(0, 100);
      console.log(`API ERROR: ${msg}`);
      if (msg.includes("QUOTA")) {
        console.log("Stopping due to quota.");
        break;
      }
      errors++;
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.log("parse fail");
      errors++;
      continue;
    }
    if (parsed.is_chart !== true) {
      console.log("not a chart");
      nonCharts++;
      if (!DRY_RUN) {
        // Mark as 'image' so we don't waste another Pro call on
        // re-run. Geometry (9D) can pick up these later.
        await supabase.from("quiz_questions").update({ figure_kind: "image" }).eq("id", row.id);
      }
      continue;
    }
    const vr = validateChartData(parsed);
    if (!vr.ok) {
      console.log(`validation fail (${vr.errors.join(", ")})`);
      errors++;
      continue;
    }
    const chartData = stampChartProvenance(vr.data, {
      extractedBy: EXTRACTOR_VERSION,
      extractedAt: new Date().toISOString(),
    });
    const autoPublishable = chartData.confidence >= AUTO_PUBLISH_THRESHOLD;
    const tag = autoPublishable ? "AUTO" : "REVIEW";
    console.log(
      `${chartData.kind.toUpperCase()} (conf ${chartData.confidence.toFixed(2)}) → ${tag}`
    );
    if (!DRY_RUN) {
      const update = autoPublishable
        ? {
            figure_kind: "chart",
            figure_chart_data: chartData,
            updated_at: new Date().toISOString(),
          }
        : {
            // Save the extraction but DON'T flip figure_kind — the
            // raster screenshot keeps rendering until a human
            // accepts it in the Inspector.
            figure_chart_data: chartData,
            updated_at: new Date().toISOString(),
          };
      const { error: upErr } = await supabase
        .from("quiz_questions")
        .update(update)
        .eq("id", row.id);
      if (upErr) {
        console.log(`  ✗ write failed: ${upErr.message}`);
        errors++;
        continue;
      }
    }
    if (autoPublishable) autoPublished++;
    else savedForReview++;
  }

  console.log("");
  console.log("═".repeat(72));
  console.log(`Done. ${autoPublished} auto-published, ${savedForReview} saved for review,`);
  console.log(`      ${nonCharts} non-chart images marked, ${errors} errors.`);
  if (DRY_RUN) console.log("(dry-run — no writes)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
