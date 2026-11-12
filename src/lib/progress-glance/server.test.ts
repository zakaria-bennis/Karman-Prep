import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/school/db", () => ({
  untypedAdmin: () => {
    throw new Error("tests pass a fake client");
  },
}));

import { loadPracticeActivity } from "./server";

type Row = Record<string, unknown>;
function fake(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])];
      const q = {
        select: () => q,
        in(column: string, values: unknown[]) {
          rows = rows.filter((r) => values.includes(r[column]));
          return q;
        },
        limit: () => q,
        then<T>(resolve: (v: { data: Row[]; error: null }) => T) {
          return Promise.resolve(resolve({ data: rows, error: null }));
        },
      };
      return q;
    },
  };
}

describe("practice activity for parents and schools", () => {
  it("counts time and answers from skill practice and the quiz-flow runs", async () => {
    const client = fake({
      catalog_practice_sessions: [
        { id: "s1", student_id: "me", skill_id: "ma-01", completed_at: "2026-11-07T10:00:00Z" },
      ],
      catalog_practice_responses: [
        {
          session_id: "s1",
          question_id: "q1",
          is_correct: true,
          answered_at: "2026-11-07T09:00:00Z",
          response_time_seconds: 60,
        },
      ],
      quiz_runs: [{ id: "r1", student_id: "me", completed_at: "2026-11-08T10:00:00Z" }],
      quiz_run_responses: [
        {
          run_id: "r1",
          question_id: "q2",
          skill_id: "ma-02",
          is_correct: false,
          answered_at: "2026-11-08T09:00:00Z",
          response_time_seconds: 90,
        },
        {
          run_id: "r1",
          question_id: "q3",
          skill_id: "ma-02",
          is_correct: true,
          answered_at: "2026-10-01T09:00:00Z",
          response_time_seconds: 500,
        },
      ],
    });
    const out = await loadPracticeActivity(
      ["me"],
      new Date("2026-11-01T00:00:00Z"),
      client as never
    );
    const me = out.get("me")!;
    expect(me.secondsSince).toBe(150);
    expect(me.answers).toHaveLength(3);
    expect(me.lastPracticedAt).toBe("2026-11-08T10:00:00Z");
  });
});
