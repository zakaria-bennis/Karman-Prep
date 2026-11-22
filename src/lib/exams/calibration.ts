/*
 * Server only. Question statistics learn from exam answers (the SAT engine's calibrator, PR 281). After a
 * sitting finishes, every question of that form is recalibrated from all finished sittings of the form:
 * 1. the takers' mean and SD, from the scored questions at their current values;
 * 2. every question (trial questions included, which is what they are for), with that population held
 *    fixed and priors centred on each question's cold-start values from its 1 to 7 rating.
 * The results go to quiz_questions.calib_* (column-only updates). Scoring blends them in by how many answers
 * back them (src/lib/sat-engine/params.ts), so a handful of sittings barely moves anything.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { calibrate, estimatePopulation, type Answer } from "@/lib/sat-engine/calibrate";
import { coldStartParams, paramsOf } from "@/lib/sat-engine/params";
import { loadExamQuestions } from "./questions";

export const CALIBRATION_MODEL = "karman-3pl-em-exams-v1";
/** Below this many finished sittings of a form, nothing is written. */
export const MIN_SITTINGS = 5;

const db = () => createAdminClient() as unknown as SupabaseClient;

export async function recalibrateForm(
  form: number
): Promise<{ sittings: number; updated: number }> {
  const { data: sittings, error } = await db()
    .from("exam_sittings")
    .select("id")
    .eq("form", form)
    .not("completed_at", "is", null)
    .limit(5000);
  if (error) throw new Error("Sittings could not be read");
  const ids = ((sittings ?? []) as { id: string }[]).map((s) => s.id);
  if (ids.length < MIN_SITTINGS) return { sittings: ids.length, updated: 0 };

  const answers: (Answer & { trial: boolean })[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const { data, error: readError } = await db()
      .from("exam_responses")
      .select("sitting_id, question_id, is_correct, trial")
      .in("sitting_id", ids.slice(offset, offset + 100))
      .not("is_correct", "is", null)
      .limit(20000);
    if (readError) throw new Error("Exam answers could not be read");
    for (const row of (data ?? []) as {
      sitting_id: string;
      question_id: string;
      is_correct: boolean;
      trial: boolean;
    }[])
      answers.push({
        person: row.sitting_id,
        item: row.question_id,
        correct: row.is_correct,
        trial: row.trial,
      });
  }
  const questions = await loadExamQuestions([...new Set(answers.map((a) => a.item))]);
  const scored = new Map(
    [...questions.values()]
      .filter((q) => answers.some((a) => a.item === q.engine.id && !a.trial))
      .map((q) => [q.engine.id, paramsOf(q.engine)])
  );
  const population = estimatePopulation(
    scored,
    answers.filter((a) => !a.trial)
  );
  const result = calibrate(
    [...questions.values()].map((q) => ({
      id: q.engine.id,
      start: coldStartParams(q.engine),
      fixC: q.engine.format === "student-produced",
    })),
    answers,
    { population }
  );
  let updated = 0;
  const now = new Date().toISOString();
  for (const item of result.items.values()) {
    if (!item.responses) continue;
    const { error: writeError } = await db()
      .from("quiz_questions")
      .update({
        calib_difficulty: item.params.b,
        calib_discrimination: item.params.a,
        calib_guessing: item.params.c,
        calib_answer_count: item.responses,
        calib_model: CALIBRATION_MODEL,
        calib_updated_at: now,
      })
      .eq("id", item.id);
    if (!writeError) updated++;
  }
  return { sittings: ids.length, updated };
}
