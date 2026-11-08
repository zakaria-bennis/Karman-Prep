import { beforeEach, describe, expect, it, vi } from "vitest";
const client = vi.hoisted(() => ({
  marker: "real-client-context",
  calls: [] as unknown[][],
  tables: {} as Record<string, unknown[]>,
  rpc: vi.fn(function (this: { marker?: string }, name: string) {
    if (this?.marker !== "real-client-context") throw new Error("Missing RPC client context");
    return Promise.resolve({ data: name === "catalog_practice_owned" ? null : {}, error: null });
  }),
  from(table: string) {
    client.calls.push(["from", table]);
    let range = [0, 9999];
    const query = {
      select: (value: string) => (client.calls.push(["select", value]), query),
      update: (value: unknown) => (client.calls.push(["update", value]), query),
      eq: (column: string, value: unknown) => (client.calls.push(["eq", column, value]), query),
      is: (column: string, value: unknown) => (client.calls.push(["is", column, value]), query),
      in: (column: string, value: unknown) => (client.calls.push(["in", column, value]), query),
      order: () => query,
      range: (start: number, end: number) => ((range = [start, end]), query),
      then(resolve: (result: unknown) => unknown) {
        const rows = (client.tables[table] ?? []).slice(range[0], range[1] + 1);
        return Promise.resolve(resolve({ data: rows, error: null }));
      },
    };
    return query;
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => client }));
import { loadCatalogQuestionEvidence, supabaseCatalogSessionStore } from "./supabase-store";

const q = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
beforeEach(() => {
  client.calls = [];
  client.tables = {};
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("catalog practice database RPC boundary", () => {
  it("retains the database client receiver when loading an owned session", async () => {
    await expect(supabaseCatalogSessionStore.getOwned("session", "student")).resolves.toBeNull();
    expect(client.rpc).toHaveBeenCalledWith("catalog_practice_owned", {
      p_session_id: "session",
      p_student_id: "student",
    });
  });

  it("closes only the student's own open session, leaving the score empty", async () => {
    await supabaseCatalogSessionStore.abandon(q(1), "student");
    expect(client.calls).toContainEqual(["from", "catalog_practice_sessions"]);
    const update = client.calls.find((call) => call[0] === "update")![1] as Record<string, unknown>;
    expect(Object.keys(update)).toEqual(["completed_at"]);
    expect(client.calls).toContainEqual(["eq", "id", q(1)]);
    expect(client.calls).toContainEqual(["eq", "student_id", "student"]);
    expect(client.calls).toContainEqual(["is", "completed_at", null]);
  });

  it("reads every saved answer for the student's sessions in one skill", async () => {
    client.tables.catalog_practice_sessions = [{ id: q(1) }, { id: q(2) }];
    client.tables.catalog_practice_responses = [
      { question_id: q(10), answered_at: "2026-11-01T00:00:00Z" },
      { question_id: q(11), answered_at: "2026-11-02T00:00:00Z" },
    ];
    expect(await supabaseCatalogSessionStore.answeredQuestions("student", "skill")).toEqual([
      { questionId: q(10), answeredAt: "2026-11-01T00:00:00Z" },
      { questionId: q(11), answeredAt: "2026-11-02T00:00:00Z" },
    ]);
    expect(client.calls).toContainEqual(["eq", "student_id", "student"]);
    expect(client.calls).toContainEqual(["eq", "skill_id", "skill"]);
    expect(client.calls).toContainEqual(["in", "session_id", [q(1), q(2)]]);
  });

  it("skips ambiguous and missing evidence instead of failing the whole pool", async () => {
    client.tables.answer_key_entries = [
      { question_id: q(1), raw_model_response: { a: 1 } },
      { question_id: q(2), raw_model_response: { b: 1 } },
      { question_id: q(2), raw_model_response: { b: 2 } },
    ];
    const evidence = await loadCatalogQuestionEvidence([q(1), q(2), q(3)]);
    expect([...evidence.keys()]).toEqual([q(1)]);
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/ambiguous/));
    expect(console.error).toHaveBeenCalledWith(expect.stringMatching(/missing/));
  });
});
