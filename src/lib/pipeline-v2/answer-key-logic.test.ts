// ============================================================
// Unit tests for the answer-key correction state machine.
//
// These tests pin the §6 rules from
// docs/ingestion/pipeline-v2-redesign-plan.md.
//
// Logic lives in scripts/lib/answer-key-logic.mjs.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  selectOfficialAnswerFromEntry,
  answerVerificationStatus,
  CORRECTION_CONFIDENCE_THRESHOLDS,
} from "../../../scripts/lib/answer-key-logic.mjs";

// Convenience factory.
function entry(overrides: Record<string, unknown> = {}) {
  return {
    printed_answer: "B",
    printed_answer_confidence: 0.95,
    printed_answer_crossed_out: false,
    printed_answer_crossed_out_confidence: 0.95,
    manual_correction_present: false,
    manual_correction_color: null,
    manual_correction_answer: null,
    manual_correction_confidence: 0,
    ...overrides,
  };
}

describe("selectOfficialAnswerFromEntry — §6.1 printed only", () => {
  it("clean printed answer → printed_key_used_no_correction", () => {
    const v = selectOfficialAnswerFromEntry(entry());
    expect(v.selected_official_answer).toBe("B");
    expect(v.status).toBe("printed_key_used_no_correction");
    expect(v.quiz_status).toBe("printed_key_used_no_correction");
    expect(v.review_required).toBe(false);
  });
});

describe("selectOfficialAnswerFromEntry — §6.2 crossed out + correction readable", () => {
  it("high-confidence correction → corrected_key_verified, no review", () => {
    const v = selectOfficialAnswerFromEntry(
      entry({
        printed_answer: "B",
        printed_answer_crossed_out: true,
        printed_answer_crossed_out_confidence: 0.95,
        manual_correction_present: true,
        manual_correction_color: "red",
        manual_correction_answer: "D",
        manual_correction_confidence: 0.95,
      })
    );
    expect(v.selected_official_answer).toBe("D");
    expect(v.status).toBe("corrected_key_verified");
    expect(v.quiz_status).toBe("corrected_key_verified");
    expect(v.review_required).toBe(false);
  });

  it("medium-confidence correction → corrected_key_verified, review required", () => {
    const v = selectOfficialAnswerFromEntry(
      entry({
        printed_answer: "B",
        printed_answer_crossed_out: true,
        printed_answer_crossed_out_confidence: 0.9,
        manual_correction_present: true,
        manual_correction_answer: "D",
        manual_correction_confidence: 0.8, // between medium and high
      })
    );
    expect(v.selected_official_answer).toBe("D");
    expect(v.status).toBe("corrected_key_verified");
    expect(v.review_required).toBe(true);
  });
});

describe("selectOfficialAnswerFromEntry — §6.3 correction present, NOT crossed out", () => {
  it("high-confidence correction → corrected_key_verified, review required", () => {
    const v = selectOfficialAnswerFromEntry(
      entry({
        printed_answer: "A",
        printed_answer_crossed_out: false,
        manual_correction_present: true,
        manual_correction_answer: "C",
        manual_correction_confidence: 0.95,
      })
    );
    expect(v.selected_official_answer).toBe("C");
    expect(v.status).toBe("corrected_key_verified");
    expect(v.review_required).toBe(true);
    expect(v.review_reason).toMatch(/not visibly crossed out/);
  });

  it("medium-confidence correction → pending_verification", () => {
    const v = selectOfficialAnswerFromEntry(
      entry({
        printed_answer: "A",
        manual_correction_present: true,
        manual_correction_answer: "C",
        manual_correction_confidence: 0.8,
      })
    );
    expect(v.selected_official_answer).toBe("C");
    expect(v.status).toBe("manual_correction_selected_pending_verification");
    expect(v.quiz_status).toBe("correction_unclear");
    expect(v.review_required).toBe(true);
  });

  it("low-confidence (unreadable) correction → default to printed, unclear", () => {
    const v = selectOfficialAnswerFromEntry(
      entry({
        printed_answer: "A",
        manual_correction_present: true,
        manual_correction_answer: null,
        manual_correction_confidence: 0.4,
      })
    );
    expect(v.selected_official_answer).toBe("A"); // fall back to printed
    expect(v.status).toBe("correction_unclear");
    expect(v.review_required).toBe(true);
  });
});

describe("selectOfficialAnswerFromEntry — §6.4 crossed out, correction unreadable", () => {
  it("crossed-out + no readable correction → null + cross-out status", () => {
    const v = selectOfficialAnswerFromEntry(
      entry({
        printed_answer: "A",
        printed_answer_crossed_out: true,
        printed_answer_crossed_out_confidence: 0.95,
        manual_correction_present: true,
        manual_correction_answer: null,
        manual_correction_confidence: 0.3,
      })
    );
    expect(v.selected_official_answer).toBeNull();
    expect(v.status).toBe("printed_key_crossed_out_no_readable_replacement");
    expect(v.quiz_status).toBe("unverifiable");
    expect(v.review_required).toBe(true);
  });
});

describe("selectOfficialAnswerFromEntry — missing answer", () => {
  it("no printed answer at all → missing_answer_key", () => {
    const v = selectOfficialAnswerFromEntry(
      entry({ printed_answer: null, printed_answer_confidence: 0.1 })
    );
    expect(v.selected_official_answer).toBeNull();
    expect(v.status).toBe("missing_answer_key");
    expect(v.quiz_status).toBe("missing_answer_key");
    expect(v.review_required).toBe(true);
  });
});

describe("selectOfficialAnswerFromEntry — uncertain cross-out (no correction)", () => {
  it("cross-out medium confidence → review_required, printed kept", () => {
    const v = selectOfficialAnswerFromEntry(
      entry({
        printed_answer: "B",
        printed_answer_confidence: 0.95,
        printed_answer_crossed_out: true,
        printed_answer_crossed_out_confidence: 0.7,
      })
    );
    expect(v.selected_official_answer).toBe("B");
    expect(v.status).toBe("correction_unclear");
    expect(v.review_required).toBe(true);
    // Confidence is discounted to reflect the uncertainty
    expect(v.selected_confidence).toBeLessThan(0.95);
  });
});

describe("answerVerificationStatus", () => {
  it("solver matches selected → verified", () => {
    expect(
      answerVerificationStatus({
        solverVote: "B",
        selectedOfficial: "B",
        verdict: "verified",
      })
    ).toBe("verified");
  });

  it("solver matches via verified_opus → verified_opus", () => {
    expect(
      answerVerificationStatus({
        solverVote: "B",
        selectedOfficial: "B",
        verdict: "verified_opus",
      })
    ).toBe("verified_opus");
  });

  it("solver disagrees → disputed", () => {
    expect(
      answerVerificationStatus({
        solverVote: "C",
        selectedOfficial: "B",
        verdict: "likely_wrong",
      })
    ).toBe("disputed");
  });

  it("missing selected → unverifiable", () => {
    expect(
      answerVerificationStatus({
        solverVote: "B",
        selectedOfficial: null,
        verdict: "verified",
      })
    ).toBe("unverifiable");
  });

  it("case-insensitive letter compare", () => {
    expect(
      answerVerificationStatus({
        solverVote: "b",
        selectedOfficial: "B",
        verdict: "verified",
      })
    ).toBe("verified");
  });
});

describe("threshold values match spec §7", () => {
  it("correction_high >= 0.90", () => {
    expect(CORRECTION_CONFIDENCE_THRESHOLDS.correction_high).toBeGreaterThanOrEqual(0.9);
  });
  it("crossout_high >= 0.85", () => {
    expect(CORRECTION_CONFIDENCE_THRESHOLDS.crossout_high).toBeGreaterThanOrEqual(0.85);
  });
});
