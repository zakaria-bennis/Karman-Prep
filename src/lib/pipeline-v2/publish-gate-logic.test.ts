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
  gateIrrelevantAttachedVisual,
  gateUncertainVisualRelevance,
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

// ── v2 phase 4 — visual relevance gates ─────────────────────

describe("computePublishStatus — v2 phase 4 visual relevance", () => {
  it("phase 4 gates short-circuit until relevance metadata is present", () => {
    const r = computePublishStatus(
      {
        ...baseRow,
        image_url: "https://r2.example/repeated-calculator.png",
        irrelevant_visual_asset_count: 1,
        required_visual_asset_count: 0,
        phase4_visual_relevance_checked: false,
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("publish_ready");
  });

  it("blocks when the only attached visual was classified irrelevant", () => {
    const r = computePublishStatus(
      {
        ...baseRow,
        image_url: "https://r2.example/repeated-calculator.png",
        phase4_visual_relevance_checked: true,
        required_visual_asset_count: 0,
        irrelevant_visual_asset_count: 1,
        uncertain_visual_asset_count: 0,
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("blocked_missing_visual");
    expect(r.reason).toMatch(/phase4_attached_visual_classified_irrelevant/);
  });

  it("routes uncertain visual relevance to human review", () => {
    const r = computePublishStatus(
      {
        ...baseRow,
        image_url: "https://r2.example/repeated-but-referenced.png",
        phase4_visual_relevance_checked: true,
        required_visual_asset_count: 0,
        irrelevant_visual_asset_count: 0,
        uncertain_visual_asset_count: 1,
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("needs_human_review");
    expect(r.reason).toMatch(/phase4_uncertain_visual_relevance=1/);
  });

  it("passes when at least one attached visual is required", () => {
    const r = computePublishStatus(
      {
        ...baseRow,
        image_url: "https://r2.example/real-graph.png",
        phase4_visual_relevance_checked: true,
        required_visual_asset_count: 1,
        irrelevant_visual_asset_count: 1,
        uncertain_visual_asset_count: 0,
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("publish_ready");
  });

  it("exports direct gate helpers for focused checks", () => {
    expect(
      gateIrrelevantAttachedVisual({
        image_url: "https://r2.example/artifact.png",
        phase4_visual_relevance_checked: true,
        required_visual_asset_count: 0,
        irrelevant_visual_asset_count: 1,
      })?.suggestedStatus
    ).toBe("blocked_missing_visual");

    expect(
      gateUncertainVisualRelevance({
        phase4_visual_relevance_checked: true,
        uncertain_visual_asset_count: 2,
      })?.suggestedStatus
    ).toBe("needs_human_review");
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

// ── v2 phase 3 — opt-in gates ───────────────────────────────

describe("computePublishStatus — v2 phase 3 (opt-in)", () => {
  it("ALL phase 3 gates short-circuit when source_assets_processed_at is null", () => {
    // Even with every weak-evidence signal present, a row that
    // hasn't been through Phase 3 stays publish_ready.
    const r = computePublishStatus(
      {
        ...baseRow,
        source_assets_processed_at: null,
        has_question_crop: false,
        question_crop_match_confidence: 0.1,
        question_crop_match_method: "ordered_fallback",
        has_orphan_crops_on_page: true,
        question_crop_complete: false,
        source_assets_processed_status: "partial",
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("publish_ready");
  });
});

describe("computePublishStatus — v2 phase 3 gates fire when opted in", () => {
  const phase3Row = {
    ...baseRow,
    source_assets_processed_at: "2026-05-26T03:00:00Z",
  };

  it("gateMissingSourcePage", () => {
    const r = computePublishStatus({ ...phase3Row, source_page: null }, slugs);
    expect(r.suggestedStatus).toBe("needs_human_review");
    expect(r.reason).toMatch(/source_page_missing/);
  });

  it("gateMissingQuestionCrop", () => {
    const r = computePublishStatus(
      { ...phase3Row, source_page: 17, has_question_crop: false },
      slugs
    );
    expect(r.suggestedStatus).toBe("needs_human_review");
    expect(r.reason).toMatch(/missing_question_crop/);
  });

  it("gateLowCropConfidence at 0.5", () => {
    const r = computePublishStatus(
      {
        ...phase3Row,
        source_page: 17,
        has_question_crop: true,
        question_crop_match_confidence: 0.5,
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("needs_human_review");
    expect(r.reason).toMatch(/low_crop_confidence/);
  });

  it("gateLowCropConfidence PASSES at 0.75 boundary", () => {
    const r = computePublishStatus(
      {
        ...phase3Row,
        source_page: 17,
        has_question_crop: true,
        question_crop_match_confidence: 0.75,
        question_crop_complete: true,
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("publish_ready");
  });

  it("gateOrderedFallbackMatch", () => {
    const r = computePublishStatus(
      {
        ...phase3Row,
        source_page: 17,
        has_question_crop: true,
        question_crop_match_confidence: 0.9,
        question_crop_match_method: "ordered_fallback",
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("needs_human_review");
    expect(r.reason).toMatch(/ordered_fallback/);
  });

  it("gateOrphanCropsOnPage", () => {
    const r = computePublishStatus(
      {
        ...phase3Row,
        source_page: 17,
        has_question_crop: true,
        question_crop_match_confidence: 0.9,
        question_crop_complete: true,
        has_orphan_crops_on_page: true,
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("needs_human_review");
    expect(r.reason).toMatch(/orphan_crops_on_page/);
  });

  it("gateIncompleteCrop", () => {
    const r = computePublishStatus(
      {
        ...phase3Row,
        source_page: 17,
        has_question_crop: true,
        question_crop_match_confidence: 0.9,
        question_crop_complete: false,
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("needs_human_review");
    expect(r.reason).toMatch(/crop_complete=false/);
  });
});

describe("computePublishStatus — phase 3 ordering vs Phase 1/2", () => {
  const phase3Row = {
    ...baseRow,
    source_assets_processed_at: "2026-05-26T03:00:00Z",
  };

  it("Phase 1 blocking gate (KaTeX) BEATS Phase 3 weak-evidence", () => {
    const r = computePublishStatus(
      {
        ...phase3Row,
        publish_status: "blocked_katex_error",
        has_question_crop: false,
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("blocked_katex_error");
  });

  it("Phase 2 blocking gate (correction_disputed) BEATS Phase 3", () => {
    const r = computePublishStatus(
      {
        ...phase3Row,
        answer_key_status: "correction_disputed",
        has_question_crop: false,
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("blocked_answer_dispute");
  });

  it("Phase 3 missing-crop BEATS Phase 1 missing-explanation", () => {
    const r = computePublishStatus(
      {
        ...phase3Row,
        source_page: 17, // satisfies gateMissingSourcePage so we test the right gate
        has_question_crop: false,
        explanation_text: "",
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("needs_human_review");
    expect(r.reason).toMatch(/missing_question_crop/);
  });
});

describe("computePublishStatus — clean phase 3 row publishes", () => {
  it("all signals green, all gates pass", () => {
    const r = computePublishStatus(
      {
        ...baseRow,
        source_assets_processed_at: "2026-05-26T03:00:00Z",
        source_assets_processed_status: "complete",
        source_page: 17,
        has_question_crop: true,
        question_crop_match_confidence: 0.95,
        question_crop_match_method: "page_passage_snippet",
        question_crop_complete: true,
        has_orphan_crops_on_page: false,
      },
      slugs
    );
    expect(r.suggestedStatus).toBe("publish_ready");
  });
});
