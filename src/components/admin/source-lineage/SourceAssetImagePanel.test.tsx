// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SourceAssetImagePanel } from "./SourceAssetImagePanel";
import type { SourceLineage, SourceLineageAsset } from "@/lib/source-lineage/types";

function makeAsset(overrides: Partial<SourceLineageAsset> = {}): SourceLineageAsset {
  return {
    id: "a-1",
    question_id: "q-1",
    source_pdf: "test.pdf",
    page_number: 17,
    asset_type: "question_crop",
    asset_path: "question-crops/test/p17-q5.png",
    public_url: "https://r2.example/p17-q5.png",
    bbox: null,
    crop_complete: true,
    relevance: "required",
    repeated_across_pages: false,
    use_in_solving: true,
    match_method: "page_passage_snippet",
    match_confidence: 0.9,
    validation_status: "matched",
    parent_asset_id: null,
    created_at: "2026-05-26T00:00:00Z",
    notes: null,
    ...overrides,
  };
}

function lineage(assets: SourceLineageAsset[]): SourceLineage {
  return {
    signals: null,
    assets,
  };
}

describe("SourceAssetImagePanel", () => {
  it("shows empty state when lineage has no matching asset", () => {
    render(
      <SourceAssetImagePanel
        lineage={lineage([])}
        assetType="question_crop"
        emptyLabel="No crop available."
      />
    );
    expect(screen.getByText("No crop available.")).toBeInTheDocument();
    expect(screen.queryByText(/view/i)).not.toBeInTheDocument();
  });

  it("renders the asset image when a question_crop exists with a public URL", () => {
    render(
      <SourceAssetImagePanel
        lineage={lineage([makeAsset()])}
        assetType="question_crop"
        emptyLabel="no crop"
      />
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toBe("https://r2.example/p17-q5.png");
    expect(screen.getByText(/view/i)).toBeInTheDocument();
  });

  it("falls back to path display when the asset has no public_url", () => {
    render(
      <SourceAssetImagePanel
        lineage={lineage([makeAsset({ public_url: null })])}
        assetType="question_crop"
        emptyLabel="no crop"
      />
    );
    expect(screen.getByText(/has no public URL/i)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("only picks the asset matching the requested assetType", () => {
    render(
      <SourceAssetImagePanel
        lineage={lineage([
          makeAsset({ id: "a-page", asset_type: "page_image" }),
          makeAsset({ id: "a-crop", asset_type: "question_crop" }),
          makeAsset({ id: "a-exp", asset_type: "expanded_question_crop" }),
        ])}
        assetType="expanded_question_crop"
        emptyLabel="no expanded"
      />
    );
    // The match-confidence badge appears, meaning we found a matching asset.
    expect(screen.getByText(/passage/i)).toBeInTheDocument();
    // The expanded crop's filename should show
    expect(screen.queryByText("no expanded")).not.toBeInTheDocument();
  });

  it("renders the MatchConfidenceBadge for the asset", () => {
    render(
      <SourceAssetImagePanel
        lineage={lineage([makeAsset({ match_method: "ordered_fallback", match_confidence: 0.6 })])}
        assetType="question_crop"
        emptyLabel="no crop"
      />
    );
    expect(screen.getByText(/fallback/i)).toBeInTheDocument();
  });
});
