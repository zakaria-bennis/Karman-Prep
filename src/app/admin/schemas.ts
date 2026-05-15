// ============================================================
// Zod schemas for admin server actions.
//
// Server actions in Next.js are typed at compile time, but the
// args are NOT validated at runtime — a buggy client (or a
// future change that bypasses TS narrowing) can post any shape
// and the function happily writes it to the DB. These schemas
// add a runtime gate so admin writes can't insert garbage into
// the question bank or curriculum content.
//
// The schemas mirror the TS types from `@/types/quiz` and the
// query layer; whenever those change, update here in lockstep.
// ============================================================

import { z } from "zod";

// ── Primitive enums (kept in sync with @/types/quiz) ────────

export const quizDifficultySchema = z.enum(["foundational", "intermediate", "advanced", "mastery"]);

export const quizDifficultyLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

export const quizQuestionTypeSchema = z.enum([
  "multiple_choice",
  "evidence_based",
  "math_computation",
  "math_word_problem",
]);

export const answerLetterSchema = z.enum(["A", "B", "C", "D"]);

export const answerFormatSchema = z.enum(["multiple_choice", "numeric_entry"]);

export const importStatusSchema = z.enum(["ok", "needs_review"]);
export const importFlagTypeSchema = z.enum(["skip", "partial_emit"]);
export const answerSourceSchema = z.enum(["extracted", "inferred", "hand_corrected"]);

export const subjectSchema = z.enum(["reading", "math"]);

// IDs are not all UUIDs (some are slug-like, e.g. node ids like "ma-15").
// We require non-empty strings without baking in a format.
const nonEmptyString = z.string().min(1);

// ── New-question input (used by actionAddQuestion) ──────────

export const newQuestionInputSchema = z.object({
  node_id: nonEmptyString.nullable(),
  question_text: nonEmptyString,
  question_type: quizQuestionTypeSchema,
  difficulty: quizDifficultySchema,
  difficulty_level: quizDifficultyLevelSchema,
  answer_format: answerFormatSchema,
  correct_answer: nonEmptyString,
  numeric_tolerance: z.number().nullable(),
  explanation_text: z.string(),
  explanation_per_choice: z.record(answerLetterSchema, z.string()).nullable(),
  hint: z.string().nullable(),
  subject: subjectSchema,
  topic_cluster: z.string(),
  desmos_strategy: z.string().nullable(),
  choices: z.array(z.object({ letter: answerLetterSchema, choice_text: z.string() })).max(4),
  display_order: z.number().int().optional(),
  passage_intro: z.string().nullable().optional(),
  passage: z.string().nullable().optional(),
  passage_a: z.string().nullable().optional(),
  passage_b: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  concept_slug: z.string().nullable().optional(),
  answer_source: answerSourceSchema.nullable().optional(),
  source_pdf: z.string().nullable().optional(),
  source_page: z.number().int().nullable().optional(),
  content_hash: z.string().nullable().optional(),
  import_status: importStatusSchema.nullable().optional(),
  import_flag_type: importFlagTypeSchema.nullable().optional(),
  import_flag_reason: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  image_storage_path: z.string().nullable().optional(),
  image_alt: z.string().nullable().optional(),
});

// ── Update-question patch (used by actionUpdateQuestion) ────

export const updateQuestionPatchSchema = z
  .object({
    question_text: z.string(),
    difficulty: quizDifficultySchema,
    correct_answer: z.string(),
    explanation_text: z.string(),
    explanation_per_choice: z.record(answerLetterSchema, z.string()),
    hint: z.string().nullable(),
    topic_cluster: z.string(),
    desmos_strategy: z.string().nullable(),
  })
  .partial();

// ── Bulk import row (used by actionBulkImport) ──────────────

export const bulkImportRowSchema = z.object({
  question_text: nonEmptyString,
  choice_a: z.string().optional(),
  choice_b: z.string().optional(),
  choice_c: z.string().optional(),
  choice_d: z.string().optional(),
  correct_answer: nonEmptyString,
  // Bulk-import rows come from CSV/JSON — difficulty arrives as a
  // free-form string and is normalized downstream. We keep it loose
  // here so the loose-typed callers (CSV inbox cron) don't choke.
  difficulty: z.string(),
  topic_cluster: z.string().optional(),
  hint: z.string().optional(),
  explanation_text: z.string(),
  explanation_a: z.string().optional(),
  explanation_b: z.string().optional(),
  explanation_c: z.string().optional(),
  explanation_d: z.string().optional(),
  desmos_strategy: z.string().optional(),
  passage_intro: z.string().optional(),
  passage: z.string().optional(),
  passage_a: z.string().optional(),
  passage_b: z.string().optional(),
  question_format: answerFormatSchema.optional(),
  numeric_tolerance: z.string().optional(),
  domain: z.string().optional(),
  concept_slug: z.string().optional(),
  answer_source: answerSourceSchema.optional(),
  source_pdf: z.string().optional(),
  source_page: z.union([z.string(), z.number()]).optional(),
  content_hash: z.string().optional(),
  import_status: importStatusSchema.optional(),
  import_flag_type: importFlagTypeSchema.optional(),
  import_flag_reason: z.string().optional(),
  image_url: z.string().optional(),
  image_alt: z.string().optional(),
});

export const bulkImportInputSchema = z.object({
  nodeId: nonEmptyString.nullable(),
  subject: subjectSchema.nullable(),
  rows: z.array(bulkImportRowSchema),
});

// ── Per-action inputs for the simpler signatures ────────────

export const updateQuestionDifficultyInputSchema = z.object({
  questionId: nonEmptyString,
  difficulty: quizDifficultySchema,
  nodeId: nonEmptyString,
});

export const updateQuestionDifficultyLevelInputSchema = z.object({
  questionId: nonEmptyString,
  level: quizDifficultyLevelSchema,
});

export const updateQuestionInputSchema = z.object({
  questionId: nonEmptyString,
  patch: updateQuestionPatchSchema,
  nodeId: nonEmptyString,
});

export const saveTextbookInputSchema = z.object({
  nodeId: nonEmptyString,
  textbook: z.string(),
});

export const saveVideoURLInputSchema = z.object({
  nodeId: nonEmptyString,
  // Either null (clearing the video) or a valid http(s) URL.
  videoUrl: z.union([z.string().url(), z.null()]),
  durationSeconds: z.number().int().positive().nullable(),
});

export const deleteVideoInputSchema = z.object({
  nodeId: nonEmptyString,
  storagePath: z.string().nullable(),
});

export const reorderQuestionsInputSchema = z.object({
  orderedIds: z.array(nonEmptyString).min(1),
  nodeId: nonEmptyString,
});

export const deleteQuestionInputSchema = z.object({
  questionId: nonEmptyString,
  nodeId: nonEmptyString,
});

export const removeQuestionImageInputSchema = z.object({
  questionId: nonEmptyString,
  nodeId: nonEmptyString,
  storagePath: z.string().nullable(),
});

export const resolveFlaggedQuestionInputSchema = z.object({
  flagId: nonEmptyString,
});

export const acceptFlaggedQuestionInputSchema = z.object({
  questionId: nonEmptyString,
  opts: z
    .object({
      nodeId: nonEmptyString.nullable().optional(),
    })
    .default({}),
});

export const rejectFlaggedQuestionInputSchema = z.object({
  questionId: nonEmptyString,
});

export const bulkRejectQuestionsInputSchema = z.object({
  // Cap at 200 — the Flagged list is paginated visually but not in
  // the API, so we limit the per-call size to keep one DELETE round
  // trip bounded. A bad PDF should never produce more than that
  // many flags anyway.
  questionIds: z.array(nonEmptyString).min(1).max(200),
});

// FormData-based actions (actionUploadVideo, actionUploadQuestionImage)
// can't be fully validated with Zod because File is a binary handle,
// not a JSON-serializable value. We validate the non-File args.

export const uploadVideoArgsSchema = z.object({
  nodeId: nonEmptyString,
});

export const uploadQuestionImageArgsSchema = z.object({
  questionId: nonEmptyString,
  nodeId: nonEmptyString,
  alt: z.string().nullable(),
});

// ── Schemas for the other 6 admin server-action files ────────
// Same gate-at-the-boundary pattern as the main actions.ts schemas
// above. Kept here (rather than in per-area sibling files) so the
// admin surface has one canonical schema home.

// AppRole values match @/lib/supabase/queries/admin AppRole. Updates
// here must stay in lockstep with that type.
export const appRoleSchema = z.enum(["student", "tutor", "admin", "parent"]);

// Impersonation can target anyone EXCEPT admin — an admin can't
// impersonate as another admin (no point + would be confusing).
// Mirrors `type ImpersonateRole = Exclude<AppRole, "admin">`.
export const impersonateRoleSchema = z.enum(["student", "tutor", "parent"]);

// CohortTier + CohortStatus from @/lib/supabase/queries/cohorts.
export const cohortTierSchema = z.enum(["group", "small_group"]);
export const cohortStatusSchema = z.enum(["forming", "active", "completed"]);

// Per-tier max cohort size — mirrored from migration 006's CHECK
// constraint. Update in lockstep with the DB.
const TIER_MAX_CAP: Record<z.infer<typeof cohortTierSchema>, number> = {
  small_group: 5,
  group: 200,
};

// ── impersonation-actions.ts ──────────────────────────────
export const setImpersonationInputSchema = z.object({
  role: impersonateRoleSchema,
});

// ── curriculum/search-actions.ts ──────────────────────────
export const searchBankQuestionsInputSchema = z.object({
  // 1-char hits are noisy and the action filters them anyway, but
  // gating at the schema makes the contract explicit.
  query: z.string().min(2, "query must be at least 2 chars"),
});

// ── cohorts/actions.ts ────────────────────────────────────
export const createCohortInputSchema = z
  .object({
    name: z
      .string()
      .min(1, "name is required")
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "name cannot be whitespace-only")),
    tier: cohortTierSchema,
    // YYYY-MM-DD only; rejects ISO timestamps and free-form dates.
    sat_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "sat_date must be YYYY-MM-DD"),
    tutor_user_id: nonEmptyString,
    max_size: z.number().int().positive(),
    current_topic: z.string().nullable().optional(),
    status: cohortStatusSchema.optional(),
  })
  .refine((d) => d.max_size <= TIER_MAX_CAP[d.tier], {
    message: "max_size exceeds the per-tier cap (group: 200, small_group: 5)",
    path: ["max_size"],
  });

// ── users/actions.ts ──────────────────────────────────────
export const setUserRoleInputSchema = z.object({
  targetUserId: nonEmptyString,
  nextRole: appRoleSchema,
});

export const linkParentStudentInputSchema = z
  .object({
    parentUserId: nonEmptyString,
    studentUserId: nonEmptyString,
  })
  .refine((d) => d.parentUserId !== d.studentUserId, {
    message: "parent and student cannot be the same user",
    path: ["studentUserId"],
  });

export const unlinkParentStudentInputSchema = z.object({
  parentUserId: nonEmptyString,
  studentUserId: nonEmptyString,
});

// ── cohorts/[id]/members-actions.ts ───────────────────────
// Same shape for add + remove — kept as one schema (used twice).
export const cohortMemberMutationInputSchema = z.object({
  cohortId: nonEmptyString,
  studentUserId: nonEmptyString,
});
