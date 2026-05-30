// @vitest-environment node
//
// Unit tests for the under-extraction guard in
// scripts/lib/extraction-coverage.mjs. The guard's job is to catch
// the case where extract-with-gemini.mjs comes back from Sonnet with
// fewer questions than a real SAT PDF has.
//
// The bug it protects against shipped on 202406asiav2.pdf: page 79
// was a continuation page (same graph as p.78 + choices B/C/D), and
// the LLM correctly merged choice D back into p.78 but then threw
// away the rest of p.79 — losing 3 math questions on the way. We
// added prompt guidance for the pattern, but the prompt fix isn't
// enforceable; this code-level guard makes sure a similar miss
// surfaces a loud warning instead of silently shipping into the
// /admin/questions/review queue.
//
// Pure tests, no IO.

import { describe, expect, it } from "vitest";
import {
  MATH_DOMAINS,
  FLOORS,
  EXPECTED,
  tallyBySubject,
  findPageGaps,
  analyzeCoverage,
} from "../../../scripts/lib/extraction-coverage.mjs";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Build a healthy, full-sized SAT extraction: 44 math + 54 R&W. */
function makeHealthyRows() {
  const rows = [];
  // 44 math rows spread across pages 54-97 (one Q per page, no gaps).
  for (let i = 0; i < 44; i++) {
    rows.push({
      source_page: 54 + i,
      domain: "algebra",
      concept_slug: "linear-equations",
    });
  }
  // 54 R&W rows spread across pages 1-54.
  for (let i = 0; i < 54; i++) {
    rows.push({
      source_page: 1 + i,
      domain: "info_ideas",
      concept_slug: "central-ideas",
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("MATH_DOMAINS", () => {
  it("covers the four canonical math domains", () => {
    expect(MATH_DOMAINS.has("algebra")).toBe(true);
    expect(MATH_DOMAINS.has("advanced_math")).toBe(true);
    expect(MATH_DOMAINS.has("geometry")).toBe(true);
    expect(MATH_DOMAINS.has("data_analysis")).toBe(true);
  });

  it("does not include R&W domains", () => {
    expect(MATH_DOMAINS.has("info_ideas")).toBe(false);
    expect(MATH_DOMAINS.has("craft_structure")).toBe(false);
    expect(MATH_DOMAINS.has("expression_ideas")).toBe(false);
    expect(MATH_DOMAINS.has("conventions")).toBe(false);
  });
});

describe("FLOORS / EXPECTED", () => {
  it("floors sit just below the expected SAT counts", () => {
    // The floors are tighter than the expected numbers so they catch
    // small misses (the 202406asiav2.pdf bug was only 3 questions
    // short of the math expectation).
    expect(FLOORS.math).toBeLessThan(EXPECTED.math);
    expect(FLOORS.rw).toBeLessThan(EXPECTED.rw);
    expect(FLOORS.total).toBeLessThan(EXPECTED.total);

    // …but not so loose that they'd allow 5+ misses.
    expect(EXPECTED.math - FLOORS.math).toBeLessThanOrEqual(3);
    expect(EXPECTED.rw - FLOORS.rw).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// tallyBySubject
// ---------------------------------------------------------------------------

describe("tallyBySubject", () => {
  it("counts math vs R&W using the domain field", () => {
    const rows = [
      { domain: "algebra" },
      { domain: "advanced_math" },
      { domain: "geometry" },
      { domain: "data_analysis" },
      { domain: "info_ideas" },
      { domain: "craft_structure" },
    ];
    expect(tallyBySubject(rows)).toEqual({ math: 4, rw: 2, total: 6 });
  });

  it("treats unknown / null domains as R&W (defensive)", () => {
    // An invalid domain would already be flagged by the slug-validation
    // pass upstream; we just need to not crash on it here.
    const rows = [
      { domain: "algebra" },
      { domain: null },
      { domain: undefined },
      { domain: "garbage-value" },
    ];
    expect(tallyBySubject(rows)).toEqual({ math: 1, rw: 3, total: 4 });
  });

  it("handles empty / nullish input", () => {
    expect(tallyBySubject([])).toEqual({ math: 0, rw: 0, total: 0 });
    expect(tallyBySubject(null)).toEqual({ math: 0, rw: 0, total: 0 });
    expect(tallyBySubject(undefined)).toEqual({ math: 0, rw: 0, total: 0 });
  });
});

// ---------------------------------------------------------------------------
// findPageGaps
// ---------------------------------------------------------------------------

describe("findPageGaps", () => {
  it("returns no gaps when math pages are contiguous", () => {
    const rows = [
      { source_page: 54, domain: "algebra" },
      { source_page: 55, domain: "algebra" },
      { source_page: 56, domain: "algebra" },
    ];
    expect(findPageGaps(rows, "math")).toEqual([]);
  });

  it("detects a single 1-page gap (the 202406asiav2.pdf p.79 signature)", () => {
    // 202406asiav2.pdf shipped with p.78 → p.80 in math, missing p.79.
    // This is the precise case the guard is supposed to flag.
    const rows = [
      { source_page: 78, domain: "data_analysis" },
      { source_page: 80, domain: "algebra" },
    ];
    expect(findPageGaps(rows, "math")).toEqual([{ subject: "math", page: 79, between: [78, 80] }]);
  });

  it("expands a multi-page gap into one entry per missing page", () => {
    const rows = [
      { source_page: 60, domain: "algebra" },
      { source_page: 64, domain: "algebra" },
    ];
    const gaps = findPageGaps(rows, "math");
    expect(gaps).toHaveLength(3);
    expect(gaps.map((g) => g.page)).toEqual([61, 62, 63]);
    for (const g of gaps) expect(g.between).toEqual([60, 64]);
  });

  it("doesn't flag the same page twice when the same domain appears twice", () => {
    // Two math questions on the same page (rare but valid). Should
    // not be treated as a duplicate gap; should not crash either.
    const rows = [
      { source_page: 60, domain: "algebra" },
      { source_page: 60, domain: "geometry" },
      { source_page: 62, domain: "algebra" },
    ];
    expect(findPageGaps(rows, "math")).toEqual([{ subject: "math", page: 61, between: [60, 62] }]);
  });

  it("scans each subject's own page list independently", () => {
    // On real SAT PDFs R&W and math live in disjoint page ranges, so
    // this case is theoretical, but: gap detection is strictly per
    // subject. If math is on p.51 but R&W has p.50 → p.52, then from
    // R&W's perspective p.51 is still missing — and we want that flag
    // because it means an R&W question was lost on that page.
    const rows = [
      { source_page: 50, domain: "info_ideas" },
      { source_page: 51, domain: "algebra" },
      { source_page: 52, domain: "info_ideas" },
    ];
    expect(findPageGaps(rows, "rw")).toEqual([{ subject: "rw", page: 51, between: [50, 52] }]);
    // Math only has p.51 — single page can't have an internal gap.
    expect(findPageGaps(rows, "math")).toEqual([]);
  });

  it("doesn't infer gaps before the first or after the last extracted page", () => {
    // Pages 1-50 might legitimately be empty (instructions etc.) —
    // we only flag gaps strictly between two questions we DO have.
    const rows = [
      { source_page: 54, domain: "algebra" },
      { source_page: 95, domain: "algebra" },
    ];
    // Exactly 40 inner gaps (55..94), nothing at boundaries.
    const gaps = findPageGaps(rows, "math");
    expect(gaps).toHaveLength(40);
    expect(gaps[0]?.page).toBe(55);
    expect(gaps[gaps.length - 1]?.page).toBe(94);
  });

  it("ignores rows with non-integer source_page", () => {
    const rows = [
      { source_page: 54, domain: "algebra" },
      { source_page: null, domain: "algebra" },
      { source_page: "57", domain: "algebra" },
      { source_page: 56, domain: "algebra" },
    ];
    // Only 54 + 56 contribute → one gap at 55.
    expect(findPageGaps(rows, "math")).toEqual([{ subject: "math", page: 55, between: [54, 56] }]);
  });
});

// ---------------------------------------------------------------------------
// analyzeCoverage — the integrated entry point used by the runner
// ---------------------------------------------------------------------------

describe("analyzeCoverage — happy path", () => {
  it("returns no reasons or gaps for a full healthy extraction", () => {
    const result = analyzeCoverage(makeHealthyRows());
    expect(result.math).toBe(44);
    expect(result.rw).toBe(54);
    expect(result.total).toBe(98);
    expect(result.reasons).toEqual([]);
    expect(result.gaps).toEqual([]);
  });
});

describe("analyzeCoverage — 202406asiav2.pdf regression", () => {
  it("flags the actual production failure: 41 math / 54 R&W with a p.79 gap", () => {
    // Reconstruct the exact shape we found in the DB:
    //   - 41 math rows on pages 54-78 + 80-95 (page 79 missing)
    //   - 54 R&W rows (healthy)
    const rows = [];
    // Math: pages 54-78 (25 rows)
    for (let p = 54; p <= 78; p++) {
      rows.push({ source_page: p, domain: "algebra" });
    }
    // Math: pages 80-95 (16 rows) — skips 79
    for (let p = 80; p <= 95; p++) {
      rows.push({ source_page: p, domain: "algebra" });
    }
    // R&W: pages 1-54 (54 rows)
    for (let p = 1; p <= 54; p++) {
      rows.push({ source_page: p, domain: "info_ideas" });
    }

    const result = analyzeCoverage(rows);

    expect(result.math).toBe(41);
    expect(result.rw).toBe(54);
    expect(result.total).toBe(95);

    // Math floor (42) is breached.
    expect(result.reasons).toContainEqual(expect.stringContaining("math=41"));
    // Total is exactly 95 = floor, so no total reason expected.
    expect(result.reasons.some((r) => r.startsWith("total="))).toBe(false);
    expect(result.reasons.some((r) => r.startsWith("rw="))).toBe(false);

    // The gap at p.79 surfaces.
    expect(result.gaps).toContainEqual({
      subject: "math",
      page: 79,
      between: [78, 80],
    });
  });
});

describe("analyzeCoverage — degenerate inputs", () => {
  it("flags total + math + rw when the extraction is empty", () => {
    const result = analyzeCoverage([]);
    expect(result.reasons).toHaveLength(3);
    expect(result.reasons.some((r) => r.startsWith("total="))).toBe(true);
    expect(result.reasons.some((r) => r.startsWith("math="))).toBe(true);
    expect(result.reasons.some((r) => r.startsWith("rw="))).toBe(true);
    expect(result.gaps).toEqual([]);
  });

  it("doesn't crash on null", () => {
    const result = analyzeCoverage(null);
    expect(result.math).toBe(0);
    expect(result.rw).toBe(0);
    expect(result.total).toBe(0);
  });
});
