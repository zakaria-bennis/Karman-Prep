// What a host hands the one question screen (QuizShell.tsx). Kept apart so the shell stays small.
import type { ReactNode } from "react";
import type { QuizMode } from "@/lib/quiz/mode";
import type { TimingAccommodation } from "@/lib/quiz/timer";
import type { NoteSignals } from "@/lib/quiz/signals";
import type { ConfidenceBand, StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";

export type QuizShellProps = {
  mode: QuizMode;
  questions: StudentQuizQuestion[];
  /** Total questions in the section; adaptive sets may know only the first few questions. */
  total?: number;
  attemptKey: string;
  index: number;
  section: string;
  topic?: string;
  onNavigate(index: number): void;
  onSelectAnswer?(questionId: string, answer: string | null): void;
  /** How a question was answered (time worked, time away, changes of mind and so on), each time
   *  there is more to keep. The host saves it; nothing waits on it. */
  onSignals?(signals: NoteSignals): void;
  onSubmit?(questionId: string, answer: string): void | Promise<void>;
  /** "time" when a countdown ran out and the section submitted itself. */
  onFinish?(reason?: "time"): void;
  onExit?(): void;
  reviews: Record<string, StudentQuizReview>;
  startedAtMs?: number;
  accommodation?: TimingAccommodation;
  hasCalculator?: boolean;
  loading?: boolean;
  /** Saved markers by question id (server state the host loaded). */
  saved?: Record<string, "bookmark" | "tutor_flag">;
  /** Each may return a promise; a rejected one puts the marker back and tells the student. */
  onToggleBookmark?(questionId: string, on: boolean): void | Promise<unknown>;
  onFlagForTutor?(questionId: string, note: string): void | Promise<unknown>;
  onRemoveTutorFlag?(questionId: string): void | Promise<unknown>;
  onReportProblem?(questionId: string, note: string): void | Promise<unknown>;
  /** Extra content under the question (instant-mode rewards plug in here). */
  feedback?: ReactNode;
  /** The host keeps its own picture behind the glass (the challenge's city), so the shell draws no
   *  landscape of its own. */
  noWorld?: boolean;
  /** The host draws its own clock (Time Trial); the shell shows none and never expires. */
  hideClock?: boolean;
  /** Replaces the counter in the bottom bar. */
  progress?: ReactNode;
  /** A completed skill set moved the skill's band (skill practice only). */
  levelUp?: { skill: string; before: ConfidenceBand | null; after: ConfidenceBand } | null;
  onLevelUpDone?(): void;
};
