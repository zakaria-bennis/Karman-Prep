// ============================================================
// Diagnostic scoring engine.
//
// Replaces the old "average four math domain percentages and
// subtract 30 / add 30" rule, which (a) ignored Reading &
// Writing entirely and (b) recommended whatever domain had
// the lowest raw % even when the student was universally weak —
// producing absurd suggestions like "your focus area is
// Advanced Math" for a 260-320 scorer.
//
// New model:
//   1. Per-question difficulty-weighted accuracy per domain.
//   2. Section sub-scores (Math 200-800, R&W 200-800) rolled
//      from the 4 domains in each section.
//   3. Total predicted SAT range = section_low_sum ± 50.
//   4. Focus-area selection is FOUNDATION-AWARE:
//      · If foundation_index (% correct on difficulty-1
//        questions) < 60 → focus = "build foundations"
//        regardless of which domain is technically lowest.
//      · Otherwise → pick the domain with the lowest
//        difficulty-weighted score that has at least one
//        answered question.
//   5. Strongest domain only surfaces if the student got at
//      least 3 questions correct in that domain — otherwise
//      we honestly say "no clear strength yet."
// ============================================================

import { DOMAIN_SECTION, DOMAIN_LABELS, type SATDomain, type DomainScores } from "@/types";

export interface AnswerInput {
  questionId: string;
  domain: SATDomain;
  difficulty: 1 | 2 | 3;
  conceptId?: string;
  /** True if the student selected the correct answer. Skipped or
   *  blank questions are treated as incorrect. */
  correct: boolean;
}

export interface FocusArea {
  /** "foundation" = work on basic concepts across the board.
   *  "domain"     = the domain the student should target next. */
  type: "foundation" | "domain";
  /** Display label for the focus area. */
  label: string;
  /** A short explanation, written for the student. */
  detail: string;
  /** When type === "domain", the SATDomain enum value. */
  domain: SATDomain | null;
  /** Topic slugs the student missed that fed this recommendation. */
  weakTopics: string[];
}

export interface StrongestArea {
  domain: SATDomain;
  score: number;
  /** How many they got right in this domain. */
  correctCount: number;
}

export interface SectionScore {
  /** 200-800 SAT subscore. */
  low: number;
  high: number;
  /** Difficulty-weighted accuracy (0-100) used to derive the score. */
  accuracy: number;
}

export interface ScoredDiagnostic {
  /** Per-domain difficulty-weighted accuracy (0-100). 0 if the
   *  diagnostic didn't include any questions in that domain. */
  domainScores: DomainScores;
  /** SAT-style section subscores. */
  math: SectionScore;
  rw: SectionScore;
  /** Total predicted SAT range (400-1600). */
  totalLow: number;
  totalHigh: number;
  /** Recommended next focus. */
  focusArea: FocusArea;
  /** Student's strongest domain (or null if no clear strength). */
  strongest: StrongestArea | null;
  /** All topic slugs missed across the diagnostic, deduped. */
  weakConcepts: string[];
  /** Foundation index (% correct on difficulty-1 items, 0-100). */
  foundationIndex: number;
}

// ─────────────────────────────────────────────────────────────
// Per-domain difficulty-weighted accuracy
// ─────────────────────────────────────────────────────────────

function domainWeightedAccuracy(answers: AnswerInput[], domain: SATDomain): number {
  const inDomain = answers.filter((a) => a.domain === domain);
  if (inDomain.length === 0) return 0;
  const totalWeight = inDomain.reduce((s, a) => s + a.difficulty, 0);
  const correctWeight = inDomain.reduce((s, a) => s + (a.correct ? a.difficulty : 0), 0);
  return totalWeight === 0 ? 0 : Math.round((correctWeight / totalWeight) * 100);
}

function correctCountInDomain(answers: AnswerInput[], domain: SATDomain): number {
  return answers.filter((a) => a.domain === domain && a.correct).length;
}

function answeredCountInDomain(answers: AnswerInput[], domain: SATDomain): number {
  return answers.filter((a) => a.domain === domain).length;
}

// ─────────────────────────────────────────────────────────────
// Section-level (Math, R&W) accuracy → SAT 200-800 subscore
// ─────────────────────────────────────────────────────────────

function sectionAccuracy(answers: AnswerInput[], section: "math" | "rw"): number {
  const inSection = answers.filter((a) => DOMAIN_SECTION[a.domain] === section);
  if (inSection.length === 0) return 0;
  const totalWeight = inSection.reduce((s, a) => s + a.difficulty, 0);
  const correctWeight = inSection.reduce((s, a) => s + (a.correct ? a.difficulty : 0), 0);
  return totalWeight === 0 ? 0 : (correctWeight / totalWeight) * 100;
}

/** Rounds to the nearest 10 — SAT scores are always multiples of 10. */
function roundTo10(n: number): number {
  return Math.round(n / 10) * 10;
}

/** SAT-style section subscore. The ±30 band reflects the
 *  noise inherent in a 35-item diagnostic — full-form scores
 *  use much more data per section. All values are snapped to
 *  the nearest 10 because the SAT only reports in 10-point
 *  increments (no 739, no 859 — must be 740, 860). */
function sectionScore(accuracy: number): SectionScore {
  // Map 0-100 → 200-800. Slightly compressed at the bottom because
  // a student getting 10% right is still likely to score above 200
  // due to the SAT's scaled-score floor.
  const base = 200 + (accuracy / 100) * 600;
  const lifted = Math.max(220, base);
  const low = roundTo10(Math.max(200, lifted - 30));
  const high = roundTo10(Math.min(800, lifted + 30));
  return {
    low,
    high,
    accuracy: Math.round(accuracy),
  };
}

// ─────────────────────────────────────────────────────────────
// Focus area & strongest area selection
// ─────────────────────────────────────────────────────────────

function pickFocusArea(
  answers: AnswerInput[],
  domainScores: DomainScores,
  foundationIndex: number
): FocusArea {
  // Foundation pass — if the student is missing easy questions
  // across the board, no point sending them to "Advanced Math."
  if (foundationIndex < 60) {
    const missedFoundationals = answers
      .filter((a) => a.difficulty === 1 && !a.correct && a.conceptId)
      .map((a) => a.conceptId!) as string[];
    return {
      type: "foundation",
      label: "Build foundational skills first",
      detail:
        foundationIndex < 40
          ? "You missed many of the easier questions across multiple domains. Your learning path will start with the fundamentals — once those click, the harder material will follow."
          : "You handled some of the harder questions but slipped on a few foundational ones. Closing those basic gaps will lift every other domain you tackle next.",
      domain: null,
      weakTopics: Array.from(new Set(missedFoundationals)),
    };
  }

  // Domain pass — pick the domain with lowest difficulty-weighted
  // score AMONG domains the student answered at least one question in.
  const candidates = (Object.entries(domainScores) as [SATDomain, number][])
    .filter(([d]) => answeredCountInDomain(answers, d) > 0)
    .sort((a, b) => a[1] - b[1]);

  // Edge case — nothing answered. Shouldn't happen in practice.
  if (candidates.length === 0) {
    return {
      type: "foundation",
      label: "Build foundational skills first",
      detail: "Take the diagnostic again so we can recommend a focus area.",
      domain: null,
      weakTopics: [],
    };
  }

  const [weakestDomain, weakestScore] = candidates[0];
  const missedInDomain = answers
    .filter((a) => a.domain === weakestDomain && !a.correct && a.conceptId)
    .map((a) => a.conceptId!) as string[];
  return {
    type: "domain",
    label: DOMAIN_LABELS[weakestDomain],
    detail: `Your difficulty-weighted accuracy here was ${weakestScore}% — the lowest of any domain on this diagnostic. Your learning path will start with the topics you missed in this area.`,
    domain: weakestDomain,
    weakTopics: Array.from(new Set(missedInDomain)),
  };
}

function pickStrongest(answers: AnswerInput[], domainScores: DomainScores): StrongestArea | null {
  const eligible = (Object.entries(domainScores) as [SATDomain, number][])
    .map(([d, score]) => ({ domain: d, score, correctCount: correctCountInDomain(answers, d) }))
    // Need at least 3 correct to claim a "strength" — guards against
    // "lucked into 100% of 1 question" false positives.
    .filter((e) => e.correctCount >= 3)
    .sort((a, b) => b.score - a.score);
  return eligible.length > 0 ? eligible[0] : null;
}

// ─────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────

export function scoreDiagnostic(answers: AnswerInput[]): ScoredDiagnostic {
  const domainScores: DomainScores = {
    algebra: domainWeightedAccuracy(answers, "algebra"),
    advanced_math: domainWeightedAccuracy(answers, "advanced_math"),
    geometry: domainWeightedAccuracy(answers, "geometry"),
    data_analysis: domainWeightedAccuracy(answers, "data_analysis"),
    info_ideas: domainWeightedAccuracy(answers, "info_ideas"),
    craft_structure: domainWeightedAccuracy(answers, "craft_structure"),
    expression_ideas: domainWeightedAccuracy(answers, "expression_ideas"),
    conventions: domainWeightedAccuracy(answers, "conventions"),
  };

  const easyAnswers = answers.filter((a) => a.difficulty === 1);
  const foundationIndex =
    easyAnswers.length > 0
      ? Math.round((easyAnswers.filter((a) => a.correct).length / easyAnswers.length) * 100)
      : 100;

  const math = sectionScore(sectionAccuracy(answers, "math"));
  const rw = sectionScore(sectionAccuracy(answers, "rw"));

  // Total = sum of low/high section bounds, clamped to 400-1600.
  const totalLow = Math.max(400, math.low + rw.low);
  const totalHigh = Math.min(1600, math.high + rw.high);

  const focusArea = pickFocusArea(answers, domainScores, foundationIndex);
  const strongest = pickStrongest(answers, domainScores);

  const weakConcepts = Array.from(
    new Set(answers.filter((a) => !a.correct && a.conceptId).map((a) => a.conceptId!))
  );

  return {
    domainScores,
    math,
    rw,
    totalLow,
    totalHigh,
    focusArea,
    strongest,
    weakConcepts,
    foundationIndex,
  };
}
