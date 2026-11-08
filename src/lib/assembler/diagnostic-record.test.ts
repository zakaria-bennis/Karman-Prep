import { describe, expect, it, vi } from "vitest";
import { diagnosticResultRow, nextDiagnosticKey } from "./diagnostic-record";

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => {
    throw new Error("pure tests only");
  },
}));

describe("the bank-fed diagnostic feeds Progress", () => {
  it("stores one predicted total (no range) and each section's number", () => {
    const row = diagnosticResultRow(
      "user-1",
      { reading: 610, math: 580, total: 1190 },
      "2026-11-08T15:00:00.000Z"
    );
    expect(row).toEqual({
      user_id: "user-1",
      taken_at: "2026-11-08T15:00:00.000Z",
      score_range_low: 1190,
      score_range_high: 1190,
      domain_scores: { reading: 610, math: 580 },
      weak_concepts: [],
    });
  });

  it("numbers retakes after the first diagnostic", () => {
    expect(nextDiagnosticKey(null)).toBe("diagnostic:1");
    expect(nextDiagnosticKey("diagnostic:1")).toBe("diagnostic:2");
    expect(nextDiagnosticKey("diagnostic:9")).toBe("diagnostic:10");
    expect(nextDiagnosticKey("diagnostic:oops")).toBe("diagnostic:1");
  });
});
