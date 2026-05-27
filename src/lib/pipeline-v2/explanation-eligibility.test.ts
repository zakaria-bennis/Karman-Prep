// @vitest-environment node
//
// Unit tests for the Phase 7 pre-fill eligibility gate in
// scripts/lib/explanation-eligibility.mjs. The gate IS the policy
// — every blocking condition the user enumerated must be
// exercised, plus the happy-path eligibility decision.

import { describe, expect, it } from "vitest";
import {
  checkFillEligibility,
  categorizeReason,
  ELIGIBILITY_CATEGORIES,
} from "../../../scripts/lib/explanation-eligibility.mjs";

// ── Fixture: a row that PASSES the gate ──
function eligibleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "q1",
    publish_status: "publish_ready",
    question_text: "What is the value of x in 2x + 3 = 11?",
    subject: "math",
    answer_format: "multiple_choice",
    answer_choices: [
      { letter: "A", choice_text: "2" },
      { letter: "B", choice_text: "4" },
      { letter: "C", choice_text: "6" },
      { letter: "D", choice_text: "8" },
    ],
    selected_official_answer: "B",
    correct_answer: "B",
    answer_key_status: "printed_key_used_no_correction",
    math_notation_status: null,
    answer_verification_status: "verified_panel",
    answer_verified_at: "2026-05-27T20:00:00Z",
    source_assets_processed_at: "2026-05-27T19:00:00Z",
    image_url: null,
    required_visual_asset_count: 0,
    ...overrides,
  };
}

describe("checkFillEligibility — happy path", () => {
  it("eligible row returns eligible=true, no reason or note", () => {
    const r = checkFillEligibility(eligibleRow());
    expect(r.eligible).toBe(true);
    expect(r.reason).toBeNull();
    expect(r.diagnostic_note).toBeNull();
  });
});

describe("checkFillEligibility — STRUCTURAL blockers", () => {
  it("corrupt_question → blocked", () => {
    const r = checkFillEligibility(eligibleRow({ publish_status: "corrupt_question" }));
    expect(r.eligible).toBe(false);
    expect(r.reason).toBe("corrupt_question");
    expect(r.diagnostic_note).toContain("corrupt");
  });

  it("duplicate_detected → blocked", () => {
    const r = checkFillEligibility(eligibleRow({ publish_status: "duplicate_detected" }));
    expect(r.reason).toBe("duplicate_detected");
  });

  it("empty question_text → blocked", () => {
    const r = checkFillEligibility(eligibleRow({ question_text: "  " }));
    expect(r.reason).toBe("empty_question_text");
  });

  it("MC question with only 3 choices → blocked", () => {
    const r = checkFillEligibility(
      eligibleRow({
        answer_choices: [
          { letter: "A", choice_text: "1" },
          { letter: "B", choice_text: "2" },
          { letter: "C", choice_text: "3" },
        ],
      })
    );
    expect(r.reason).toBe("missing_mc_choices");
  });

  it("numeric_entry question doesn't need 4 choices", () => {
    const r = checkFillEligibility(
      eligibleRow({ answer_format: "numeric_entry", answer_choices: [] })
    );
    expect(r.eligible).toBe(true);
  });
});

describe("checkFillEligibility — ANSWER KEY blockers", () => {
  it("missing both selected_official_answer + correct_answer → blocked", () => {
    const r = checkFillEligibility(
      eligibleRow({ selected_official_answer: null, correct_answer: null })
    );
    expect(r.reason).toBe("missing_answer_key");
  });

  it("answer_key_status=correction_unclear → blocked", () => {
    const r = checkFillEligibility(eligibleRow({ answer_key_status: "correction_unclear" }));
    expect(r.reason).toBe("answer_key_correction_unclear");
  });

  it("answer_key_status=correction_disputed → blocked", () => {
    const r = checkFillEligibility(eligibleRow({ answer_key_status: "correction_disputed" }));
    expect(r.reason).toBe("answer_key_correction_disputed");
  });

  it("answer_key_status=missing_answer_key → blocked with status reason", () => {
    const r = checkFillEligibility(eligibleRow({ answer_key_status: "missing_answer_key" }));
    expect(r.reason).toContain("answer_key_status=");
  });
});

describe("checkFillEligibility — SOURCE blockers", () => {
  it("question references graph but no required visual + no image → blocked", () => {
    const r = checkFillEligibility(
      eligibleRow({
        question_text: "Based on the graph above, what is f(2)?",
        image_url: null,
        required_visual_asset_count: 0,
        source_assets_processed_at: "2026-05-27T19:00:00Z",
      })
    );
    expect(r.reason).toBe("missing_required_visual");
  });

  it("question mentions visual BUT has image_url → eligible", () => {
    const r = checkFillEligibility(
      eligibleRow({
        question_text: "Based on the graph above, what is f(2)?",
        image_url: "https://r2/graph.png",
      })
    );
    expect(r.eligible).toBe(true);
  });

  it("question mentions visual BUT has required visual asset → eligible", () => {
    const r = checkFillEligibility(
      eligibleRow({
        question_text: "Based on the graph above, what is f(2)?",
        required_visual_asset_count: 1,
      })
    );
    expect(r.eligible).toBe(true);
  });

  it("Phase 3 NOT yet run (source_assets_processed_at null) → missing-visual gate doesn't fire", () => {
    const r = checkFillEligibility(
      eligibleRow({
        question_text: "Based on the graph above, what is f(2)?",
        source_assets_processed_at: null,
      })
    );
    // We don't block on missing-visual until Phase 3 has actually
    // tried to extract crops. (Legacy rows shouldn't suddenly fail.)
    expect(r.eligible).toBe(true);
  });
});

describe("checkFillEligibility — MATH NOTATION blockers", () => {
  it("math_notation_status=suggested_repair_needs_review → blocked", () => {
    const r = checkFillEligibility(
      eligibleRow({ math_notation_status: "suggested_repair_needs_review" })
    );
    expect(r.reason).toBe("math_notation_suggested_repair_needs_review");
  });

  it("math_notation_status=ambiguous_repair → blocked", () => {
    const r = checkFillEligibility(eligibleRow({ math_notation_status: "ambiguous_repair" }));
    expect(r.reason).toBe("math_notation_ambiguous_repair");
  });

  it("math_notation_status=unrepairable_from_source → blocked", () => {
    const r = checkFillEligibility(
      eligibleRow({ math_notation_status: "unrepairable_from_source" })
    );
    expect(r.reason).toBe("math_notation_unrepairable_from_source");
  });

  it("math_notation_status=verified_auto_repair → ELIGIBLE", () => {
    const r = checkFillEligibility(eligibleRow({ math_notation_status: "verified_auto_repair" }));
    expect(r.eligible).toBe(true);
  });
});

describe("checkFillEligibility — VERIFICATION (Phase 6) blockers", () => {
  it("publish_status=blocked_answer_dispute → blocked", () => {
    const r = checkFillEligibility(eligibleRow({ publish_status: "blocked_answer_dispute" }));
    expect(r.reason).toBe("blocked_answer_dispute");
  });

  it("answer_verification_status=model_consensus_disagrees_with_key → blocked", () => {
    const r = checkFillEligibility(
      eligibleRow({ answer_verification_status: "model_consensus_disagrees_with_key" })
    );
    expect(r.reason).toBe("verification_model_consensus_disagrees_with_key");
  });

  it("answer_verification_status=escalation_disagrees → blocked", () => {
    const r = checkFillEligibility(
      eligibleRow({ answer_verification_status: "escalation_disagrees" })
    );
    expect(r.reason).toBe("verification_escalation_disagrees");
  });

  it("answer_verification_status=unanswerable → blocked", () => {
    const r = checkFillEligibility(eligibleRow({ answer_verification_status: "unanswerable" }));
    expect(r.reason).toBe("verification_unanswerable");
  });

  it("answer_verification_status=verifier_error → blocked", () => {
    const r = checkFillEligibility(eligibleRow({ answer_verification_status: "verifier_error" }));
    expect(r.reason).toBe("verification_verifier_error");
  });

  it("answer_verification_status=verified_panel → ELIGIBLE", () => {
    const r = checkFillEligibility(eligibleRow({ answer_verification_status: "verified_panel" }));
    expect(r.eligible).toBe(true);
  });
});

describe("checkFillEligibility — KATEX / SLUG blockers", () => {
  it("publish_status=blocked_katex_error → blocked", () => {
    const r = checkFillEligibility(eligibleRow({ publish_status: "blocked_katex_error" }));
    expect(r.reason).toBe("blocked_katex_error");
  });

  it("publish_status=blocked_slug_uncertain → blocked", () => {
    const r = checkFillEligibility(eligibleRow({ publish_status: "blocked_slug_uncertain" }));
    expect(r.reason).toBe("blocked_slug_uncertain");
  });
});

describe("categorizeReason", () => {
  it("groups reasons into the expected high-level categories", () => {
    expect(categorizeReason(null)).toBe(ELIGIBILITY_CATEGORIES.ELIGIBLE);
    expect(categorizeReason("corrupt_question")).toBe(ELIGIBILITY_CATEGORIES.STRUCTURAL);
    expect(categorizeReason("missing_mc_choices")).toBe(ELIGIBILITY_CATEGORIES.STRUCTURAL);
    expect(categorizeReason("missing_answer_key")).toBe(ELIGIBILITY_CATEGORIES.ANSWER_KEY);
    expect(categorizeReason("answer_key_correction_unclear")).toBe(
      ELIGIBILITY_CATEGORIES.ANSWER_KEY
    );
    expect(categorizeReason("missing_required_visual")).toBe(ELIGIBILITY_CATEGORIES.SOURCE);
    expect(categorizeReason("math_notation_ambiguous_repair")).toBe(
      ELIGIBILITY_CATEGORIES.MATH_NOTATION
    );
    expect(categorizeReason("blocked_answer_dispute")).toBe(ELIGIBILITY_CATEGORIES.VERIFICATION);
    expect(categorizeReason("verification_escalation_disagrees")).toBe(
      ELIGIBILITY_CATEGORIES.VERIFICATION
    );
    expect(categorizeReason("blocked_katex_error")).toBe(ELIGIBILITY_CATEGORIES.KATEX_SLUG);
  });
});
