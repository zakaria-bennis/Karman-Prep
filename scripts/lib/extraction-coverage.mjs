// Coverage / under-extraction helpers for extract-with-gemini.mjs.
//
// Lifted out of the runner so the math/RW floor + page-gap detection
// can be unit-tested without standing up a real Anthropic call. The
// runner imports these and prints the warnings to the operator.
//
// Why these exist:
//   The 202406asiav2.pdf smoke test surfaced the "continuation page"
//   bug — page 78 had the question + graph + choices A/B/C, page 79
//   had the SAME graph + choices B/C/D AND 3 new questions below. The
//   LLM merged choice D correctly but skipped the entire rest of page
//   79, silently losing 3 math questions. The prompt now warns about
//   this pattern, but we also want a deterministic post-pass that
//   flags the failure even when the LLM ignores the guidance.
//
//   Two signals catch this:
//     1) Subject-level floors. A real SAT PDF has ~44 math + ~54 R&W.
//        Anything materially under those numbers indicates a missed
//        page.
//     2) Page-gap detection. For each subject, if pages N and N+2 both
//        contain questions but N+1 has none, that's the signature of a
//        skipped continuation page — surface it so the operator knows
//        where to look.

/**
 * Domains we treat as math for the math-vs-R&W split. Mirrors the set
 * in extract-with-gemini.mjs; keep them in sync.
 */
export const MATH_DOMAINS = new Set(["algebra", "advanced_math", "geometry", "data_analysis"]);

/**
 * Floors below which we declare under-extraction. Chosen tight enough
 * to catch the 3-question miss on 202406asiav2.pdf but loose enough
 * that legitimately-short test forms (rare but possible) don't trip
 * the guard. Tune up as we see more PDFs.
 */
export const FLOORS = {
  total: 95,
  math: 42,
  rw: 52,
};

/** Reference counts so we can report "missing N" deltas in messages. */
export const EXPECTED = {
  total: 98,
  math: 44,
  rw: 54,
};

/**
 * Count math vs R&W rows by domain. Anything not in MATH_DOMAINS
 * counts as R&W — that includes info_ideas, craft_structure,
 * expression_ideas, conventions, plus any oddball value (which would
 * already be flagged by the slug validation pass upstream).
 *
 * Pure function — same input always yields the same output.
 */
export function tallyBySubject(rows) {
  let math = 0;
  let rw = 0;
  for (const r of rows ?? []) {
    if (MATH_DOMAINS.has(r?.domain)) math++;
    else rw++;
  }
  return { math, rw, total: math + rw };
}

/**
 * Find 1+-page gaps inside the sorted page list for a single subject.
 * Each missing page produces one entry so a 2-page gap returns 2.
 *
 * A "gap" means: the extracted rows include pages X and X+2 but
 * nothing on X+1. We don't infer gaps at the boundaries of the
 * extracted range — only between two rows we actually have — because
 * the start/end of the PDF legitimately has instruction pages,
 * answer-key pages, and blanks.
 */
export function findPageGaps(rows, subject) {
  const wantMath = subject === "math";
  const pages = (rows ?? [])
    .filter((r) => MATH_DOMAINS.has(r?.domain) === wantMath)
    .map((r) => r?.source_page)
    .filter((p) => Number.isInteger(p))
    .sort((a, b) => a - b);

  const gaps = [];
  for (let i = 1; i < pages.length; i++) {
    const prev = pages[i - 1];
    const cur = pages[i];
    if (cur === prev) continue;
    if (cur - prev > 1) {
      for (let p = prev + 1; p < cur; p++) {
        gaps.push({ subject, page: p, between: [prev, cur] });
      }
    }
  }
  return gaps;
}

/**
 * Top-level analysis: returns the human-readable reasons array
 * (floor violations) plus the combined math + R&W gap list. The
 * runner prints these together under one "UNDER-EXTRACTION GUARD"
 * banner. Empty arrays = nothing to warn about.
 */
export function analyzeCoverage(rows) {
  const { math, rw, total } = tallyBySubject(rows);
  const reasons = [];
  if (total < FLOORS.total) {
    reasons.push(
      `total=${total} < ${FLOORS.total} (expected ~${EXPECTED.total}, missing ${EXPECTED.total - total})`
    );
  }
  if (math < FLOORS.math) {
    reasons.push(
      `math=${math} < ${FLOORS.math} (expected ~${EXPECTED.math}, missing ${EXPECTED.math - math})`
    );
  }
  if (rw < FLOORS.rw) {
    reasons.push(`rw=${rw} < ${FLOORS.rw} (expected ~${EXPECTED.rw}, missing ${EXPECTED.rw - rw})`);
  }
  const gaps = [...findPageGaps(rows, "math"), ...findPageGaps(rows, "rw")];
  return { math, rw, total, reasons, gaps };
}
