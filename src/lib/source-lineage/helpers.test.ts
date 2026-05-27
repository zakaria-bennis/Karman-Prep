import { describe, expect, it } from "vitest";
import {
  compactMatchMethod,
  findPreferredSourceAsset,
  groupSourceAssets,
  hasProcessedSourceLineage,
  sourceAssetFilename,
} from "./helpers";
import type { SourceLineage, SourceLineageAsset } from "./types";

function asset(partial: Partial<SourceLineageAsset> & { id: string; asset_type: string }) {
  return {
    question_id: "q1",
    source_pdf: "test.pdf",
    page_number: 5,
    asset_path: `question-crops/job/${partial.id}.png`,
    public_url: `https://r2.example/${partial.id}.png`,
    bbox: null,
    crop_complete: true,
    relevance: "required",
    repeated_across_pages: false,
    use_in_solving: true,
    match_method: "page_stem_snippet",
    match_confidence: 0.75,
    validation_status: "matched",
    parent_asset_id: null,
    created_at: "2026-05-26T12:00:00Z",
    notes: null,
    ...partial,
  } as SourceLineageAsset;
}

describe("source-lineage helpers", () => {
  it("groups assets in the admin display order", () => {
    const groups = groupSourceAssets([
      asset({ id: "z", asset_type: "unknown_debug_asset" }),
      asset({ id: "expanded", asset_type: "expanded_question_crop" }),
      asset({ id: "page", asset_type: "page_image" }),
      asset({ id: "crop", asset_type: "question_crop" }),
    ]);

    expect(groups.map((group) => group.assetType)).toEqual([
      "page_image",
      "question_crop",
      "expanded_question_crop",
      "unknown_debug_asset",
    ]);
  });

  it("picks the highest-confidence asset for preview chips", () => {
    const lineage: SourceLineage = {
      signals: null,
      assets: [
        asset({ id: "low", asset_type: "question_crop", match_confidence: 0.6 }),
        asset({ id: "high", asset_type: "question_crop", match_confidence: 0.9 }),
      ],
    };

    expect(findPreferredSourceAsset(lineage, "question_crop")?.id).toBe("high");
  });

  it("detects processed lineage from the Phase 3 timestamp", () => {
    expect(hasProcessedSourceLineage({ signals: null, assets: [] })).toBe(false);
    expect(
      hasProcessedSourceLineage({
        signals: {
          question_id: "q1",
          source_pdf: "test.pdf",
          source_page: 5,
          source_assets_processed_at: "2026-05-26T12:00:00Z",
          source_assets_processed_status: "complete",
          question_crop_match_method: null,
          question_crop_match_confidence: null,
          question_crop_complete: null,
          has_question_crop: null,
          has_orphan_crops_on_page: null,
        },
        assets: [],
      })
    ).toBe(true);
  });

  it("formats filenames and match methods for compact admin badges", () => {
    expect(sourceAssetFilename("question-crops/job/p5-qabc-expanded.png")).toBe(
      "p5-qabc-expanded.png"
    );
    expect(compactMatchMethod("page_passage_snippet")).toBe("passage");
    expect(compactMatchMethod("ordered_fallback")).toBe("fallback");
    expect(compactMatchMethod(null)).toBe("no match");
  });
});
