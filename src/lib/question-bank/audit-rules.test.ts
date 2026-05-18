// ============================================================
// Unit tests for `auditRow` — the deterministic single-row audit
// checks. Mirrors the most-impactful codes from audit-csv.mjs so
// the Inspector "Re-run checks" button stays trustworthy.
// ============================================================

import { describe, it, expect } from "vitest";
import { auditRow, type AuditableRow } from "./audit-rules";

function makeMcRow(overrides: Partial<AuditableRow> = {}): AuditableRow {
  return {
    question_text: "What is $2 + 2$?",
    correct_answer: "B",
    answer_format: "multiple_choice",
    difficulty_level: 3,
    hint: null,
    explanation_text: "Adding 2 and 2 gives 4. The other choices are common arithmetic errors.",
    explanation_per_choice: {
      A: "Off by one",
      B: "Correct — 2+2=4",
      C: "Off by one",
      D: "Way off",
    },
    passage: null,
    passage_intro: null,
    passage_a: null,
    passage_b: null,
    domain: "algebra",
    concept_slug: null,
    image_url: null,
    image_alt: null,
    numeric_tolerance: null,
    choices: [
      { letter: "A", choice_text: "3", is_correct: false },
      { letter: "B", choice_text: "4", is_correct: true },
      { letter: "C", choice_text: "5", is_correct: false },
      { letter: "D", choice_text: "6", is_correct: false },
    ],
    ...overrides,
  };
}

describe("auditRow — schema codes", () => {
  it("emits no findings on a clean MC row", () => {
    const findings = auditRow(makeMcRow());
    expect(findings.map((f) => f.code)).toEqual([]);
  });

  it("A2: empty question_text", () => {
    const f = auditRow(makeMcRow({ question_text: null }));
    expect(f.some((x) => x.code === "A2_empty_question_text")).toBe(true);
  });

  it("A3: empty correct_answer", () => {
    const f = auditRow(makeMcRow({ correct_answer: null }));
    expect(f.some((x) => x.code === "A3_empty_correct_answer")).toBe(true);
  });

  it("A7: difficulty out of [1,7]", () => {
    expect(
      auditRow(makeMcRow({ difficulty_level: 0 })).some((f) => f.code === "A7_bad_difficulty")
    ).toBe(true);
    expect(
      auditRow(makeMcRow({ difficulty_level: 8 })).some((f) => f.code === "A7_bad_difficulty")
    ).toBe(true);
    expect(
      auditRow(makeMcRow({ difficulty_level: null })).some((f) => f.code === "A7_bad_difficulty")
    ).toBe(true);
  });

  it("A15: MC correct_answer not in A|B|C|D", () => {
    const f = auditRow(makeMcRow({ correct_answer: "E" }));
    expect(f.some((x) => x.code === "A15_mc_bad_letter")).toBe(true);
  });

  it("A17: MC row missing a choice text", () => {
    const f = auditRow(
      makeMcRow({
        choices: [
          { letter: "A", choice_text: "", is_correct: false },
          { letter: "B", choice_text: "4", is_correct: true },
          { letter: "C", choice_text: "5", is_correct: false },
          { letter: "D", choice_text: "6", is_correct: false },
        ],
      })
    );
    expect(f.some((x) => x.code === "A17_mc_missing_choice")).toBe(true);
  });

  it("C6: duplicate MC choices", () => {
    const f = auditRow(
      makeMcRow({
        choices: [
          { letter: "A", choice_text: "4", is_correct: false },
          { letter: "B", choice_text: "4", is_correct: true },
          { letter: "C", choice_text: "5", is_correct: false },
          { letter: "D", choice_text: "6", is_correct: false },
        ],
      })
    );
    expect(f.some((x) => x.code === "C6_duplicate_choices")).toBe(true);
  });

  it("C6b: correct letter points at empty choice", () => {
    const f = auditRow(
      makeMcRow({
        correct_answer: "C",
        choices: [
          { letter: "A", choice_text: "3", is_correct: false },
          { letter: "B", choice_text: "4", is_correct: false },
          { letter: "C", choice_text: "", is_correct: true },
          { letter: "D", choice_text: "6", is_correct: false },
        ],
      })
    );
    expect(f.some((x) => x.code === "C6b_correct_letter_empty")).toBe(true);
  });

  it("A18: SPR row carrying MC choices", () => {
    const f = auditRow(
      makeMcRow({
        answer_format: "numeric_entry",
        correct_answer: "12",
        // Keep non-empty choices to trigger the warning.
      })
    );
    expect(f.some((x) => x.code === "A18_spr_has_choice")).toBe(true);
  });
});

describe("auditRow — KaTeX formatting", () => {
  it("B1: unbalanced $ delimiters", () => {
    const f = auditRow(makeMcRow({ question_text: "What is $x^2 + 2$ plus $y?" }));
    expect(f.some((x) => x.code === "B1_unbalanced_dollar")).toBe(true);
  });

  it("B5: unbalanced { } braces", () => {
    const f = auditRow(makeMcRow({ question_text: "Solve $\\frac{1}{2$" }));
    expect(f.some((x) => x.code === "B5_unbalanced_braces")).toBe(true);
  });

  it("B5: extra closing brace", () => {
    const f = auditRow(makeMcRow({ question_text: "Solve $x^2}$" }));
    expect(f.some((x) => x.code === "B5_unbalanced_braces")).toBe(true);
  });
});

describe("auditRow — cross-field codes", () => {
  it("C1: figure hinted but image_url missing", () => {
    const f = auditRow(
      makeMcRow({
        question_text: "Based on the scatterplot shown above, what is the slope?",
        image_url: null,
      })
    );
    expect(f.some((x) => x.code === "C1_figure_missing")).toBe(true);
  });

  it("C1 does NOT fire when image_url is present", () => {
    const f = auditRow(
      makeMcRow({
        question_text: "Based on the scatterplot shown above, what is the slope?",
        image_url: "https://example.com/figure.png",
      })
    );
    expect(f.some((x) => x.code === "C1_figure_missing")).toBe(false);
  });

  it("C2: image_alt mentions UI noise", () => {
    const f = auditRow(makeMcRow({ image_alt: "Answer box for the student input." }));
    expect(f.some((x) => x.code === "C2_alt_ui_noise")).toBe(true);
  });

  it("C4: only one of passage_a/passage_b set", () => {
    expect(
      auditRow(makeMcRow({ passage_a: "Some text", passage_b: null })).some(
        (f) => f.code === "C4_lone_passage_ab"
      )
    ).toBe(true);
    expect(
      auditRow(makeMcRow({ passage_a: null, passage_b: "Some text" })).some(
        (f) => f.code === "C4_lone_passage_ab"
      )
    ).toBe(true);
  });
});

describe("auditRow — quality codes", () => {
  it("D0: empty explanation_text", () => {
    const f = auditRow(makeMcRow({ explanation_text: null }));
    expect(f.some((x) => x.code === "D0_no_explanation")).toBe(true);
  });

  it("D1: short explanation_text", () => {
    const f = auditRow(makeMcRow({ explanation_text: "Short." }));
    expect(f.some((x) => x.code === "D1_short_explanation")).toBe(true);
  });

  it("D6: MC row with no per-choice explanations", () => {
    const f = auditRow(makeMcRow({ explanation_per_choice: null }));
    expect(f.some((x) => x.code === "D6_no_per_choice_expl")).toBe(true);
  });

  it("D7: MC row with partial per-choice explanations", () => {
    const f = auditRow(
      makeMcRow({
        explanation_per_choice: { A: "wrong", B: "right" },
      })
    );
    expect(f.some((x) => x.code === "D7_partial_per_choice_expl")).toBe(true);
  });
});

describe("auditRow — OCR patterns", () => {
  it("F1: bare letter+digit in math (likely missing exponent)", () => {
    const f = auditRow(makeMcRow({ question_text: "Simplify $x2 + 3x$" }));
    expect(f.some((x) => x.code === "F1_bare_digit_after_letter")).toBe(true);
  });

  it("F1 does NOT fire on properly-exponentiated math", () => {
    const f = auditRow(makeMcRow({ question_text: "Simplify $x^2 + 3x$" }));
    expect(f.some((x) => x.code === "F1_bare_digit_after_letter")).toBe(false);
  });

  it("F5: question_text ends mid-sentence", () => {
    const f = auditRow(
      makeMcRow({
        question_text: "What is the value of x in the equation above which yields the maximum",
      })
    );
    expect(f.some((x) => x.code === "F5_no_terminal_punct")).toBe(true);
  });

  it("F5 does NOT fire when question ends in ?", () => {
    const f = auditRow(
      makeMcRow({ question_text: "What is the value of x in the equation above?" })
    );
    expect(f.some((x) => x.code === "F5_no_terminal_punct")).toBe(false);
  });

  it("F7: replacement character", () => {
    const f = auditRow(makeMcRow({ question_text: "What is the value of x � here?" }));
    expect(f.some((x) => x.code === "F7_replacement_char")).toBe(true);
  });
});

describe("auditRow — dedupe", () => {
  it("collapses repeated codes from multiple text fields", () => {
    // F1 fires on question_text AND choice_a, both have bare letter+digit.
    const f = auditRow(
      makeMcRow({
        question_text: "Simplify $x2$",
        choices: [
          { letter: "A", choice_text: "$y3$", is_correct: false },
          { letter: "B", choice_text: "4", is_correct: true },
          { letter: "C", choice_text: "5", is_correct: false },
          { letter: "D", choice_text: "6", is_correct: false },
        ],
      })
    );
    const f1Hits = f.filter((x) => x.code === "F1_bare_digit_after_letter");
    expect(f1Hits.length).toBe(1);
  });
});
