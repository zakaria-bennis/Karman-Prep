/*
 * One student's progress as their tutor and their parent see it (founder, round 2, 2026-11-22),
 * read with the student portal's own loader (load.ts), so all three show the same numbers.
 *   Tutor   the weakest skills (dropped or stalled), the last exam's score change and its
 *           Reinforce skills first, then every answer in the Mistake Log.
 *   Parent  a simpler summary: the score trend, time studied, the streak and the Reinforce skills;
 *           no question-by-question detail.
 * Server only. The caller has already checked the viewer may see this student.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExamResult, NextStep } from "@/lib/exams/result";
import { createAdminClient } from "@/lib/supabase/server";
import { studentContextFor } from "@/lib/student/context";
import type { PortalData } from "./data";
import { loadPortalData } from "./load";
import { weakestSkills, type Weak } from "./tutor-view";

export type LastExam = {
  total: number;
  /** Points up (or down) on the exam before; null for a first exam. */
  change: number | null;
  completedAt: string;
  /** The skills that cost the most points, most first (the exam ending's Reinforce skills). */
  reinforce: NextStep[];
};

export type StudentSummary = {
  data: PortalData;
  lastExam: LastExam | null;
  /** Every finished exam's total, oldest first. */
  trend: { at: string; total: number }[];
  /** Minutes studied in each of the last eight weeks, oldest first; the last is this week. */
  weeks: number[];
  streak: number;
  weakest: Weak[];
};

const db = () => createAdminClient() as unknown as SupabaseClient;

/** Minutes in each of the last `n` seven-day spans, oldest first, from the student's day log. */
export function minutesByWeek(
  log: readonly { day: number; minutes: number }[],
  today: number,
  n = 8
): number[] {
  const out = Array.from({ length: n }, () => 0);
  for (const d of log) {
    const back = Math.floor((today - d.day) / 7);
    if (back >= 0 && back < n) out[n - 1 - back] += d.minutes;
  }
  return out.map((m) => Math.round(m));
}

export async function loadStudentSummary(clerkId: string): Promise<StudentSummary | null> {
  const ctx = await studentContextFor(clerkId);
  if (!ctx) return null;
  const [data, sittings] = await Promise.all([
    loadPortalData(ctx),
    db()
      .from("exam_sittings")
      .select("completed_at, result")
      .eq("student_id", clerkId)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: true })
      .limit(200)
      .then(
        (r) => (r.data ?? []) as { completed_at: string; result: ExamResult | null }[],
        () => []
      ),
  ]);
  const scored = sittings.filter((s) => s.result);
  const last = scored.at(-1);
  const student = data.student;
  return {
    data,
    lastExam: last?.result
      ? {
          total: last.result.total,
          change: last.result.improvement,
          completedAt: last.completed_at,
          reinforce: last.result.nextSteps,
        }
      : null,
    trend: scored.map((s) => ({ at: s.completed_at, total: s.result!.total })),
    weeks: minutesByWeek(student.log ?? [], student.days),
    streak: data.streak,
    weakest: weakestSkills(student.sittings ?? [], data.skills, student.days),
  };
}
