import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const calls = vi.hoisted(() => [] as Array<[string, ...unknown[]]>);
const fixture = vi.hoisted(() => ({ rows: {} as Record<string, unknown[]> }));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from(table: string) {
      calls.push(["from", table]);
      const query = {
        select(value: string) {
          calls.push(["select", value]);
          return query;
        },
        eq(column: string, value: unknown) {
          calls.push(["eq", column, value]);
          return query;
        },
        in(column: string, values: unknown[]) {
          calls.push(["in", column, values]);
          return query;
        },
        order(column: string) {
          calls.push(["order", column]);
          return query;
        },
        then(resolve: (value: { data: unknown[]; error: null }) => void) {
          resolve({ data: fixture.rows[table] ?? [], error: null });
        },
      };
      return query;
    },
  }),
}));

import { fetchQuestionsForNode } from "./questions";

describe("fetchQuestionsForNode publication boundary", () => {
  beforeEach(() => {
    calls.splice(0);
    fixture.rows = {};
  });

  it("requires both the archive filter and an approved publish status for students", async () => {
    await fetchQuestionsForNode("ma-00");
    expect(calls).toContainEqual(["eq", "node_id", "ma-00"]);
    expect(calls).toContainEqual(["eq", "is_live", true]);
    expect(calls).toContainEqual([
      "in",
      "publish_status",
      ["publish_ready", "publish_ready_with_verified_repair"],
    ]);
  });

  it("lets the admin view inspect unpublished questions", async () => {
    await fetchQuestionsForNode("ma-00", { includeFlagged: true });
    expect(calls).not.toContainEqual(["eq", "is_live", true]);
    expect(calls.some((call) => call[0] === "in" && call[1] === "publish_status")).toBe(false);
  });
  it("hydrates reviewed numeric answers from private key evidence for server grading", async () => {
    const hash = (text: string) => createHash("sha256").update(text).digest("hex");
    const q = {
      id: "numeric-question",
      question_text: "|8-x|=2",
      raw_question_text: "|8-x|=2",
      answer_format: "numeric_entry",
      correct_answer: "6",
      source_version: hash("PDF"),
      source_section: "math",
      source_module: "M1",
      source_question_number: 1,
      source_occurrence: 1,
    };
    const set = {
      version: 1,
      answers: ["6", "10"],
      question_text_sha256: hash(q.question_text),
      raw_question_text_sha256: hash(q.raw_question_text),
      source_version: q.source_version,
      source_section: "math",
      source_module: "M1",
      source_question_number: 1,
      source_occurrence: 1,
      answer_key_artifact_sha256: hash("key"),
      independent_review_sha256s: [hash("algebra"), hash("substitution")],
      rationale: "Two absolute-value branches.",
    };
    fixture.rows.quiz_questions = [q];
    fixture.rows.answer_key_entries = [
      { question_id: q.id, raw_model_response: { numeric_answer_set: set } },
    ];
    const result = await fetchQuestionsForNode("ma-00");
    expect(result[0].reviewed_numeric_answers).toEqual(["6", "10"]);
    expect(calls).toContainEqual(["from", "answer_key_entries"]);
    fixture.rows.answer_key_entries.push({
      question_id: q.id,
      raw_model_response: { numeric_answer_set: set },
    });
    await expect(fetchQuestionsForNode("ma-00")).rejects.toThrow(/Ambiguous/);
    fixture.rows.answer_key_entries = [
      {
        question_id: q.id,
        raw_model_response: { numeric_answer_set: { ...set, question_text_sha256: hash("stale") } },
      },
    ];
    await expect(fetchQuestionsForNode("ma-00")).rejects.toThrow(/does not match/);
  });
});
