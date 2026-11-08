import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { canAccess } from "./access";
import { PLAN_ENTITLEMENTS } from "./catalog";
import { getUsage, supabasePlanDataSource } from "./resolve";

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => {
    throw new Error("tests pass a fake client");
  },
}));

type Row = Record<string, unknown>;

/** A tiny in-memory stand-in for the Supabase query builder: the filters usage counting uses. */
function fakeClient(tables: Record<string, Row[]>): SupabaseClient {
  const from = (table: string) => {
    let rows = [...(tables[table] ?? [])];
    let head = false;
    let slice: [number, number] | null = null;
    const query = {
      select(_columns: string, options?: { count?: string; head?: boolean }) {
        head = options?.head === true;
        return query;
      },
      eq(column: string, value: unknown) {
        rows = rows.filter((row) => row[column] === value);
        return query;
      },
      in(column: string, values: unknown[]) {
        rows = rows.filter((row) => values.includes(row[column]));
        return query;
      },
      is(column: string, value: null) {
        rows = rows.filter((row) => (row[column] ?? null) === value);
        return query;
      },
      not(column: string, _op: "is", value: null) {
        rows = rows.filter((row) => (row[column] ?? null) !== value);
        return query;
      },
      order() {
        return query;
      },
      range(start: number, end: number) {
        slice = [start, end];
        return query;
      },
      then<T>(resolve: (value: { data: Row[] | null; count: number; error: null }) => T) {
        const data = slice ? rows.slice(slice[0], slice[1] + 1) : rows;
        return Promise.resolve(
          resolve({ data: head ? null : data, count: rows.length, error: null })
        );
      },
    };
    return query;
  };
  return { from } as unknown as SupabaseClient;
}

const ME = "user_me";
const OTHER = "user_other";

const TABLES: Record<string, Row[]> = {
  catalog_practice_sessions: [{ id: "s1", student_id: ME }],
  catalog_practice_responses: [
    { id: "cr1", session_id: "s1", question_id: "q1" },
    { id: "cr2", session_id: "s1", question_id: "q2" },
  ],
  quiz_attempts: [{ id: "a1", student_id: ME }],
  question_responses: [
    { id: "qr1", attempt_id: "a1", question_id: "q2" },
    { id: "qr2", attempt_id: "a1", question_id: "q3" },
  ],
  quiz_runs: [
    { id: "r1", student_id: ME, kind: "daily-ten", completed_at: "2026-11-08T10:00:00Z" },
    { id: "r2", student_id: ME, kind: "practice-set", completed_at: null },
    { id: "r3", student_id: ME, kind: "domain-quiz", completed_at: null },
    { id: "r4", student_id: ME, kind: "full-test", completed_at: "2026-11-07T10:00:00Z" },
    { id: "r5", student_id: ME, kind: "full-test", completed_at: null },
    { id: "r6", student_id: ME, kind: "diagnostic", completed_at: "2026-11-06T10:00:00Z" },
    { id: "r7", student_id: OTHER, kind: "practice-set", completed_at: null },
  ],
  quiz_run_responses: [
    { id: "rr1", run_id: "r1", question_id: "q4" },
    { id: "rr2", run_id: "r2", question_id: "q5" },
    { id: "rr3", run_id: "r3", question_id: "q1" },
    { id: "rr4", run_id: "r4", question_id: "q6" },
    { id: "rr5", run_id: "r5", question_id: "q7" },
    { id: "rr6", run_id: "r6", question_id: "q8" },
    { id: "rr7", run_id: "r7", question_id: "q9" },
  ],
};

describe("Free plan usage from the database", () => {
  const source = supabasePlanDataSource(fakeClient(TABLES));

  it("counts distinct questions across skill practice, node quizzes and quiz runs", async () => {
    // q1-q3 from practice and node quizzes, q4 (Daily 10), q5 (set), q1 again (Domain quiz).
    expect(await source.answeredQuestionCount(ME)).toBe(5);
  });

  it("leaves the full-length tests, the diagnostic and other students out of the 100", async () => {
    const other = await source.answeredQuestionCount(OTHER);
    expect(other).toBe(1);
    const onlyTests = supabasePlanDataSource(
      fakeClient({
        quiz_runs: TABLES.quiz_runs.filter(
          (r) => r.kind === "full-test" || r.kind === "diagnostic"
        ),
        quiz_run_responses: TABLES.quiz_run_responses,
      })
    );
    expect(await onlyTests.answeredQuestionCount(ME)).toBe(0);
  });

  it("counts finished full-length tests only", async () => {
    expect(await source.completedFullLengthTests(ME)).toBe(1);
    expect(await source.completedFullLengthTests(OTHER)).toBe(0);
  });

  it("closes Free's full-length test once one is finished, not when one is only started", async () => {
    const free = { entitlements: PLAN_ENTITLEMENTS.free };
    const usage = await getUsage(ME, source);
    expect(usage).toEqual({ questionsAnswered: 5, fullLengthTestsCompleted: 1 });
    expect(canAccess(free, "full-length-test:new", usage)).toBe(false);
    const startedOnly = supabasePlanDataSource(
      fakeClient({ ...TABLES, quiz_runs: TABLES.quiz_runs.filter((r) => r.id !== "r4") })
    );
    expect(canAccess(free, "full-length-test:new", await getUsage(ME, startedOnly))).toBe(true);
  });
});
