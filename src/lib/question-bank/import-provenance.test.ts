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
