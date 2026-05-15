// Unit tests for the shared CSV parser used by both the admin
// BulkImportPanel UI and the ingest-csv-inbox cron. Audit #9.

import { describe, expect, it } from "vitest";
import { parseCsv, toBulkRows, CSV_HEADERS } from "./csv-parser";

describe("CSV_HEADERS", () => {
  it("contains every required column in the documented order", () => {
    expect(CSV_HEADERS).toContain("question_text");
    expect(CSV_HEADERS).toContain("correct_answer");
    expect(CSV_HEADERS).toContain("concept_slug");
    expect(CSV_HEADERS[0]).toBe("question_text");
  });
});

describe("parseCsv", () => {
  it("parses a minimal header + one row", () => {
    const csv = "question_text,correct_answer\nWhat is 2+2?,B";
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].question_text).toBe("What is 2+2?");
    expect(rows[0].correct_answer).toBe("B");
  });

  it("returns an empty array for an empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("skips blank lines between rows", () => {
    const csv = "question_text,correct_answer\n\nQ1,A\n\n\nQ2,B\n";
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.question_text)).toEqual(["Q1", "Q2"]);
  });

  it("handles quoted fields with embedded commas", () => {
    const csv = `question_text,correct_answer\n"Find x where 3,2 holds",A`;
    const rows = parseCsv(csv);
    expect(rows[0].question_text).toBe("Find x where 3,2 holds");
  });

  it("handles doubled quotes inside a quoted field", () => {
    const csv = `question_text,correct_answer\n"She said ""hi""",B`;
    const rows = parseCsv(csv);
    expect(rows[0].question_text).toBe('She said "hi"');
  });

  it("handles CRLF line endings", () => {
    const csv = "question_text,correct_answer\r\nQ1,A\r\nQ2,B\r\n";
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.correct_answer)).toEqual(["A", "B"]);
  });

  it("trims whitespace around values", () => {
    const csv = "question_text,correct_answer\n  spaced out  ,  C  ";
    const rows = parseCsv(csv);
    expect(rows[0].question_text).toBe("spaced out");
    expect(rows[0].correct_answer).toBe("C");
  });
});

describe("toBulkRows", () => {
  it("maps the simplest row + applies sensible defaults", () => {
    const rows = toBulkRows([
      { question_text: "Q1", correct_answer: "a", explanation_text: "exp" },
    ]);
    expect(rows[0].question_text).toBe("Q1");
    expect(rows[0].correct_answer).toBe("A"); // upper-cased
    expect(rows[0].difficulty).toBe("4"); // default
    expect(rows[0].question_format).toBe("multiple_choice"); // default
  });

  it("preserves numeric_entry format when explicitly set", () => {
    const rows = toBulkRows([
      { question_text: "Q", correct_answer: "42", question_format: "numeric_entry" },
    ]);
    expect(rows[0].question_format).toBe("numeric_entry");
  });

  it("coerces invalid question_format to multiple_choice", () => {
    const rows = toBulkRows([
      { question_text: "Q", correct_answer: "A", question_format: "garbage" },
    ]);
    expect(rows[0].question_format).toBe("multiple_choice");
  });

  it("validates the answer_source enum", () => {
    expect(toBulkRows([{ question_text: "Q", answer_source: "inferred" }])[0].answer_source).toBe(
      "inferred"
    );
    expect(
      toBulkRows([{ question_text: "Q", answer_source: "hand_corrected" }])[0].answer_source
    ).toBe("hand_corrected");
    expect(toBulkRows([{ question_text: "Q", answer_source: "extracted" }])[0].answer_source).toBe(
      "extracted"
    );
    expect(
      toBulkRows([{ question_text: "Q", answer_source: "made_up" }])[0].answer_source
    ).toBeUndefined();
  });

  it("validates the import_flag_type enum", () => {
    expect(toBulkRows([{ question_text: "Q", import_flag_type: "skip" }])[0].import_flag_type).toBe(
      "skip"
    );
    expect(
      toBulkRows([{ question_text: "Q", import_flag_type: "partial_emit" }])[0].import_flag_type
    ).toBe("partial_emit");
    expect(
      toBulkRows([{ question_text: "Q", import_flag_type: "garbage" }])[0].import_flag_type
    ).toBeUndefined();
  });

  it("returns undefined for empty / missing optional fields", () => {
    const rows = toBulkRows([{ question_text: "Q", correct_answer: "A" }]);
    expect(rows[0].choice_a).toBeUndefined();
    expect(rows[0].topic_cluster).toBeUndefined();
    expect(rows[0].hint).toBeUndefined();
    expect(rows[0].image_url).toBeUndefined();
  });
});
