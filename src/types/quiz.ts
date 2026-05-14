// ============================================================
// Karman — Quiz & Lesson System Types
// Mirrors migration 002_lesson_quiz.sql.
// ============================================================

import type { Subject } from "@/data/curriculum";

export type QuizDifficulty = "foundational" | "intermediate" | "advanced" | "mastery";
/** Numeric 1 (easiest) through 7 (hardest) — new source of truth for adaptive algorithm. */
export type QuizDifficultyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type QuizAnswerFormat = "multiple_choice" | "numeric_entry";
export type QuizQuestionType =
  | "multiple_choice"
  | "evidence_based"
  | "math_computation"
  | "math_word_problem";
export type ConfidenceBand = "struggling" | "developing" | "proficient" | "mastered";
export type AnswerLetter = "A" | "B" | "C" | "D";
export type OverrideStatus =
  | "locked"
  | "unlocked"
  | "in_progress"
  | "partially_complete"
  | "mastered";

// ── Database row shapes ──────────────────────────────────────

export interface AnswerChoice {
  id: string;
  question_id: string;
  letter: AnswerLetter;
  choice_text: string;
  is_correct: boolean;
}

export type ImportStatus = "ok" | "needs_review";
export type ImportFlagType = "skip" | "partial_emit";
export type AnswerSource = "extracted" | "inferred" | "hand_corrected";

export interface QuizQuestion {
  id: string;
  /** Curriculum node this question is tied to. NULL for PDF-imported
   *  questions that live in the bank until an admin routes them via
   *  the Question Review UI. */
  node_id: string | null;
  question_text: string;
  question_type: QuizQuestionType;
  difficulty: QuizDifficulty;                // legacy — kept for back-compat display
  difficulty_level: QuizDifficultyLevel;     // 1–7 — the new source of truth
  answer_format: QuizAnswerFormat;           // 'multiple_choice' or 'numeric_entry'
  correct_answer: string;                    // letter A/B/C/D (MC) OR numeric string (numeric_entry)
  numeric_tolerance: number | null;          // ± range for numeric answers; null = exact match
  explanation_text: string;
  explanation_per_choice: Partial<Record<AnswerLetter, string>> | null;
  hint: string | null;                       // shown to students while answering (optional)
  image_url: string | null;                  // optional graph / table / figure shown above the question
  image_storage_path: string | null;         // object key inside the 'question-images' bucket
  image_alt: string | null;                  // alt text for accessibility
  subject: Subject;
  topic_cluster: string;
  desmos_strategy: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  is_flagged: boolean;
  flag_count: number;

  // ── Ingestion fields (migration 020) ───────────────────────
  /** Italic source attribution shown above literature passages. */
  passage_intro: string | null;
  /** Single-passage R&W content. */
  passage: string | null;
  /** First passage for cross-text-connection (paired) questions. */
  passage_a: string | null;
  /** Second passage for cross-text-connection (paired) questions. */
  passage_b: string | null;
  /** One of the 8 SAT domain slugs (see lib/question-bank/taxonomy.ts). */
  domain: string | null;
  /** One of the 72 SAT concept slugs (see lib/question-bank/taxonomy.ts). */
  concept_slug: string | null;
  /** Whether the answer was extracted from the key, inferred, or hand-corrected. */
  answer_source: AnswerSource | null;
  /** Filename of the source PDF (e.g., "official-sat-practice-test-1.pdf"). */
  source_pdf: string | null;
  source_page: number | null;
  /** SHA-1 of normalized question_text + choices — the dedupe key. */
  content_hash: string | null;
  /** "needs_review" hides the question from students until accepted in /admin/questions/review. */
  import_status: ImportStatus | null;
  import_flag_type: ImportFlagType | null;
  import_flag_reason: string | null;
}

/** Admin-supplied overrides for a node's textbook + video.
 *  When present, overrides the defaults defined in curriculum.ts. */
export interface NodeContent {
  node_id: string;
  textbook_content: string | null;
  video_url: string | null;
  video_storage_path: string | null;
  video_duration_seconds: number | null;
  updated_by: string | null;
  updated_at: string;
}

export interface QuizQuestionWithChoices extends QuizQuestion {
  answer_choices: AnswerChoice[];
}

export interface AdaptiveStep {
  question_id: string;
  difficulty: QuizDifficulty;
  was_correct: boolean;
}

export interface QuizAttempt {
  id: string;
  student_id: string;
  node_id: string;
  attempt_number: number;
  score: number | null;
  questions_answered: number;
  questions_correct: number;
  confidence_band: ConfidenceBand | null;
  started_at: string;
  completed_at: string | null;
  adaptive_path: AdaptiveStep[];
}

export interface QuestionResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  student_answer: AnswerLetter;
  is_correct: boolean;
  difficulty_at_time: QuizDifficulty;
  response_time_seconds: number;
  flagged: boolean;
  flag_note: string | null;
  answered_at: string;
}

export interface FlaggedQuestion {
  id: string;
  question_id: string;
  student_id: string;
  node_id: string;
  flag_note: string | null;
  created_at: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
}

export interface TutorNodeOverride {
  id: string;
  tutor_id: string;
  student_id: string;
  node_id: string;
  override_status: OverrideStatus;
  locked_pathway: boolean;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TutorCheckpointAssignment {
  id: string;
  tutor_id: string;
  student_id: string;
  checkpoint_id: string;   // e.g. "reading:1"
  assigned_at: string;
  reason: string | null;
  cooldown_override: boolean;
}

// ── Runtime helpers ─────────────────────────────────────────

export const DIFFICULTY_ORDER: QuizDifficulty[] = [
  "foundational",
  "intermediate",
  "advanced",
  "mastery",
];

export const DIFFICULTY_COLORS: Record<QuizDifficulty, { bg: string; text: string; border: string; hex: string }> = {
  foundational: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-300 dark:border-emerald-700", hex: "#10b981" },
  intermediate: { bg: "bg-amber-100 dark:bg-amber-900/30",     text: "text-amber-700 dark:text-amber-300",     border: "border-amber-300 dark:border-amber-700",     hex: "#f59e0b" },
  advanced:     { bg: "bg-orange-100 dark:bg-orange-900/30",   text: "text-orange-700 dark:text-orange-300",   border: "border-orange-300 dark:border-orange-700",   hex: "#f97316" },
  mastery:      { bg: "bg-rose-100 dark:bg-rose-900/30",       text: "text-rose-700 dark:text-rose-300",       border: "border-rose-300 dark:border-rose-700",       hex: "#e11d48" },
};

export const CONFIDENCE_COLORS: Record<ConfidenceBand, { bg: string; text: string; hex: string; label: string }> = {
  struggling:  { bg: "bg-red-100 dark:bg-red-900/30",      text: "text-red-700 dark:text-red-300",      hex: "#ef4444", label: "Struggling" },
  developing:  { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", hex: "#eab308", label: "Developing" },
  proficient:  { bg: "bg-green-100 dark:bg-green-900/30",  text: "text-green-700 dark:text-green-300",  hex: "#22c55e", label: "Proficient" },
  mastered:    { bg: "bg-teal-100 dark:bg-teal-900/30",    text: "text-teal-700 dark:text-teal-300",    hex: "#14b8a6", label: "Mastered" },
};

/** Given a 0-100 score, return the confidence band classification. */
export function getConfidenceBand(score: number): ConfidenceBand {
  if (score < 40) return "struggling";
  if (score < 65) return "developing";
  if (score < 80) return "proficient";
  return "mastered";
}

/** Given current difficulty and whether the last answer was correct, return the next difficulty. */
export function stepDifficulty(current: QuizDifficulty, wasCorrect: boolean): QuizDifficulty {
  const idx = DIFFICULTY_ORDER.indexOf(current);
  if (wasCorrect) return DIFFICULTY_ORDER[Math.min(idx + 1, DIFFICULTY_ORDER.length - 1)];
  return DIFFICULTY_ORDER[Math.max(idx - 1, 0)];
}

// ── 1–7 difficulty system ────────────────────────────────────

export const DIFFICULTY_LEVEL_LABELS: Record<QuizDifficultyLevel, string> = {
  1: "Very easy",
  2: "Easy",
  3: "Medium-easy",
  4: "Medium",
  5: "Medium-hard",
  6: "Hard",
  7: "Very hard",
};

/** Color for each 1-7 level — gradient from green (easy) to deep rose (hard). */
export const DIFFICULTY_LEVEL_HEX: Record<QuizDifficultyLevel, string> = {
  1: "#10b981",   // emerald
  2: "#22c55e",   // green
  3: "#84cc16",   // lime
  4: "#eab308",   // yellow
  5: "#f97316",   // orange
  6: "#ef4444",   // red
  7: "#be123c",   // rose-700
};

export function stepDifficultyLevel(current: QuizDifficultyLevel, wasCorrect: boolean): QuizDifficultyLevel {
  const next = wasCorrect ? current + 1 : current - 1;
  return Math.max(1, Math.min(7, next)) as QuizDifficultyLevel;
}

/** Map the legacy 4-level enum to a 1-7 integer. */
export function legacyDifficultyToLevel(d: QuizDifficulty): QuizDifficultyLevel {
  switch (d) {
    case "foundational": return 2;
    case "intermediate": return 4;
    case "advanced":     return 5;
    case "mastery":      return 6;
  }
}

/** Inverse mapping so legacy code paths still read the old enum. */
export function levelToLegacyDifficulty(level: QuizDifficultyLevel): QuizDifficulty {
  if (level <= 2) return "foundational";
  if (level <= 4) return "intermediate";
  if (level <= 6) return "advanced";
  return "mastery";
}
