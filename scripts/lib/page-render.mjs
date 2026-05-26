// ============================================================
// page-render — thin wrapper around pdftoppm for rendering a
// single PDF page to PNG.
//
// Phase 3 only. extract-figures.mjs and extract-answer-key.mjs
// keep their existing inline pdftoppm calls — consolidating them
// into this lib is deferred to Phase 8 (don't touch working code
// during Phase 3).
//
// Returns { pngPath, width, height }. Throws on pdftoppm error.
// ============================================================

import { spawnSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/**
 * Render one page of a PDF to a PNG at the given DPI.
 *
 * @param {string} pdfPath - absolute path to the PDF file
 * @param {number} pageNumber - 1-based page index
 * @param {object} [opts]
 * @param {number} [opts.dpi=200]
 * @param {string} [opts.outDir] - destination folder; defaults to a
 *   fresh subdir of os.tmpdir() so concurrent calls don't collide
 * @param {string} [opts.fileStem] - filename stem; default "page"
 * @returns {Promise<{ pngPath: string, width: number, height: number }>}
 */
export async function renderPdfPage(pdfPath, pageNumber, opts = {}) {
  const dpi = opts.dpi ?? 200;
  const outDir = opts.outDir ?? join(tmpdir(), `page-render-${Date.now()}`);
  const fileStem = opts.fileStem ?? `page`;
  mkdirSync(outDir, { recursive: true });

  const outBase = join(outDir, `${fileStem}-${pageNumber}`);
  const result = spawnSync(
    "pdftoppm",
    [
      "-f",
      String(pageNumber),
      "-l",
      String(pageNumber),
      "-r",
      String(dpi),
      "-png",
      pdfPath,
      outBase,
    ],
    { encoding: "utf-8" }
  );
  if (result.status !== 0) {
    throw new Error(
      `pdftoppm failed for page ${pageNumber}: ${result.stderr || result.stdout || "no output"}`
    );
  }

  // pdftoppm emits page-<N>-<page>.png on some versions,
  // page-<N>.png on others. Try both.
  let pngPath = null;
  for (const name of [
    `${fileStem}-${pageNumber}-${pageNumber}.png`,
    `${fileStem}-${pageNumber}.png`,
  ]) {
    const p = join(outDir, name);
    if (existsSync(p)) {
      pngPath = p;
      break;
    }
  }
  if (!pngPath) {
    throw new Error(`pdftoppm output not found for page ${pageNumber} in ${outDir}`);
  }

  // Use sharp to read the dimensions (needed by callers that do
  // bbox→pixel conversion). sharp is already a project dep.
  const sharp = (await import("sharp")).default;
  const meta = await sharp(pngPath).metadata();
  return {
    pngPath,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}
