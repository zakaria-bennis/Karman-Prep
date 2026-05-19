// ============================================================
// extract-chart-data — Phase 4d backfill.
//
// For every quiz_question with image_url set AND figure_chart_data
// still null AND figure_kind in {null, image}, call Gemini Pro
// vision to decide whether the figure is a COORDINATE-PLANE CHART
// (scatterplot / line graph / bar chart / function plot).
//
// If yes, extract a ChartFigure JSON (src/types/chart.ts) and:
//   · confidence >= 0.8  → write figure_chart_data + set
//                          figure_kind='chart' (auto-publish to
//                          students, the new ChartFigure renderer
//                          replaces the raster screenshot)
//   · confidence <  0.8  → write figure_chart_data BUT leave
//                          figure_kind='image' (Inspector flags
//                          the row for manual review; renderer
//                          keeps showing the screenshot)
//
// If not a chart, set figure_kind='image' so we don't re-call on
// re-runs (mirrors extract-table-data.mjs's pattern).
//
// USAGE
//   node --env-file=.env.local scripts/figure-extraction/extract-chart-data.mjs
//   LIMIT=10 node --env-file=.env.local ...    # cap for testing
//   node --env-file=.env.local ... --dry-run   # don't write, just print
//
// COST
//   Gemini Pro free tier: 25 RPD. With ~150 figure-bearing rows
//   in the bank, the run takes 6+ days at the free quota OR uses
//   paid quota. Cheaper alternative: use Gemini Flash for the
//   first pass and only escalate to Pro on flagged rows. v1 uses
//   Pro directly because chart extraction needs spatial reasoning
//   that Flash often misses.
// ============================================================

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

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

// Prompt is intentionally exhaustive: the schema lives in
// src/types/chart.ts but the model only sees this prompt.
const PROMPT = `You are looking at a figure extracted from an SAT practice test PDF. Decide whether it is a COORDINATE-PLANE CHART of one of these four types:

  · "scatterplot"   — a collection of dots, no lines connecting them
  · "line_graph"    — dots connected by line segments (possibly multiple series)
  · "bar_chart"     — vertical or horizontal bars with categorical x-axis
                       (treat histograms as bar_chart with numeric categories)
  · "function_plot" — a smooth curve representing y = f(x) (e.g. parabola, line)

If it is NOT one of these (geometry diagram, 3D solid, table, photo, raw equation, etc.), return {"is_chart": false}.

If it IS a chart, extract structured data. Coordinate values are in the AXIS'S NUMERIC SPACE, NOT pixel positions — read off the axes and report the data as a student would record it. Be honest about uncertainty: if a dot looks like it sits between (3, 5.5) and (3, 6), pick the closer one.

Return strict JSON matching this exact shape:

{
  "is_chart": true,
  "kind": "scatterplot" | "line_graph" | "bar_chart" | "function_plot",
  "title": "<title above the chart, or null>",
  "x_axis": {
    "label": "<x-axis label, or empty string>",
    "min": <number or null>,
    "max": <number or null>,
    "tick_step": <number or null>,
    "categories": ["A", "B", "C"] | null   // only for bar_chart; mutually exclusive with min/max
  },
  "y_axis": { ...same shape... },
  "show_grid": true | false,
  "series": [
    // SCATTER:
    { "kind": "scatter", "label": "<name or null>",
      "points": [[x1, y1], [x2, y2], ...] },
    // LINE:
    { "kind": "line", "label": "<name or null>",
      "points": [[x1, y1], [x2, y2], ...] },
    // BAR:
    { "kind": "bar", "label": "<name or null>",
      "bars": [{"category": "A", "value": 5}, ...] },
    // FUNCTION (must match one of the supported families):
    { "kind": "function", "label": "<name or null>",
      "expression": { "kind": "linear",   "m": <num>, "b": <num> }
                   | { "kind": "quadratic", "a": <num>, "b": <num>, "c": <num> }
                   | { "kind": "absolute_value", "a": <num>, "h": <num>, "k": <num> }
                   | { "kind": "exponential", "a": <num>, "b": <num> },
      "domain": [<xLo>, <xHi>] | null }
  ],
  "confidence": <0.0 — 1.0>,
  "extractor_note": "<short note explaining any judgement calls, or null>"
}

CONFIDENCE GUIDE:
  · 1.0   — every value is read directly from clearly-labeled axes
  · 0.8+  — high confidence; ready to auto-publish to students
  · 0.5-0.8 — best guess; needs human review
  · <0.5  — significant ambiguity (illegible labels, weird crop, etc.)

CRITICAL:
  · Do NOT invent data points if the image is unclear — set lower confidence instead.
  · For function_plot, only emit if the curve clearly matches one of the 4 supported expression families. Otherwise treat as scatterplot (sample 8-12 points along the curve).
  · For bar_chart, set categories[] on x_axis AND make sure every bar's "category" matches one entry.
  · Don't transcribe the question text or answer choices into the chart data.`;

async function fetchImageBytes(url) {
  if (!url) return null;
  if (url.startsWith("data:image/")) {
    const m = url.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (!m) return null;
    return { mime: m[1], buf: Buffer.from(m[2], "base64") };
  }
  if (url.startsWith("https://") || url.startsWith("http://")) {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const mime = res.headers.get("content-type") || "image/png";
      const buf = Buffer.from(await res.arrayBuffer());
      return { mime, buf };
    } catch {
      return null;
    }
  }
  if (existsSync(url)) return { mime: "image/png", buf: await readFile(url) };
  return null;
}

// Light validation — fail fast on responses that won't deserialize
// into the ChartFigure TypeScript type. We catch the obvious shape
// errors here; the renderer is defensive about missing optional
// fields anyway.
function validateChart(p) {
  if (!p || p.is_chart !== true) return null;
  if (!["scatterplot", "line_graph", "bar_chart", "function_plot"].includes(p.kind)) {
    return null;
  }
  if (!p.x_axis || !p.y_axis || !Array.isArray(p.series) || p.series.length === 0) {
    return null;
  }
  if (typeof p.confidence !== "number") return null;
  return {
    kind: p.kind,
    title: p.title ?? null,
    x_axis: normalizeAxis(p.x_axis),
    y_axis: normalizeAxis(p.y_axis),
    show_grid: p.show_grid !== false,
    series: p.series,
    confidence: Math.max(0, Math.min(1, p.confidence)),
    extracted_by: EXTRACTOR_VERSION,
    extracted_at: new Date().toISOString(),
    extractor_note: p.extractor_note ?? null,
  };
}

function normalizeAxis(a) {
  return {
    label: typeof a?.label === "string" ? a.label : "",
    min: typeof a?.min === "number" ? a.min : null,
    max: typeof a?.max === "number" ? a.max : null,
    tick_step: typeof a?.tick_step === "number" ? a.tick_step : null,
    categories: Array.isArray(a?.categories) ? a.categories : null,
  };
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
    const img = await fetchImageBytes(row.image_url);
    if (!img) {
      console.log("could not fetch image");
      errors++;
      continue;
    }
    let raw;
    try {
      raw = await geminiVision([
        { inline_data: { mime_type: img.mime, data: img.buf.toString("base64") } },
        { text: PROMPT },
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
        // re-run. Phase 4c (geometry) can pick up these later.
        await supabase.from("quiz_questions").update({ figure_kind: "image" }).eq("id", row.id);
      }
      continue;
    }
    const chartData = validateChart(parsed);
    if (!chartData) {
      console.log("validation fail");
      errors++;
      continue;
    }
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
