// @vitest-environment node
//
// Sanity tests for the Phase 6 typed enums in
// scripts/lib/grader-roles.mjs. These mirror the strings written
// to DB columns + grader_runs rows — any drift here means a
// silent app-vs-DB mismatch.

import { describe, expect, it } from "vitest";
import {
  PHASE6_VERIFIER_VERSION,
  GRADER_ROLES,
  PASS1_ROLES,
  ROLE_PROVIDERS,
  ROLE_MODELS,
  DISPUTE_CATEGORIES,
  ESCALATION_PATHS,
  VERIFIER_STATUSES,
  VISUAL_INPUT_PREFERENCE,
  VISUAL_INPUT_PREFERENCE_NOTATION,
} from "../../../scripts/lib/grader-roles.mjs";

describe("phase 6 module identity", () => {
  it("exposes the version sentinel used in answer_verifier_version", () => {
    expect(PHASE6_VERIFIER_VERSION).toBe("phase6_answer_verification_v1");
  });
});

describe("GRADER_ROLES — 6 typed roles", () => {
  it("matches the strings the DB verify script asserts", () => {
    expect(GRADER_ROLES.DEEPSEEK_PRIMARY).toBe("deepseek_primary_solver");
    expect(GRADER_ROLES.GROQ_INDEPENDENT).toBe("groq_independent_solver");
    expect(GRADER_ROLES.GEMINI_FLASH_VISUAL).toBe("gemini_flash_visual_checker");
    expect(GRADER_ROLES.GEMINI_PRO_VISUAL).toBe("gemini_pro_visual_escalation");
    expect(GRADER_ROLES.CLAUDE_OPUS_REASONING).toBe("claude_opus_reasoning_arbiter");
    expect(GRADER_ROLES.SYMPY_EQUIVALENCE).toBe("sympy_equivalence_checker");
  });

  it("PASS1_ROLES is exactly the 3-voter panel", () => {
    expect(PASS1_ROLES).toEqual([
      "deepseek_primary_solver",
      "groq_independent_solver",
      "gemini_flash_visual_checker",
    ]);
  });

  it("every role has a registered provider + model", () => {
    for (const r of Object.values(GRADER_ROLES)) {
      expect(ROLE_PROVIDERS[r]).toBeTruthy();
      expect(ROLE_MODELS[r]).toBeTruthy();
    }
  });
});

describe("DISPUTE_CATEGORIES — 7 typed dispute kinds + none", () => {
  it("matches the user's policy enumeration", () => {
    expect(DISPUTE_CATEGORIES.NONE).toBe("none");
    expect(DISPUTE_CATEGORIES.ANSWER_KEY_DISPUTE).toBe("answer_key_dispute");
    expect(DISPUTE_CATEGORIES.VISUAL_DISPUTE).toBe("visual_dispute");
    expect(DISPUTE_CATEGORIES.MATH_NOTATION_DISPUTE).toBe("math_notation_dispute");
    expect(DISPUTE_CATEGORIES.MATH_EQUIVALENCE_DISPUTE).toBe("math_equivalence_dispute");
    expect(DISPUTE_CATEGORIES.RW_REASONING_DISPUTE).toBe("rw_reasoning_dispute");
    expect(DISPUTE_CATEGORIES.UNANSWERABLE_QUESTION).toBe("unanswerable_question");
    expect(DISPUTE_CATEGORIES.EXTRACTION_ERROR).toBe("extraction_error");
  });
});

describe("ESCALATION_PATHS", () => {
  it("exposes pro / opus / both / sympy_first / human_review_only", () => {
    expect(ESCALATION_PATHS.PRO).toBe("pro");
    expect(ESCALATION_PATHS.OPUS).toBe("opus");
    expect(ESCALATION_PATHS.BOTH).toBe("both");
    expect(ESCALATION_PATHS.SYMPY_FIRST).toBe("sympy_first");
    expect(ESCALATION_PATHS.HUMAN_REVIEW_ONLY).toBe("human_review_only");
  });
});

describe("VERIFIER_STATUSES", () => {
  it("includes the Phase 6 statuses Phase 6 gates read", () => {
    expect(VERIFIER_STATUSES.VERIFIED_PANEL).toBe("verified_panel");
    expect(VERIFIER_STATUSES.VERIFIED_PRO).toBe("verified_pro");
    expect(VERIFIER_STATUSES.VERIFIED_OPUS).toBe("verified_opus");
    expect(VERIFIER_STATUSES.VERIFIED_SYMPY).toBe("verified_sympy");
    expect(VERIFIER_STATUSES.MODEL_CONSENSUS_DISAGREES_WITH_KEY).toBe(
      "model_consensus_disagrees_with_key"
    );
    expect(VERIFIER_STATUSES.ESCALATION_DISAGREES).toBe("escalation_disagrees");
    expect(VERIFIER_STATUSES.PANEL_SPLIT).toBe("panel_split");
    expect(VERIFIER_STATUSES.SYMPY_INCONCLUSIVE).toBe("sympy_inconclusive");
    expect(VERIFIER_STATUSES.UNANSWERABLE).toBe("unanswerable");
    expect(VERIFIER_STATUSES.VERIFIER_ERROR).toBe("verifier_error");
  });
});

describe("VISUAL_INPUT_PREFERENCE — fallback chain", () => {
  it("defaults to expanded_question_crop first", () => {
    expect(VISUAL_INPUT_PREFERENCE[0]).toBe("expanded_question_crop");
    expect(VISUAL_INPUT_PREFERENCE).toContain("question_crop");
    expect(VISUAL_INPUT_PREFERENCE).toContain("page_image");
  });

  it("notation-check preference puts tight crop first", () => {
    expect(VISUAL_INPUT_PREFERENCE_NOTATION[0]).toBe("question_crop");
    expect(VISUAL_INPUT_PREFERENCE_NOTATION).toContain("expanded_question_crop");
  });
});
