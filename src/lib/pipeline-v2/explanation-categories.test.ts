// @vitest-environment node
//
// Sanity tests for the Phase 7 enum module.

import { describe, expect, it } from "vitest";
import {
  EXPLANATION_V2_VERSION,
  EXPLANATION_V2_STATUSES,
  STATUSES_BLOCKING_PUBLISH,
  STATUSES_PUBLISH_READY,
  INTERNAL_CATEGORIES,
  INTERNAL_CATEGORY_VALUES,
  isValidInternalCategory,
} from "../../../scripts/lib/explanation-categories.mjs";

describe("EXPLANATION_V2_VERSION", () => {
  it("matches the version we write to the JSONB bundle", () => {
    expect(EXPLANATION_V2_VERSION).toBe("explanation_v2_v1");
  });
});

describe("EXPLANATION_V2_STATUSES — 7 statuses", () => {
  it("has the seven expected values", () => {
    expect(EXPLANATION_V2_STATUSES.NOT_STARTED).toBe("not_started");
    expect(EXPLANATION_V2_STATUSES.SKIPPED_NOT_ELIGIBLE).toBe("skipped_not_eligible");
    expect(EXPLANATION_V2_STATUSES.GENERATED).toBe("generated");
    expect(EXPLANATION_V2_STATUSES.QA_PASSED).toBe("qa_passed");
    expect(EXPLANATION_V2_STATUSES.QA_FAILED).toBe("qa_failed");
    expect(EXPLANATION_V2_STATUSES.NEEDS_HUMAN_REVIEW).toBe("needs_human_review");
    expect(EXPLANATION_V2_STATUSES.STALE_ANSWER_CHANGED).toBe("stale_answer_changed");
  });

  it("STATUSES_BLOCKING_PUBLISH contains exactly the 4 publish-blockers", () => {
    // The .has() set is narrowly typed (union of the 4 blocker
    // strings); cast through Set<string> to probe with values
    // outside that union (the assertion is that they DON'T match).
    const set = STATUSES_BLOCKING_PUBLISH as ReadonlySet<string>;
    expect(set.has("skipped_not_eligible")).toBe(true);
    expect(set.has("qa_failed")).toBe(true);
    expect(set.has("needs_human_review")).toBe(true);
    expect(set.has("stale_answer_changed")).toBe(true);
    expect(set.has("qa_passed")).toBe(false);
    expect(set.has("generated")).toBe(false);
  });

  it("STATUSES_PUBLISH_READY contains only qa_passed", () => {
    const set = STATUSES_PUBLISH_READY as ReadonlySet<string>;
    expect(set.has("qa_passed")).toBe(true);
    expect(set.size).toBe(1);
  });
});

describe("INTERNAL_CATEGORIES — 11 analytics labels + null support", () => {
  it("matches the user's enumeration verbatim", () => {
    const expected = [
      "unsupported_inference",
      "too_broad",
      "too_narrow",
      "wrong_relationship",
      "grammar_mismatch",
      "transition_mismatch",
      "irrelevant_detail",
      "calculation_error",
      "sign_error",
      "no_clear_trap",
      "other",
    ];
    expect([...INTERNAL_CATEGORY_VALUES].sort()).toEqual([...expected].sort());
  });

  it("isValidInternalCategory accepts null (key user policy)", () => {
    expect(isValidInternalCategory(null)).toBe(true);
    expect(isValidInternalCategory(undefined)).toBe(true);
  });

  it("isValidInternalCategory accepts every enum value", () => {
    for (const v of INTERNAL_CATEGORY_VALUES) {
      expect(isValidInternalCategory(v)).toBe(true);
    }
  });

  it("isValidInternalCategory rejects unknown values", () => {
    expect(isValidInternalCategory("not_a_category")).toBe(false);
    expect(isValidInternalCategory("")).toBe(false);
    expect(isValidInternalCategory("TOO_BROAD")).toBe(false); // case-sensitive
  });

  it("exposes the canonical analytics labels", () => {
    expect(INTERNAL_CATEGORIES.UNSUPPORTED_INFERENCE).toBe("unsupported_inference");
    expect(INTERNAL_CATEGORIES.NO_CLEAR_TRAP).toBe("no_clear_trap");
    expect(INTERNAL_CATEGORIES.OTHER).toBe("other");
  });
});
