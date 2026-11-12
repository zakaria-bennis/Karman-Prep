import "server-only";
/*
 * Loads one day of a child's work for the parent's daily report. The pure builder and the plan
 * rule live in ./daily-report-build.ts; this file only reads rows. Callers must have checked the
 * parent's link to the child (requireChild). Question ids are read only to place an answer in its
 * sub-skill, the same as the Week page; none leave this module.
 *
 * Sources:
 *   answers   catalog_practice_sessions + catalog_practice_responses, and quiz_run_responses
 *             (Daily 10, practice sets, Domain quizzes), via src/lib/student/skill-levels-server
 *   homework  school_assignments (listSchoolHomeworkForStudent) and tutor_homework
 *   score     diagnostic_results (loadScoreHistory), the Week page's source
 *   note      tutor_notes for the student, dated by its last edit
 *   zone      users.time_zone of the parent
 *   plan      getPlan (subscriptions.plan_id + plan_grants), then subscriptions.tier
 */
import { getPlan } from "@/lib/plans";
import { loadScoreHistory } from "@/lib/progress-glance/server";
import { listSchoolHomeworkForStudent } from "@/lib/school/homework";
import { untypedAdmin, type UntypedAdmin } from "@/lib/school/db";
import { loadRunAnswers, loadSkillAnswers } from "@/lib/student/skill-levels-server";
import {
  buildDailyReport,
  hasDailyReport,
  resolveReportDay,
  type DailyReport,
  type ReportHomeworkRow,
  type ReportNoteRow,
} from "./daily-report-build";
import type { Child } from "./server";

export * from "./daily-report-build";

type One<T> = T | T[] | null;
const pick = <T>(v: One<T>): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export async function parentTimeZone(
  supabase: UntypedAdmin,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("time_zone")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return ((data as { time_zone: string | null } | null)?.time_zone ?? null) || null;
}

async function tutorHomework(supabase: UntypedAdmin, studentUserId: string) {
  // Skipped quietly where the tutor_homework migration is not applied yet, like the Week page.
  const { data, error } = await supabase
    .from("tutor_homework")
    .select("title, due_on, completed_at")
    .eq("student_user_id", studentUserId)
    .neq("status", "cancelled");
  if (error) return [];
  return ((data ?? []) as { title: string; due_on: string; completed_at: string | null }[]).map(
    (h): ReportHomeworkRow => ({ title: h.title, dueOn: h.due_on, completedAt: h.completed_at })
  );
}

async function tutorNotes(supabase: UntypedAdmin, studentUserId: string): Promise<ReportNoteRow[]> {
  const { data, error } = await supabase
    .from("tutor_notes")
    .select("body, created_at, updated_at, tutor:users!tutor_notes_tutor_user_id_fkey (first_name)")
    .eq("student_user_id", studentUserId)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (
    (data ?? []) as {
      body: string | null;
      created_at: string;
      updated_at: string | null;
      tutor: One<{ first_name: string | null }>;
    }[]
  ).map((n) => ({
    body: n.body ?? "",
    from: pick(n.tutor)?.first_name ?? null,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }));
}

/** Whether this child's plan includes the daily report. Unreadable plans count as not. */
export async function childHasDailyReport(child: Child): Promise<boolean> {
  const supabase = untypedAdmin();
  const [planIds, legacy] = await Promise.all([
    getPlan(child.clerkId)
      .then((p) => p.planIds as string[])
      .catch((error: unknown) => {
        console.error("[parent] plan could not be read for the daily report", error);
        return [] as string[];
      }),
    supabase
      .from("subscriptions")
      .select("tier, status")
      .eq("user_id", child.clerkId)
      .maybeSingle()
      .then(({ data }) => (data as { tier: string | null; status: string | null } | null) ?? null),
  ]);
  return hasDailyReport(planIds, legacy);
}

export interface DailyReportPage {
  report: DailyReport;
  today: string;
}

/** One day's report for `child`, in the parent's time zone (`parentUserId` is users.id). */
export async function loadDailyReport(
  parentUserId: string,
  child: Child,
  requestedDay: string | null | undefined,
  now: Date = new Date()
): Promise<DailyReportPage> {
  const supabase = untypedAdmin();
  const zone = await parentTimeZone(supabase, parentUserId);
  const { day, today, timeZone } = resolveReportDay(requestedDay, zone, now);
  const [practice, runs, scores, school, tutorItems, notes] = await Promise.all([
    loadSkillAnswers(child.clerkId),
    loadRunAnswers(child.clerkId),
    loadScoreHistory([child.id], supabase),
    listSchoolHomeworkForStudent({ userId: child.id, clerkId: child.clerkId }, supabase),
    tutorHomework(supabase, child.id),
    tutorNotes(supabase, child.id),
  ]);
  const report = buildDailyReport(
    {
      answers: [...practice, ...runs].map((a) => ({
        skillId: a.skillId,
        subSkillId: a.subSkillId,
        correct: a.correct,
        usedHint: !!a.hint,
        at: typeof a.at === "number" ? new Date(a.at).toISOString() : String(a.at),
        seconds: a.seconds,
      })),
      homework: [
        ...school.map((h) => ({ title: h.title, dueOn: h.dueOn, completedAt: h.completedAt })),
        ...tutorItems,
      ],
      scores: scores.get(child.id) ?? [],
      notes,
    },
    { day, timeZone, now }
  );
  return { report, today };
}
