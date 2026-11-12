/*
 * The parent portal's Messages, as plain data (founder, 2026-11-12): the tutor's notes read like
 * an inbox, each with a glance at that week's practice so a parent can compare one session's note
 * with the last, and one conversation with the Karman Prep team for questions and requests (miss
 * a class, move a session, book a 1:1). Pure, so it is unit-tested; the database lives in
 * ./messages.ts.
 */
import { z } from "zod";
import type { PracticeAnswer } from "@/lib/progress-glance/levels";

export const MESSAGE_KINDS = ["message", "miss_class", "move_session", "book_session"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const KIND_LABEL: Record<MessageKind, string> = {
  message: "Message",
  miss_class: "Can't make a class",
  move_session: "Move a session",
  book_session: "Book a 1:1",
};

/** What the parent picks in the form, and the hint under it. */
export const KIND_HINT: Record<MessageKind, string> = {
  message: "Anything about your student's prep, plan or billing.",
  miss_class: "Tell us which class your student will miss. The recording stays in Sessions.",
  move_session: "Pick the session and tell us when would work better.",
  book_session: "Tell us the days and times that suit you. We'll find a tutor and confirm.",
};

/** The kinds that are about one booked session. */
export const NEEDS_SESSION: ReadonlySet<MessageKind> = new Set(["miss_class", "move_session"]);

export const sendMessageInput = z
  .object({
    studentId: z.string().uuid(),
    kind: z.enum(MESSAGE_KINDS),
    sessionId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    body: z
      .string()
      .transform((s) => s.replace(/\r\n/g, "\n").trim())
      .pipe(
        z
          .string()
          .min(1, "Write a short message first.")
          .max(4000, "Keep it under 4,000 characters.")
      ),
  })
  .superRefine((v, ctx) => {
    if (NEEDS_SESSION.has(v.kind) && !v.sessionId)
      ctx.addIssue({ code: "custom", path: ["sessionId"], message: "Pick the session first." });
  });
export type SendMessageInput = z.output<typeof sendMessageInput>;

export interface FamilyMessage {
  id: string;
  from: "parent" | "staff";
  authorName: string | null;
  kind: MessageKind;
  sessionStartsAt: string | null;
  body: string;
  status: "open" | "handled";
  createdAt: string;
  readAt: string | null;
}

/** One week of practice ending at a moment: what a parent compares between two notes. */
export interface WeekStats {
  answered: number;
  correct: number;
  /** Whole percent, or null with nothing answered. */
  accuracy: number | null;
  /** Distinct skills practiced. */
  skills: number;
  /** Days with at least one answer. */
  activeDays: number;
}

const WEEK_MS = 7 * 86_400_000;

export function weekStats(answers: readonly PracticeAnswer[], endIso: string): WeekStats {
  const end = Date.parse(endIso);
  const start = end - WEEK_MS;
  const inWeek = answers.filter((a) => {
    const t = Date.parse(a.at);
    return t > start && t <= end;
  });
  const correct = inWeek.filter((a) => a.correct).length;
  return {
    answered: inWeek.length,
    correct,
    accuracy: inWeek.length ? Math.round((correct / inWeek.length) * 100) : null,
    skills: new Set(inWeek.map((a) => a.skillId)).size,
    activeDays: new Set(inWeek.map((a) => a.at.slice(0, 10))).size,
  };
}

export interface NoteEntry {
  id: string;
  from: string | null;
  body: string;
  at: string;
  week: WeekStats;
  /** Change in accuracy from the note before it, in points, when both weeks have answers. */
  accuracyChange: number | null;
  /** Change in questions answered from the note before it. */
  answeredChange: number | null;
}

/** Notes newest first, each with its week and the change since the older note below it. */
export function noteTimeline(
  notes: readonly { id: string; from: string | null; body: string; at: string }[],
  answers: readonly PracticeAnswer[]
): NoteEntry[] {
  const sorted = [...notes].sort((a, b) => b.at.localeCompare(a.at));
  const weeks = sorted.map((n) => weekStats(answers, n.at));
  return sorted.map((n, i) => {
    const week = weeks[i];
    const before = weeks[i + 1];
    return {
      ...n,
      week,
      accuracyChange:
        before && week.accuracy !== null && before.accuracy !== null
          ? week.accuracy - before.accuracy
          : null,
      answeredChange: before ? week.answered - before.answered : null,
    };
  });
}

/** "+6 points", "-3 points", "No change". */
export function changeLabel(n: number, unit: string): string {
  if (n === 0) return "No change";
  return `${n > 0 ? "+" : "−"}${Math.abs(n)} ${unit}`;
}
