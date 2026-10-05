import { describe, expect, it } from "vitest";
import {
  computeContentHashV2,
  importQuestion,
  validateImportRow,
  type ImportQuestionInput,
} from "./import-core";
import { rowToImportInput } from "../../../scripts/pdf-pipeline/import-json-direct-row";
const table = {
  header_row: ["x", "y"],
  rows: [
    ["1", "2"],
    ["3", "4"],
  ],
};
const row: ImportQuestionInput = {
  question_text: "Which table?",
  correct_answer: "A",
  domain: "algebra",
  concept_slug: "linear-equations-two-variables",
  choice_a: "First table",
  choice_b: "Second",
  choice_c: "Third",
  choice_d: "Fourth",
  choice_tables: { A: table },
  figure_kind: "table",
  figure_table_data: table,
};
describe("native table import boundaries", () => {
  it("carries question and choice tables through the CLI adapter", () => {
    const adapted = rowToImportInput(row, "synthetic.pdf");
    expect(adapted).toMatchObject({
      figure_kind: "table",
      figure_table_data: table,
      choice_tables: { A: table },
    });
    expect(validateImportRow(adapted as ImportQuestionInput).ok).toBe(true);
  });
  it("rejects malformed, unpaired and wrongly assigned tables before any write", () => {
    expect(
      validateImportRow({ ...row, choice_tables: { A: { rows: [["1"], ["2", "3"]] } } }).ok
    ).toBe(false);
    expect(validateImportRow({ ...row, figure_kind: null }).ok).toBe(false);
    expect(validateImportRow({ ...row, figure_table_data: null }).ok).toBe(false);
    expect(validateImportRow({ ...row, question_format: "numeric_entry" }).ok).toBe(false);
    expect(validateImportRow({ ...row, choice_tables: { E: table } as never }).ok).toBe(false);
  });
  it("includes table cells and choice ownership in retry hashes, preserving text-only hashes", () => {
    const base = { ...row, subject: "math", answer_format: "multiple_choice" };
    const hash = computeContentHashV2(base);
    expect(computeContentHashV2({ ...base, choice_tables: { B: table } })).not.toBe(hash);
    expect(
      computeContentHashV2({ ...base, figure_table_data: { ...table, rows: [["1", "9"]] } })
    ).not.toBe(hash);
    expect(computeContentHashV2({ ...base, figure_table_data: null, choice_tables: {} })).toBe(
      computeContentHashV2({ ...base, figure_table_data: undefined, choice_tables: undefined })
    );
  });
  it("writes native cells beside their A–D choices and leaves publication draft", async () => {
    const calls: { table: string; payload: unknown }[] = [];
    const client = {
      from(name: string) {
        const builder = {
          insert(payload: unknown) {
            calls.push({ table: name, payload });
            return builder;
          },
          update() {
            return builder;
          },
          eq() {
            return builder;
          },
          select() {
            return builder;
          },
          single() {
            return Promise.resolve({ data: { id: "synthetic-id" }, error: null });
          },
          then(resolve: (value: unknown) => unknown) {
            return Promise.resolve(resolve({ data: null, error: null }));
          },
        };
        return builder;
      },
    };
    const result = await importQuestion(client as never, row);
    expect(result.inserted).toBe(true);
    expect(calls.find((c) => c.table === "quiz_questions")?.payload).toMatchObject({
      figure_kind: "table",
      figure_table_data: table,
      publish_status: "draft",
    });
    expect(calls.find((c) => c.table === "answer_choices")?.payload).toMatchObject([
      { letter: "A", choice_table_data: table },
      { letter: "B", choice_table_data: null },
      { letter: "C", choice_table_data: null },
      { letter: "D", choice_table_data: null },
    ]);
  });
});
