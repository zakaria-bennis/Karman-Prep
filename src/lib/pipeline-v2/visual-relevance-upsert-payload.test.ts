// @vitest-environment node
//
// Tests for buildVisualRelevanceUpsertPayload — the helper that
// builds the source_assets upsert payload in
// scripts/pdf-pipeline/classify-visual-relevance.mjs.
//
// THIS LOCKS IN THE FIX for a real bug observed on 2026-05-28:
// supabase-js .upsert() runs the Postgres INSERT branch first and
// validates NOT NULL constraints BEFORE the ON CONFLICT clause
// resolves. So an UPDATE-only intent crashed with:
//
//   23502: null value in column "asset_type" of relation
//   "source_assets" violates not-null constraint
//
// The fix is to pass through every NOT NULL column from the
// existing row's values. These tests ensure that contract holds.

import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — .mjs has no type decls
import {
  buildVisualRelevanceUpsertPayload,
  SOURCE_ASSETS_NOT_NULL_COLUMNS,
} from "../../../scripts/lib/visual-relevance-logic.mjs";

function makeAsset(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "8e3d230d-92cf-4eb1-af18-befee4242118",
    question_id: "ee23032a-1234-5678-abcd-000000000001",
    source_pdf: "202406asiav2.pdf",
    page_number: 7,
    asset_type: "figure_crop",
    asset_path: "pdf-inbox/job/202406asiav2/figure-7.png",
    public_url: "https://r2.example.com/pdf-inbox/job/202406asiav2/figure-7.png",
    bbox: null,
    relevance: "uncertain",
    repeated_across_pages: false,
    use_in_solving: false,
    validation_status: null,
    notes: null,
    raw_metadata: null,
    created_at: "2026-05-28T00:00:00Z",
    ...extra,
  };
}

const sampleClassification = {
  relevance: "required",
  repeated_across_pages: false,
  use_in_solving: true,
  visual_class: "required_for_question",
  reason: "question_text_references_figure",
};

const samplePhase4Metadata = {
  phase4_visual_relevance: {
    reason: "question_text_references_figure",
    visual_signature: "abcdef0123456789",
  },
};

describe("buildVisualRelevanceUpsertPayload — NOT NULL passthroughs", () => {
  it("includes every NOT NULL column on the source_assets table", () => {
    const payload: Record<string, unknown> = buildVisualRelevanceUpsertPayload({
      asset: makeAsset(),
      classification: sampleClassification,
      phase4Metadata: samplePhase4Metadata,
    });
    for (const col of SOURCE_ASSETS_NOT_NULL_COLUMNS) {
      expect(payload).toHaveProperty(col);
      // Critically, the value must be NON-NULL when the asset has it
      // set — otherwise the INSERT branch still violates the constraint.
      expect(payload[col]).not.toBeNull();
    }
  });

  it("preserves the asset_type field that crashed Stage 6 on 2026-05-28", () => {
    // The actual failing row from the workflow run had id
    // 8e3d230d-92cf-4eb1-af18-befee4242118. The payload missed
    // asset_type, causing 23502. After fix, asset_type passes through.
    const asset = makeAsset({ asset_type: "chart_crop" });
    const payload: Record<string, unknown> = buildVisualRelevanceUpsertPayload({
      asset,
      classification: sampleClassification,
      phase4Metadata: samplePhase4Metadata,
    });
    expect(payload.asset_type).toBe("chart_crop");
  });

  it("preserves question_id, source_pdf, page_number, asset_path", () => {
    const asset = makeAsset({
      question_id: "abc-123",
      source_pdf: "test.pdf",
      page_number: 42,
      asset_path: "pdf-inbox/test/figure-42.png",
    });
    const payload: Record<string, unknown> = buildVisualRelevanceUpsertPayload({
      asset,
      classification: sampleClassification,
      phase4Metadata: samplePhase4Metadata,
    });
    expect(payload.question_id).toBe("abc-123");
    expect(payload.source_pdf).toBe("test.pdf");
    expect(payload.page_number).toBe(42);
    expect(payload.asset_path).toBe("pdf-inbox/test/figure-42.png");
  });

  it("sets the classified relevance, repeated_across_pages, use_in_solving", () => {
    const payload: Record<string, unknown> = buildVisualRelevanceUpsertPayload({
      asset: makeAsset(),
      classification: {
        relevance: "irrelevant",
        repeated_across_pages: true,
        use_in_solving: false,
      },
      phase4Metadata: samplePhase4Metadata,
    });
    expect(payload.relevance).toBe("irrelevant");
    expect(payload.repeated_across_pages).toBe(true);
    expect(payload.use_in_solving).toBe(false);
  });

  it("includes the merged phase4 metadata under raw_metadata", () => {
    const payload: Record<string, unknown> = buildVisualRelevanceUpsertPayload({
      asset: makeAsset(),
      classification: sampleClassification,
      phase4Metadata: samplePhase4Metadata,
    });
    expect(payload.raw_metadata).toEqual(samplePhase4Metadata);
  });

  it("throws when asset.id is missing (defensive guard)", () => {
    expect(() =>
      buildVisualRelevanceUpsertPayload({
        asset: makeAsset({ id: undefined }),
        classification: sampleClassification,
        phase4Metadata: samplePhase4Metadata,
      })
    ).toThrow(/asset\.id required/);
  });

  it("emits null for a NOT NULL column when the asset truly has null (logged for diagnostics)", () => {
    // Edge case: if loadAssets() somehow returned a row with one of
    // these fields null (data corruption upstream), we don't silently
    // synthesize a value — we pass null through, the upsert fails
    // loudly with 23502, and the operator can investigate. Better
    // than masking the upstream corruption.
    const payload: Record<string, unknown> = buildVisualRelevanceUpsertPayload({
      asset: makeAsset({ asset_path: null }),
      classification: sampleClassification,
      phase4Metadata: samplePhase4Metadata,
    });
    expect(payload.asset_path).toBeNull();
  });
});

describe("SOURCE_ASSETS_NOT_NULL_COLUMNS — frozen contract", () => {
  it("exports as a non-empty frozen array", () => {
    expect(Array.isArray(SOURCE_ASSETS_NOT_NULL_COLUMNS)).toBe(true);
    expect(SOURCE_ASSETS_NOT_NULL_COLUMNS.length).toBeGreaterThan(0);
    expect(Object.isFrozen(SOURCE_ASSETS_NOT_NULL_COLUMNS)).toBe(true);
  });

  it("includes asset_type (the specific column from the 2026-05-28 crash)", () => {
    expect(SOURCE_ASSETS_NOT_NULL_COLUMNS).toContain("asset_type");
  });
});
