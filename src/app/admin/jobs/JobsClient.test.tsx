// @vitest-environment jsdom
//
// Regression test for the /admin/jobs crash: a real job carried
// progress.stage = "crops" (a v2 orchestrator stage the legacy StageIcon
// map didn't include), so `map[stage]` was undefined and destructuring it
// threw — taking the whole page down. JobsClient must now render ANY
// stage (known v2 stage, or a totally unmapped/future one) without
// crashing, falling back to a generic icon.

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import JobsClient from "./JobsClient";
import type { PdfProcessingJob, PdfJobStage } from "@/types/pdf-job";

// JobsClient uses next/navigation's useRouter for its auto-refresh.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function makeJob(overrides: Partial<PdfProcessingJob> = {}): PdfProcessingJob {
  return {
    id: "job-1",
    source_pdf: "test.pdf",
    pdf_storage_path: "path",
    pdf_size_bytes: 1024 * 1024,
    pdf_page_count: 10,
    uploaded_by_user_id: "u1",
    uploaded_at: "2026-06-01T00:00:00.000Z",
    status: "running",
    module_status: {} as PdfProcessingJob["module_status"],
    csv_storage_paths: {},
    imported_counts: {},
    error_message: null,
    started_at: "2026-06-01T00:00:00.000Z",
    completed_at: null,
    progress: {
      stage: "crops",
      message: "Per-question source-asset extraction",
      updated_at: "2026-06-01T00:00:00.000Z",
      percent: 28,
    },
    ...overrides,
  };
}

describe("JobsClient — renders any stage without crashing (the /admin/jobs bug)", () => {
  it("renders a job whose stage is the previously-unmapped 'crops'", () => {
    const { getByText } = render(
      <JobsClient initialJobs={[makeJob({ source_pdf: "crops.pdf" })]} />
    );
    // Before the fix this threw in StageIcon; now it renders the row + a
    // proper label (added to STAGE_LABEL).
    expect(getByText("crops.pdf")).toBeTruthy();
    expect(getByText("Cropping question images")).toBeTruthy();
  });

  it("falls back gracefully for a totally unknown / future stage", () => {
    const job = makeJob({
      source_pdf: "future.pdf",
      progress: {
        stage: "some_future_stage" as PdfJobStage, // not in any map — runtime value from DB
        stage_label: "Doing something new",
        message: null,
        updated_at: "2026-06-01T00:00:00.000Z",
        percent: 50,
      },
    });
    const { getByText } = render(<JobsClient initialJobs={[job]} />);
    expect(getByText("future.pdf")).toBeTruthy();
    // Uses the runner-provided stage_label when the static map has no entry.
    expect(getByText("Doing something new")).toBeTruthy();
  });

  it("renders a mix of v2 stages (extract → publish) in one list", () => {
    const stages: PdfJobStage[] = [
      "extracting",
      "answer_key",
      "visuals",
      "figure_structure",
      "math_repair",
      "auditing",
      "publishing",
      "done",
    ];
    const jobs = stages.map((stage, i) =>
      makeJob({
        id: `job-${i}`,
        source_pdf: `pdf-${stage}.pdf`,
        status: stage === "done" ? "complete" : "running",
        progress: { stage, message: null, updated_at: "2026-06-01T00:00:00.000Z" },
      })
    );
    const { getByText } = render(<JobsClient initialJobs={jobs} />);
    for (const stage of stages) expect(getByText(`pdf-${stage}.pdf`)).toBeTruthy();
  });

  it("shows the empty state when there are no jobs", () => {
    const { getByText } = render(<JobsClient initialJobs={[]} />);
    expect(getByText(/No PDFs uploaded yet/i)).toBeTruthy();
  });
});
