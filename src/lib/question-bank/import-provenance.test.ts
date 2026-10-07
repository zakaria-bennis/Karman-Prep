import { describe, expect, it } from "vitest";
import { validateImportRow } from "./import-core";
import { writeImportAnswerProvenance } from "./import-provenance";
const row = {
  question_text: "Original question?",
  correct_answer: "B",
  domain: "algebra" as const,
  choice_a: "A",
  choice_b: "B",
  import_status: "needs_review" as const,
  import_flag_reason: "Key dispute",
  reviewed_answer: {
    printed_answer: "A",
    independently_verified_answer: "B",
    evidence: { explanation: "Independent derivation" },
  },
};
describe("reviewed import answer provenance", () => {
  it("keeps a disagreeing printed key distinct from the independent active answer", async () => {
    const calls: { table: string; payload: unknown }[] = [];
    const db = {
      from(table: string) {
        const b = {
          insert(payload: unknown) {
            calls.push({ table, payload });
            return b;
          },
          update(payload: unknown) {
            calls.push({ table, payload });
            return b;
          },
          eq() {
            return b;
          },
          then(resolve: (v: unknown) => unknown) {
            return Promise.resolve(resolve({ error: null }));
          },
        };
        return b;
      },
    };
    expect(await writeImportAnswerProvenance(db as never, "local-id", row)).toEqual([]);
    expect(calls[0].payload).toMatchObject({
      printed_answer: "A",
      selected_official_answer: "A",
      review_required: true,
      raw_model_response: { explanation: "Independent derivation" },
    });
    expect(calls[1].payload).toMatchObject({ selected_official_answer: "A" });
  });
  it("rejects mismatched active/solved values and nonheld key disagreements", () => {
    expect(validateImportRow(row).ok).toBe(true);
    expect(validateImportRow({ ...row, correct_answer: "C" }).ok).toBe(false);
    expect(validateImportRow({ ...row, import_status: "ok" }).ok).toBe(false);
  });
});

const generated = {
  kind: "independently_confirmed_generated" as const,
  printed_answer: null,
  independently_verified_answer: "B",
  generated_key_artifact_sha256: "a".repeat(64),
  independent_review_sha256s: ["b".repeat(64), "c".repeat(64)],
  evidence: { original_png_sha256: "d".repeat(64) },
};

describe("generated answer provenance", () => {
  it("keeps official fields null and a publication hold with durable review hashes", async () => {
    const calls: { table: string; payload: Record<string, unknown> }[] = [];
    const db = {
      from(table: string) {
        const b = {
          insert(payload: Record<string, unknown>) {
            calls.push({ table, payload });
            return b;
          },
          update(payload: Record<string, unknown>) {
            calls.push({ table, payload });
            return b;
          },
          eq() {
            return b;
          },
          then(resolve: (v: unknown) => unknown) {
            return Promise.resolve(resolve({ error: null }));
          },
        };
        return b;
      },
    };
    const input = { ...row, import_status: "ok" as const, reviewed_answer: generated };
    expect(validateImportRow(input).ok).toBe(true);
    expect(await writeImportAnswerProvenance(db as never, "generated-id", input)).toEqual([]);
    expect(calls[0].payload).toMatchObject({
      printed_answer: null,
      selected_official_answer: null,
      status: "missing_answer_key",
      review_required: true,
      raw_model_response: { ...generated, official_answer_available: false },
    });
    expect(calls[1].payload).toMatchObject({
      selected_official_answer: null,
      answer_key_status: "missing_answer_key",
    });
  });

  it.each([
    { printed_answer: "B" },
    { independently_verified_answer: "A" },
    { generated_key_artifact_sha256: "not-a-hash" },
    { independent_review_sha256s: ["b".repeat(64)] },
    { independent_review_sha256s: ["b".repeat(64), "b".repeat(64)] },
    { evidence: null },
    { kind: "unverified_generated" },
  ])(
    "rejects incomplete/disagreeing generated evidence before any writer call: %j",
    async (change) => {
      const input = {
        ...row,
        reviewed_answer: { ...generated, ...change },
      } as unknown as typeof row;
      expect(validateImportRow(input).ok).toBe(false);
      const db = {
        from() {
          throw new Error("Must not access database");
        },
      };
      expect(
        (await writeImportAnswerProvenance(db as never, "invalid-id", input)).length
      ).toBeGreaterThan(0);
    }
  );
});
