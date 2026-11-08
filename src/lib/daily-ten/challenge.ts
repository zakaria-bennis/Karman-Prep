/*
 * Server only. The two daily challenge questions (one Math, one Reading and Writing, the same for
 * every student, chosen by `src/lib/daily-challenge`). A signed-in student's first answer is kept
 * so the review can show how everyone did. Signed-out visitors keep no record.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

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
}): Promise<void> {
  const { error } = await db().from("daily_challenge_answers").upsert(
    {
      day: input.day,
      subject: input.subject,
      student_id: input.clerkId,
      question_id: input.questionId,
      student_answer: input.answer,
      is_correct: input.correct,
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
