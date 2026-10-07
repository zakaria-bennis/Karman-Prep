import { describe, expect, it, vi } from "vitest";
import { computeContentHashV2, importQuestion, type ImportQuestionInput } from "./import-core";
import { importAnswerEvidence } from "./import-provenance";

const row: ImportQuestionInput = {
  question_text: "What is 2 + 2?",
  correct_answer: "B",
  domain: "algebra",
  difficulty: 2,
  choice_a: "3",
  choice_b: "4",
  choice_c: "5",
  choice_d: "6",
  source_version: "d".repeat(64),
  source_identity_required: true,
  source_section: "math",
  source_module: "M1",
  source_question_number: 1,
  source_occurrence: 1,
  reviewed_answer: {
    kind: "independently_confirmed_generated",
    printed_answer: null,
    independently_verified_answer: "B",
    generated_key_artifact_sha256: "a".repeat(64),
    independent_review_sha256s: ["b".repeat(64), "c".repeat(64)],
    evidence: { source: "synthetic" },
  },
};
const options = { difficultyPolicy: "reviewed" as const, privateDraft: true };
function client(duplicate = false, existing?: Record<string, unknown>) {
  const writes: Record<string, unknown>[] = [];
  return {
    writes,
    db: {
      from(table: string) {
        const builder = {
          insert(payload: Record<string, unknown>) {
            writes.push({ table, payload });
            return builder;
          },
          update(payload: Record<string, unknown>) {
            writes.push({ table, payload });
            return builder;
          },
          select() {
            return builder;
          },
          eq() {
            return builder;
          },
          single() {
            return Promise.resolve({
              data: duplicate ? null : { id: "test-question" },
              error: duplicate ? { code: "23505", message: "duplicate" } : null,
            });
          },
          maybeSingle() {
            return Promise.resolve({
              data:
                table === "answer_key_entries"
                  ? { raw_model_response: importAnswerEvidence(row) }
                  : existing,
              error: null,
            });
          },
          then(resolve: (v: unknown) => unknown) {
            return Promise.resolve(resolve({ error: null }));
          },
        };
        return builder;
      },
    },
  };
}
describe("private draft write boundary", () => {
  it("sets is_live=false and retains independent answer without inventing official key", async () => {
    const c = client();
    const result = await importQuestion(c.db as never, row, options);
    expect(result.inserted).toBe(true);
    expect(result.errors).toEqual([]);
    expect(c.writes[0].payload).toMatchObject({
      import_status: "needs_review",
      publish_status: "needs_human_review",
      verified_answer: "B",
      answer_source: "inferred",
    });
    expect((c.writes[0].payload as Record<string, unknown>).is_live).toBeUndefined();
    expect(c.writes.find((w) => w.table === "answer_key_entries")?.payload).toMatchObject({
      printed_answer: null,
      selected_official_answer: null,
      status: "missing_answer_key",
    });
    expect(
      c.writes.every((w) =>
        ["quiz_questions", "answer_choices", "answer_key_entries"].includes(w.table as string)
      )
    ).toBe(true);
  });
  it("rejects implicit legacy/default difficulty or missing provenance before DB access", async () => {
    const from = vi.fn();
    expect((await importQuestion({ from } as never, row, { privateDraft: true })).inserted).toBe(
      false
    );
    expect(
      (await importQuestion({ from } as never, { ...row, reviewed_answer: undefined }, options))
        .inserted
    ).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });
  it.each([
    { source_version: undefined },
    { source_identity_required: false },
    { source_module: undefined },
    { source_question_number: 1.5 },
    { source_occurrence: 0 },
  ])("rejects incomplete stable source identity: %j", async (change) => {
    const from = vi.fn();
    const result = await importQuestion({ from } as never, { ...row, ...change }, options);
    expect(result.inserted).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });
  const existing = {
    id: "test-question",
    difficulty_level: 2,
    content_hash_v2: computeContentHashV2({
      ...row,
      subject: "math",
      answer_format: "multiple_choice",
    }),
    correct_answer: "B",
    concept_slug: null,
    raw_question_text: row.question_text,
    selected_official_answer: null,
    verified_answer: "B",
    is_live: false,
    publish_status: "draft",
  };
  it("allows exact private replay without modifying prior data", async () => {
    const c = client(true, existing);
    const result = await importQuestion(c.db as never, row, options);
    expect(result.duplicate_skipped).toBe(true);
    expect(c.writes).toHaveLength(1);
  });
  it.each([
    { is_live: true },
    { publish_status: "publish_ready" },
    { correct_answer: "A" },
    { verified_answer: "A" },
    { selected_official_answer: "B" },
    { difficulty_level: 3 },
  ])("rejects visible/published or changed source-identity replay: %j", async (change) => {
    const c = client(true, { ...existing, ...change });
    const result = await importQuestion(c.db as never, row, options);
    expect(result.inserted).toBe(false);
    expect(result.duplicate_skipped).toBe(false);
    expect(result.errors.join()).toMatch(/source identity conflict/);
    expect(c.writes).toHaveLength(1);
  });
  it("rejects changed independent review evidence under the same source identity", async () => {
    const c = client(true, existing);
    const changed = {
      ...row,
      reviewed_answer: { ...row.reviewed_answer!, evidence: { source: "changed" } },
    };
    const result = await importQuestion(c.db as never, changed, options);
    expect(result.duplicate_skipped).toBe(false);
    expect(result.errors.join()).toMatch(/answer evidence differs/);
  });
});
