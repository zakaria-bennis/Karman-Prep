// @vitest-environment node
//
// Tests for the deterministic well-formedness checks exported by
// scripts/pdf-pipeline/audit/check-well-formedness.mjs. These run
// without any LLM calls — pure rule evaluation against the row shape.

import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs has no type declarations; runtime validation only.
import { deterministicWellFormednessChecks } from "../../../scripts/pdf-pipeline/audit/check-well-formedness.mjs";

function mcRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "q1",
    question_text: "What is the value of x in 2x + 3 = 11?",
    answer_format: "multiple_choice",
    correct_answer: "B",
    answer_choices: [
      { letter: "A", choice_text: "2" },
      { letter: "B", choice_text: "4" },
      { letter: "C", choice_text: "6" },
      { letter: "D", choice_text: "8" },
    ],
    ...overrides,
  };
}

function numericRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "q2",
    question_text: "Find x.",
    answer_format: "numeric_entry",
    correct_answer: "4",
    answer_choices: [],
    ...overrides,
  };
}

describe("deterministicWellFormednessChecks — happy paths", () => {
  it("returns no findings for a complete MC row", () => {
    expect(deterministicWellFormednessChecks(mcRow())).toEqual([]);
  });

  it("returns no findings for a complete numeric_entry row", () => {
    expect(deterministicWellFormednessChecks(numericRow())).toEqual([]);
  });
});

describe("deterministicWellFormednessChecks — empty stem", () => {
  it("flags BLOCKING when question_text is empty", () => {
    const findings = deterministicWellFormednessChecks(mcRow({ question_text: "" }));
    expect(findings.find((f: { code: string }) => f.code === "empty_question_text")?.severity).toBe(
      "BLOCKING"
    );
  });
  it("flags BLOCKING when question_text is whitespace-only", () => {
    const findings = deterministicWellFormednessChecks(mcRow({ question_text: "   \n  " }));
    expect(findings.find((f: { code: string }) => f.code === "empty_question_text")).toBeDefined();
  });
});

describe("deterministicWellFormednessChecks — MC missing choices", () => {
  it("flags each missing letter", () => {
    const findings = deterministicWellFormednessChecks(
      mcRow({
        answer_choices: [
          { letter: "A", choice_text: "1" },
          { letter: "B", choice_text: "2" },
        ],
      })
    );
    expect(findings.find((f: { code: string }) => f.code === "mc_missing_choice_c")).toBeDefined();
    expect(findings.find((f: { code: string }) => f.code === "mc_missing_choice_d")).toBeDefined();
  });
});

describe("deterministicWellFormednessChecks — duplicate choices", () => {
  it("flags identical choice texts", () => {
    const findings = deterministicWellFormednessChecks(
      mcRow({
        answer_choices: [
          { letter: "A", choice_text: "2" },
          { letter: "B", choice_text: "2" }, // duplicate of A
          { letter: "C", choice_text: "6" },
          { letter: "D", choice_text: "8" },
        ],
      })
    );
    expect(
      findings.find((f: { code: string }) => f.code === "mc_duplicate_choice_text")
    ).toBeDefined();
  });

  it("is case-insensitive on duplicate detection", () => {
    const findings = deterministicWellFormednessChecks(
      mcRow({
        answer_choices: [
          { letter: "A", choice_text: "Yes" },
          { letter: "B", choice_text: "yes" }, // dup with A modulo case
          { letter: "C", choice_text: "Maybe" },
          { letter: "D", choice_text: "No" },
        ],
      })
    );
    expect(
      findings.find((f: { code: string }) => f.code === "mc_duplicate_choice_text")
    ).toBeDefined();
  });
});

describe("deterministicWellFormednessChecks — correct_answer letter", () => {
  it("flags BLOCKING when correct_answer isn't A/B/C/D", () => {
    const findings = deterministicWellFormednessChecks(mcRow({ correct_answer: "E" }));
    expect(
      findings.find((f: { code: string }) => f.code === "mc_invalid_correct_answer_letter")
    ).toBeDefined();
  });
  it("accepts lowercase correct_answer", () => {
    expect(deterministicWellFormednessChecks(mcRow({ correct_answer: "c" }))).toEqual([]);
  });
});

describe("deterministicWellFormednessChecks — numeric_entry", () => {
  it("flags empty correct_answer as BLOCKING", () => {
    const findings = deterministicWellFormednessChecks(numericRow({ correct_answer: "" }));
    expect(
      findings.find((f: { code: string }) => f.code === "numeric_empty_correct_answer")
    ).toBeDefined();
  });
  it("flags non-numeric correct_answer as WARNING", () => {
    const findings = deterministicWellFormednessChecks(
      numericRow({ correct_answer: "approximately 4" })
    );
    expect(
      findings.find(
        (f: { code: string; severity: string }) =>
          f.code === "numeric_non_numeric_correct_answer" && f.severity === "WARNING"
      )
    ).toBeDefined();
  });
  it("accepts fractions like 1/2", () => {
    expect(deterministicWellFormednessChecks(numericRow({ correct_answer: "1/2" }))).toEqual([]);
  });
  it("accepts decimals like 0.5", () => {
    expect(deterministicWellFormednessChecks(numericRow({ correct_answer: "0.5" }))).toEqual([]);
  });
  it("accepts percent like 50%", () => {
    expect(deterministicWellFormednessChecks(numericRow({ correct_answer: "50%" }))).toEqual([]);
  });
  it("accepts scientific like 1.5e-3", () => {
    expect(deterministicWellFormednessChecks(numericRow({ correct_answer: "1.5e-3" }))).toEqual([]);
  });
});

describe("deterministicWellFormednessChecks — question_text duplicates passage", () => {
  it("flags WARNING when question_text starts with same 80 chars as passage", () => {
    const passage =
      "The author of the passage describes the rapid expansion of urban infrastructure during the late nineteenth century…";
    const findings = deterministicWellFormednessChecks(
      mcRow({
        question_text: passage + " Which statement is best supported?",
        passage,
      })
    );
    expect(
      findings.find((f: { code: string }) => f.code === "question_text_duplicates_passage")
    ).toBeDefined();
  });
});

describe("deterministicWellFormednessChecks — overly-long choices", () => {
  it("flags WARNING when a choice text exceeds 800 chars", () => {
    const overlong = "x".repeat(900);
    const findings = deterministicWellFormednessChecks(
      mcRow({
        answer_choices: [
          { letter: "A", choice_text: "ok" },
          { letter: "B", choice_text: overlong },
          { letter: "C", choice_text: "ok" },
          { letter: "D", choice_text: "ok2" },
        ],
      })
    );
    expect(findings.find((f: { code: string }) => f.code === "mc_choice_b_too_long")).toBeDefined();
  });
});
