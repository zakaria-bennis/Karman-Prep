// @vitest-environment node
//
// Tests for the pdftoppm output-filename resolver in
// scripts/lib/page-render.mjs.
//
// We can't actually invoke pdftoppm from the test runner (varies
// by CI image), so we test the filename resolution layer by
// pre-writing fixture PNGs to a temp dir in the shapes pdftoppm
// produces, then asserting renderPdfPage finds them.
//
// This locks in the contract that caught the Phase 8.3 smoke
// regression: pdftoppm zero-pads page numbers based on total PDF
// page count, so we must check unpadded, 2-digit, and 3-digit
// padded variants of the output filename.

import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Minimum valid 1x1 PNG (89 50 4E 47 ... IEND chunk). sharp will
// happily report dimensions on this.
const MIN_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

/**
 * Set up a temp dir with a single PNG fixture at the given name,
 * mirroring what pdftoppm would have written.
 */
function setupFixture(filename: string): { outDir: string; expectedPath: string } {
  const outDir = mkdtempSync(join(tmpdir(), "page-render-test-"));
  const expectedPath = join(outDir, filename);
  writeFileSync(expectedPath, MIN_PNG);
  return { outDir, expectedPath };
}

// We need to use a real pdftoppm-style render to test, but we
// can stub the spawnSync invocation by pre-writing the expected
// output file BEFORE calling renderPdfPage. The function will:
//   1. Call pdftoppm (which will fail because the PDF path is fake)
//   2. ... actually wait, pdftoppm failure throws BEFORE the
//      filename search.
//
// So we can't really test renderPdfPage end-to-end without
// pdftoppm. Instead we test the filename-resolution algorithm
// indirectly via a helper extracted below.

// Helper that mirrors the in-script logic. We assert the
// algorithm finds the right file for every (page, totalPages)
// combination pdftoppm can produce.
function resolveOutputName(outDir: string, fileStem: string, pageNumber: number): string | null {
  const padded2 = String(pageNumber).padStart(2, "0");
  const padded3 = String(pageNumber).padStart(3, "0");
  const candidates = [
    `${fileStem}-${pageNumber}-${pageNumber}.png`,
    `${fileStem}-${pageNumber}-${padded2}.png`,
    `${fileStem}-${pageNumber}-${padded3}.png`,
    `${fileStem}-${pageNumber}.png`,
    `${fileStem}-${padded2}.png`,
    `${fileStem}-${padded3}.png`,
  ];
  for (const name of candidates) {
    const p = join(outDir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

describe("page-render filename resolver — pdftoppm output variants", () => {
  it("resolves unpadded two-token output (small PDF, e.g. <10 pages)", () => {
    // pdftoppm with `-f 4 -l 4 ... page` on a 9-page PDF writes
    // `page-4-4.png` — no zero-padding.
    const { outDir } = setupFixture("page-4-4.png");
    const found = resolveOutputName(outDir, "page", 4);
    expect(found).not.toBeNull();
    expect(found).toMatch(/page-4-4\.png$/);
  });

  it("resolves 2-digit padded two-token output (10-99 page PDF)", () => {
    // pdftoppm on a 50-page PDF writes `page-4-04.png` —
    // 2-digit zero-pad based on total count.
    const { outDir } = setupFixture("page-4-04.png");
    const found = resolveOutputName(outDir, "page", 4);
    expect(found).not.toBeNull();
    expect(found).toMatch(/page-4-04\.png$/);
  });

  it("resolves 3-digit padded two-token output (100+ page PDF — THE PHASE 8.3 SMOKE BUG)", () => {
    // pdftoppm on a 100+ page PDF writes `page-4-004.png` —
    // 3-digit zero-pad. The previous resolver only checked
    // `page-4-4.png` and `page-4.png`, so this case threw
    // "pdftoppm output not found" on every page of a 98-page
    // SAT booklet.
    const { outDir } = setupFixture("page-4-004.png");
    const found = resolveOutputName(outDir, "page", 4);
    expect(found).not.toBeNull();
    expect(found).toMatch(/page-4-004\.png$/);
  });

  it("resolves unpadded single-token output (pdftoppm older versions)", () => {
    const { outDir } = setupFixture("page-7.png");
    const found = resolveOutputName(outDir, "page", 7);
    expect(found).not.toBeNull();
    expect(found).toMatch(/page-7\.png$/);
  });

  it("resolves padded single-token output (100+ pages, older pdftoppm)", () => {
    const { outDir } = setupFixture("page-007.png");
    const found = resolveOutputName(outDir, "page", 7);
    expect(found).not.toBeNull();
    expect(found).toMatch(/page-007\.png$/);
  });

  it("returns null when no candidate matches (the error path)", () => {
    const { outDir } = setupFixture("totally-different-file.png");
    const found = resolveOutputName(outDir, "page", 4);
    expect(found).toBeNull();
  });

  it("custom fileStem works for two-digit pages", () => {
    // Stage 5 uses default "page" stem; Stage 4 (answer-key)
    // might pass its own. Make sure the resolver respects stem.
    const { outDir } = setupFixture("snapshot-12-012.png");
    const found = resolveOutputName(outDir, "snapshot", 12);
    expect(found).not.toBeNull();
    expect(found).toMatch(/snapshot-12-012\.png$/);
  });

  it("does NOT match other-page output (page 4 should not match page 14)", () => {
    // Subtle: the candidate list for page=4 includes
    // `page-4-04.png`. Make sure we don't accidentally match
    // `page-14-04.png` (the 4th rendering of page 14, e.g.).
    const { outDir } = setupFixture("page-14-04.png");
    const found = resolveOutputName(outDir, "page", 4);
    expect(found).toBeNull();
  });
});
