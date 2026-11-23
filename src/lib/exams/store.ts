/*
 * Server only. Reads and writes for the full-length exams: the stored forms, each student's sittings and
 * every answer with its time (migration 20261122030000_exams.sql). Service role; every caller has already
 * checked who the student is.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import {
  ACCOMMODATION,
  sittingPlanSchema,
  type FormItems,
  type ModuleKey,
  type SittingPlan,
} from "./plan";
import type { ExamResult } from "./result";
import { validTimeZone } from "./window";

/** The exam tables are newer than the generated types. */
const db = () => createAdminClient() as unknown as SupabaseClient;

export type FormRecord = { form: number; level: "standard" | "hard"; items: FormItems };

type ItemRow = {
  form: number;
  section: "reading" | "math";
  module: "module1" | "easier" | "harder";
  position: number;
  question_id: string;
  trial: boolean;
};

const emptyItems = (): FormItems => ({
  reading: {
    module1: { questionIds: [], trialIds: [] },
    easier: { questionIds: [], trialIds: [] },
    harder: { questionIds: [], trialIds: [] },
  },
  math: {
    module1: { questionIds: [], trialIds: [] },
    easier: { questionIds: [], trialIds: [] },
    harder: { questionIds: [], trialIds: [] },
  },
});

export async function loadForm(form: number): Promise<FormRecord | null> {
  const [{ data: head, error: headError }, { data: items, error: itemError }] = await Promise.all([
    db().from("exam_forms").select("form, level").eq("form", form).maybeSingle(),
    db()
      .from("exam_form_items")
      .select("form, section, module, position, question_id, trial")
      .eq("form", form)
      .order("position", { ascending: true }),
  ]);
  if (headError || itemError) throw new Error("Exam form could not be loaded");
  if (!head) return null;
  const out = emptyItems();
  for (const row of (items ?? []) as ItemRow[]) {
    const slot = out[row.section][row.module];
    slot.questionIds.push(row.question_id);
    if (row.trial) slot.trialIds.push(row.question_id);
  }
  return { form: head.form as number, level: head.level as "standard" | "hard", items: out };
}

/** How many exams exist (20). */
export async function formNumbers(): Promise<number[]> {
  const { data, error } = await db().from("exam_forms").select("form").order("form");
  if (error) throw new Error("Exams could not be listed");
  return ((data ?? []) as { form: number }[]).map((row) => row.form);
}

export type SittingRecord = {
  id: string;
  studentId: string;
  form: number;
  timeZone: string;
  openedBy: "window" | "pass" | "test-switch";
  startedAt: string;
  plan: SittingPlan;
  completedAt: string | null;
  result: ExamResult | null;
  coins: number;
};

type SittingRow = {
  id: string;
  student_id: string;
  form: number;
  time_zone: string;
  opened_by: SittingRecord["openedBy"];
  started_at: string;
  plan: unknown;
  completed_at: string | null;
  result: ExamResult | null;
  coins: number;
};

const SITTING_COLUMNS =
  "id, student_id, form, time_zone, opened_by, started_at, plan, completed_at, result, coins";

function toSitting(row: SittingRow): SittingRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    form: row.form,
    timeZone: row.time_zone,
    openedBy: row.opened_by,
    startedAt: row.started_at,
    plan: sittingPlanSchema.parse(row.plan),
    completedAt: row.completed_at,
    result: row.result,
    coins: row.coins,
  };
}

export async function findSitting(studentId: string, form: number): Promise<SittingRecord | null> {
  const { data, error } = await db()
    .from("exam_sittings")
    .select(SITTING_COLUMNS)
    .eq("student_id", studentId)
    .eq("form", form)
    .maybeSingle();
  if (error) throw new Error("Exam could not be loaded");
  return data ? toSitting(data as SittingRow) : null;
}

export async function sittingById(id: string): Promise<SittingRecord | null> {
  const { data, error } = await db()
    .from("exam_sittings")
    .select(SITTING_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Exam could not be loaded");
  return data ? toSitting(data as SittingRow) : null;
}

/** Every sitting of a student, newest first (for the exam list, Progress and coins). */
export async function sittingsOf(studentId: string): Promise<SittingRecord[]> {
  const { data, error } = await db()
    .from("exam_sittings")
    .select(SITTING_COLUMNS)
    .eq("student_id", studentId)
    .order("started_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Exams could not be loaded");
  return ((data ?? []) as SittingRow[]).map(toSitting);
}

export async function insertSitting(input: {
  studentId: string;
  form: number;
  timeZone: string;
  openedBy: SittingRecord["openedBy"];
  plan: SittingPlan;
}): Promise<string> {
  if (input.openedBy === "pass") {
    const { data, error } = await db().rpc("exam_start_with_pass", {
      p_student: input.studentId,
      p_form: input.form,
      p_time_zone: input.timeZone,
      p_plan: input.plan,
    });
    if (error)
      throw new Error(
        error.message.includes("no exam pass") ? "No exam pass" : "Exam could not be started"
      );
    return data as string;
  }
  const { data, error } = await db()
    .from("exam_sittings")
    .insert({
      student_id: input.studentId,
      form: input.form,
      time_zone: input.timeZone,
      opened_by: input.openedBy,
      started_at: input.plan.modules[0].startedAt,
      plan: input.plan,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Exam already started");
    throw new Error("Exam could not be started");
  }
  return (data as { id: string }).id;
}

/** Saves a new plan only if nobody saved another since `from` was read. False when someone did. */
export async function savePlan(id: string, from: SittingPlan, to: SittingPlan): Promise<boolean> {
  const next = { ...to, rev: from.rev + 1 };
  const { data, error } = await db()
    .from("exam_sittings")
    .update({ plan: next })
    .eq("id", id)
    .eq("plan->>rev", String(from.rev))
    .select("id");
  if (error) throw new Error("Exam could not be saved");
  return (data ?? []).length === 1;
}

export async function completeSitting(id: string, result: ExamResult, coins: number) {
  const { error } = await db()
    .from("exam_sittings")
    .update({ completed_at: result.completedAt, result, coins })
    .eq("id", id)
    .is("completed_at", null);
  if (error) throw new Error("Exam result could not be saved");
}

export async function deleteSitting(id: string) {
  const { error } = await db().from("exam_sittings").delete().eq("id", id);
  if (error) throw new Error("Exam could not be reset");
}

export type ResponseRow = {
  module: ModuleKey;
  position: number;
  question_id: string;
  answer: string | null;
  is_correct: boolean | null;
  trial: boolean;
  seconds: number;
  changes: number;
  flagged: boolean;
};

export async function readResponses(sittingId: string): Promise<ResponseRow[]> {
  const { data, error } = await db()
    .from("exam_responses")
    .select("module, position, question_id, answer, is_correct, trial, seconds, changes, flagged")
    .eq("sitting_id", sittingId)
    .limit(200);
  if (error) throw new Error("Exam answers could not be loaded");
  return (data ?? []) as ResponseRow[];
}

/** Upserts answers (and their times) for one sitting; grading fields included when given. */
export async function writeResponses(sittingId: string, rows: readonly ResponseRow[]) {
  if (!rows.length) return;
  const { error } = await db()
    .from("exam_responses")
    .upsert(
      rows.map((row) => ({ ...row, sitting_id: sittingId, updated_at: new Date().toISOString() })),
      { onConflict: "sitting_id,question_id" }
    );
  if (error) throw new Error("Exam answers could not be saved");
}

export type StudentFacts = {
  timeZone: string | null;
  accommodation: number;
  examPasses: number;
};

export async function studentFacts(clerkId: string): Promise<StudentFacts> {
  const [{ data: user }, { data: rewards }] = await Promise.all([
    db()
      .from("users")
      .select("time_zone, timing_accommodation")
      .eq("clerk_id", clerkId)
      .maybeSingle(),
    db().from("portal_rewards").select("passes").eq("student_id", clerkId).maybeSingle(),
  ]);
  const passes = (rewards as { passes?: Record<string, unknown> } | null)?.passes ?? {};
  const held = Number(passes["Exam pass"] ?? 0);
  const row = user as { time_zone?: string | null; timing_accommodation?: string | null } | null;
  return {
    timeZone: validTimeZone(row?.time_zone ?? null),
    accommodation: ACCOMMODATION[row?.timing_accommodation ?? "standard"] ?? 1,
    examPasses: Number.isFinite(held) && held > 0 ? Math.floor(held) : 0,
  };
}

/** Stores the student's own time zone the first time it is known; later changes go through Settings. */
export async function storeTimeZone(clerkId: string, zone: string): Promise<string | null> {
  const safe = validTimeZone(zone);
  if (!safe) return null;
  const { error } = await db()
    .from("users")
    .update({ time_zone: safe })
    .eq("clerk_id", clerkId)
    .is("time_zone", null);
  if (error) throw new Error("Time zone could not be saved");
  return safe;
}

/** Other full-length results that feed the predicted score: old full-length tests and diagnostics. */
export async function otherScoredExams(clerkId: string, userId: string | null) {
  const [{ data: runs }, { data: diagnostics }] = await Promise.all([
    db()
      .from("quiz_runs")
      .select("kind, completed_at, result")
      .eq("student_id", clerkId)
      .in("kind", ["full-test", "diagnostic"])
      .not("completed_at", "is", null)
      .limit(200),
    userId
      ? db()
          .from("diagnostic_results")
          .select("taken_at, score_range_low, score_range_high")
          .eq("user_id", userId)
          .limit(100)
      : Promise.resolve({ data: [] }),
  ]);
  return {
    runs: (runs ?? []) as {
      completed_at: string;
      result: { predicted?: { total: number } } | null;
    }[],
    diagnostics: (diagnostics ?? []) as {
      taken_at: string;
      score_range_low: number;
      score_range_high: number;
    }[],
  };
}

/** Each question's skill among the 72 (question_skills72, written by the Bank stream). */
export async function skill72Tags(ids: readonly string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db()
      .from("question_skills72")
      .select("question_id, skill_id")
      .in("question_id", ids.slice(i, i + 200));
    if (error) continue;
    for (const row of (data ?? []) as { question_id: string; skill_id: string }[])
      out.set(row.question_id, row.skill_id);
  }
  return out;
}

/** Learned expected times by `${skillId}|${band}` (exam_pace_norms); empty until enough answers. */
export async function paceNorms(): Promise<Map<string, number>> {
  const { data, error } = await db()
    .from("exam_pace_norms")
    .select("skill_id, band, median_seconds")
    .limit(1000);
  if (error) return new Map();
  return new Map(
    ((data ?? []) as { skill_id: string; band: string; median_seconds: number }[]).map((r) => [
      `${r.skill_id}|${r.band}`,
      r.median_seconds,
    ])
  );
}
