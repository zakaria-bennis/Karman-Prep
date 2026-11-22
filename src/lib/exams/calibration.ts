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
import { NORM_MIN_ANSWERS, bandOf, median } from "./pacing";
import { skill72Tags } from "./store";

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

/**
 * Expected times learned from real students (pacing.ts): every answered exam question's seconds, from
 * finished sittings, grouped by skill (the 72) and difficulty band; a group's median is written once it has
 * NORM_MIN_ANSWERS answers. Runs after each finished exam.
 */
export async function learnPaceNorms(): Promise<{ groups: number }> {
  const { data: done } = await db()
    .from("exam_sittings")
    .select("id")
    .not("completed_at", "is", null)
    .limit(5000);
  const sittings = ((done ?? []) as { id: string }[]).map((s) => s.id);
  if (!sittings.length) return { groups: 0 };
  const rows: { question_id: string; seconds: number }[] = [];
  for (let i = 0; i < sittings.length && rows.length < 60000; i += 100) {
    const { data } = await db()
      .from("exam_responses")
      .select("question_id, seconds")
      .in("sitting_id", sittings.slice(i, i + 100))
      .not("answer", "is", null)
      .gt("seconds", 0)
      .limit(20000);
    rows.push(...((data ?? []) as { question_id: string; seconds: number }[]));
  }
  const ids = [...new Set(rows.map((r) => r.question_id))];
  const tags = await skill72Tags(ids);
  const levels = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db()
      .from("quiz_questions")
      .select("id, difficulty_level")
      .in("id", ids.slice(i, i + 200));
    for (const q of (data ?? []) as { id: string; difficulty_level: number | null }[])
      levels.set(q.id, q.difficulty_level ?? 4);
  }
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const skill = tags.get(r.question_id);
    if (!skill) continue;
    const key = `${skill}|${bandOf(levels.get(r.question_id) ?? 4)}`;
    groups.set(key, [...(groups.get(key) ?? []), r.seconds]);
  }
  const ready = [...groups.entries()].filter(([, s]) => s.length >= NORM_MIN_ANSWERS);
  if (ready.length) {
    const { error } = await db()
      .from("exam_pace_norms")
      .upsert(
        ready.map(([key, seconds]) => {
          const [skill_id, band] = key.split("|");
          return {
            skill_id,
            band,
            median_seconds: Math.max(1, Math.min(3600, median(seconds))),
            answers: seconds.length,
            updated_at: new Date().toISOString(),
          };
        }),
        { onConflict: "skill_id,band" }
      );
    if (error) throw new Error("Pace norms could not be saved");
  }
  return { groups: ready.length };
}
