/*
 * Pacing in the exam debrief (founder, 2026-11-22 round 2): each question marked too fast, on pace or too
 * slow against the time a question of its kind takes. Expected time is per skill (the 72) and longer for
 * harder questions. It starts from the seeds below (a module's average is 71 seconds a question in Reading
 * and Writing and 95 in Math) and is learned from real students: once 30 answers on a skill and difficulty
 * band are in, their median replaces the seed (exam_pace_norms, written after each finished exam). Pure.
 */
import { skill72 } from "@/lib/skills/ids72";
import type { ModuleKey } from "./plan";

/** Seconds a middle-difficulty question takes, by domain, then by skill where it differs. */
const DOMAIN_SECONDS: Record<string, number> = {
  "Information and Ideas": 85,
  "Craft and Structure": 70,
  "Expression of Ideas": 60,
  "Standard English Conventions": 45,
  Algebra: 75,
  "Advanced Math": 95,
  "Problem-Solving and Data Analysis": 95,
  "Geometry and Trigonometry": 100,
};
const SKILL_SECONDS: Record<string, number> = {
  "rw-precise-word-choice": 50,
  "rw-advanced-vocabulary": 50,
  "rw-meaning-in-context": 55,
  "rw-comparing-two-texts": 100,
  "rw-responding-across-texts": 100,
  "rw-reading-tables": 95,
  "rw-reading-graphs": 95,
  "m-solving-linear-equations": 60,
  "m-percentages": 80,
  "m-ratios-and-proportions": 80,
  "m-units-and-conversions": 80,
};

export type Band = "easy" | "medium" | "hard";
export const bandOf = (difficulty: number): Band =>
  difficulty <= 2 ? "easy" : difficulty <= 5 ? "medium" : "hard";
const BAND_FACTOR: Record<Band, number> = { easy: 0.75, medium: 1, hard: 1.35 };

/** Learned medians by `${skillId}|${band}`. */
export type PaceNorms = ReadonlyMap<string, number>;
export const NORM_MIN_ANSWERS = 30;

export function expectedSeconds(
  skillId: string | null,
  difficulty: number,
  norms: PaceNorms
): number {
  const band = bandOf(difficulty);
  const learned = skillId ? norms.get(`${skillId}|${band}`) : undefined;
  if (learned) return learned;
  const base =
    (skillId && SKILL_SECONDS[skillId]) ||
    (skillId && DOMAIN_SECONDS[skill72(skillId)?.domain ?? ""]) ||
    80;
  return Math.round(base * BAND_FACTOR[band]);
}

export type Mark = "fast" | "pace" | "slow" | "blank";

export function markOf(seconds: number, expected: number, answered: boolean): Mark {
  if (!answered) return "blank";
  if (seconds < expected * 0.4) return "fast";
  if (seconds > expected * 1.6) return "slow";
  return "pace";
}

export type PacedAnswer = {
  module: ModuleKey;
  skill72: string | null;
  difficulty: number;
  seconds: number;
  answered: boolean;
};

export type Pacing = {
  modules: { key: ModuleKey; marks: Mark[] }[];
  /** The three questions furthest over their expected time. */
  slowest: {
    module: ModuleKey;
    number: number;
    seconds: number;
    expected: number;
    skill: string;
  }[];
};

export function buildPacing(answers: readonly PacedAnswer[], norms: PaceNorms): Pacing {
  const modules: Pacing["modules"] = [];
  const over: (Pacing["slowest"][number] & { ratio: number })[] = [];
  for (const key of ["rw1", "rw2", "m1", "m2"] as const) {
    const inModule = answers.filter((a) => a.module === key);
    if (!inModule.length) continue;
    modules.push({
      key,
      marks: inModule.map((a, i) => {
        const expected = expectedSeconds(a.skill72, a.difficulty, norms);
        const mark = markOf(a.seconds, expected, a.answered);
        if (mark === "slow")
          over.push({
            module: key,
            number: i + 1,
            seconds: a.seconds,
            expected,
            skill: (a.skill72 && skill72(a.skill72)?.name) || "A question",
            ratio: a.seconds / expected,
          });
        return mark;
      }),
    });
  }
  const slowest = over
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3)
    .map(({ ratio: _ratio, ...rest }) => rest);
  return { modules, slowest };
}

/** Median of a list (for learning norms). */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
