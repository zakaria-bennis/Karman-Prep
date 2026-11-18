/* Server only. Writes and reads quiz_response_signals (service role): how each question in a run
   was answered, as the student's browser reported it (src/lib/quiz/signals.ts). */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import {
  changesIn,
  firstPickIn,
  lastPickIn,
  noteSignalsSchema,
  type AnswerSignals,
} from "@/lib/quiz/signals";

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

/** Keeps what the browser reported, for questions of a run that is this student's. The latest
 *  report of a question replaces the one before (each is the whole record so far). */
export async function saveSignals(studentId: string, input: unknown): Promise<number> {
  const { runId, device, items } = noteSignalsSchema.parse(input);
  const client = db();
  const { data: run, error: missing } = await client
    .from("quiz_runs")
    .select("id, snapshots")
    .eq("id", runId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (missing) throw new Error("Signals could not be saved");
  if (!run) throw new Error("Run not found");
  // only questions that are in this run
  const inRun = new Set(
    (run.snapshots as { student?: { id?: string } }[]).map((s) => s?.student?.id).filter(Boolean)
  );
  const rows = items
    .filter((item) => inRun.has(item.questionId))
    .map((item) => toRow(runId, studentId, device, item));
  if (rows.length === 0) return 0;
  const { error } = await client
    .from("quiz_response_signals")
    .upsert(rows, { onConflict: "run_id,question_id" });
  if (error) throw new Error("Signals could not be saved");
  return rows.length;
}

function toRow(runId: string, studentId: string, device: unknown, s: AnswerSignals) {
  return {
    run_id: runId,
    question_id: s.questionId,
    student_id: studentId,
    position: s.position,
    option_order: s.order,
    active_ms: s.activeMs,
    away_ms: s.awayMs,
    idle_ms: s.idleMs,
    aways: s.aways,
    first_action_ms: s.firstActionMs,
    answered_ms: s.answeredMs,
    first_pick: firstPickIn(s),
    last_pick: lastPickIn(s),
    changes: changesIn(s),
    picks: s.picks,
    crossed: s.crossed,
    calculator_opens: s.calculatorOpens,
    calculator_ms: s.calculatorMs,
    explanation_ms: s.explanationMs,
    visits: s.visits,
    pastes: s.pastes,
    copies: s.copies,
    screenshot_keys: s.screenshotKeys,
    tool_keys: s.toolKeys,
    marked: s.marked,
    input: s.input,
    device,
    updated_at: new Date().toISOString(),
  };
}
