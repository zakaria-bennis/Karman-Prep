#!/usr/bin/env node
// ============================================================
// promote-geometry — Stage 6.6: the geometry render gate.
//
// 2D-geometry extractions are stored (figure_geometry_data) but render
// as screenshots by default ("clean-looking wrong geometry is more
// dangerous than a real screenshot"). This stage decides, per figure,
// whether the structured RENDER is safe to show students:
//
//   1. buildGeometrySvg(figure_geometry_data) → SVG  (deterministic)
//   2. rasterize the SVG with sharp → PNG
//   3. composite it side-by-side with the original screenshot
//   4. ask a vision model: "are the LEFT original and RIGHT render
//      FUNCTIONALLY identical?" (same shapes / labels / markings /
//      relationships — ignore line weight, font, exact positions)
//   5. only on a high-confidence match → flip figure_kind='geometric'
//      + store figure_svg, so GeometryFigure.tsx renders it. Otherwise
//      keep the screenshot + record the mismatch.
//
// The vision judge is the safety net: a wrong render simply fails the
// comparison and stays a screenshot — no clean-but-wrong geometry ever
// reaches a student.
//
// Run via tsx (imports the TS renderer from @/lib). Idempotent: skips
// rows already promoted (figure_kind='geometric').
//
// USAGE
//   npx tsx --env-file=.env.local scripts/pdf-pipeline/promote-geometry.ts \
//     --source-pdf 202603asiav1.pdf [--limit N] [--dry-run] \
//     [--min-confidence 0.85] [--question-id <uuid>]
// ============================================================

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { buildGeometrySvg, type GeometryFigureData } from "@/lib/figures/geometry-svg";
import { callGemini as callGeminiRaw } from "../lib/llm-providers.mjs";
import { fetchImageBuffer } from "../lib/fetch-image.mjs";
import { upsertFinding, SEVERITY, AUDIT_MODULES } from "../lib/findings.mjs";

/** Re-type the JSDoc-typed .mjs callGemini for the options we pass — its
 *  `image = null` default makes TS infer image as null otherwise. */
const callGemini = callGeminiRaw as (opts: {
  prompt: string;
  image?: { mime: string; buf: Buffer };
  model?: string;
  json?: boolean;
  maxOutputTokens?: number;
}) => Promise<{ is_match?: boolean; confidence?: number; differences?: string } | string>;

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const flag = (n: string): string | null => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};
const SOURCE_PDF = flag("source-pdf");
const QUESTION_ID = flag("question-id");
const LIMIT = flag("limit") ? Number(flag("limit")) : null;
const MIN_CONFIDENCE = flag("min-confidence") ? Number(flag("min-confidence")) : 0.85;
const COMPARE_MODEL = flag("model") ?? "gemini-2.5-pro";

if (!SOURCE_PDF && !QUESTION_ID) {
  console.error("Usage: promote-geometry.ts --source-pdf <name> [--limit N] [--dry-run]");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const COMPARE_PROMPT = `This single image shows TWO figures side by side.
LEFT = the original screenshot of an SAT geometry figure.
RIGHT = a clean SVG re-drawing generated from data extracted from that figure.

Decide whether the RIGHT re-drawing is FUNCTIONALLY IDENTICAL to the LEFT original — i.e. a student solving the problem would get the exact same information from either:
- same shapes (triangles, segments, etc.) in the same arrangement
- same vertex/point labels in the same places
- same angle markings (right angles, given measures) and length markings (given values)
- same relationships (parallel, perpendicular, shared edges)

IGNORE cosmetic differences: line weight, font, color, exact pixel positions, slight scale, and "figure not drawn to scale" notes.

Return JSON only:
{ "is_match": true | false, "confidence": 0.0-1.0, "differences": "short description of any FUNCTIONAL differences, or 'none'" }`;

/** Composite two PNGs side-by-side on a white canvas for the judge. */
async function sideBySide(leftBuf: Buffer, rightBuf: Buffer): Promise<Buffer> {
  const W = 460;
  const GAP = 28;
  const L = await sharp(leftBuf)
    .resize({ width: W, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
  const R = await sharp(rightBuf)
    .resize({ width: W, fit: "inside" })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
  const lm = await sharp(L).metadata();
  const rm = await sharp(R).metadata();
  const h = Math.max(lm.height ?? W, rm.height ?? W);
  return sharp({
    create: { width: W * 2 + GAP, height: h, channels: 3, background: "#ffffff" },
  })
    .composite([
      { input: L, left: 0, top: Math.round((h - (lm.height ?? 0)) / 2) },
      { input: R, left: W + GAP, top: Math.round((h - (rm.height ?? 0)) / 2) },
    ])
    .png()
    .toBuffer();
}

interface QRow {
  id: string;
  source_pdf: string | null;
  source_page: number | null;
  image_url: string | null;
  figure_kind: string | null;
  figure_geometry_data: GeometryFigureData;
  figure_quality: Record<string, unknown> | null;
}

async function selectRows(): Promise<QRow[]> {
  let q = supabase
    .from("quiz_questions")
    .select(
      "id, source_pdf, source_page, image_url, figure_kind, figure_geometry_data, figure_quality"
    )
    .not("figure_geometry_data", "is", null)
    .neq("figure_kind", "geometric"); // skip already-promoted
  if (QUESTION_ID) q = q.eq("id", QUESTION_ID);
  else if (SOURCE_PDF) q = q.eq("source_pdf", SOURCE_PDF);
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error) throw error;
  // 2D geometry only (3D is a separate, later renderer)
  return (data ?? []).filter(
    (r) => (r.figure_geometry_data as GeometryFigureData)?.kind === "geometric"
  ) as QRow[];
}

async function writeRow(id: string, patch: Record<string, unknown>) {
  if (DRY_RUN) return;
  const { error } = await supabase
    .from("quiz_questions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`write ${id}: ${error.message}`);
}

async function main() {
  console.log(
    `Stage 6.6 — promote-geometry (compare: ${COMPARE_MODEL}, min-conf ${MIN_CONFIDENCE}${DRY_RUN ? ", dry-run" : ""})`
  );
  const rows = await selectRows();
  console.log(`  ${rows.length} unpromoted 2D-geometry figure(s)`);
  const tally = { promoted: 0, kept: 0, unrenderable: 0, skipped: 0 };

  for (const [i, row] of rows.entries()) {
    const tag = `[${i + 1}/${rows.length}] ${row.source_pdf ?? "?"} p${row.source_page ?? "?"}`;
    const { svg, renderable, reason } = buildGeometrySvg(row.figure_geometry_data);
    if (!renderable || !svg) {
      console.log(`${tag}: not renderable (${reason}) — screenshot kept`);
      tally.unrenderable++;
      continue;
    }
    if (!row.image_url) {
      console.log(`${tag}: no screenshot — skipping`);
      tally.skipped++;
      continue;
    }
    const fetched = await fetchImageBuffer(row.image_url);
    if (!fetched.ok) {
      console.log(`${tag}: screenshot unfetchable — skipping`);
      tally.skipped++;
      continue;
    }

    let comparison: Buffer;
    try {
      const renderPng = await sharp(Buffer.from(svg), { density: 144 }).png().toBuffer();
      comparison = await sideBySide(fetched.buf as Buffer, renderPng);
    } catch (err) {
      console.log(
        `${tag}: render/composite error (${String((err as Error).message).slice(0, 60)}) — skipping`
      );
      tally.skipped++;
      continue;
    }

    let verdict: { is_match?: boolean; confidence?: number; differences?: string } | null = null;
    try {
      const resp = await callGemini({
        prompt: COMPARE_PROMPT,
        image: { mime: "image/png", buf: comparison },
        model: COMPARE_MODEL,
        json: true,
        // Pro spends thinking tokens against this budget before the JSON;
        // 600 starved it (empty output). Give it room.
        maxOutputTokens: 8192,
      });
      verdict = typeof resp === "object" ? resp : JSON.parse(resp);
    } catch (err) {
      console.log(
        `${tag}: compare error (${String((err as Error).message).slice(0, 60)}) — skipping`
      );
      tally.skipped++;
      continue;
    }

    const conf = typeof verdict?.confidence === "number" ? verdict.confidence : 0;
    const pass = verdict?.is_match === true && conf >= MIN_CONFIDENCE;
    const visual_validation = {
      compared: true,
      is_match: verdict?.is_match === true,
      confidence: conf,
      differences: verdict?.differences ?? null,
      model: COMPARE_MODEL,
      compared_at: new Date().toISOString(),
    };
    const figure_quality = { ...(row.figure_quality ?? {}), visual_validation };

    if (pass) {
      await writeRow(row.id, {
        figure_kind: "geometric",
        figure_svg: svg,
        figure_quality: {
          ...figure_quality,
          validation_status: "validated",
          used_fallback_level: 0,
        },
      });
      console.log(`${tag}: GEOMETRY → SVG promoted (match, conf ${conf.toFixed(2)})`);
      tally.promoted++;
    } else {
      await writeRow(row.id, { figure_quality });
      await upsertFinding({
        supabase,
        questionId: row.id,
        category: AUDIT_MODULES.FIGURE_COHERENCE,
        code: "geometry_render_mismatch",
        severity: SEVERITY.NOTICE,
        message: `Geometry render did not pass the visual match (${verdict?.is_match ? `conf ${conf.toFixed(2)} < ${MIN_CONFIDENCE}` : "not a match"}); keeping screenshot.`,
        value: row.image_url,
        detail: visual_validation,
        dryRun: DRY_RUN,
      });
      console.log(
        `${tag}: kept screenshot (${verdict?.is_match ? `low conf ${conf.toFixed(2)}` : "mismatch"}: ${(verdict?.differences ?? "").slice(0, 50)})`
      );
      tally.kept++;
    }
  }

  console.log(
    `\nDone. promoted: ${tally.promoted}, kept-screenshot: ${tally.kept}, unrenderable: ${tally.unrenderable}, skipped: ${tally.skipped}.`
  );
  if (DRY_RUN) console.log("(dry-run — no writes)");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
