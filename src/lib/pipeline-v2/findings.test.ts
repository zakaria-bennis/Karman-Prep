// @vitest-environment node
//
// Tests for Phase 8.3 shared findings helpers in
// scripts/lib/findings.mjs — eligibility guards + the
// hydrateBlockingFindings DB read shape via a mocked Supabase client.

import { describe, expect, it, vi } from "vitest";
import {
  SEVERITY,
  SOURCE,
  AUDIT_MODULES,
  isEligibleForWellFormedness,
  isEligibleForSlugAlignment,
  isEligibleForFigureCoherence,
  isEligibleForExplanationConsistency,
  hydrateBlockingFindings,
  upsertFinding,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — .mjs has no type declarations; runtime validation only.
} from "../../../scripts/lib/findings.mjs";

describe("SEVERITY + SOURCE enums (mirror DB CHECK constraints)", () => {
  it("SEVERITY matches the migration enum values", () => {
    expect(SEVERITY.BLOCKING).toBe("BLOCKING");
    expect(SEVERITY.WARNING).toBe("WARNING");
    expect(SEVERITY.NOTICE).toBe("NOTICE");
  });
  it("SOURCE matches the migration enum values", () => {
    expect(SOURCE.AUDITOR).toBe("auditor");
    expect(SOURCE.GRADER).toBe("grader");
  });
  it("AUDIT_MODULES exposes the four typed audit categories", () => {
    expect(AUDIT_MODULES.WELL_FORMEDNESS).toBe("well_formedness");
    expect(AUDIT_MODULES.SLUG_ALIGNMENT).toBe("slug_alignment");
    expect(AUDIT_MODULES.FIGURE_COHERENCE).toBe("figure_coherence");
    expect(AUDIT_MODULES.EXPLANATION_CONSISTENCY).toBe("explanation_consistency");
  });
});

describe("isEligibleForWellFormedness", () => {
  it("returns true for any row with an id", () => {
    expect(isEligibleForWellFormedness({ id: "q1" })).toBe(true);
  });
  it("returns false for a row without an id", () => {
    expect(isEligibleForWellFormedness({})).toBe(false);
    expect(isEligibleForWellFormedness(null)).toBe(false);
  });
});

describe("isEligibleForSlugAlignment", () => {
  it("requires id + non-empty concept_slug", () => {
    expect(isEligibleForSlugAlignment({ id: "q1", concept_slug: "transitions" })).toBe(true);
    expect(isEligibleForSlugAlignment({ id: "q1", concept_slug: "" })).toBe(false);
    expect(isEligibleForSlugAlignment({ id: "q1" })).toBe(false);
    expect(isEligibleForSlugAlignment({ concept_slug: "transitions" })).toBe(false);
  });
});

describe("isEligibleForFigureCoherence", () => {
  it("returns true when image_url is set", () => {
    expect(isEligibleForFigureCoherence({ id: "q1", image_url: "https://r2/x.png" })).toBe(true);
  });
  it("returns true when required_visual_asset_count > 0", () => {
    expect(isEligibleForFigureCoherence({ id: "q1", required_visual_asset_count: 1 })).toBe(true);
  });
  it("returns false when both image_url is null and required count is 0", () => {
    expect(
      isEligibleForFigureCoherence({ id: "q1", image_url: null, required_visual_asset_count: 0 })
    ).toBe(false);
  });
});

describe("isEligibleForExplanationConsistency", () => {
  it("returns true when explanation_v2.correct_reasoning is set", () => {
    expect(
      isEligibleForExplanationConsistency({
        id: "q1",
        explanation_v2: { correct_reasoning: "Because…" },
      })
    ).toBe(true);
  });
  it("returns false when explanation_v2 missing or empty", () => {
    expect(isEligibleForExplanationConsistency({ id: "q1" })).toBe(false);
    expect(isEligibleForExplanationConsistency({ id: "q1", explanation_v2: {} })).toBe(false);
    expect(isEligibleForExplanationConsistency({ id: "q1", explanation_v2: null })).toBe(false);
  });
});

describe("hydrateBlockingFindings — DB shape", () => {
  function mockSupabase(findingRows: Array<Record<string, unknown>>) {
    return {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: findingRows, error: null }),
      })),
    };
  }

  it("returns empty map when no questionIds passed", async () => {
    const supa = mockSupabase([]);
    const out = await hydrateBlockingFindings(supa, []);
    expect(out.size).toBe(0);
  });

  it("aggregates count + firstSuggestedStatus per question", async () => {
    const supa = mockSupabase([
      {
        question_id: "q1",
        code: "slug_mismatch",
        category: "slug_alignment",
        message: "Slug fits poorly.",
        detail: { suggested_publish_status: "blocked_slug_uncertain" },
      },
      {
        question_id: "q1",
        code: "figure_question_mismatch",
        category: "figure_coherence",
        message: "Figure doesn't match.",
        detail: { suggested_publish_status: "blocked_missing_visual" },
      },
      {
        question_id: "q2",
        code: "serious_drift",
        category: "explanation_consistency",
        message: "Explanation contradicts.",
        detail: null,
      },
    ]);
    const out = await hydrateBlockingFindings(supa, ["q1", "q2"]);
    expect(out.get("q1")?.count).toBe(2);
    expect(out.get("q1")?.firstSuggestedStatus).toBe("blocked_slug_uncertain");
    expect(out.get("q1")?.firstCategory).toBe("slug_alignment");
    expect(out.get("q2")?.count).toBe(1);
    expect(out.get("q2")?.firstSuggestedStatus).toBeNull();
  });

  it("returns empty map on supabase error (logs warning, doesn't throw)", async () => {
    const supa = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
      })),
    };
    const out = await hydrateBlockingFindings(supa, ["q1"]);
    expect(out.size).toBe(0);
  });
});

describe("upsertFinding — DB call shape", () => {
  it("dry-run skips the DB call", async () => {
    const supa = { from: vi.fn() };
    const result = await upsertFinding({
      supabase: supa,
      questionId: "q1",
      category: "well_formedness",
      code: "empty_question_text",
      severity: "BLOCKING",
      message: "test",
      dryRun: true,
    });
    expect(result.ok).toBe(true);
    expect(supa.from).not.toHaveBeenCalled();
  });

  it("real call passes the right onConflict key", async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    const supa = { from: vi.fn(() => ({ upsert: upsertSpy })) };
    await upsertFinding({
      supabase: supa,
      questionId: "q1",
      category: "slug_alignment",
      code: "slug_mismatch",
      severity: "WARNING",
      message: "test",
      detail: { x: 1 },
    });
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        question_id: "q1",
        source: "auditor",
        severity: "WARNING",
        category: "slug_alignment",
        code: "slug_mismatch",
        detail: { x: 1 },
      }),
      { onConflict: "question_id,source,code" }
    );
  });
});
