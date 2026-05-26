import { describe, expect, it } from "vitest";
import { normalizeSourceLineage } from "./source-lineage";

type SignalsInput = Parameters<typeof normalizeSourceLineage>[0];
type AssetsInput = Parameters<typeof normalizeSourceLineage>[1];

describe("normalizeSourceLineage", () => {
  it("normalizes signals and source asset rows into the client shape", () => {
    const signals: SignalsInput = {
      question_id: "q1",
      source_pdf: "practice.pdf",
      source_page: 17,
      source_assets_processed_at: "2026-05-26T12:00:00Z",
      source_assets_processed_status: "complete",
      question_crop_match_method: "page_passage_snippet",
      question_crop_match_confidence: 0.9,
      question_crop_complete: true,
      has_question_crop: true,
      has_orphan_crops_on_page: false,
    };
    const assets: AssetsInput = [
      {
        id: "crop1",
        question_id: "q1",
        source_pdf: "practice.pdf",
        page_number: 17,
        asset_type: "question_crop",
        asset_path: "question-crops/job/p17-q1.png",
        public_url: "https://r2.example/p17-q1.png",
        bbox: { y_min: 10, x_min: 20, y_max: 300, x_max: 900 },
        crop_complete: true,
        relevance: "required",
        repeated_across_pages: false,
        use_in_solving: true,
        match_method: "page_passage_snippet",
        match_confidence: 0.9,
        validation_status: "matched",
        parent_asset_id: "page1",
        created_at: "2026-05-26T12:01:00Z",
        notes: null,
      },
    ];

    const lineage = normalizeSourceLineage(signals, assets);

    expect(lineage.signals?.question_crop_match_confidence).toBe(0.9);
    expect(lineage.assets).toHaveLength(1);
    expect(lineage.assets[0]).toMatchObject({
      id: "crop1",
      asset_type: "question_crop",
      bbox: { y_min: 10, x_min: 20, y_max: 300, x_max: 900 },
      relevance: "required",
      use_in_solving: true,
      match_confidence: 0.9,
    });
  });
});
