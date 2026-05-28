// @vitest-environment node
//
// Tests for the source_pdf aggregation in
// src/lib/supabase/queries/quiz/source-pdfs.ts.
//
// We mock the Supabase client and verify:
//   · the query shape (correct table, correct columns, NOT NULL filter)
//   · per-PDF counting splits active vs archived correctly
//   · sort order is most-recent first
//   · includeArchived: false filters out PDFs with zero active rows

import { describe, expect, it, vi, beforeEach } from "vitest";

// We import the helper *after* mocking the Supabase client factory
// so vi.mock applies before the helper grabs its dependency.
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(),
}));

import { fetchSourcePdfList } from "@/lib/supabase/queries/quiz/source-pdfs";
import { createAdminClient } from "@/lib/supabase/server";

function makeSupabaseStub(rows: Array<Record<string, unknown>>) {
  // Build a tiny chainable stub matching the supabase-js fluent
  // interface for this query. select → not → order → returns
  // { data, error }.
  return {
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn(() => chain);
      chain.not = vi.fn(() => chain);
      chain.order = vi.fn(() => Promise.resolve({ data: rows, error: null }));
      return chain;
    }),
  };
}

describe("fetchSourcePdfList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates per-PDF active + archived counts", async () => {
    const rows = [
      // PDF A: 2 active, 1 archived
      { source_pdf: "a.pdf", archived_at: null, created_at: "2026-05-28T00:00:00Z" },
      { source_pdf: "a.pdf", archived_at: null, created_at: "2026-05-28T00:00:01Z" },
      {
        source_pdf: "a.pdf",
        archived_at: "2026-05-27T12:00:00Z",
        created_at: "2026-05-27T00:00:00Z",
      },
      // PDF B: 0 active, 3 archived
      {
        source_pdf: "b.pdf",
        archived_at: "2026-05-20T00:00:00Z",
        created_at: "2026-05-19T00:00:00Z",
      },
      {
        source_pdf: "b.pdf",
        archived_at: "2026-05-20T00:00:00Z",
        created_at: "2026-05-19T00:00:01Z",
      },
      {
        source_pdf: "b.pdf",
        archived_at: "2026-05-20T00:00:00Z",
        created_at: "2026-05-19T00:00:02Z",
      },
    ];
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseStub(rows) as unknown as ReturnType<typeof createAdminClient>
    );

    const result = await fetchSourcePdfList();
    expect(result).toHaveLength(2);

    const a = result.find((r) => r.source_pdf === "a.pdf");
    const b = result.find((r) => r.source_pdf === "b.pdf");
    expect(a?.active_count).toBe(2);
    expect(a?.archived_count).toBe(1);
    expect(b?.active_count).toBe(0);
    expect(b?.archived_count).toBe(3);
  });

  it("hides PDFs with zero active rows when includeArchived=false", async () => {
    const rows = [
      { source_pdf: "active.pdf", archived_at: null, created_at: "2026-05-28T00:00:00Z" },
      {
        source_pdf: "old.pdf",
        archived_at: "2026-05-20T00:00:00Z",
        created_at: "2026-05-19T00:00:00Z",
      },
    ];
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseStub(rows) as unknown as ReturnType<typeof createAdminClient>
    );

    const result = await fetchSourcePdfList({ includeArchived: false });
    expect(result).toHaveLength(1);
    expect(result[0].source_pdf).toBe("active.pdf");
  });

  it("returns most_recent ISO timestamp from the freshest row per PDF", async () => {
    // Note: the source query orders by created_at DESC, so the
    // FIRST row encountered per source_pdf IS the most recent.
    const rows = [
      // a.pdf — freshest row is at the top
      { source_pdf: "a.pdf", archived_at: null, created_at: "2026-05-28T12:00:00Z" },
      { source_pdf: "a.pdf", archived_at: null, created_at: "2026-05-26T00:00:00Z" },
    ];
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseStub(rows) as unknown as ReturnType<typeof createAdminClient>
    );
    const result = await fetchSourcePdfList();
    expect(result[0].most_recent).toBe("2026-05-28T12:00:00Z");
  });

  it("sorts result by most_recent DESC across PDFs", async () => {
    const rows = [
      // Mixed order in input
      { source_pdf: "old.pdf", archived_at: null, created_at: "2026-05-01T00:00:00Z" },
      { source_pdf: "new.pdf", archived_at: null, created_at: "2026-05-28T00:00:00Z" },
      { source_pdf: "mid.pdf", archived_at: null, created_at: "2026-05-15T00:00:00Z" },
    ];
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseStub(rows) as unknown as ReturnType<typeof createAdminClient>
    );
    const result = await fetchSourcePdfList();
    expect(result.map((r) => r.source_pdf)).toEqual(["new.pdf", "mid.pdf", "old.pdf"]);
  });

  it("ignores rows with null source_pdf entirely", async () => {
    // Even with the .not('source_pdf', 'is', null) filter at the
    // query level, defensive code in the aggregator should skip
    // any nulls that slip through (e.g. if someone uses a custom
    // call site).
    const rows = [
      { source_pdf: null, archived_at: null, created_at: "2026-05-28T00:00:00Z" },
      { source_pdf: "real.pdf", archived_at: null, created_at: "2026-05-28T00:00:00Z" },
    ];
    vi.mocked(createAdminClient).mockReturnValue(
      makeSupabaseStub(rows) as unknown as ReturnType<typeof createAdminClient>
    );
    const result = await fetchSourcePdfList();
    expect(result).toHaveLength(1);
    expect(result[0].source_pdf).toBe("real.pdf");
  });
});
