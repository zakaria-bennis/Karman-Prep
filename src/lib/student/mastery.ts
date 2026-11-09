import type { ConfidenceBand, QuizDifficultyLevel } from "@/types/quiz";

/** Spec: Mastery model. One-parameter logistic ability, weighted by recency and difficulty. */
export type Observation = {
  correct: boolean;
  difficulty: QuizDifficultyLevel;
  /** Days between the answer and "now". */
  ageDays: number;
};

export const HALF_LIFE_DAYS = 30;
export const PRIOR_SD = 1.2;
export const TEST_DAY_DIFFICULTY = 5;
const SLOPE = 0.55;

export const hardness = (d: number) => (d - 4) * SLOPE;
export const recencyWeight = (ageDays: number) => 0.5 ** (Math.max(0, ageDays) / HALF_LIFE_DAYS);
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export type SkillEstimate = {
  ability: number;
  standardError: number;
  /** Weighted number of answers behind the estimate. */
  evidence: number;
  /** Chance of a difficulty-5 question right, 0 to 100. */
  mastery: number;
  band: ConfidenceBand | null;
  answered: number;
};

export function estimateSkill(obs: readonly Observation[]): SkillEstimate {
  const items = obs.map((o) => ({
    w: recencyWeight(o.ageDays),
    b: hardness(o.difficulty),
    y: +o.correct,
  }));
  const priorPrecision = 1 / PRIOR_SD ** 2;
  let theta = 0;
  let information = priorPrecision;
  for (let step = 0; step < 25; step++) {
    let gradient = -theta * priorPrecision;
    information = priorPrecision;
    for (const it of items) {
      const p = sigmoid(theta - it.b);
      gradient += it.w * (it.y - p);
      information += it.w * p * (1 - p);
    }
    const move = gradient / information;
    theta += Math.max(-1, Math.min(1, move));
    if (Math.abs(move) < 1e-6) break;
  }
  const standardError = 1 / Math.sqrt(information);
  const evidence = items.reduce((n, it) => n + it.w, 0);
  const hardRight = obs.reduce(
    (n, o) => n + (o.correct && o.difficulty >= TEST_DAY_DIFFICULTY ? recencyWeight(o.ageDays) : 0),
    0
  );
  const pAt5 = sigmoid(theta - hardness(TEST_DAY_DIFFICULTY));
  const lowAt5 = sigmoid(theta - standardError - hardness(TEST_DAY_DIFFICULTY));
  return {
    ability: theta,
    standardError,
    evidence,
    mastery: Math.round(pAt5 * 100),
    band: bandFor({ evidence, pAt5, lowAt5, hardRight }),
    answered: obs.length,
  };
}

export function bandFor(x: {
  evidence: number;
  pAt5: number;
  lowAt5: number;
  hardRight: number;
}): ConfidenceBand | null {
  if (x.evidence < 3) return null;
  if (x.lowAt5 >= 0.8 && x.evidence >= 8 && x.hardRight >= 2) return "mastered";
  if (x.pAt5 >= 0.6) return "proficient";
  if (x.pAt5 >= 0.35) return "developing";
  return "struggling";
}

/** What a student reads. Tutors and the database keep the stored value. */
export const BAND_LABEL: Record<ConfidenceBand | "none", string> = {
  none: "Not started",
  struggling: "Needs work",
  developing: "Developing",
  proficient: "Proficient",
  mastered: "Mastered",
};

export const BAND_ORDER: readonly (ConfidenceBand | null)[] = [
  null,
  "struggling",
  "developing",
  "proficient",
  "mastered",
];
