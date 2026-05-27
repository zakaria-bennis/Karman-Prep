// ============================================================
// grader-normalize — Phase 6 answer normalization + equivalence.
//
// Pure helpers (apart from the SymPy wrapper, which is async but
// never throws). Used by verify-answers.mjs to compare answers
// across solvers, the answer key, and the panel consensus.
//
// THREE NORMALIZATION TIERS
//   1. normalizeLetter('A' | 'a)' | '(A)' | 'A.' | ' A ') → 'A'
//      For multiple-choice. Strict A-D only.
//   2. normalizeNumeric handles decimals, fractions, percents,
//      scientific notation. For numeric_entry math.
//   3. answersEquivalent — high-level "are these two answers the
//      same?" Tries string match → numeric match → SymPy.
//
// SymPy is invoked via Phase 5's areExpressionsEquivalent. The
// bridge collapses any failure to { equivalent: null } so callers
// never need try/catch. Phase 6 surfaces that null as 'inconclusive'.
// ============================================================

import { areExpressionsEquivalent } from "./math-equivalence.mjs";

// ── normalizeLetter ──────────────────────────────────────────

/**
 * Coerce a raw solver answer into a single A-D letter, or return null.
 * Handles common verbose forms a solver might emit.
 *
 * @param {string | null | undefined} raw
 * @returns {"A"|"B"|"C"|"D"|null}
 */
export function normalizeLetter(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s.length === 0) return null;
  // Direct one-letter form (most common)
  if (/^[A-Da-d]$/.test(s)) return s.toUpperCase();
  // Common verbose forms: "(A)", "A.", "A)", "Choice A", "Option A"
  const m = s.match(/(?:^|\W)([A-Da-d])(?:[\.\)\s]|$)/);
  if (m) return m[1].toUpperCase();
  return null;
}

// ── normalizeNumeric ─────────────────────────────────────────

/**
 * Parse a numeric answer string into a canonical number, or null
 * if the string clearly isn't numeric. Handles:
 *   "0.5", "1/2", "50%", "1e-3", "-1/4", "5 / 8", "0.5x" (rejected),
 *   "$3.14", "3.14 dollars" (just the number wins).
 *
 * Returns null for non-numeric (e.g. "any positive integer") so the
 * caller knows to fall back to SymPy or human review.
 *
 * @param {string | number | null | undefined} raw
 * @returns {number | null}
 */
export function normalizeNumeric(raw) {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  let s = String(raw).trim();
  if (s.length === 0) return null;

  // Strip "answer = " / "answer: " preambles + currency + thousands sep.
  s = s.replace(/^(?:answer|ans)\s*[:=]?\s*/i, "").trim();
  s = s.replace(/^[$]/, "").trim();
  s = s.replace(/,/g, "");

  // Try the cheapest shape first — fraction. Handles "1/2", "-3/4",
  // "5 / 8" (whitespace around slash tolerated). Do this BEFORE the
  // unit-strip pass so spaces around / don't get eaten.
  const fracMatch = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)\b/);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) return num / den;
    return null;
  }

  // Percent: "50%" → 0.5. Tolerates a unit/word after the %.
  const pctMatch = s.match(/^(-?\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) return Number(pctMatch[1]) / 100;

  // Plain number or scientific (e.g. "1.5e-3", "-2.5E+10").
  // Match LEADING numeric token; anything after a non-numeric char
  // is treated as a trailing unit and stripped. The character class
  // intentionally INCLUDES e/E + sign so exponents survive.
  const numMatch = s.match(/^(-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?)/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

// ── answersEquivalent ────────────────────────────────────────

/**
 * High-level answer comparison. Try cheapest first; only fall back
 * to SymPy when string + numeric matching are inconclusive.
 *
 *   Returns one of:
 *     "equivalent"      — same answer
 *     "not_equivalent"  — confirmed different
 *     "inconclusive"    — can't tell (SymPy failed / non-numeric)
 *
 * Tolerance default 1e-6 for floating-point equality.
 *
 * @param {object} args
 * @param {string} args.answerA
 * @param {string} args.answerB
 * @param {"multiple_choice" | "numeric_entry"} [args.answerFormat="multiple_choice"]
 * @param {number} [args.numericTolerance=1e-6]
 * @returns {Promise<"equivalent" | "not_equivalent" | "inconclusive">}
 */
export async function answersEquivalent({
  answerA,
  answerB,
  answerFormat = "multiple_choice",
  numericTolerance = 1e-6,
}) {
  if (answerA == null || answerB == null) return "inconclusive";

  // ── 1. Direct string equality (case + whitespace insensitive) ──
  const sa = String(answerA).trim().toLowerCase();
  const sb = String(answerB).trim().toLowerCase();
  if (sa === sb) return "equivalent";

  // ── 2. Multiple-choice: letter normalization ──
  if (answerFormat === "multiple_choice") {
    const la = normalizeLetter(answerA);
    const lb = normalizeLetter(answerB);
    if (la != null && lb != null) {
      return la === lb ? "equivalent" : "not_equivalent";
    }
    // One side didn't normalize → treat as inconclusive rather than
    // hallucinating an answer.
    return "inconclusive";
  }

  // ── 3. Numeric entry: try numeric match ──
  const na = normalizeNumeric(answerA);
  const nb = normalizeNumeric(answerB);
  if (na != null && nb != null) {
    if (Math.abs(na - nb) <= numericTolerance) return "equivalent";
    // Numerically distinct — still try SymPy in case one is in a
    // form that loses precision (e.g. "0.333333" vs "1/3" — already
    // handled by normalizeNumeric, but defense in depth).
  }

  // ── 4. SymPy bridge ──
  // Hand both raw strings to SymPy. The bridge handles caret-as-power
  // and implicit multiplication. If SymPy says equivalent, trust it.
  // If SymPy says no (and numeric also disagreed), confirmed not.
  // If SymPy says inconclusive (parse error, timeout), inconclusive.
  const eq = await areExpressionsEquivalent({
    expressionA: String(answerA),
    expressionB: String(answerB),
  });
  if (eq.equivalent === true) return "equivalent";
  if (eq.equivalent === false) return "not_equivalent";
  // Numeric match would've returned already if it succeeded; if we
  // got here with finite numbers that DIDN'T match, return not_equivalent.
  if (na != null && nb != null) return "not_equivalent";
  return "inconclusive";
}

// ── tallyAgreement ───────────────────────────────────────────

/**
 * Given an array of solver answers (strings), return:
 *   { consensus: <most-common>, count: <how many agreed>,
 *     unanimous: <bool>, splits: { ans -> count } }
 *
 * Letter normalization applied before tallying so "(A)" and "A"
 * count as the same vote. Nulls are filtered out (failed voter
 * doesn't count toward the tally — but its existence is recorded
 * separately via the grader_runs row).
 *
 * @param {Array<string|null|undefined>} answers
 * @param {"multiple_choice" | "numeric_entry"} answerFormat
 * @returns {{
 *   consensus: string | null,
 *   count: number,
 *   unanimous: boolean,
 *   splits: Record<string, number>,
 *   total_valid: number,
 * }}
 */
export function tallyAgreement(answers, answerFormat = "multiple_choice") {
  const splits = {};
  let totalValid = 0;
  for (const raw of answers) {
    const normalized =
      answerFormat === "multiple_choice"
        ? normalizeLetter(raw)
        : raw == null
          ? null
          : String(raw).trim();
    if (!normalized) continue;
    totalValid++;
    splits[normalized] = (splits[normalized] ?? 0) + 1;
  }
  if (totalValid === 0) {
    return { consensus: null, count: 0, unanimous: false, splits, total_valid: 0 };
  }
  const sorted = Object.entries(splits).sort((a, b) => b[1] - a[1]);
  const [topAns, topCount] = sorted[0];
  const unanimous = topCount === totalValid;
  return {
    consensus: topCount > totalValid / 2 ? topAns : null,
    count: topCount,
    unanimous,
    splits,
    total_valid: totalValid,
  };
}
