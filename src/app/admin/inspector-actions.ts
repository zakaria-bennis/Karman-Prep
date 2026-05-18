"use server";

// ============================================================
// Inspector server actions — every write the Inspector UI can
// kick off, role-gated to admin. Split out of `actions.ts` to
// keep both files under the 700-line repo cap.
//
// What lives here:
//   · Single-row resolve / accept / flag / update / restore
//   · Bulk resolve / accept / flag (worklist multi-select)
//   · Re-audit-this-row (deterministic audit on demand)
//   · Apply-Pro's-answer (one-click fix for likely_wrong)
//
// Each action validates its input through Zod before any DB
// write — same hard-boundary pattern as `actions.ts`.
// `actions.ts` re-exports these so existing imports keep
// working without churn.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/queries/admin";
import { reauditRowInputSchema, applySuggestedFixInputSchema } from "./schemas";
import type { Database } from "@/types/supabase";
import { auditRow, type AuditableRow } from "@/lib/question-bank/audit-rules";

async function guardAdmin(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  const ok = await requireRole(userId, ["admin"]);
  if (!ok) throw new Error("Admin role required");
  return userId;
}

// ── Findings: single-row resolve ─────────────────────────────

/** Mark a single audit-or-grader finding as resolved (admin reviewed
 *  and decided it's either fixed, dismissed, or not a real issue). */
export async function actionResolveFinding(input: {
  findingId: string;
  note?: string;
}): Promise<void> {
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("question_findings")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolved_note: input.note ?? null,
    })
    .eq("id", input.findingId);
  if (error) throw error;
  revalidatePath("/admin/questions/inspect");
}

// ── Accept / flag — single row ───────────────────────────────

/** Flip a question to live (is_live=true via the import_status='ok'
 *  trigger) AND auto-resolve every open finding on it. The admin
 *  has decided the question is good as-is, so the findings shouldn't
 *  keep haunting the worklist. Resolved findings stay in the DB for
 *  audit-trail purposes (filterable via "Include resolved"). */
export async function actionAcceptInspectedQuestion(input: { questionId: string }): Promise<void> {
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  // 1. Flip the question to live.
  const { error: qErr } = await supabase
    .from("quiz_questions")
    .update({
      import_status: "ok",
      import_flag_type: null,
      import_flag_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.questionId);
  if (qErr) throw qErr;

  // 2. Auto-resolve every open finding for this question. Without
  //    this step, the worklist still shows the row even after the
  //    admin accepted it.
  const { error: fErr } = await supabase
    .from("question_findings")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolved_note: "Auto-resolved on Accept Live",
    })
    .eq("question_id", input.questionId)
    .is("resolved_at", null);
  if (fErr) throw fErr;

  revalidatePath("/admin/questions/inspect");
  revalidatePath(`/admin/questions/inspect/${input.questionId}`);
  revalidatePath("/admin/questions/review");
}

/** Reverse of accept — flag a previously-live question for review
 *  (e.g. the admin saw it in the Inspector with WARNING findings and
 *  decided it shouldn't stay live until fixed). */
export async function actionFlagInspectedQuestion(input: {
  questionId: string;
  reason?: string;
}): Promise<void> {
  await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("quiz_questions")
    .update({
      import_status: "needs_review",
      import_flag_type: "partial_emit",
      import_flag_reason: input.reason ?? "Flagged via Inspector",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.questionId);
  if (error) throw error;
  revalidatePath("/admin/questions/inspect");
  revalidatePath(`/admin/questions/inspect/${input.questionId}`);
  revalidatePath("/admin/questions/review");
}

// ── Update + Restore live in inspector-edit-actions.ts ──────
// (Both lean heavily on question_history snapshot helpers — keeping
// them clustered + extracted keeps this file under the 700-line
// cap.) Imports go DIRECTLY through actions.ts → inspector-edit-
// actions; we don't re-export through this file because Turbopack's
// `"use server"` boundary check rejects cascading re-exports
// (silent in TS, hard build error in cf:build).

// ── Bulk Inspector actions ───────────────────────────────────
// Worklist multi-select wires into these. Each does ONE bulk UPDATE
// per call so triaging 50 rows is one round-trip, not 50.

/** Resolve every open finding on each of the given questions. Does
 *  NOT change question.import_status — use the bulk-accept action if
 *  you also want to flip those questions live. */
export async function actionBulkResolveFindings(input: {
  questionIds: string[];
  note?: string;
}): Promise<{ resolved: number }> {
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  if (input.questionIds.length === 0) return { resolved: 0 };
  const { data, error } = await supabase
    .from("question_findings")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolved_note: input.note ?? "Bulk-resolved via Inspector",
    })
    .in("question_id", input.questionIds)
    .is("resolved_at", null)
    .select("id");
  if (error) throw error;
  revalidatePath("/admin/questions/inspect");
  return { resolved: data?.length ?? 0 };
}

/** Bulk-accept N questions: flip each to import_status='ok' (live)
 *  + auto-resolve every open finding on each of them. */
export async function actionBulkAcceptQuestions(input: {
  questionIds: string[];
}): Promise<{ accepted: number; resolvedFindings: number }> {
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  if (input.questionIds.length === 0) return { accepted: 0, resolvedFindings: 0 };
  const nowIso = new Date().toISOString();
  const { data: qd, error: qErr } = await supabase
    .from("quiz_questions")
    .update({
      import_status: "ok",
      import_flag_type: null,
      import_flag_reason: null,
      updated_at: nowIso,
    })
    .in("id", input.questionIds)
    .select("id");
  if (qErr) throw qErr;
  const { data: fd, error: fErr } = await supabase
    .from("question_findings")
    .update({
      resolved_at: nowIso,
      resolved_by: userId,
      resolved_note: "Auto-resolved on bulk Accept Live",
    })
    .in("question_id", input.questionIds)
    .is("resolved_at", null)
    .select("id");
  if (fErr) throw fErr;
  revalidatePath("/admin/questions/inspect");
  revalidatePath("/admin/questions/review");
  return { accepted: qd?.length ?? 0, resolvedFindings: fd?.length ?? 0 };
}

/** Bulk-flag N questions for review. Does NOT touch findings — those
 *  stay open since the admin is signalling "this row still needs
 *  attention." */
export async function actionBulkFlagQuestions(input: {
  questionIds: string[];
  reason?: string;
}): Promise<{ flagged: number }> {
  await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();
  if (input.questionIds.length === 0) return { flagged: 0 };
  const { data, error } = await supabase
    .from("quiz_questions")
    .update({
      import_status: "needs_review",
      import_flag_type: "partial_emit",
      import_flag_reason: input.reason ?? "Bulk-flagged via Inspector",
      updated_at: new Date().toISOString(),
    })
    .in("id", input.questionIds)
    .select("id");
  if (error) throw error;
  revalidatePath("/admin/questions/inspect");
  revalidatePath("/admin/questions/review");
  return { flagged: data?.length ?? 0 };
}

// ── Re-audit a single row (Batch 3 — new) ─────────────────────
// Runs the same deterministic checks the CLI runs (audit-csv.mjs),
// but on ONE row instead of the whole CSV. Lets the admin re-verify
// after an edit without re-running the offline pipeline.
//
// Strategy:
//   1. Fetch quiz_questions row + answer_choices.
//   2. Map to AuditableRow shape.
//   3. Run `auditRow` from @/lib/question-bank/audit-rules.
//   4. Diff against existing question_findings rows (source=auditor,
//      resolved_at IS NULL):
//        · code now produced but no open row → INSERT
//        · code no longer produced but has open row → mark resolved
//          with note "auto-resolved on re-audit"
//        · code present in both → no-op (don't churn timestamps)
//   5. Return counts so the UI can show "3 new, 2 resolved, 1 stable".

export async function actionReauditRow(input: { questionId: string }): Promise<{
  questionId: string;
  newFindings: number;
  autoResolvedFindings: number;
  stillOpenFindings: number;
}> {
  reauditRowInputSchema.parse(input);
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createAdminClient();

  // 1. Fetch the row + its choices.
  const { data: row, error: rowErr } = await supabase
    .from("quiz_questions")
    .select(
      `id, question_text, correct_answer, answer_format, difficulty_level,
       hint, explanation_text, explanation_per_choice,
       passage, passage_intro, passage_a, passage_b,
       domain, concept_slug, image_url, image_alt, numeric_tolerance,
       answer_choices(letter, choice_text, is_correct)`
    )
    .eq("id", input.questionId)
    .maybeSingle();
  if (rowErr) throw rowErr;
  if (!row) throw new Error(`Question ${input.questionId} not found`);

  // 2. Map to AuditableRow shape.
  const auditable: AuditableRow = {
    question_text: row.question_text,
    correct_answer: row.correct_answer,
    answer_format: row.answer_format,
    difficulty_level: row.difficulty_level,
    hint: row.hint,
    explanation_text: row.explanation_text,
    explanation_per_choice: (row.explanation_per_choice as Record<string, string> | null) ?? null,
    passage: row.passage,
    passage_intro: row.passage_intro,
    passage_a: row.passage_a,
    passage_b: row.passage_b,
    domain: row.domain,
    concept_slug: row.concept_slug,
    image_url: row.image_url,
    image_alt: row.image_alt,
    numeric_tolerance: row.numeric_tolerance,
    choices: (row.answer_choices ?? []).map((c) => ({
      letter: c.letter,
      choice_text: c.choice_text,
      is_correct: c.is_correct,
    })),
  };

  // 3. Run audit-rules.
  const findings = auditRow(auditable);
  const producedCodes = new Set(findings.map((f) => f.code));

  // 4. Pull current OPEN auditor findings for diff.
  const { data: existing, error: existErr } = await supabase
    .from("question_findings")
    .select("id, code")
    .eq("question_id", input.questionId)
    .eq("source", "auditor")
    .is("resolved_at", null);
  if (existErr) throw existErr;
  const existingByCode = new Map<string, string>(); // code → finding_id
  for (const e of existing ?? []) existingByCode.set(e.code, e.id);

  // Codes to INSERT: produced now, no existing open row.
  const toInsert = findings.filter((f) => !existingByCode.has(f.code));
  // Codes to AUTO-RESOLVE: have open row but no longer produced.
  const toResolve: string[] = [];
  for (const [code, id] of existingByCode.entries()) {
    if (!producedCodes.has(code)) toResolve.push(id);
  }
  const stillOpen = findings.length - toInsert.length;

  // 5a. INSERT new findings.
  if (toInsert.length > 0) {
    type FindingInsert = Database["public"]["Tables"]["question_findings"]["Insert"];
    const payload: FindingInsert[] = toInsert.map((f) => ({
      question_id: input.questionId,
      source: "auditor",
      severity: f.severity,
      category: f.category,
      code: f.code,
      message: f.message,
      value: f.value ?? null,
      detail: null,
    }));
    const { error: insErr } = await supabase
      .from("question_findings")
      .upsert(payload, { onConflict: "question_id,source,code" });
    if (insErr) throw insErr;
  }

  // 5b. AUTO-RESOLVE stale findings.
  if (toResolve.length > 0) {
    const { error: resErr } = await supabase
      .from("question_findings")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        resolved_note: "Auto-resolved on re-audit (code no longer produced)",
      })
      .in("id", toResolve);
    if (resErr) throw resErr;
  }

  revalidatePath("/admin/questions/inspect");
  revalidatePath(`/admin/questions/inspect/${input.questionId}`);
  return {
    questionId: input.questionId,
    newFindings: toInsert.length,
    autoResolvedFindings: toResolve.length,
    stillOpenFindings: stillOpen,
  };
}

// ── Apply Pro's-answer one-click fix (Batch 3 — new) ──────────
// When the LLM grader emits a `likely_wrong` finding, its
// `detail.pro_answer` is the letter Pro (Gemini 2.5 Pro) believes
// is correct. This action flips correct_answer to that letter,
// re-derives is_correct on the answer_choices, snapshots history,
// and resolves the finding — one click instead of edit→save→resolve.
//
// Only works for MC questions (Pro's answer is a letter).
//
// Strategy mirrors actionUpdateInspectedQuestion's
// answer-letter-only path so the history snapshot tells the same
// story.

export async function actionApplySuggestedFix(input: {
  findingId: string;
}): Promise<{ questionId: string; newCorrect: string }> {
  applySuggestedFixInputSchema.parse(input);
  const userId = await guardAdmin();
  const { createAdminClient } = await import("@/lib/supabase/server");
  const { buildSnapshot, insertHistoryRow } = await import("@/lib/supabase/queries/quiz/history");
  const supabase = createAdminClient();

  // 1. Load the finding and pull suggested answer from detail.pro_answer.
  const { data: finding, error: fErr } = await supabase
    .from("question_findings")
    .select("*")
    .eq("id", input.findingId)
    .maybeSingle();
  if (fErr) throw fErr;
  if (!finding) throw new Error("Finding not found");
  if (finding.code !== "likely_wrong") {
    throw new Error("Apply-suggested-fix only valid for likely_wrong findings");
  }
  if (finding.resolved_at) {
    throw new Error("Finding is already resolved");
  }
  const detail = (finding.detail ?? {}) as Record<string, unknown>;
  const suggested = String(detail.pro_answer ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-D]$/.test(suggested)) {
    throw new Error(`Suggested answer "${suggested}" is not A|B|C|D — can't apply automatically`);
  }
  const questionId = finding.question_id;
  if (!questionId) throw new Error("Finding has no question_id");

  // 2. Snapshot BEFORE so history captures the swap.
  const { data: beforeRow, error: beforeErr } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", questionId)
    .maybeSingle();
  if (beforeErr) throw beforeErr;
  if (!beforeRow) throw new Error("Question not found");
  if (beforeRow.answer_format !== "multiple_choice") {
    throw new Error("Apply-suggested-fix only valid for multiple_choice questions");
  }
  if (beforeRow.correct_answer === suggested) {
    // Nothing to flip — just resolve the finding.
    const { error: rErr } = await supabase
      .from("question_findings")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: userId,
        resolved_note: `Stored answer already matches Pro's suggestion (${suggested})`,
      })
      .eq("id", input.findingId);
    if (rErr) throw rErr;
    revalidatePath("/admin/questions/inspect");
    revalidatePath(`/admin/questions/inspect/${questionId}`);
    return { questionId, newCorrect: suggested };
  }
  const beforeSnapshot = buildSnapshot(beforeRow as unknown as Parameters<typeof buildSnapshot>[0]);

  // 3. Update correct_answer on quiz_questions.
  const { error: qErr } = await supabase
    .from("quiz_questions")
    .update({
      correct_answer: suggested,
      updated_at: new Date().toISOString(),
    })
    .eq("id", questionId);
  if (qErr) throw qErr;

  // 4. Re-derive is_correct on answer_choices.
  const { error: r1 } = await supabase
    .from("answer_choices")
    .update({ is_correct: false })
    .eq("question_id", questionId);
  if (r1) throw r1;
  const { error: r2 } = await supabase
    .from("answer_choices")
    .update({ is_correct: true })
    .eq("question_id", questionId)
    .eq("letter", suggested as "A" | "B" | "C" | "D");
  if (r2) throw r2;

  // 5. Snapshot AFTER and record history.
  const { data: afterRow, error: afterErr } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", questionId)
    .maybeSingle();
  if (afterErr) throw afterErr;
  if (afterRow) {
    const afterSnapshot = buildSnapshot(afterRow as unknown as Parameters<typeof buildSnapshot>[0]);
    await insertHistoryRow({
      questionId,
      beforeState: beforeSnapshot,
      afterState: afterSnapshot,
      editedBy: userId,
      source: "inspector",
      note: `Applied Pro's suggested answer (${beforeRow.correct_answer} → ${suggested})`,
    });
  }

  // 6. Mark the finding resolved.
  const { error: resErr } = await supabase
    .from("question_findings")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolved_note: `Applied Pro's suggested answer (${beforeRow.correct_answer} → ${suggested})`,
    })
    .eq("id", input.findingId);
  if (resErr) throw resErr;

  revalidatePath("/admin/questions/inspect");
  revalidatePath(`/admin/questions/inspect/${questionId}`);
  revalidatePath("/admin/questions/review");
  return { questionId, newCorrect: suggested };
}
