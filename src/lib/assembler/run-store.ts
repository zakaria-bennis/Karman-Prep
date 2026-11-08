/* Server only. Reads and writes quiz_runs and quiz_run_responses (service role). */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { clampLevel } from "@/components/portal/skill-levels";
import type { CatalogDeliverySnapshot } from "@/lib/catalog-practice/delivery-contract";
import type { RunForm, RunKind, RunRecord, RunResponse, RunResult } from "./run-types";

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

const runRow = z.object({
  id: z.string().uuid(),
  student_id: z.string(),
  kind: z.enum(["daily-ten", "practice-set", "domain-quiz", "full-test", "diagnostic"]),
  run_key: z.string(),
  scope: z.string().nullable(),
  form: z.record(z.string(), z.unknown()),
  snapshots: z.array(z.unknown()).min(1),
  sequence: z.array(z.string()),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  result: z.unknown().nullable(),
});

const responseRow = z.object({
  ordinal: z.number().int(),
  section_key: z.string(),
  question_id: z.string().uuid(),
  skill_id: z.string(),
  difficulty: z.number().int(),
  student_answer: z.string(),
  is_correct: z.boolean(),
  used_hint: z.boolean(),
  response_time_seconds: z.number().int(),
  answered_at: z.string(),
  level_before: z.number().int().nullable(),
  level_after: z.number().int().nullable(),
});

const RUN_COLUMNS =
  "id, student_id, kind, run_key, scope, form, snapshots, sequence, started_at, completed_at, result";

function toRecord(value: unknown): RunRecord {
  const row = runRow.parse(value);
  return {
    id: row.id,
    studentId: row.student_id,
    kind: row.kind,
    runKey: row.run_key,
    scope: row.scope,
    form: row.form as unknown as RunForm,
    snapshots: row.snapshots as CatalogDeliverySnapshot[],
    sequence: row.sequence,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    result: (row.result as RunResult | null) ?? null,
  };
}

export async function findRunByKey(studentId: string, runKey: string): Promise<RunRecord | null> {
  const { data, error } = await db()
    .from("quiz_runs")
    .select(RUN_COLUMNS)
    .eq("student_id", studentId)
    .eq("run_key", runKey)
    .maybeSingle();
  if (error) throw new Error("Saved run could not be loaded");
  return data ? toRecord(data) : null;
}

export async function findOpenRun(
  studentId: string,
  kind: RunKind,
  scope: string
): Promise<RunRecord | null> {
  const { data, error } = await db()
    .from("quiz_runs")
    .select(RUN_COLUMNS)
    .eq("student_id", studentId)
    .eq("kind", kind)
    .eq("scope", scope)
    .is("completed_at", null)
    .order("started_at", { ascending: false })
    .limit(1);
  if (error) throw new Error("Saved run could not be loaded");
  return data?.[0] ? toRecord(data[0]) : null;
}

export async function getOwnedRun(runId: string, studentId: string): Promise<RunRecord | null> {
  const { data, error } = await db()
    .from("quiz_runs")
    .select(RUN_COLUMNS)
    .eq("id", runId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (error) throw new Error("Saved run could not be loaded");
  return data ? toRecord(data) : null;
}

/** Inserts a run; if the key already exists (a second tab, a retry), returns the saved one. */
export async function insertRun(input: {
  studentId: string;
  kind: RunKind;
  runKey: string;
  scope: string | null;
  form: RunForm;
  snapshots: CatalogDeliverySnapshot[];
  sequence: string[];
}): Promise<RunRecord> {
  const { data, error } = await db()
    .from("quiz_runs")
    .insert({
      student_id: input.studentId,
      kind: input.kind,
      run_key: input.runKey,
      scope: input.scope,
      form: input.form,
      snapshots: input.snapshots,
      sequence: input.sequence,
    })
    .select(RUN_COLUMNS)
    .single();
  if (!error && data) return toRecord(data);
  const existing = await findRunByKey(input.studentId, input.runKey);
  if (existing) return existing;
  throw new Error("Run could not be started");
}

export async function updateRun(
  runId: string,
  studentId: string,
  patch: { form?: RunForm; sequence?: string[]; completed_at?: string; result?: RunResult }
): Promise<void> {
  const { error } = await db()
    .from("quiz_runs")
    .update(patch)
    .eq("id", runId)
    .eq("student_id", studentId);
  if (error) throw new Error("Run could not be saved");
}

export async function loadResponses(runId: string): Promise<RunResponse[]> {
  const { data, error } = await db()
    .from("quiz_run_responses")
    .select(
      "ordinal, section_key, question_id, skill_id, difficulty, student_answer, is_correct, used_hint, response_time_seconds, answered_at, level_before, level_after"
    )
    .eq("run_id", runId)
    .order("ordinal", { ascending: true });
  if (error) throw new Error("Saved answers could not be loaded");
  return z
    .array(responseRow)
    .parse(data ?? [])
    .map((r) => ({
      ordinal: r.ordinal,
      sectionKey: r.section_key,
      questionId: r.question_id,
      skillId: r.skill_id,
      difficulty: r.difficulty,
      studentAnswer: r.student_answer,
      isCorrect: r.is_correct,
      usedHint: r.used_hint,
      seconds: r.response_time_seconds,
      answeredAt: r.answered_at,
      levelBefore: r.level_before === null ? null : clampLevel(r.level_before),
      levelAfter: r.level_after === null ? null : clampLevel(r.level_after),
    }));
}

/** First answers only: a question already answered in this run keeps its saved answer. */
export async function insertResponses(runId: string, rows: RunResponse[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await db()
    .from("quiz_run_responses")
    .upsert(
      rows.map((r) => ({
        run_id: runId,
        ordinal: r.ordinal,
        section_key: r.sectionKey,
        question_id: r.questionId,
        skill_id: r.skillId,
        difficulty: r.difficulty,
        student_answer: r.studentAnswer,
        is_correct: r.isCorrect,
        used_hint: r.usedHint,
        response_time_seconds: r.seconds,
        level_before: r.levelBefore,
        level_after: r.levelAfter,
      })),
      { onConflict: "run_id,question_id", ignoreDuplicates: true }
    );
  if (error) throw new Error("Answer could not be saved");
}

/** Every question this student answered in any run, with the latest time. */
export async function answeredInRuns(studentId: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const client = db();
  const { data: runs, error } = await client
    .from("quiz_runs")
    .select("id")
    .eq("student_id", studentId);
  if (error) throw new Error("Saved runs could not be loaded");
  const ids = (runs ?? []).map((r: { id: string }) => r.id);
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await client
      .from("quiz_run_responses")
      .select("question_id, answered_at")
      .in("run_id", ids.slice(i, i + 100));
    for (const row of (data ?? []) as { question_id: string; answered_at: string }[]) {
      const prev = out.get(row.question_id);
      if (!prev || prev < row.answered_at) out.set(row.question_id, row.answered_at);
    }
  }
  return out;
}

/** Families of questions in the student's earlier full-length tests (both Module 2 variants). */
/** Whether the student has a full-length test started and not yet finished. */
export async function openFullTest(studentId: string): Promise<boolean> {
  const { count, error } = await db()
    .from("quiz_runs")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("kind", "full-test")
    .is("completed_at", null);
  if (error) throw new Error("Saved tests could not be loaded");
  return (count ?? 0) > 0;
}

export async function fullTestQuestionIds(studentId: string): Promise<string[]> {
  const { data, error } = await db()
    .from("quiz_runs")
    .select("form")
    .eq("student_id", studentId)
    .eq("kind", "full-test");
  if (error) throw new Error("Saved tests could not be loaded");
  return ((data ?? []) as { form: RunForm }[]).flatMap((row) =>
    row.form.sections.flatMap((s) => [
      ...s.questionIds,
      ...(s.variants ? [...s.variants.easier, ...s.variants.harder] : []),
    ])
  );
}

/** Tokens (points) awarded in one run. */
export async function tokensForRun(runId: string, studentId: string): Promise<number> {
  const { data } = await db()
    .from("student_point_awards")
    .select("points")
    .eq("student_id", studentId)
    .like("award_key", `run:${runId}:%`);
  return ((data ?? []) as { points: number }[]).reduce((n, r) => n + r.points, 0);
}

/** Days with a finished Daily 10. */
export async function dailyTenDays(studentId: string): Promise<string[]> {
  const { data } = await db()
    .from("quiz_runs")
    .select("run_key")
    .eq("student_id", studentId)
    .eq("kind", "daily-ten")
    .not("completed_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(400);
  return ((data ?? []) as { run_key: string }[]).map((r) => r.run_key.replace("daily-ten:", ""));
}
