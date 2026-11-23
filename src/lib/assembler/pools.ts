/*
 * Pools (overnight plan 2026-11-22, shared contract 4). Server only.
 *
 * Every question has a pool (quiz_questions.pool, migration 20261031040000):
 * - "practice": drills, skill sets, the Daily 10, Endless, time trials, challenge questions, strategy
 *   quizzes and every other practice mode. Generated questions are always here (migration
 *   20261122020000 refuses a generated row in any other pool).
 * - "test": held for the 20 full-length exams, never shown in practice.
 * - "tryout": an exam's unscored trial question, held the same way.
 *
 * So every practice read adds `practiceOnly` to its quiz_questions query, and every list of question ids
 * that was frozen earlier (a saved set, a mistake to retry, a bookmark) goes through `keepPracticeIds`
 * before a question is served again. Exams read their own questions by id (src/lib/exams/).
 *
 * The Practice plan's fixed set of 5,000 (founder, 2026-11-13: levels 1 to 6, never an exam question;
 * Pro gets everything else) is marked in quiz_questions.practice_plan (migration 20261122030000). The plan
 * gate adds `practicePlanOnly` for students on a core plan.
 */
import { createAdminClient } from "@/lib/supabase/server";

export type QuestionPool = "practice" | "test" | "tryout";

export const PRACTICE_POOL: QuestionPool = "practice";

/** The pools an exam holds back. */
export const EXAM_POOLS: readonly QuestionPool[] = ["test", "tryout"];

/** Any PostgREST query on quiz_questions. `filter` takes column names the generated types may not know. */
type Filterable<T> = { filter(column: string, operator: string, value: unknown): T };

/** Keeps only practice questions: add it to every practice read of quiz_questions. */
export function practiceOnly<T extends Filterable<T>>(query: T): T {
  return query.filter("pool", "eq", PRACTICE_POOL);
}

/** Keeps only the Practice plan's fixed set of 5,000 (add it after `practiceOnly` for core plans). */
export function practicePlanOnly<T extends Filterable<T>>(query: T): T {
  return query.filter("practice_plan", "eq", true);
}

/** Whether a row read with its pool may be served in practice. A row without the column counts as practice. */
export function isPracticeQuestion(row: { pool?: string | null }): boolean {
  return (row.pool ?? PRACTICE_POOL) === PRACTICE_POOL;
}

/**
 * The ids, in the order given, that are still practice questions: for lists frozen before a question was
 * held for an exam (saved sets, mistakes to retry, bookmarks). Unknown ids are dropped.
 */
export async function keepPracticeIds(ids: readonly string[]): Promise<string[]> {
  if (!ids.length) return [];
  const db = createAdminClient();
  const keep = new Set<string>();
  for (let offset = 0; offset < ids.length; offset += 200) {
    const { data, error } = await practiceOnly(
      db
        .from("quiz_questions")
        .select("id")
        .in("id", ids.slice(offset, offset + 200))
    );
    if (error) throw new Error("Practice questions could not be checked");
    for (const row of data ?? []) keep.add(row.id);
  }
  return ids.filter((id) => keep.has(id));
}
