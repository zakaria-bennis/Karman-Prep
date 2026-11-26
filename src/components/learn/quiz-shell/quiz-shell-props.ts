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
  /** Shuffles each multiple-choice question's choices in an order fixed by this seed and the
   *  question's id (src/lib/quiz/shuffle.ts): the same student sees the same order every time.
   *  Letters go by place. Everything handed back (onSelectAnswer, onSubmit, onSignals) is in the
   *  question's own letters; reviews come in its own letters too. Typed answers never move. */
  shuffleSeed?: string;
  /** Question ids made by the generator. Pass it only after a server-side admin check: the shell
   *  shows a quiet "Generated" mark on these and never works it out for itself. */
  generated?: Readonly<Record<string, true>>;
  /** Endless: the bottom bar's dots grow from one to ten and older ones scroll back, with the
   *  hearts beside them. `hearts` is how many the run began with, `lost` how many are gone. Pass
   *  `total` as the questions answered plus one. */
  endless?: { hearts: number; lost: number };
  /** Second chances the student holds. After a miss graded in front of them, the explanation
   *  offers one (one a set); `onUse` resolves true once it is spent. */
  rescue?: { left: number; onUse(questionId: string): Promise<boolean> };
  /** The student opened a question's hint (practice modes; the answer then does not count toward
   *  the skill's level). */
  onHint?(questionId: string): void;
  /** Questions already put right with a second chance (their dots show it). */
  rescued?: Readonly<Record<string, true>>;
};
