/*
 * Server only. The two daily challenge questions (one Math, one Reading and Writing, the same for
 * every student, chosen by `src/lib/daily-challenge`). A signed-in student's first answer is kept
 * so the review can show how everyone did. Signed-out visitors keep no record.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { crowdOf, type Crowd, type CrowdRow } from "@/lib/daily-challenge/crowd";

export type ChallengeStats = { answered: number; right: number };

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

/** Keeps the student's first answer for the day; a second answer is ignored. */
export async function recordChallengeAnswer(input: {
  day: string;
  subject: "math" | "reading";
  clerkId: string;
  questionId: string;
  answer: string;
  correct: boolean;
  /** Time worked on the question, from the quiz's record; absent from older callers. */
  activeMs?: number;
}): Promise<void> {
  const { error } = await db()
    .from("daily_challenge_answers")
    .upsert(
      {
        day: input.day,
        subject: input.subject,
        student_id: input.clerkId,
        question_id: input.questionId,
        student_answer: input.answer,
        is_correct: input.correct,
        ...(input.activeMs === undefined ? {} : { active_ms: input.activeMs }),
      },
      { onConflict: "day,subject,student_id", ignoreDuplicates: true }
    );
  if (error) console.error("[daily challenge] answer could not be kept", error.message);
}

/** How every student did on today's question. Never throws: the review shows without it. */
export async function challengeStats(
  day: string,
  subject: "math" | "reading",
  questionId: string
): Promise<ChallengeStats | null> {
  const { data, error } = await db()
    .from("daily_challenge_answers")
    .select("is_correct")
    .eq("day", day)
    .eq("subject", subject)
    .eq("question_id", questionId)
    .limit(10000);
  if (error) return null;
  const rows = (data ?? []) as { is_correct: boolean }[];
  return { answered: rows.length, right: rows.filter((r) => r.is_correct).length };
}

/** "6 of 10 students got it right" style line; null until anyone has answered. */
export function othersLine(stats: ChallengeStats | null): string | null {
  if (!stats || stats.answered === 0) return null;
  if (stats.answered === 1) return "You are the first student to answer today.";
  const percent = Math.round((100 * stats.right) / stats.answered);
  return `${percent}% of the ${stats.answered} students who answered today got it right.`;
}

/**
 * How many of today's two questions (Math, Reading and Writing) this student has answered, so the
 * Library knows whether to open the Challenge. Never throws: on a failed read it says none.
 */
export async function challengeAnsweredCount(clerkId: string, day: string): Promise<number> {
  const { data, error } = await db()
    .from("daily_challenge_answers")
    .select("subject")
    .eq("day", day)
    .eq("student_id", clerkId)
    .limit(2);
  if (error) return 0;
  return new Set(((data ?? []) as { subject: string }[]).map((r) => r.subject)).size;
}

/** Everyone's answers to one of today's challenge questions, for the ending. Null on a failed read. */
export async function challengeCrowd(
  day: string,
  subject: "math" | "reading",
  questionId: string
): Promise<Crowd | null> {
  const { data, error } = await db()
    .from("daily_challenge_answers")
    .select("student_answer, is_correct, active_ms")
    .eq("day", day)
    .eq("subject", subject)
    .eq("question_id", questionId)
    .limit(10000);
  if (error) return null;
  return crowdOf((data ?? []) as CrowdRow[]);
}

/** This student's answers today, Reading and Writing first. Empty on a failed read. */
export async function challengeAnswersOf(
  clerkId: string,
  day: string
): Promise<
  {
    subject: "math" | "reading";
    question_id: string;
    student_answer: string;
    is_correct: boolean;
    active_ms: number | null;
  }[]
> {
  const { data, error } = await db()
    .from("daily_challenge_answers")
    .select("subject, question_id, student_answer, is_correct, active_ms")
    .eq("day", day)
    .eq("student_id", clerkId)
    .limit(2);
  if (error || !data) return [];
  type Row = Awaited<ReturnType<typeof challengeAnswersOf>>[number];
  return (data as Row[]).sort((a, b) =>
    a.subject === "reading" ? -1 : b.subject === "reading" ? 1 : 0
  );
}
