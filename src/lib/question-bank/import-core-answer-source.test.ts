// @vitest-environment node
//
// importQuestion never labels an agent-solved answer (decision D4, ruling R26):
// answer_source is null for reviewed_answer.kind "independently_confirmed_generated",
// even when the row carries a label.

import { describe, expect, it } from "vitest";
import { importQuestion, type ImportQuestionInput } from "./import-core";
import { mockSupabase, validRow } from "./import-core-test-helpers";

describe("importQuestion — answer_source label", () => {
  it("does not label independently confirmed answers", async () => {
    const { client, calls } = mockSupabase({
      quiz_questions: { data: { id: "q-1" }, error: null },
    });
    const digest = "a".repeat(64);
    await importQuestion(
      client,
      validRow({
        reviewed_answer: {
          kind: "independently_confirmed_generated",
          independently_verified_answer: "B",
          evidence: { note: "two independent solves" },
          printed_answer: null,
          generated_key_artifact_sha256: digest,
          independent_review_sha256s: [digest, "b".repeat(64)],
        },
      } as Partial<ImportQuestionInput>)
    );
    const qInsert = calls.find((c) => c.table === "quiz_questions" && c.method === "insert");
    expect(qInsert).toBeDefined();
    expect((qInsert!.payload as Record<string, unknown>).answer_source).toBeNull();
  });

  it("drops a carried answer_source label on independently confirmed answers", async () => {
    const { client, calls } = mockSupabase({
      quiz_questions: { data: { id: "q-1" }, error: null },
    });
    const digest = "c".repeat(64);
    await importQuestion(
      client,
      validRow({
        answer_source: "extracted",
        reviewed_answer: {
          kind: "independently_confirmed_generated",
          independently_verified_answer: "B",
          evidence: { note: "two independent solves" },
          printed_answer: null,
          generated_key_artifact_sha256: digest,
          independent_review_sha256s: [digest, "d".repeat(64)],
        },
      } as Partial<ImportQuestionInput>)
    );
    const qInsert = calls.find((c) => c.table === "quiz_questions" && c.method === "insert");
    expect(qInsert).toBeDefined();
    expect((qInsert!.payload as Record<string, unknown>).answer_source).toBeNull();
  });
});
