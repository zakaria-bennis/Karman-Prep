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

/** Someone who keeps it up is frozen for longer (founder, 2026-11-17: "a longer freeze for
 *  repeating speeders"). Each step is a pace no person holds: an answer every 7 seconds for a
 *  quarter of an hour, or every 12 seconds for a whole hour. Past a step, answers are refused
 *  until that much time has gone by with fewer, so the freeze lasts up to the step's length. */
export const FREEZES = [
  { windowMs: 15 * 60_000, answers: 130 },
  { windowMs: 60 * 60_000, answers: 300 },
] as const;

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

/** Refuses when this student has already saved as many answers in the last minute as the limit,
 *  or has kept a scraper's pace for long enough to be frozen. */
export async function assertAnswerPace(studentId: string, now = Date.now()): Promise<void> {
  const steps = [{ windowMs: PACE.windowMs, answers: PACE.answers }, ...FREEZES];
  const counts = await Promise.all(
    steps.map((step) =>
      db()
        .from("quiz_run_responses")
        .select("id, quiz_runs!inner(student_id)", { count: "exact", head: true })
        .eq("quiz_runs.student_id", studentId)
        .gte("answered_at", new Date(now - step.windowMs).toISOString())
    )
  );
  steps.forEach((step, i) => {
    const { count, error } = counts[i];
    // a count that cannot be read never stops a student from answering
    if (error || count === null) return;
    if (overPace(count, step.answers)) {
      console.warn("[pace] answers refused", { studentId, count, minutes: step.windowMs / 60_000 });
      throw new PaceError();
    }
  });
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
