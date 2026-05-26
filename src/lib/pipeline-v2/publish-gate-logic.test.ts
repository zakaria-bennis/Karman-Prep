// ============================================================
// Unit tests for the publish-gate decision rules + the KaTeX
// span extractor. These functions are the heart of v2 phase 1's
// "import_status ≠ student visibility" enforcement; they need
// pinned behavior.
//
// All functions live in publish-gate-logic.mjs as pure JS so
// they can be imported here AND from the orchestrator scripts
// without a tsx round-trip.
// ============================================================

import { describe, it, expect } from "vitest";
// The logic lives in scripts/lib/publish-gate-logic.mjs so the
// orchestrator scripts (publish-gate.mjs, validate-katex.mjs) can
// import it without a tsx round-trip. The test sits in src/ because
// that's where vitest's include glob looks.
import {
  computePublishStatus,
  extractMathSpans,
  gateRequiredFields,
  gateKaTeX,
  gateGraderVotes,
  gateSlug,
  gateMissingVisual,
  gateImportStatus,
  gateExplanation,
  // v2 phase 2
  gateAnswerKeyStatus,
  gateAnswerVerification,
} from "../../../scripts/lib/publish-gate-logic.mjs";

const baseRow = {
  question_text: "What is 2+2?",
  correct_answer: "B",
  answer_format: "multiple_choice",
  answer_choices: [
    { letter: "A", choice_text: "3" },
    { letter: "B", choice_text: "4" },
    { letter: "C", choice_text: "5" },
    { letter: "D", choice_text: "6" },
  ],
  explanation_text: "Addition.",
  publish_status: "draft",
  import_status: "ok",
  concept_slug: "addition",
  grader_votes: null,
  import_flag_reason: null,
};
const slugs = new Set(["addition", "subtraction"]);

describe("computePublishStatus — happy path", () => {
  it("promotes a clean row to publish_ready", () => {
    const r = computePublishStatus({ ...baseRow }, slugs);
    expect(r.suggestedStatus).toBe("publish_ready");
    expect(r.reason).toBe("all_gates_pass");
  });
});

describe("computePublishStatus — blocking gates", () => {
  it("blocked_katex_error when publish_status already set to that", () => {
    const r = computePublishStatus({ ...baseRow, publish_status: "blocked_katex_error" }, slugs);
    expect(r.suggestedStatus).toBe("blocked_katex_error");
  });

  it("blocked_answer_dispute when grader verdict is likely_wrong", () => {
    const r = computePublishStatus(
      { ...baseRow, grader_votes: { verdict: "likely_wrong" } },
      slugs
    );
    expect(r.suggestedStatus).toBe("blocked_answer_dispute");
  });

  it("blocked_answer_dispute when grader verdict is pass1_split", () => {
    const r = computePublishStatus({ ...baseRow, grader_votes: { verdict: "pass1_split" } }, slugs);
    expect(r.suggestedStatus).toBe("blocked_answer_dispute");
  });

  it("blocked_slug_uncertain when concept_slug not in canonical set", () => {
    const r = computePublishStatus({ ...baseRow, concept_slug: "not-a-real-slug" }, slugs);
    expect(r.suggestedStatus).toBe("blocked_slug_uncertain");
  });

  it("blocked_missing_visual on import_flag_reason mentioning whole-page fallback", () => {
    const r = computePublishStatus(
      { ...baseRow, import_flag_reason: "whole-page figure fallback used" },
      slugs
    );
    expect(r.suggestedStatus).toBe("blocked_missing_visual");
  });

  it("corrupt_question when question_text is empty", () => {
    const r = computePublishStatus({ ...baseRow, question_text: "" }, slugs);
    expect(r.suggestedStatus).toBe("corrupt_question");
  });

  it("corrupt_question when MC missing a choice letter", () => {
    const r = computePublishStatus(
      {
        ...baseRow,
        answer_choices: [
          { letter: "A", choice_text: "x" },
          { letter: "B", choice_text: "y" },
          { letter: "C", choice_text: "z" },
        ],
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("corrupt_question");
  });
});

describe("computePublishStatus — soft (needs_human_review) gates", () => {
  it("needs_human_review when import_status=needs_review", () => {
    const r = computePublishStatus({ ...baseRow, import_status: "needs_review" }, slugs);
    expect(r.suggestedStatus).toBe("needs_human_review");
    expect(r.reason).toMatch(/import_status=needs_review/);
  });

  it("needs_human_review when explanation_text is empty", () => {
    const r = computePublishStatus({ ...baseRow, explanation_text: "" }, slugs);
    expect(r.suggestedStatus).toBe("needs_human_review");
    expect(r.reason).toBe("missing_explanation_text");
  });

  it("needs_human_review when correct_answer is empty (NOT corrupt)", () => {
    const r = computePublishStatus({ ...baseRow, correct_answer: "" }, slugs);
    expect(r.suggestedStatus).toBe("needs_human_review");
  });
});

describe("computePublishStatus — gate ordering (strictness)", () => {
  it("KaTeX block beats grader dispute", () => {
    const r = computePublishStatus(
      {
        ...baseRow,
        publish_status: "blocked_katex_error",
        grader_votes: { verdict: "likely_wrong" },
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("blocked_katex_error");
  });

  it("grader dispute beats slug uncertain", () => {
    const r = computePublishStatus(
      {
        ...baseRow,
        grader_votes: { verdict: "likely_wrong" },
        concept_slug: "not-a-slug",
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("blocked_answer_dispute");
  });

  it("import_status=needs_review beats missing explanation", () => {
    const r = computePublishStatus(
      { ...baseRow, import_status: "needs_review", explanation_text: "" },
      slugs
    );
    expect(r.suggestedStatus).toBe("needs_human_review");
    expect(r.reason).toMatch(/import_status=needs_review/);
  });
});

describe("computePublishStatus — slug gate fallbacks", () => {
  it("empty concept_slug does NOT block (bank rows route via Review UI)", () => {
    const r = computePublishStatus({ ...baseRow, concept_slug: null }, slugs);
    expect(r.suggestedStatus).toBe("publish_ready");
  });

  it("no validSlugs set (curriculum file missing) → slug gate is a no-op", () => {
    const r = computePublishStatus({ ...baseRow, concept_slug: "anything-goes" }, new Set());
    expect(r.suggestedStatus).toBe("publish_ready");
  });
});

describe("individual gate functions return shape", () => {
  it("gateRequiredFields returns null when valid", () => {
    expect(gateRequiredFields(baseRow)).toBeNull();
  });
  it("gateKaTeX returns null when not katex-blocked", () => {
    expect(gateKaTeX(baseRow)).toBeNull();
  });
  it("gateGraderVotes returns null when no grader_votes", () => {
    expect(gateGraderVotes(baseRow)).toBeNull();
  });
  it("gateSlug returns null when slug is valid", () => {
    expect(gateSlug(baseRow, slugs)).toBeNull();
  });
  it("gateMissingVisual returns null when no fallback mention", () => {
    expect(gateMissingVisual(baseRow)).toBeNull();
  });
  it("gateImportStatus returns null when status is ok", () => {
    expect(gateImportStatus(baseRow)).toBeNull();
  });
  it("gateExplanation returns null when explanation present", () => {
    expect(gateExplanation(baseRow)).toBeNull();
  });
});

// ── v2 phase 2: answer-key + verification gates ──────────────

describe("computePublishStatus — v2 phase 2 answer_key_status gate", () => {
  it("correction_disputed → blocked_answer_dispute", () => {
    const r = computePublishStatus({ ...baseRow, answer_key_status: "correction_disputed" }, slugs);
    expect(r.suggestedStatus).toBe("blocked_answer_dispute");
  });

  it("missing_answer_key → needs_human_review", () => {
    const r = computePublishStatus({ ...baseRow, answer_key_status: "missing_answer_key" }, slugs);
    expect(r.suggestedStatus).toBe("needs_human_review");
  });

  it("correction_unclear → needs_human_review", () => {
    const r = computePublishStatus({ ...baseRow, answer_key_status: "correction_unclear" }, slugs);
    expect(r.suggestedStatus).toBe("needs_human_review");
  });

  it("unverifiable → needs_human_review", () => {
    const r = computePublishStatus({ ...baseRow, answer_key_status: "unverifiable" }, slugs);
    expect(r.suggestedStatus).toBe("needs_human_review");
  });

  it("printed_key_used_no_correction → pass", () => {
    const r = computePublishStatus(
      { ...baseRow, answer_key_status: "printed_key_used_no_correction" },
      slugs
    );
    expect(r.suggestedStatus).toBe("publish_ready");
  });

  it("corrected_key_verified → publish_ready_with_verified_repair", () => {
    const r = computePublishStatus(
      { ...baseRow, answer_key_status: "corrected_key_verified" },
      slugs
    );
    expect(r.suggestedStatus).toBe("publish_ready_with_verified_repair");
    expect(r.reason).toBe("all_gates_pass_with_verified_repair");
  });
});

describe("computePublishStatus — v2 phase 2 answer_verification_status gate", () => {
  it("disputed → blocked_answer_dispute", () => {
    const r = computePublishStatus({ ...baseRow, answer_verification_status: "disputed" }, slugs);
    expect(r.suggestedStatus).toBe("blocked_answer_dispute");
  });

  it("unverifiable → needs_human_review", () => {
    const r = computePublishStatus(
      { ...baseRow, answer_verification_status: "unverifiable" },
      slugs
    );
    expect(r.suggestedStatus).toBe("needs_human_review");
  });

  it("verified → pass", () => {
    const r = computePublishStatus({ ...baseRow, answer_verification_status: "verified" }, slugs);
    expect(r.suggestedStatus).toBe("publish_ready");
  });

  it("verification disputed BEATS slug uncertain (strictness order)", () => {
    const r = computePublishStatus(
      { ...baseRow, answer_verification_status: "disputed", concept_slug: "not-a-slug" },
      slugs
    );
    expect(r.suggestedStatus).toBe("blocked_answer_dispute");
  });
});

describe("individual phase-2 gates", () => {
  it("gateAnswerKeyStatus returns null on undefined", () => {
    expect(gateAnswerKeyStatus(baseRow)).toBeNull();
  });
  it("gateAnswerVerification returns null on undefined", () => {
    expect(gateAnswerVerification(baseRow)).toBeNull();
  });
});

describe("extractMathSpans", () => {
  it("returns empty for null / empty input", () => {
    expect(extractMathSpans(null)).toEqual([]);
    expect(extractMathSpans("")).toEqual([]);
  });

  it("extracts a single inline span", () => {
    const spans = extractMathSpans("Solve $x^2 = 4$.");
    expect(spans).toHaveLength(1);
    expect(spans[0].latex).toBe("x^2 = 4");
    expect(spans[0].displayMode).toBe(false);
  });

  it("extracts a display span", () => {
    const spans = extractMathSpans("Equation: $$\\frac{a}{b}$$ done.");
    expect(spans).toHaveLength(1);
    expect(spans[0].latex).toBe("\\frac{a}{b}");
    expect(spans[0].displayMode).toBe(true);
  });

  it("extracts multiple inline spans on one line", () => {
    const spans = extractMathSpans("First $a^2$ then $b^2$.");
    const latexes = spans.map((s) => s.latex).sort();
    expect(latexes).toEqual(["a^2", "b^2"]);
  });

  it("treats \\$ as escaped (currency), not a math delimiter", () => {
    const spans = extractMathSpans("Priced at \\$80 today.");
    expect(spans).toHaveLength(0);
  });

  it("ignores $ chars INSIDE a display span when finding inline ones", () => {
    // Regression check: the inline regex must not re-match $ chars
    // that are already swallowed by a $$...$$ display span.
    const spans = extractMathSpans("$$x^2 + 1$$ and $y^2$");
    expect(spans).toHaveLength(2);
    expect(spans.some((s) => s.displayMode && s.latex === "x^2 + 1")).toBe(true);
    expect(spans.some((s) => !s.displayMode && s.latex === "y^2")).toBe(true);
  });
});
