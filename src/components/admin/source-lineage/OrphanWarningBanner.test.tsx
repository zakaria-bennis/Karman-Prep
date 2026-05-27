// @vitest-environment jsdom

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { OrphanWarningBanner } from "./OrphanWarningBanner";
import type { SourceLineage } from "@/lib/source-lineage/types";

function lineage(overrides: Partial<SourceLineage["signals"]> = {}): SourceLineage {
  return {
    signals: {
      question_id: "q-1",
      source_pdf: "test.pdf",
      source_page: 17,
      source_assets_processed_at: "2026-05-26T00:00:00Z",
      source_assets_processed_status: "complete",
      question_crop_match_method: null,
      question_crop_match_confidence: null,
      question_crop_complete: null,
      has_question_crop: true,
      has_orphan_crops_on_page: true,
      ...overrides,
    },
    assets: [],
  };
}

describe("OrphanWarningBanner", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("renders when has_orphan_crops_on_page is true", () => {
    render(<OrphanWarningBanner lineage={lineage()} questionId="q-1" />);
    expect(screen.getByText(/orphan crops/i)).toBeInTheDocument();
  });

  it("does NOT render when has_orphan_crops_on_page is false", () => {
    render(
      <OrphanWarningBanner
        lineage={lineage({ has_orphan_crops_on_page: false })}
        questionId="q-1"
      />
    );
    expect(screen.queryByText(/orphan crops/i)).not.toBeInTheDocument();
  });

  it("does NOT render when lineage is null", () => {
    render(<OrphanWarningBanner lineage={null} questionId="q-1" />);
    expect(screen.queryByText(/orphan crops/i)).not.toBeInTheDocument();
  });

  it("dismiss button stores per-PDF-page key, not per-question", () => {
    // The audit fix: a reviewer working through 30 questions on the same
    // orphan PDF page should dismiss the banner ONCE, not 30 times.
    render(<OrphanWarningBanner lineage={lineage()} questionId="q-1" />);
    fireEvent.click(screen.getByLabelText(/dismiss/i));
    // Stored key should be keyed by source_pdf + source_page
    expect(sessionStorage.getItem("karman.source-lineage.orphan.test.pdf::page17")).toBe("1");
    // The legacy per-questionId key should NOT have been written
    expect(sessionStorage.getItem("karman.source-lineage.orphan.q-1")).toBeNull();
  });

  it("stays dismissed for the SAME PDF page across different questionIds", () => {
    // First question dismisses
    const { unmount } = render(<OrphanWarningBanner lineage={lineage()} questionId="q-1" />);
    fireEvent.click(screen.getByLabelText(/dismiss/i));
    unmount();

    // Second question on the same page should NOT see the banner
    render(<OrphanWarningBanner lineage={lineage()} questionId="q-2" />);
    expect(screen.queryByText(/orphan crops/i)).not.toBeInTheDocument();
  });

  it("RE-shows the banner on a DIFFERENT PDF page", () => {
    // Dismiss for page 17
    const { unmount } = render(<OrphanWarningBanner lineage={lineage()} questionId="q-1" />);
    fireEvent.click(screen.getByLabelText(/dismiss/i));
    unmount();

    // Same PDF, page 18 → banner appears
    render(<OrphanWarningBanner lineage={lineage({ source_page: 18 })} questionId="q-2" />);
    expect(screen.getByText(/orphan crops/i)).toBeInTheDocument();
  });

  it("falls back to per-questionId key when signals lack pdf+page", () => {
    // Pre-Phase-3 row where signals weren't hydrated with location info.
    render(
      <OrphanWarningBanner
        lineage={lineage({ source_pdf: null, source_page: null })}
        questionId="q-1"
      />
    );
    fireEvent.click(screen.getByLabelText(/dismiss/i));
    expect(sessionStorage.getItem("karman.source-lineage.orphan.q::q-1")).toBe("1");
  });

  it("shows the 'Open inspector' link when href is provided", () => {
    render(<OrphanWarningBanner lineage={lineage()} questionId="q-1" href="/admin/x" />);
    expect(screen.getByText(/open inspector/i)).toBeInTheDocument();
  });
});
