/*
 * Whether today's Daily 10 is finished (founder, 2026-11-08: Today's main button starts the
 * Daily 10 until it's done for the day, then the next assignment leads).
 *
 * The quiz flows (claude/overnight-quiz-7856ae) save each Daily 10 as a `quiz_runs` row with
 * kind 'daily-ten' and run_key 'daily-ten:<YYYY-MM-DD>', the student's own day. The table is
 * read when it exists; before that merge, the Daily 10 simply counts as not done. Days are
 * compared in Central time, the quiz flows' default when a device sends no time zone.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { dayKey } from "./streak";

/** The days (YYYY-MM-DD) with a finished Daily 10, newest first. */
export async function dailyTenDays(clerkId: string): Promise<string[]> {
  try {
    const db = createAdminClient() as unknown as SupabaseClient;
    const { data, error } = await db
      .from("quiz_runs")
      .select("run_key, completed_at")
      .eq("student_id", clerkId)
      .eq("kind", "daily-ten")
      .not("completed_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(400);
    if (error || !data) return [];
    const days = new Set<string>();
    for (const r of data as { run_key: string; completed_at: string }[]) {
      const fromKey = /^daily-ten:(\d{4}-\d{2}-\d{2})$/.exec(r.run_key)?.[1];
      days.add(fromKey ?? dayKey(r.completed_at));
    }
    return [...days].sort().reverse();
  } catch {
    return [];
  }
}

export function doneToday(days: readonly string[], nowMs = Date.now()): boolean {
  return days.includes(dayKey(nowMs));
}
