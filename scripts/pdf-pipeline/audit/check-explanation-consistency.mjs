#!/usr/bin/env node

// ============================================================
// check-explanation-consistency — Phase 8.3 audit module.
//
// Cross-checks explanation_v2 content against the verified answer:
//   · Does correct_reasoning support the verified_answer?
//   · For MC: do per-choice explanations actually match the choice text?
//   · For R&W: does cited evidence exist in the passage?
//   · Is per-choice misconception language natural vs. forced?
//
// Sonnet by default; escalate to Opus for unresolved high-severity
// disputes.
//
// Eligibility: row must have explanation_v2 with correct_reasoning.
//
// This DOES overlap with Phase 7's QA critic — but it serves a
// different purpose: Phase 7 critic gates whether to PUBLISH the
// new explanation. This audit runs after publish-gate, surfaces
// drift between explanation + verified answer, and persists
// findings so an admin can spot-check or flag for re-fill.
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { callClaude } from "../../lib/llm-providers.mjs";
import {
  upsertFinding,
  SEVERITY,
  AUDIT_MODULES,
  isEligibleForExplanationConsistency,
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
    "supports_verified_answer",
    "evidence_grounded",
    "natural_voice",
    "verdict",
    "summary",
  ],
  properties: {
    supports_verified_answer: { type: "boolean" },
    evidence_grounded: { type: "boolean" },
    natural_voice: { type: "boolean" },
    verdict: { type: "string", enum: ["consistent", "minor_drift", "serious_drift"] },
    summary: { type: "string" },
  },
};

function buildPrompt(q) {
  return `You are auditing whether the published explanation_v2 for an SAT question is consistent with the verified answer.

QUESTION:
${q.question_text}

${q.passage ? `PASSAGE:\n${q.passage}\n` : ""}
VERIFIED ANSWER: ${q.selected_official_answer ?? q.correct_answer ?? "(unknown)"}

EXPLANATION_V2:
${JSON.stringify(q.explanation_v2, null, 2)}

Decide:
- supports_verified_answer: does correct_reasoning actually argue for the verified answer (not a different one)?
- evidence_grounded: for R&W, do cited passage quotes exist? for Math, are reasoning steps correct?
- natural_voice: is per-choice misconception language genuine (vs. forced/contrived)?
- verdict: consistent | minor_drift | serious_drift
  consistent       — no audit finding needed.
  minor_drift      — small clarity/quality issue; flag as WARNING.
  serious_drift    — explanation contradicts the verified answer OR cites nonexistent evidence; flag as BLOCKING.
- summary: 1-2 sentences.`;
}

async function callTier(q, model) {
  try {
    return {
      ok: true,
      raw: await callClaude({
        prompt: buildPrompt(q),
        model,
        toolSchema: RESPONSE_SCHEMA,
        maxTokens: 800,
      }),
    };
  } catch (err) {
    return { ok: false, error: err?.message ?? String(err) };
  }
}

const SELECT =
  "id, question_text, passage, selected_official_answer, correct_answer, explanation_v2, source_pdf, source_page";

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
  console.log("Phase 8.3 — check-explanation-consistency");
  const rows = (await selectRows()).filter(isEligibleForExplanationConsistency);
  console.log(`  ${rows.length} eligible row(s)`);
  if (rows.length === 0) return;

  let cleanCount = 0,
    warnCount = 0,
    blockCount = 0;
  for (const q of rows) {
    if (NO_LLM) continue;
    let result = await callTier(q, "claude-sonnet-4-6");
    let resp = result.ok ? result.raw : null;
    let escalated = false;

    if (resp && resp.verdict === "serious_drift") {
      const opus = await callTier(q, "claude-opus-4-7");
      if (opus.ok) {
        resp = opus.raw;
        escalated = true;
      }
    }
    if (!resp) continue;

    if (resp.verdict === "consistent") {
      cleanCount++;
      continue;
    }
    const severity = resp.verdict === "serious_drift" ? SEVERITY.BLOCKING : SEVERITY.WARNING;
    if (severity === SEVERITY.BLOCKING) blockCount++;
    else warnCount++;

    await upsertFinding({
      supabase,
      questionId: q.id,
      category: AUDIT_MODULES.EXPLANATION_CONSISTENCY,
      code: resp.verdict, // "minor_drift" or "serious_drift"
      severity,
      message: resp.summary,
      value: null,
      detail: {
        supports_verified_answer: resp.supports_verified_answer,
        evidence_grounded: resp.evidence_grounded,
        natural_voice: resp.natural_voice,
        escalated_to_opus: escalated,
        ...(severity === SEVERITY.BLOCKING
          ? { suggested_publish_status: "needs_human_review" }
          : {}),
      },
      dryRun: DRY_RUN,
    });
  }

  console.log(`Clean: ${cleanCount}  Warnings: ${warnCount}  Blocking: ${blockCount}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
