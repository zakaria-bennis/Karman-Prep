// ============================================================
// question_history selectors + snapshot helpers.
//
// Server actions call `snapshotBeforeEdit` right before they UPDATE
// a quiz_questions row, so the BEFORE state ends up in the
// question_history table for later inspection / restore.
//
// The Inspector detail page calls `selectQuestionHistory` to render
// the per-row history pane + the Restore button.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";
import type { QuizQuestionWithChoices } from "@/types/quiz";

export interface QuestionHistoryEntry {
  id: string;
  question_id: string;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  changed_fields: string[];
  edited_by: string;
  edit_source: "inspector" | "bulk" | "api" | "apply-fix" | "preview";
  edit_note: string | null;
  created_at: string;
}

/** A serializable subset of the question + its choices that captures
 *  every editable field. Returned as the snapshot payload — same
 *  shape used for both before_state and after_state. */
export interface QuestionSnapshot {
  question_text: string;
  correct_answer: string;
  difficulty_level: number | null;
  explanation_text: string;
  explanation_per_choice: Record<string, string> | null;
  hint: string | null;
  desmos_strategy: string | null;
  image_alt: string | null;
  image_url: string | null;
  figure_kind: string | null;
  figure_table_data: unknown;
  figure_chart_data: unknown;
  passage_intro: string | null;
  passage: string | null;
  passage_a: string | null;
  passage_b: string | null;
  numeric_tolerance: number | null;
  concept_slug: string | null;
  domain: string | null;
  topic_cluster: string | null;
  import_status: string | null;
  choices: Array<{ letter: string; choice_text: string; is_correct: boolean }>;
}

/** Build a snapshot object from a fetched question + its choices. */
export function buildSnapshot(q: QuizQuestionWithChoices): QuestionSnapshot {
  return {
    question_text: q.question_text ?? "",
    correct_answer: q.correct_answer ?? "",
    difficulty_level: q.difficulty_level ?? null,
    explanation_text: q.explanation_text ?? "",
    explanation_per_choice: (q.explanation_per_choice as Record<string, string> | null) ?? null,
    hint: q.hint ?? null,
    desmos_strategy: q.desmos_strategy ?? null,
    image_alt: q.image_alt ?? null,
    image_url: q.image_url ?? null,
    figure_kind: q.figure_kind ?? null,
    figure_table_data: q.figure_table_data ?? null,
    figure_chart_data: q.figure_chart_data ?? null,
    passage_intro: q.passage_intro ?? null,
    passage: q.passage ?? null,
    passage_a: q.passage_a ?? null,
    passage_b: q.passage_b ?? null,
    numeric_tolerance: q.numeric_tolerance ?? null,
    concept_slug: q.concept_slug ?? null,
    domain: q.domain ?? null,
    topic_cluster: q.topic_cluster ?? null,
    import_status: q.import_status ?? null,
    choices: q.answer_choices.map((c) => ({
      letter: c.letter,
      choice_text: c.choice_text,
      is_correct: c.is_correct,
    })),
  };
}

/** Compute which top-level fields differ between two snapshots.
 *  Used to populate `changed_fields` on the history row + show a
 *  concise summary in the history list. */
export function diffSnapshots(before: QuestionSnapshot, after: QuestionSnapshot): string[] {
  const fields: (keyof QuestionSnapshot)[] = [
    "question_text",
    "correct_answer",
    "difficulty_level",
    "explanation_text",
    "explanation_per_choice",
    "hint",
    "desmos_strategy",
    "image_alt",
    "image_url",
    "figure_kind",
    "figure_table_data",
    "figure_chart_data",
    "passage_intro",
    "passage",
    "passage_a",
    "passage_b",
    "numeric_tolerance",
    "concept_slug",
    "domain",
    "topic_cluster",
    "import_status",
  ];
  const changed: string[] = [];
  for (const f of fields) {
    if (JSON.stringify(before[f]) !== JSON.stringify(after[f])) changed.push(f);
  }
  // Compare choice arrays element-wise
  if (JSON.stringify(before.choices) !== JSON.stringify(after.choices)) changed.push("choices");
  return changed;
}

/** Insert a history row capturing this edit. Called by server actions
 *  AFTER the UPDATE completes (so after_state reflects the post-edit
 *  values). The action passes its current user id and the source
 *  channel ('inspector' / 'bulk' / etc) for audit. */
export async function insertHistoryRow(input: {
  questionId: string;
  beforeState: QuestionSnapshot;
  afterState: QuestionSnapshot;
  editedBy: string;
  source: "inspector" | "bulk" | "api" | "apply-fix" | "preview";
  note?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const changed = diffSnapshots(input.beforeState, input.afterState);
  // No-op edits don't deserve a history row.
  if (changed.length === 0) return;
  // Cast through unknown — the generated supabase type for inserts
  // doesn't always pick up newly added tables on first compile pass.
  // Runtime payload is correct per the question_history schema.
  const payload = {
    question_id: input.questionId,
    before_state: input.beforeState,
    after_state: input.afterState,
    changed_fields: changed,
    edited_by: input.editedBy,
    edit_source: input.source,
    edit_note: input.note ?? null,
  };
  const { error } = await supabase
    .from("question_history")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(payload as any);
  if (error) throw error;
}

/** Most-recent first list of edits for one question. */
export async function selectQuestionHistory(
  questionId: string,
  limit = 25
): Promise<QuestionHistoryEntry[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("question_history")
    .select("*")
    .eq("question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as QuestionHistoryEntry[];
}

/** Per-field edit history for the EditedChip popover.
 *
 *  Returns the most-recent N edits that touched `fieldKey`. We don't
 *  pre-index changed_fields in the DB (would need a GIN index +
 *  recurring maintenance); the table is small (~thousands of rows
 *  per year) so we filter in app code.
 *
 *  Each entry's `before` / `after` are the THIS-FIELD values from
 *  the respective snapshots, stringified for display. */
export async function selectFieldHistory(
  questionId: string,
  fieldKey: string,
  limit = 10
): Promise<
  Array<{
    id: string;
    createdAt: string;
    editedBy: string;
    source: string;
    before: string;
    after: string;
  }>
> {
  const rows = await selectQuestionHistory(questionId, 100);
  const matching = rows.filter((r) => r.changed_fields.includes(fieldKey)).slice(0, limit);
  return matching.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    editedBy: r.edited_by,
    source: r.edit_source,
    before: stringifyFieldValue((r.before_state as Record<string, unknown>)[fieldKey]),
    after: stringifyFieldValue((r.after_state as Record<string, unknown>)[fieldKey]),
  }));
}

/** Distinct set of fields that have ANY history for this question.
 *  Used by the preview page to know which inline-edit slots should
 *  render an [edited] chip without N round-trips. */
export async function selectChangedFieldsSet(questionId: string): Promise<Set<string>> {
  const rows = await selectQuestionHistory(questionId, 100);
  const set = new Set<string>();
  for (const r of rows) for (const f of r.changed_fields) set.add(f);
  return set;
}

function stringifyFieldValue(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
