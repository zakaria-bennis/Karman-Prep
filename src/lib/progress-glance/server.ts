import "server-only";
import { subSkillOfQuestion } from "@/lib/subskills/map";
/*
 * Reads practice for the people around a student (parents, school staff). Callers must check
 * the viewer's right to see each student first. Only skill ids, right or wrong, times and
 * seconds come back: never question ids, question text or the student's answers.
 */
import { clampLevel, type SkillLevel } from "@/components/portal/skill-levels";
import { decayedLevel } from "@/lib/levels/rules";
import { untypedAdmin, type UntypedAdmin } from "@/lib/school/db";
import type { PracticeAnswer } from "./levels";

export interface PracticeActivity {
  answers: PracticeAnswer[];
  /** Seconds spent answering since `since`: skill practice and every quiz-flow run. */
  secondsSince: number;
  /** ISO time of the most recent completed practice, if any. */
  lastPracticedAt: string | null;
  /** Levels the quiz flows saved (`student_skill_levels`), after decay. */
  stored: Map<string, SkillLevel>;
}

type Admin = UntypedAdmin;

/**
 * Levels the quiz flows saved (Daily 10, practice sets, Domain quizzes), by student Clerk id and
 * skill, with decay applied as of `now` (src/lib/levels/rules.ts). Empty when unreadable.
 */
export async function loadSavedLevels(
  studentClerkIds: readonly string[],
  now: Date,
  supabase: Admin = untypedAdmin()
): Promise<Map<string, Map<string, SkillLevel>>> {
  const out = new Map<string, Map<string, SkillLevel>>();
  if (!studentClerkIds.length) return out;
  const { data, error } = await supabase
    .from("student_skill_levels")
    .select("student_id, skill_id, level, last_practiced_at")
    .in("student_id", [...studentClerkIds])
    .limit(20000);
  if (error) {
    console.error("[progress] saved skill levels could not be read", error.message);
    return out;
  }
  for (const row of (data ?? []) as {
    student_id: string;
    skill_id: string;
    level: number;
    last_practiced_at: string | null;
  }[]) {
    const bySkill = out.get(row.student_id) ?? new Map<string, SkillLevel>();
    out.set(row.student_id, bySkill);
    bySkill.set(row.skill_id, decayedLevel(clampLevel(row.level), row.last_practiced_at, now));
  }
  return out;
}

/** Practice answers by student Clerk id. Every requested id gets an entry. */
export async function loadPracticeActivity(
  studentClerkIds: readonly string[],
  since: Date,
  supabase: Admin = untypedAdmin()
): Promise<Map<string, PracticeActivity>> {
  const saved = await loadSavedLevels(studentClerkIds, new Date(), supabase);
  const out = new Map<string, PracticeActivity>(
    studentClerkIds.map((id) => [
      id,
      { answers: [], secondsSince: 0, lastPracticedAt: null, stored: saved.get(id) ?? new Map() },
    ])
  );
  if (!studentClerkIds.length) return out;
  const sinceIso = since.toISOString();
  const add = (studentId: string, answer: PracticeAnswer, seconds: number | null) => {
    const entry = out.get(studentId);
    if (!entry) return;
    entry.answers.push(answer);
    if (answer.at >= sinceIso) entry.secondsSince += seconds ?? 0;
  };
  const finished = (studentId: string, at: string | null) => {
    const entry = out.get(studentId);
    if (entry && at && (!entry.lastPracticedAt || at > entry.lastPracticedAt))
      entry.lastPracticedAt = at;
  };
  await addCatalogPractice(studentClerkIds, supabase, add, finished);
  await addQuizRuns(studentClerkIds, supabase, add, finished);
  return out;
}

type AddAnswer = (studentId: string, answer: PracticeAnswer, seconds: number | null) => void;
type Finished = (studentId: string, at: string | null) => void;

/** Skill practice (`catalog_practice_sessions`). */
async function addCatalogPractice(
  studentClerkIds: readonly string[],
  supabase: Admin,
  add: AddAnswer,
  finished: Finished
) {
  const { data: sessions, error } = await supabase
    .from("catalog_practice_sessions")
    .select("id, student_id, skill_id, completed_at")
    .in("student_id", [...studentClerkIds]);
  if (error) throw error;
  const sessionRows = (sessions ?? []) as {
    id: string;
    student_id: string;
    skill_id: string;
    completed_at: string | null;
  }[];
  const byId = new Map(sessionRows.map((s) => [s.id, s]));
  for (const s of sessionRows) finished(s.student_id, s.completed_at);
  const ids = sessionRows.map((s) => s.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { data: responses, error: responseError } = await supabase
      .from("catalog_practice_responses")
      .select("session_id, question_id, is_correct, answered_at, response_time_seconds")
      .in("session_id", ids.slice(i, i + 200));
    if (responseError) throw responseError;
    for (const r of (responses ?? []) as {
      session_id: string;
      question_id: string | null;
      is_correct: boolean;
      answered_at: string;
      response_time_seconds: number | null;
    }[]) {
      const session = byId.get(r.session_id);
      if (!session) continue;
      add(
        session.student_id,
        {
          skillId: session.skill_id,
          subSkillId: subSkillOfQuestion(r.question_id ?? "", session.skill_id),
          correct: r.is_correct,
          at: r.answered_at,
        },
        r.response_time_seconds
      );
    }
  }
}

/** The quiz flows (`quiz_runs`: Daily 10, sets, Domain quizzes, full tests, the diagnostic). */
async function addQuizRuns(
  studentClerkIds: readonly string[],
  supabase: Admin,
  add: AddAnswer,
  finished: Finished
) {
  const { data: runs, error } = await supabase
    .from("quiz_runs")
    .select("id, student_id, completed_at")
    .in("student_id", [...studentClerkIds]);
  if (error) throw error;
  const runRows = (runs ?? []) as { id: string; student_id: string; completed_at: string | null }[];
  const byId = new Map(runRows.map((r) => [r.id, r]));
  for (const r of runRows) finished(r.student_id, r.completed_at);
  const ids = runRows.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { data: responses, error: responseError } = await supabase
      .from("quiz_run_responses")
      .select("run_id, question_id, skill_id, is_correct, answered_at, response_time_seconds")
      .in("run_id", ids.slice(i, i + 200));
    if (responseError) throw responseError;
    for (const r of (responses ?? []) as {
      run_id: string;
      question_id: string;
      skill_id: string;
      is_correct: boolean;
      answered_at: string;
      response_time_seconds: number | null;
    }[]) {
      const run = byId.get(r.run_id);
      if (!run) continue;
      add(
        run.student_id,
        {
          skillId: r.skill_id,
          subSkillId: subSkillOfQuestion(r.question_id, r.skill_id),
          correct: r.is_correct,
          at: r.answered_at,
        },
        r.response_time_seconds
      );
    }
  }
}

/** The latest diagnostic ranges for each student users.id, oldest first. */
export async function loadScoreHistory(
  studentUserIds: readonly string[],
  supabase: Admin = untypedAdmin()
): Promise<Map<string, { takenAt: string; low: number; high: number }[]>> {
  const out = new Map<string, { takenAt: string; low: number; high: number }[]>(
    studentUserIds.map((id) => [id, []])
  );
  if (!studentUserIds.length) return out;
  const { data, error } = await supabase
    .from("diagnostic_results")
    .select("user_id, taken_at, score_range_low, score_range_high")
    .in("user_id", [...studentUserIds])
    .order("taken_at", { ascending: true });
  if (error) throw error;
  for (const row of (data ?? []) as {
    user_id: string;
    taken_at: string;
    score_range_low: number;
    score_range_high: number;
  }[]) {
    out.get(row.user_id)?.push({
      takenAt: row.taken_at,
      low: row.score_range_low,
      high: row.score_range_high,
    });
  }
  return out;
}
