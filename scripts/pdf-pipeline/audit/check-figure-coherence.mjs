#!/usr/bin/env node

// ============================================================
// check-figure-coherence — Phase 8.3 audit module.
//
// Asks Gemini Flash whether the attached figure matches what the
// question references. Escalates to Pro on low confidence OR when
// a BLOCKING finding would be issued.
//
// Eligibility: row must have image_url OR required_visual_asset_count > 0.
// (No image to audit otherwise.)
//
// Writes findings:
//   · figure_question_mismatch         (BLOCKING; image doesn't match stem)
//   · figure_low_visibility            (WARNING; image too blurry/cropped to tell)
//   · figure_unreferenced              (NOTICE; image attached but stem doesn't reference it)
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { callGemini } from "../../lib/llm-providers.mjs";
import {
  upsertFinding,
  SEVERITY,
  AUDIT_MODULES,
  isEligibleForFigureCoherence,
} from "../../lib/findings.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const NO_LLM = args.includes("--no-llm");
const SOURCE_PDF =
  args.indexOf("--source-pdf") >= 0 ? args[args.indexOf("--source-pdf") + 1] : null;
const QUESTION_ID =
  args.indexOf("--question-id") >= 0 ? args[args.indexOf("--question-id") + 1] : null;
const LIMIT = args.indexOf("--limit") >= 0 ? Number(args[args.indexOf("--limit") + 1]) : null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const RESPONSE_SCHEMA = {
  type: "object",
  required: [
    "figure_matches",
    "image_legible",
    "stem_references_figure",
    "confidence",
    "rationale",
  ],
  properties: {
    figure_matches: { type: "boolean" },
    image_legible: { type: "boolean" },
    stem_references_figure: { type: "boolean" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    rationale: { type: "string" },
  },
};

function buildPrompt(q) {
  return `You are auditing whether this SAT question's attached figure (shown) coherently matches what the question text describes.

QUESTION:
${q.question_text}

ANSWER (verified): ${q.selected_official_answer ?? q.correct_answer ?? "(unknown)"}

Decide:
- figure_matches: does the attached image show what the question references?
- image_legible: is the image clear enough to tell? (false → flag as low-visibility)
- stem_references_figure: does the question text actually mention the image / graph / table / etc.?
- confidence: 0-1.
- rationale: 1-2 sentences.`;
}

async function fetchImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return {
      mime: res.headers.get("content-type") ?? "image/png",
      buf: Buffer.from(await res.arrayBuffer()),
    };
  } catch {
    return null;
  }
}

async function callTier(q, image, model) {
  try {
    return {
      ok: true,
      raw: await callGemini({
        prompt: buildPrompt(q),
        image,
        model,
        responseSchema: RESPONSE_SCHEMA,
        maxOutputTokens: 600,
        thinkingBudget: 0,
      }),
    };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

const SELECT =
  "id, question_text, selected_official_answer, correct_answer, image_url, source_pdf, source_page";

async function selectRows() {
  let q = supabase.from("quiz_questions").select(SELECT);
  if (QUESTION_ID) q = q.eq("id", QUESTION_ID);
  else if (SOURCE_PDF) q = q.eq("source_pdf", SOURCE_PDF);
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error) throw error;
  // Hydrate required_visual_asset_count from source_assets so the
  // eligibility guard fires correctly even when image_url is null
  // but a required visual asset exists.
  const ids = (data ?? []).map((r) => r.id);
  if (ids.length === 0) return [];
  const assetCounts = new Map();
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const { data: assets } = await supabase
      .from("source_assets")
      .select("question_id, relevance, use_in_solving")
      .in("question_id", slice);
    for (const a of assets ?? []) {
      if (a.relevance === "required" && a.use_in_solving) {
        assetCounts.set(a.question_id, (assetCounts.get(a.question_id) ?? 0) + 1);
      }
    }
  }
  return (data ?? []).map((r) => ({
    ...r,
    required_visual_asset_count: assetCounts.get(r.id) ?? 0,
  }));
}

async function main() {
  console.log("Phase 8.3 — check-figure-coherence");
  const rows = (await selectRows()).filter(isEligibleForFigureCoherence);
  console.log(`  ${rows.length} eligible row(s)`);
  if (rows.length === 0) return;

  let blockCount = 0,
    warnCount = 0,
    noticeCount = 0,
    cleanCount = 0;
  for (const q of rows) {
    if (NO_LLM) continue;
    const image = await fetchImage(q.image_url);
    if (!image) {
      // Can't audit without the image; skip silently.
      continue;
    }
    let result = await callTier(q, image, "gemini-2.5-flash");
    let resp = result.ok ? result.raw : null;
    let escalated = false;

    if (resp && (resp.confidence < 0.7 || (!resp.figure_matches && resp.image_legible))) {
      const pro = await callTier(q, image, "gemini-2.5-pro");
      if (pro.ok) {
        resp = pro.raw;
        escalated = true;
      }
    }
    if (!resp) continue;

    if (resp.figure_matches && resp.image_legible) {
      cleanCount++;
      continue;
    }

    let code, severity, message;
    if (!resp.image_legible) {
      code = "figure_low_visibility";
      severity = SEVERITY.WARNING;
      message = `Image too blurry/cropped to verify (conf ${resp.confidence.toFixed(2)}).`;
      warnCount++;
    } else if (!resp.figure_matches) {
      code = "figure_question_mismatch";
      severity = SEVERITY.BLOCKING;
      message = `Image does not match what the question references (conf ${resp.confidence.toFixed(2)}).`;
      blockCount++;
    } else if (!resp.stem_references_figure) {
      code = "figure_unreferenced";
      severity = SEVERITY.NOTICE;
      message = "Image attached but question text doesn't reference it.";
      noticeCount++;
    } else {
      continue;
    }

    await upsertFinding({
      supabase,
      questionId: q.id,
      category: AUDIT_MODULES.FIGURE_COHERENCE,
      code,
      severity,
      message,
      value: q.image_url,
      detail: {
        figure_matches: resp.figure_matches,
        image_legible: resp.image_legible,
        stem_references_figure: resp.stem_references_figure,
        confidence: resp.confidence,
        rationale: resp.rationale,
        escalated_to_pro: escalated,
        ...(severity === SEVERITY.BLOCKING
          ? { suggested_publish_status: "blocked_missing_visual" }
          : {}),
      },
      dryRun: DRY_RUN,
    });
  }

  console.log(
    `Clean: ${cleanCount}  Notice: ${noticeCount}  Warnings: ${warnCount}  Blocking: ${blockCount}`
  );
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
