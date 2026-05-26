// @vitest-environment jsdom

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SourceLineageSection } from "./SourceLineageSection";
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

function lineage(
  assets: SourceLineageAsset[],
  signalOverrides: Partial<SourceLineage["signals"]> = {}
): SourceLineage {
  return {
    signals: {
      question_id: "q-1",
      source_pdf: "test.pdf",
      source_page: 17,
      source_assets_processed_at: "2026-05-26T00:00:00Z",
      source_assets_processed_status: "complete",
      question_crop_match_method: "page_passage_snippet",
      question_crop_match_confidence: 0.9,
      question_crop_complete: true,
      has_question_crop: true,
      has_orphan_crops_on_page: false,
      ...signalOverrides,
    },
    assets,
  };
}

describe("SourceLineageSection", () => {
  it("returns null when lineage is unprocessed AND has no assets (pre-Phase-3 rows)", () => {
    const { container } = render(<SourceLineageSection lineage={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when signals exist but processed_at is null and no assets", () => {
    const empty: SourceLineage = {
      signals: {
        question_id: "q-1",
        source_pdf: null,
        source_page: null,
        source_assets_processed_at: null,
        source_assets_processed_status: null,
        question_crop_match_method: null,
        question_crop_match_confidence: null,
        question_crop_complete: null,
        has_question_crop: null,
        has_orphan_crops_on_page: null,
      },
      assets: [],
    };
    const { container } = render(<SourceLineageSection lineage={empty} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the section header when lineage is processed", () => {
    render(<SourceLineageSection lineage={lineage([makeAsset()])} />);
    expect(screen.getByText("Source lineage")).toBeInTheDocument();
    // /complete/i is too loose — matches both the status word AND the
    // "Crop complete" pill on each asset row. Match the labeled
    // status field text precisely instead.
    expect(screen.getByText(/processed:/i)).toBeInTheDocument();
    expect(screen.getByText(/status:/i)).toBeInTheDocument();
  });

  it("groups multiple assets by type in canonical order", () => {
    render(
      <SourceLineageSection
        lineage={lineage([
          makeAsset({ id: "a1", asset_type: "expanded_question_crop" }),
          makeAsset({ id: "a2", asset_type: "page_image" }),
          makeAsset({ id: "a3", asset_type: "question_crop" }),
        ])}
      />
    );
    // All three asset type labels render. Use exact-string matching
    // because the regex /Question Crop/i would match both "Question
    // Crop" AND "Expanded Question Crop".
    expect(screen.getByText("Page Image")).toBeInTheDocument();
    expect(screen.getByText("Question Crop")).toBeInTheDocument();
    expect(screen.getByText("Expanded Question Crop")).toBeInTheDocument();
  });

  it("renders each asset with a [view] link to its public URL", () => {
    render(<SourceLineageSection lineage={lineage([makeAsset()])} />);
    const link = screen.getByRole("link", { name: /view/i });
    expect(link.getAttribute("href")).toBe("https://r2.example/p17-q5.png");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("shows the asset filename", () => {
    render(<SourceLineageSection lineage={lineage([makeAsset()])} />);
    expect(screen.getByText(/p17-q5\.png/)).toBeInTheDocument();
  });

  it("collapses when the header button is clicked", () => {
    render(<SourceLineageSection lineage={lineage([makeAsset()])} />);
    expect(screen.getByText(/p17-q5\.png/)).toBeInTheDocument();
    const header = screen.getByText("Source lineage").closest("button");
    expect(header).not.toBeNull();
    // Use fireEvent (not native .click()) so React's state batching
    // flushes synchronously inside the test.
    fireEvent.click(header!);
    // Asset content is now hidden
    expect(screen.queryByText(/p17-q5\.png/)).not.toBeInTheDocument();
  });
});
