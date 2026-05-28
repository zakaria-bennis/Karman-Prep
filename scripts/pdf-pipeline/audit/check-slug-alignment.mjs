#!/usr/bin/env node

// ============================================================
// check-slug-alignment — Phase 8.3 audit module.
//
// Checks whether the question's assigned concept_slug actually
// matches the tested skill. Sonnet by default; escalate to Opus
// when Sonnet confidence < 0.7 OR suggested-slug != assigned-slug.
//
// Eligibility: row must have concept_slug set. Skipped otherwise.
//
// Writes WARNING-severity findings for low-confidence mismatches;
// BLOCKING when the model is confident the slug is wrong AND has
// a higher-confidence alternative.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { callClaude } from "../../lib/llm-providers.mjs";
import {
  upsertFinding,
  SEVERITY,
  AUDIT_MODULES,
  isEligibleForSlugAlignment,
} from "../../lib/findings.mjs";
import { CONCEPT_SLUG_VALUES } from "../../lib/taxonomy.generated.mjs";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const NO_LLM = args.includes("--no-llm");
const SOURCE_PDF =
  args.indexOf("--source-pdf") >= 0 ? args[args.indexOf("--source-pdf") + 1] : null;
const QUESTION_ID =
  args.indexOf("--question-id") >= 0 ? args[args.indexOf("--question-id") + 1] : null;
const LIMIT = args.indexOf("--limit") >= 0 ? Number(args[args.indexOf("--limit") + 1]) : null;

if (args.includes("--help")) {
  console.log(
    `Usage: check-slug-alignment.mjs [--source-pdf <file>] [--limit N] [--dry-run] [--no-llm]`
  );
  process.exit(0);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const FINDING_SCHEMA = {
  type: "object",
  required: [
    "assigned_slug_fits",
    "assigned_confidence",
    "suggested_slug",
    "suggested_confidence",
    "reason",
  ],
  properties: {
    assigned_slug_fits: { type: "boolean" },
    assigned_confidence: { type: "number", minimum: 0, maximum: 1 },
    suggested_slug: { type: ["string", "null"] },
    suggested_confidence: { type: "number", minimum: 0, maximum: 1 },
    reason: { type: "string" },
  },
};

function buildPrompt(q) {
  return `You are auditing whether an SAT question's assigned concept_slug actually matches the tested skill.

QUESTION:
${q.question_text}

${q.passage ? `PASSAGE:\n${q.passage}\n` : ""}
ASSIGNED slug: ${q.concept_slug}
SUBJECT: ${q.subject}

Decide:
- assigned_slug_fits: does the assigned slug describe what this question tests?
- assigned_confidence: 0-1.
- suggested_slug: if a different slug fits better, name it (must be one of the canonical 89). Null if the assigned one is fine OR no better one exists in the taxonomy.
- suggested_confidence: 0-1.
- reason: 1-2 sentences.

Canonical slugs (89 total): ${CONCEPT_SLUG_VALUES.join(", ")}`;
}

async function callTier(q, model) {
  const { prompt } = { prompt: buildPrompt(q) };
  try {
    return {
      ok: true,
      raw: await callClaude({ prompt, model, toolSchema: FINDING_SCHEMA, maxTokens: 600 }),
    };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

const SELECT = "id, question_text, passage, subject, concept_slug, source_pdf, source_page";

async function selectRows() {
  let q = supabase.from("quiz_questions").select(SELECT);
  if (QUESTION_ID) q = q.eq("id", QUESTION_ID);
  else if (SOURCE_PDF) q = q.eq("source_pdf", SOURCE_PDF);
  if (LIMIT) q = q.limit(LIMIT);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

async function main() {
  console.log("Phase 8.3 — check-slug-alignment");
  const rows = (await selectRows()).filter(isEligibleForSlugAlignment);
  console.log(`  ${rows.length} eligible row(s)`);
  if (rows.length === 0) return;

  let agreeCount = 0,
    warnCount = 0,
    blockCount = 0;
  for (const q of rows) {
    if (NO_LLM) continue;
    let result = await callTier(q, "claude-sonnet-4-6");
    let resp = result.ok ? result.raw : null;
    let escalated = false;

    // Escalate to Opus on low confidence or slug mismatch.
    if (
      resp &&
      (resp.assigned_confidence < 0.7 || (!resp.assigned_slug_fits && resp.suggested_slug))
    ) {
      const opus = await callTier(q, "claude-opus-4-7");
      if (opus.ok) {
        resp = opus.raw;
        escalated = true;
      }
    }

    if (!resp) continue;
    if (resp.assigned_slug_fits && resp.assigned_confidence >= 0.7) {
      agreeCount++;
      continue;
    }

    // Severity: BLOCKING if model is confident in a different slug;
    // WARNING otherwise.
    const isStrongMismatch =
      !resp.assigned_slug_fits &&
      resp.suggested_slug &&
      resp.suggested_slug !== q.concept_slug &&
      resp.suggested_confidence >= 0.85;
    const severity = isStrongMismatch ? SEVERITY.BLOCKING : SEVERITY.WARNING;
    if (severity === SEVERITY.BLOCKING) blockCount++;
    else warnCount++;

    await upsertFinding({
      supabase,
      questionId: q.id,
      category: AUDIT_MODULES.SLUG_ALIGNMENT,
      code: "slug_mismatch",
      severity,
      message: `Assigned slug "${q.concept_slug}" may not fit (model conf ${resp.assigned_confidence.toFixed(2)}, suggests "${resp.suggested_slug ?? "—"}" at ${resp.suggested_confidence.toFixed(2)}).`,
      value: resp.suggested_slug ?? null,
      detail: {
        assigned_slug: q.concept_slug,
        suggested_slug: resp.suggested_slug,
        suggested_confidence: resp.suggested_confidence,
        reason: resp.reason,
        escalated_to_opus: escalated,
        ...(severity === SEVERITY.BLOCKING
          ? { suggested_publish_status: "blocked_slug_uncertain" }
          : {}),
      },
      dryRun: DRY_RUN,
    });
  }

  console.log(`Agree: ${agreeCount}  Warnings: ${warnCount}  Blocking: ${blockCount}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
