// ============================================================
// Strata — Quiz & Lesson System Types
// Mirrors migration 002_lesson_quiz.sql.
// ============================================================

import type { Subject } from "@/data/curriculum";

export type QuizDifficulty = "foundational" | "intermediate" | "advanced" | "mastery";
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

export interface QuizQuestion {
  id: string;
  node_id: string;
  question_text: string;
  question_type: QuizQuestionType;
  difficulty: QuizDifficulty;
  correct_answer: AnswerLetter;
  explanation_text: string;
  explanation_per_choice: Partial<Record<AnswerLetter, string>> | null;
  subject: Subject;
  topic_cluster: string;
  desmos_strategy: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  is_flagged: boolean;
  flag_count: number;
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
