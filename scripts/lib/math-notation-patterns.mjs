// ============================================================
// math-notation-patterns — Phase 5 detection layer.
//
// Pure regex. No IO. No LLM. Given a string, returns the list of
// suspicious OCR-mangled math notation patterns it found, the
// candidate repair(s) for each, the default risk tier, and an
// explanation. The classifier in math-notation-logic.mjs takes
// these detections, layers in vision-confirmation + solver-vote +
// answer-key context, and decides whether ANY can be auto-applied.
//
// Detection categories (matching the Phase 5 outline):
//
//   bare_digit_after_letter  (low_risk_ocr)
//      x2  → x^2          (most common SAT-PDF OCR loss)
//      y3  → y^3
//      Excluded: CO2, H2O, 2x  (chem subscripts / coefficients)
//      Excluded: x12        (multi-digit — likely intentional name)
//
//   ambiguous_fraction       (medium_risk_grouping)
//      1/2x   could be (1/2)x  OR  1/(2x)
//      Candidates: both. Vision + solver picks.
//
//   ambiguous_rational       (medium_risk_grouping)
//      x+1/x-1  could be (x+1)/(x-1)  OR  x + (1/x) - 1
//      Candidates: both. Vision + solver picks.
//
//   sqrt_without_parens      (medium_risk_grouping)
//      sqrt x+1   or   √x+1
//      Candidates: sqrt(x+1)   vs   sqrt(x)+1
//
// IMPORTANT: This file is the SOURCE OF TRUTH for the regexes.
// Tests live at src/lib/pipeline-v2/math-notation-patterns.test.ts
// and exercise both true-positive and false-positive cases.
// ============================================================

export const PHASE5_VERSION = "phase5_math_repair_v1";

// Risk tier enum — mirrored from the migration's CHECK constraint.
export const RISK_TIERS = Object.freeze({
  LOW_RISK_OCR: "low_risk_ocr",
  MEDIUM_RISK_GROUPING: "medium_risk_grouping",
  HIGH_RISK_ANSWER_CHANGING: "high_risk_answer_changing",
  OPEN_ENDED_UNCERTAIN: "open_ended_uncertain",
  VISUAL_UNCLEAR: "visual_unclear",
});

// Detection pattern slugs — written to math_repair_records.detection_pattern.
// App-enforced (no DB CHECK) so we can add patterns without a migration.
export const DETECTION_PATTERNS = Object.freeze({
  BARE_DIGIT_AFTER_LETTER: "bare_digit_after_letter",
  AMBIGUOUS_FRACTION: "ambiguous_fraction",
  AMBIGUOUS_RATIONAL: "ambiguous_rational",
  SQRT_WITHOUT_PARENS: "sqrt_without_parens",
});

// ── Pattern 1: bare digit after single variable letter ────────
//
// MATCHES:  x2, y3, a4, b2   (single letter followed by single digit)
//           also tolerates surrounding whitespace boundaries.
//
// DOES NOT MATCH:
//   - CO2, H2O, NaCl3  (uppercase chem — preceded by another uppercase
//                       letter; chem subscripts are intentional)
//   - 2x, 3y  (coefficient — digit BEFORE letter, not after)
//   - x12, x123  (multi-digit — likely a variable name like x_12)
//   - log2, sin2 (these are SAT-legal: sin²x is written sin2x in OCR
//                  BUT we don't auto-repair function-name forms; the
//                  classifier handles via medium_risk by passing the
//                  match through to review only)
//
// We use a lookbehind to require the letter is NOT preceded by another
// alpha character — that's what filters out "CO2" / "log2".
// AND a lookahead requiring the digit is NOT followed by another alpha
// character — that's what filters out "H2O" / "Na2SO4" where the digit
// is a chemistry subscript bracketed by element symbols.
// Single-digit only via [0-9](?![0-9]).
//
// Trade-off: this also blocks "e2x" (e^(2x)) — a digit-between-letters
// is too ambiguous to repair with ONE canonical candidate. Such cases
// drop out of regex detection entirely and only surface if the solver
// flags them via answer disagreement (Phase 5.5 territory).
const BARE_DIGIT_AFTER_LETTER_RE = /(?<![A-Za-z])([a-zA-Z])([0-9])(?![0-9A-Za-z])/g;

// ── Pattern 2: ambiguous fraction ──────────────────────────────
//
// MATCHES:  1/2x, 3/4y, 5/6z   (integer over integer adjacent to var)
//           Captures the full "N/M<var>" span.
//
// DOES NOT MATCH:
//   - 1/2 + x       (separated by spaces and operator)
//   - 1/2           (no trailing variable)
//   - x/2           (variable in numerator — not the ambiguous case)
//
const AMBIGUOUS_FRACTION_RE = /\b(\d+)\/(\d+)([a-zA-Z])\b/g;

// ── Pattern 3: ambiguous rational expression ───────────────────
//
// MATCHES:  x+1/x-1, x-1/x+1, 2x+3/4x-5   (binomial / binomial)
//
// The core trap: the OCR layer rendered something that looks like a
// fraction-of-binomials WITHOUT parentheses. SAT PDFs commonly print
// (x+1)/(x-1) and OCR loses the parens.
//
// Strategy: match any binomial-shaped string (term op term) on both
// sides of a slash, then post-filter to require BOTH sides contain
// at least one variable — that's what distinguishes a rational
// expression from plain arithmetic like `1+2/3-4`.
//
// A "term" is: optional digits + optional letter (e.g. "2x", "x", "3").
const RATIONAL_TERM = "(?:\\d*[a-zA-Z]|\\d+)";
const RATIONAL_BINOMIAL = `(?:${RATIONAL_TERM}\\s*[+\\-]\\s*${RATIONAL_TERM})`;
const AMBIGUOUS_RATIONAL_RE = new RegExp(
  `(?<![a-zA-Z()/])(${RATIONAL_BINOMIAL})\\s*\\/\\s*(${RATIONAL_BINOMIAL})(?![a-zA-Z()/])`,
  "g"
);

function hasLetter(s) {
  return /[a-zA-Z]/.test(s);
}

// ── Pattern 4: sqrt without parens ─────────────────────────────
//
// MATCHES:  sqrt x+1, sqrt 2x-3, √x+1, √2x+1
// Captures the full radical + its candidate operand span.
//
// Uses (?<![a-zA-Z]) instead of \b because \b doesn't fire between
// a space and the non-word unicode char "√" — both sides are
// non-word, so there's no boundary to anchor on.
const SQRT_WITHOUT_PARENS_RE =
  /(?<![a-zA-Z])(sqrt|√)\s*([a-zA-Z\d][a-zA-Z\d\s]*[+\-]\s*[a-zA-Z\d]+)/gi;

// ── Public detection API ──────────────────────────────────────

/**
 * Detect bare-digit-after-letter occurrences and produce a single
 * canonical repair (insert a caret between the letter and the digit).
 *
 * @param {string} text
 * @returns {Array<{
 *   pattern: string,
 *   risk_tier: string,
 *   match: string,
 *   start: number,
 *   end: number,
 *   candidates: string[]   // ordered most-to-least likely
 * }>}
 */
export function detectBareDigitAfterLetter(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const detections = [];
  for (const m of text.matchAll(BARE_DIGIT_AFTER_LETTER_RE)) {
    const [whole, letter, digit] = m;
    detections.push({
      pattern: DETECTION_PATTERNS.BARE_DIGIT_AFTER_LETTER,
      risk_tier: RISK_TIERS.LOW_RISK_OCR,
      match: whole,
      start: m.index ?? -1,
      end: (m.index ?? -1) + whole.length,
      // Only one obvious repair: insert caret.
      candidates: [`${letter}^${digit}`],
    });
  }
  return detections;
}

/**
 * Detect "N/Mx" — ambiguous fraction adjacent to a variable.
 * Emits BOTH grouping interpretations as candidates; downstream
 * vision/solver picks. Tier defaults to medium_risk_grouping.
 */
export function detectAmbiguousFraction(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const detections = [];
  for (const m of text.matchAll(AMBIGUOUS_FRACTION_RE)) {
    const [whole, num, den, variable] = m;
    detections.push({
      pattern: DETECTION_PATTERNS.AMBIGUOUS_FRACTION,
      risk_tier: RISK_TIERS.MEDIUM_RISK_GROUPING,
      match: whole,
      start: m.index ?? -1,
      end: (m.index ?? -1) + whole.length,
      candidates: [
        // Most-likely first: SAT convention reads "1/2x" as (1/2)x.
        `(${num}/${den})${variable}`,
        `${num}/(${den}${variable})`,
      ],
    });
  }
  return detections;
}

/**
 * Detect "x+1/x-1" style ambiguous rational expressions.
 *
 * Post-filters out matches where neither side has a letter
 * (plain arithmetic like 1+2/3-4 is not a Phase 5 target).
 */
export function detectAmbiguousRational(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const detections = [];
  for (const m of text.matchAll(AMBIGUOUS_RATIONAL_RE)) {
    const [whole, num, den] = m;
    // Require BOTH sides to contain a variable — otherwise it's arithmetic.
    if (!hasLetter(num) || !hasLetter(den)) continue;
    detections.push({
      pattern: DETECTION_PATTERNS.AMBIGUOUS_RATIONAL,
      risk_tier: RISK_TIERS.MEDIUM_RISK_GROUPING,
      match: whole,
      start: m.index ?? -1,
      end: (m.index ?? -1) + whole.length,
      candidates: [
        // Parens-around-both is the dominant SAT printing.
        `(${num.trim()})/(${den.trim()})`,
        // Alternative: left side stands alone, fraction is num/den-first-term.
        `${num.trim()}/${den.trim()}`,
      ],
    });
  }
  return detections;
}

/**
 * Detect "sqrt x+1" / "√x+1" — radical with no parens around its operand.
 */
export function detectSqrtWithoutParens(text) {
  if (typeof text !== "string" || text.length === 0) return [];
  const detections = [];
  for (const m of text.matchAll(SQRT_WITHOUT_PARENS_RE)) {
    const [whole, radical, operand] = m;
    const trimmed = operand.trim();
    // operand always contains an arithmetic op by construction; split
    // on the first +/- to produce the "+1 outside" candidate.
    const firstOp = trimmed.search(/[+\-]/);
    const inside = trimmed.slice(0, firstOp).trim();
    const outside = trimmed.slice(firstOp).trim();
    detections.push({
      pattern: DETECTION_PATTERNS.SQRT_WITHOUT_PARENS,
      risk_tier: RISK_TIERS.MEDIUM_RISK_GROUPING,
      match: whole,
      start: m.index ?? -1,
      end: (m.index ?? -1) + whole.length,
      candidates: [
        // Most-common SAT printing: radical wraps the whole operand.
        `${radical}(${trimmed})`,
        // Alternative: only first token under radical, rest outside.
        `${radical}(${inside})${outside}`,
      ],
    });
  }
  return detections;
}

/**
 * Run every detector and return a unified list of detections. Each
 * detector is independent — overlapping matches (e.g. an ambiguous
 * fraction whose denominator happens to look like x2) are kept
 * separately so the classifier can decide.
 */
export function detectAllPatterns(text) {
  return [
    ...detectBareDigitAfterLetter(text),
    ...detectAmbiguousFraction(text),
    ...detectAmbiguousRational(text),
    ...detectSqrtWithoutParens(text),
  ];
}

/**
 * Apply a single repair candidate to the source text by replacing the
 * exact byte range. Returns the new string.
 *
 * The detection.start / detection.end span is what was matched;
 * candidate is the new substring. We do NOT use string.replace —
 * the same byte sequence might appear multiple times and we want
 * to repair ONLY the one we detected.
 */
export function applyRepair(text, detection, candidate) {
  if (typeof text !== "string") throw new TypeError("text must be a string");
  if (!detection || typeof detection.start !== "number" || typeof detection.end !== "number") {
    throw new TypeError("detection must have numeric start/end offsets");
  }
  if (typeof candidate !== "string") throw new TypeError("candidate must be a string");
  return text.slice(0, detection.start) + candidate + text.slice(detection.end);
}
