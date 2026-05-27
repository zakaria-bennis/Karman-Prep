// @vitest-environment node
//
// Unit tests for the Phase 5 risk-tier classifier + 8-condition
// auto-repair gate in scripts/lib/math-notation-logic.mjs.
//
// These are the safety-critical tests. The gate IS the policy —
// every condition that fails sends the repair to human review.
// The tests stage every combination of inputs the gate sees:
//   · tier hard-stops (visual_unclear, open_ended, medium grouping)
//   · all 8 low-risk conditions
//   · rollUpQuestionStatus tie-breaking

import { describe, expect, it } from "vitest";
import { RISK_TIERS } from "../../../scripts/lib/math-notation-patterns.mjs";
import {
  REPAIR_STATUSES,
  VISION_CONFIDENCE_FLOOR,
  MIN_SOLVER_AGREEMENT,
  refineRiskTier,
  evaluateAutoRepairGate,
  rollUpQuestionStatus,
  buildRepairRecord,
} from "../../../scripts/lib/math-notation-logic.mjs";

// Reusable "all green" gate input — every test mutates one field
// to assert the gate correctly fails when that field is wrong.
function allGreenInput() {
  return {
    refinedTier: RISK_TIERS.LOW_RISK_OCR,
    rawText: "x2 + 1",
    repairedText: "x^2 + 1",
    visualConfirmed: true,
    visualConfirmationConfidence: 0.97,
    solverAgreementCount: 2,
    changesVerifiedAnswer: false,
    createsAnswerKeyDispute: false,
    isOpenEndedAmbiguous: false,
  };
}

describe("module identity — mirrors migration enums", () => {
  it("exposes all 5 statuses with matching string values", () => {
    expect(REPAIR_STATUSES.NO_REPAIR_NEEDED).toBe("no_repair_needed");
    expect(REPAIR_STATUSES.VERIFIED_AUTO_REPAIR).toBe("verified_auto_repair");
    expect(REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW).toBe("suggested_repair_needs_review");
    expect(REPAIR_STATUSES.AMBIGUOUS_REPAIR).toBe("ambiguous_repair");
    expect(REPAIR_STATUSES.UNREPAIRABLE_FROM_SOURCE).toBe("unrepairable_from_source");
  });

  it("freezes the 0.95 vision floor and 2-solver minimum", () => {
    expect(VISION_CONFIDENCE_FLOOR).toBe(0.95);
    expect(MIN_SOLVER_AGREEMENT).toBe(2);
  });
});

describe("refineRiskTier — tier escalation only", () => {
  it("passes a low-risk detection through unchanged for multiple_choice", () => {
    const tier = refineRiskTier({
      detection: { risk_tier: RISK_TIERS.LOW_RISK_OCR },
      question: { answer_format: "multiple_choice" },
    });
    expect(tier).toBe(RISK_TIERS.LOW_RISK_OCR);
  });

  it("bumps any tier to open_ended_uncertain on numeric_entry", () => {
    const tier = refineRiskTier({
      detection: { risk_tier: RISK_TIERS.LOW_RISK_OCR },
      question: { answer_format: "numeric_entry" },
    });
    expect(tier).toBe(RISK_TIERS.OPEN_ENDED_UNCERTAIN);
  });

  it("bumps to visual_unclear when vision says unclear=true", () => {
    const tier = refineRiskTier({
      detection: { risk_tier: RISK_TIERS.LOW_RISK_OCR },
      question: { answer_format: "multiple_choice" },
      visionResult: { confirmed: false, confidence: 0, unclear: true },
    });
    expect(tier).toBe(RISK_TIERS.VISUAL_UNCLEAR);
  });

  it("when both numeric_entry AND unclear, picks the most restrictive (visual_unclear)", () => {
    const tier = refineRiskTier({
      detection: { risk_tier: RISK_TIERS.LOW_RISK_OCR },
      question: { answer_format: "numeric_entry" },
      visionResult: { confirmed: false, confidence: 0, unclear: true },
    });
    expect(tier).toBe(RISK_TIERS.VISUAL_UNCLEAR);
  });

  it("never lowers a tier — medium stays medium", () => {
    const tier = refineRiskTier({
      detection: { risk_tier: RISK_TIERS.MEDIUM_RISK_GROUPING },
      question: { answer_format: "multiple_choice" },
    });
    expect(tier).toBe(RISK_TIERS.MEDIUM_RISK_GROUPING);
  });
});

describe("evaluateAutoRepairGate — hard-stop tiers", () => {
  it("visual_unclear → unrepairable_from_source regardless of other inputs", () => {
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      refinedTier: RISK_TIERS.VISUAL_UNCLEAR,
    });
    expect(result.status).toBe(REPAIR_STATUSES.UNREPAIRABLE_FROM_SOURCE);
  });

  it("open_ended_uncertain → ambiguous_repair regardless of other inputs", () => {
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      refinedTier: RISK_TIERS.OPEN_ENDED_UNCERTAIN,
    });
    expect(result.status).toBe(REPAIR_STATUSES.AMBIGUOUS_REPAIR);
  });

  it("high_risk_answer_changing → ambiguous_repair (blocked)", () => {
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      refinedTier: RISK_TIERS.HIGH_RISK_ANSWER_CHANGING,
    });
    expect(result.status).toBe(REPAIR_STATUSES.AMBIGUOUS_REPAIR);
  });

  it("medium_risk_grouping → suggested_repair_needs_review (always reviewed)", () => {
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      refinedTier: RISK_TIERS.MEDIUM_RISK_GROUPING,
    });
    // This is the policy enforcement: medium tier never auto-applies.
    expect(result.status).toBe(REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW);
  });
});

describe("evaluateAutoRepairGate — low_risk 8-condition gate", () => {
  it("all 8 conditions green → verified_auto_repair", () => {
    const result = evaluateAutoRepairGate(allGreenInput());
    expect(result.status).toBe(REPAIR_STATUSES.VERIFIED_AUTO_REPAIR);
    expect(result.failed_conditions).toEqual([]);
  });

  it("condition 2 fail — visualConfirmed=false → review", () => {
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      visualConfirmed: false,
    });
    expect(result.status).toBe(REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW);
    expect(result.failed_conditions).toContain("not_visual_confirmed");
  });

  it("condition 3 fail — vision confidence below floor → review", () => {
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      visualConfirmationConfidence: 0.8,
    });
    expect(result.status).toBe(REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW);
    expect(
      result.failed_conditions.some((c: string) => c.startsWith("vision_confidence_below"))
    ).toBe(true);
  });

  it("condition 4 fail — solver agreement below 2 → review", () => {
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      solverAgreementCount: 1,
    });
    expect(result.status).toBe(REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW);
    expect(
      result.failed_conditions.some((c: string) => c.startsWith("solver_agreement_below"))
    ).toBe(true);
  });

  it("condition 5 fail — changesVerifiedAnswer=true → review", () => {
    // This is the user's key policy: even high-confidence repairs that
    // change the answer-key answer must NOT auto-apply, because the
    // model might be hunting for an answer that 'works'.
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      changesVerifiedAnswer: true,
    });
    expect(result.status).toBe(REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW);
    expect(result.failed_conditions).toContain("changes_verified_answer");
  });

  it("condition 6 fail — createsAnswerKeyDispute=true → review", () => {
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      createsAnswerKeyDispute: true,
    });
    expect(result.failed_conditions).toContain("creates_answer_key_dispute");
  });

  it("condition 7 fail — isOpenEndedAmbiguous=true → review", () => {
    // Belt-and-suspenders — refineRiskTier should have escalated this
    // to OPEN_ENDED_UNCERTAIN tier first, but if the caller passes
    // refinedTier=LOW_RISK with the flag set, the gate still catches it.
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      isOpenEndedAmbiguous: true,
    });
    expect(result.failed_conditions).toContain("open_ended_ambiguous");
  });

  it("condition 8 fail — rawText == repairedText → review (noop)", () => {
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      rawText: "x^2 + 1",
      repairedText: "x^2 + 1",
    });
    expect(result.failed_conditions).toContain("repair_is_noop");
  });

  it("multiple failures stack — all listed in failed_conditions", () => {
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      visualConfirmed: false,
      solverAgreementCount: 0,
      changesVerifiedAnswer: true,
    });
    expect(result.failed_conditions.length).toBeGreaterThanOrEqual(3);
    expect(result.failed_conditions).toContain("not_visual_confirmed");
    expect(result.failed_conditions).toContain("changes_verified_answer");
  });

  it("missing/NaN numeric inputs count as failures", () => {
    const result = evaluateAutoRepairGate({
      ...allGreenInput(),
      visualConfirmationConfidence: NaN,
      solverAgreementCount: undefined as unknown as number,
    });
    expect(result.status).toBe(REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW);
  });
});

describe("rollUpQuestionStatus — most-restrictive wins", () => {
  it("[] → no_repair_needed", () => {
    expect(rollUpQuestionStatus([])).toBe(REPAIR_STATUSES.NO_REPAIR_NEEDED);
  });

  it("all no_repair_needed → no_repair_needed", () => {
    expect(
      rollUpQuestionStatus([REPAIR_STATUSES.NO_REPAIR_NEEDED, REPAIR_STATUSES.NO_REPAIR_NEEDED])
    ).toBe(REPAIR_STATUSES.NO_REPAIR_NEEDED);
  });

  it("verified beats no_repair", () => {
    expect(
      rollUpQuestionStatus([REPAIR_STATUSES.NO_REPAIR_NEEDED, REPAIR_STATUSES.VERIFIED_AUTO_REPAIR])
    ).toBe(REPAIR_STATUSES.VERIFIED_AUTO_REPAIR);
  });

  it("suggested beats verified", () => {
    expect(
      rollUpQuestionStatus([
        REPAIR_STATUSES.VERIFIED_AUTO_REPAIR,
        REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW,
      ])
    ).toBe(REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW);
  });

  it("ambiguous beats suggested", () => {
    expect(
      rollUpQuestionStatus([
        REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW,
        REPAIR_STATUSES.AMBIGUOUS_REPAIR,
      ])
    ).toBe(REPAIR_STATUSES.AMBIGUOUS_REPAIR);
  });

  it("unrepairable_from_source is the most-restrictive (always wins)", () => {
    expect(
      rollUpQuestionStatus([
        REPAIR_STATUSES.AMBIGUOUS_REPAIR,
        REPAIR_STATUSES.UNREPAIRABLE_FROM_SOURCE,
        REPAIR_STATUSES.VERIFIED_AUTO_REPAIR,
      ])
    ).toBe(REPAIR_STATUSES.UNREPAIRABLE_FROM_SOURCE);
  });
});

describe("buildRepairRecord — DB insert payload shape", () => {
  it("returns an insertable shape with required columns", () => {
    const r = buildRepairRecord({
      questionId: "qid-1",
      field: "question_text",
      rawText: "x2 + 1",
      repairedText: "x^2 + 1",
      riskTier: RISK_TIERS.LOW_RISK_OCR,
      detectionPattern: "bare_digit_after_letter",
      visualConfirmed: true,
      visualConfirmationConfidence: 0.97,
      solverAgreementCount: 2,
      changesVerifiedAnswer: false,
      createsAnswerKeyDispute: false,
      isOpenEndedAmbiguous: false,
      status: REPAIR_STATUSES.VERIFIED_AUTO_REPAIR,
      appliedAt: "2026-05-27T03:00:00Z",
      rawMetadata: { version: "phase5_math_repair_v1" },
    });
    expect(r.question_id).toBe("qid-1");
    expect(r.field).toBe("question_text");
    expect(r.risk_tier).toBe("low_risk_ocr");
    expect(r.status).toBe("verified_auto_repair");
    expect(r.applied_at).toBe("2026-05-27T03:00:00Z");
    expect(r.raw_metadata).toEqual({ version: "phase5_math_repair_v1" });
  });

  it("nulls out non-finite numeric inputs (no NaN in DB)", () => {
    const r = buildRepairRecord({
      questionId: "qid-1",
      field: "question_text",
      rawText: "x2",
      repairedText: "x^2",
      riskTier: RISK_TIERS.LOW_RISK_OCR,
      visualConfirmed: null as unknown as boolean,
      visualConfirmationConfidence: NaN,
      solverAgreementCount: undefined as unknown as number,
      changesVerifiedAnswer: null as unknown as boolean,
      createsAnswerKeyDispute: null as unknown as boolean,
      isOpenEndedAmbiguous: null as unknown as boolean,
      status: REPAIR_STATUSES.SUGGESTED_REPAIR_NEEDS_REVIEW,
    });
    expect(r.visual_confirmed).toBeNull();
    expect(r.visual_confirmation_confidence).toBeNull();
    expect(r.solver_agreement_count).toBeNull();
    expect(r.changes_verified_answer).toBeNull();
    expect(r.creates_answer_key_dispute).toBeNull();
    expect(r.is_open_ended_ambiguous).toBeNull();
  });

  it("defaults rawMetadata to {} when not provided", () => {
    const r = buildRepairRecord({
      questionId: "qid-1",
      field: "question_text",
      rawText: "x2",
      repairedText: "x^2",
      riskTier: RISK_TIERS.LOW_RISK_OCR,
      status: REPAIR_STATUSES.NO_REPAIR_NEEDED,
    });
    expect(r.raw_metadata).toEqual({});
    expect(r.applied_at).toBeNull();
    expect(r.field_index).toBeNull();
  });
});
