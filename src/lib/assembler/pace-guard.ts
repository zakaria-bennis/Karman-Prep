/* Server only. Nobody reads and answers a question in three seconds, twenty times in a row; a
   script does (founder, 2026-11-17: speed limits against scrapers and click-macros). When an
   account answers, or opens new sets, faster than a person could, the next request is refused
   until the minute has passed. A student working normally never meets it: the limits sit far
   above the quickest honest pace, and whole timed sections, sent in one piece, are not counted
   question by question. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

export const PACE = {
  windowMs: 60_000,
  /** Answers saved one at a time, in a minute. */
  answers: 20,
  /** New quizzes opened in a minute. */
  starts: 8,
} as const;

export class PaceError extends Error {
  constructor() {
    super("Too fast to be reading");
    this.name = "PaceError";
  }
}

/** Whether another one now would be more than a person could do. */
export const overPace = (countInWindow: number, limit: number) => countInWindow >= limit;

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

/** Refuses when this student has already saved as many answers in the last minute as the limit. */
export async function assertAnswerPace(studentId: string, now = Date.now()): Promise<void> {
  const since = new Date(now - PACE.windowMs).toISOString();
  const { count, error } = await db()
    .from("quiz_run_responses")
    .select("id, quiz_runs!inner(student_id)", { count: "exact", head: true })
    .eq("quiz_runs.student_id", studentId)
    .gte("answered_at", since);
  // a count that cannot be read never stops a student from answering
  if (error || count === null) return;
  if (overPace(count, PACE.answers)) {
    console.warn("[pace] answers refused", { studentId, count });
    throw new PaceError();
  }
}

/** Refuses when this student has already opened as many quizzes in the last minute as the limit. */
export async function assertStartPace(studentId: string, now = Date.now()): Promise<void> {
  const since = new Date(now - PACE.windowMs).toISOString();
  const { count, error } = await db()
    .from("quiz_runs")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .gte("started_at", since);
  if (error || count === null) return;
  if (overPace(count, PACE.starts)) {
    console.warn("[pace] starts refused", { studentId, count });
    throw new PaceError();
  }
}
