// @vitest-environment node
//
// Unit tests for the Phase 7 deterministic schema validator in
// scripts/lib/explanation-schema.mjs.

import { describe, expect, it } from "vitest";
import {
  validateExplanationV2,
  requiredFieldsFor,
} from "../../../scripts/lib/explanation-schema.mjs";
import { EXPLANATION_V2_VERSION } from "../../../scripts/lib/explanation-categories.mjs";

function rwMcBundle(overrides: Record<string, unknown> = {}) {
  return {
    version: EXPLANATION_V2_VERSION,
    generated_at: "2026-05-27T20:00:00Z",
    generator_role: "explanation_v2_generator_sonnet",
    generator_model: "claude-sonnet-4-6",
    status: "generated",
    correct_reasoning: "The verified answer is correct because…",
    choices: {
      A: { explanation: "a", evidence: "ea", misconception_note: null, internal_category: null },
      B: { explanation: "b", evidence: "eb", misconception_note: null, internal_category: null },
      C: { explanation: "c", evidence: "ec", misconception_note: null, internal_category: null },
      D: { explanation: "d", evidence: "ed", misconception_note: null, internal_category: null },
    },
    normal_tip: null,
    desmos_tip: null,
    slug_alignment: { slug: "transitions", confidence: 0.9, reason: "The question…" },
    ...overrides,
  };
}

function mathMcBundle(overrides: Record<string, unknown> = {}) {
  return {
    version: EXPLANATION_V2_VERSION,
    generated_at: "2026-05-27T20:00:00Z",
    generator_role: "explanation_v2_generator_sonnet",
    generator_model: "claude-sonnet-4-6",
    status: "generated",
    correct_reasoning: "Solve 2x+3=11 → x=4.",
    choices: {
      A: { explanation: "a", evidence: "", misconception_note: null, internal_category: null },
      B: { explanation: "b", evidence: "", misconception_note: null, internal_category: null },
      C: { explanation: "c", evidence: "", misconception_note: null, internal_category: null },
      D: { explanation: "d", evidence: "", misconception_note: null, internal_category: null },
    },
    normal_tip: null,
    desmos_tip: null,
    ...overrides,
  };
}

function mathNumericBundle(overrides: Record<string, unknown> = {}) {
  return {
    version: EXPLANATION_V2_VERSION,
    generated_at: "2026-05-27T20:00:00Z",
    generator_role: "explanation_v2_generator_sonnet",
    generator_model: "claude-sonnet-4-6",
    status: "generated",
    correct_reasoning: "Solve 2x+3=11 → x=4.",
    normal_tip: null,
    desmos_tip: null,
    acceptable_forms: ["4", "4.0"],
    ...overrides,
  };
}

describe("validateExplanationV2 — R&W MC happy path", () => {
  it("complete R&W MC bundle passes", () => {
    const r = validateExplanationV2(rwMcBundle(), {
      subject: "reading",
      answer_format: "multiple_choice",
    });
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
    expect(r.invalid).toEqual([]);
  });

  it("missing slug_alignment fails", () => {
    const r = validateExplanationV2(rwMcBundle({ slug_alignment: undefined }), {
      subject: "reading",
      answer_format: "multiple_choice",
    });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain("slug_alignment");
  });

  it("R&W choice missing evidence → fail", () => {
    const bundle = rwMcBundle();
    (bundle.choices as Record<string, unknown>).A = {
      explanation: "x",
      evidence: "",
      misconception_note: null,
      internal_category: null,
    };
    const r = validateExplanationV2(bundle, {
      subject: "reading",
      answer_format: "multiple_choice",
    });
    expect(r.missing).toContain("choices.A.evidence");
  });

  it("invalid internal_category → fail", () => {
    const bundle = rwMcBundle();
    (bundle.choices as Record<string, unknown>).A = {
      explanation: "x",
      evidence: "y",
      misconception_note: null,
      internal_category: "not_a_real_category",
    };
    const r = validateExplanationV2(bundle, {
      subject: "reading",
      answer_format: "multiple_choice",
    });
    expect(r.ok).toBe(false);
    expect(r.invalid.some((s) => s.includes("internal_category"))).toBe(true);
  });

  it("slug_alignment.confidence out of [0,1] → invalid", () => {
    const r = validateExplanationV2(
      rwMcBundle({ slug_alignment: { slug: "x", confidence: 1.5, reason: "y" } }),
      { subject: "reading", answer_format: "multiple_choice" }
    );
    expect(r.invalid.some((s) => s.includes("confidence"))).toBe(true);
  });
});

describe("validateExplanationV2 — Math MC happy path", () => {
  it("Math MC bundle passes without slug_alignment requirement", () => {
    const r = validateExplanationV2(mathMcBundle(), {
      subject: "math",
      answer_format: "multiple_choice",
    });
    expect(r.ok).toBe(true);
  });

  it("Math MC choice doesn't require evidence", () => {
    // Already enforced — mathMcBundle has evidence:"" and passes.
    const r = validateExplanationV2(mathMcBundle(), {
      subject: "math",
      answer_format: "multiple_choice",
    });
    expect(r.ok).toBe(true);
  });
});

describe("validateExplanationV2 — Math numeric_entry", () => {
  it("numeric_entry bundle with acceptable_forms passes", () => {
    const r = validateExplanationV2(mathNumericBundle(), {
      subject: "math",
      answer_format: "numeric_entry",
    });
    expect(r.ok).toBe(true);
  });

  it("numeric_entry without acceptable_forms fails", () => {
    const r = validateExplanationV2(mathNumericBundle({ acceptable_forms: [] }), {
      subject: "math",
      answer_format: "numeric_entry",
    });
    expect(r.missing.some((s) => s.startsWith("acceptable_forms"))).toBe(true);
  });

  it("numeric_entry with non-string entry in acceptable_forms → invalid", () => {
    const r = validateExplanationV2(mathNumericBundle({ acceptable_forms: ["1", 2] }), {
      subject: "math",
      answer_format: "numeric_entry",
    });
    expect(r.invalid.some((s) => s.includes("acceptable_forms"))).toBe(true);
  });
});

describe("validateExplanationV2 — top-level required", () => {
  it("wrong version → invalid", () => {
    const r = validateExplanationV2(rwMcBundle({ version: "explanation_v1" }), {
      subject: "reading",
      answer_format: "multiple_choice",
    });
    expect(r.invalid.some((s) => s.startsWith("version"))).toBe(true);
  });

  it("missing correct_reasoning → fail", () => {
    const r = validateExplanationV2(rwMcBundle({ correct_reasoning: "" }), {
      subject: "reading",
      answer_format: "multiple_choice",
    });
    expect(r.missing).toContain("correct_reasoning");
  });

  it("missing generator_role → fail", () => {
    const r = validateExplanationV2(rwMcBundle({ generator_role: "" }), {
      subject: "reading",
      answer_format: "multiple_choice",
    });
    expect(r.missing).toContain("generator_role");
  });

  it("non-object root → fail", () => {
    const r = validateExplanationV2(null, { subject: "math", answer_format: "multiple_choice" });
    expect(r.ok).toBe(false);
  });
});

describe("validateExplanationV2 — skipped_not_eligible shortcut", () => {
  it("status=skipped_not_eligible with admin_diagnostic_note passes (no content checks)", () => {
    const r = validateExplanationV2(
      {
        version: EXPLANATION_V2_VERSION,
        generated_at: "2026-05-27T20:00:00Z",
        generator_role: "phase7_eligibility_gate",
        generator_model: "none",
        status: "skipped_not_eligible",
        admin_diagnostic_note: "Skipped because Phase 6 said the answer is disputed.",
      },
      { subject: "math", answer_format: "multiple_choice" }
    );
    expect(r.ok).toBe(true);
  });

  it("status=skipped_not_eligible WITHOUT admin_diagnostic_note → fail", () => {
    const r = validateExplanationV2(
      {
        version: EXPLANATION_V2_VERSION,
        generated_at: "2026-05-27T20:00:00Z",
        generator_role: "phase7_eligibility_gate",
        generator_model: "none",
        status: "skipped_not_eligible",
      },
      { subject: "math", answer_format: "multiple_choice" }
    );
    expect(r.missing).toContain("admin_diagnostic_note");
  });
});

describe("requiredFieldsFor", () => {
  it("R&W MC required field list includes all per-choice + slug_alignment", () => {
    const fields = requiredFieldsFor({ subject: "reading", answer_format: "multiple_choice" });
    expect(fields).toContain("correct_reasoning");
    expect(fields).toContain("choices.A.explanation");
    expect(fields).toContain("choices.A.evidence");
    expect(fields).toContain("choices.D.evidence");
    expect(fields).toContain("slug_alignment.slug");
  });

  it("Math numeric_entry required field list includes acceptable_forms", () => {
    const fields = requiredFieldsFor({ subject: "math", answer_format: "numeric_entry" });
    expect(fields).toContain("acceptable_forms");
    expect(fields).not.toContain("choices.A.explanation"); // no choices for numeric
  });
});
