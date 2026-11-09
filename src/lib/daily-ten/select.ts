/*
 * Choosing a student's Daily 10 (pure; the server loads the inputs).
 *
 * Five Reading and Writing questions, then five Math, one skill per question:
 * - Weak skills first: tried skills still at New or Learning, lowest level first, then the
 *   lowest estimated chance of a difficulty-5 question right.
 * - Spaced review: skills at Learning or above whose last practice is older than their
 *   interval (3, 7 and 14 days for Learning, Understanding and Conquered), most overdue first.
 *   Mixed check-ins like this bring old skills back before they decay.
 * - New skills: skills the student has not tried yet, so the Daily 10 widens over time.
 * Each question's difficulty follows the skill's level, inside the plan's pool (core 1 to 5,
 * mastery 1 to 7). Questions never answered come first, then the least recently answered.
 * No two questions share a family.
 */
import { stableHash } from "@/lib/catalog-practice/picker";
import type { SkillLevel } from "@/lib/levels/rules";

export type DailySkill = {
  skillId: string;
  section: "reading" | "math";
  /** Effective level after decay. */
  level: SkillLevel;
  lastPracticedAt: string | null;
  /** Chance of a difficulty-5 question right, 0 to 100, from the mastery estimate. Null if unknown. */
  mastery: number | null;
};

export type DailyCandidate = {
  questionId: string;
  skillId: string;
  difficulty: number;
  family: string;
  /** Last time this student answered it, if ever. */
  answeredAt: string | null;
};

export const DAILY_TEN_PER_SECTION = 5;
const REVIEW_DAYS: Record<number, number> = { 2: 3, 3: 7, 4: 14 };
const DAY_MS = 86_400_000;

/** The difficulty a skill's Daily 10 question aims for, by level. */
export function targetDifficulty(level: SkillLevel, maxDifficulty: number): number {
  const target = [3, 2, 3, 4, 6][level];
  return Math.min(target, maxDifficulty);
}

type Slot = { skill: DailySkill; why: "weak" | "review" | "new" | "more" };

/** The order skills are offered in for one section. */
export function rankSkills(skills: readonly DailySkill[], now: Date, seed: string): Slot[] {
  const tie = (a: DailySkill, b: DailySkill) =>
    stableHash(`${seed}:${a.skillId}`) - stableHash(`${seed}:${b.skillId}`);
  const idleDays = (s: DailySkill) =>
    s.lastPracticedAt ? (now.getTime() - Date.parse(s.lastPracticedAt)) / DAY_MS : Infinity;
  const weak = skills
    .filter((s) => s.level === 1 || s.level === 2)
    .sort((a, b) => a.level - b.level || (a.mastery ?? 50) - (b.mastery ?? 50) || tie(a, b));
  const review = skills
    .filter((s) => s.level >= 2 && idleDays(s) >= REVIEW_DAYS[s.level])
    .sort(
      (a, b) => idleDays(b) / REVIEW_DAYS[b.level] - idleDays(a) / REVIEW_DAYS[a.level] || tie(a, b)
    );
  const fresh = skills.filter((s) => s.level === 0).sort(tie);
  const rest = [...skills].sort((a, b) => idleDays(b) - idleDays(a) || tie(a, b));

  // The pattern for five slots: weak, weak, review, new, weak; then whatever is left.
  const pattern: Slot["why"][] = ["weak", "weak", "review", "new", "weak"];
  const queues: Record<Slot["why"], DailySkill[]> = { weak, review, new: fresh, more: rest };
  const taken = new Set<string>();
  const out: Slot[] = [];
  const take = (why: Slot["why"]): boolean => {
    const next = queues[why].find((s) => !taken.has(s.skillId));
    if (!next) return false;
    taken.add(next.skillId);
    out.push({ skill: next, why });
    return true;
  };
  for (const why of pattern) {
    if (take(why)) continue;
    // Fall back in a fixed order so a brand-new student still gets a full set.
    (["new", "weak", "review", "more"] as const).some(take);
  }
  while ((["weak", "review", "new", "more"] as const).some(take));
  return out;
}

function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/** The question for one slot: nearest the target difficulty, never answered first. */
function pickQuestion(
  candidates: readonly DailyCandidate[],
  target: number,
  maxDifficulty: number,
  usedFamilies: Set<string>,
  seed: string
): DailyCandidate | null {
  let best: DailyCandidate | null = null;
  let bestKey: number[] | null = null;
  for (const c of candidates) {
    if (c.difficulty > maxDifficulty || usedFamilies.has(c.family)) continue;
    // Never answered first, then nearest the target, then least recently answered, then seeded.
    const key = [
      c.answeredAt ? 1 : 0,
      Math.abs(c.difficulty - target),
      c.answeredAt ? Date.parse(c.answeredAt) : 0,
      stableHash(`${seed}:${c.questionId}`),
    ];
    if (!bestKey || lexLess(key, bestKey)) {
      best = c;
      bestKey = key;
    }
  }
  return best;
}

export type DailyPick = { questionId: string; skillId: string; why: Slot["why"] };

/**
 * Today's ten. `candidates` maps a skill id to its admitted questions. Returns fewer than ten
 * only when the pools cannot supply them.
 */
export function selectDailyTen(input: {
  skills: readonly DailySkill[];
  candidates: ReadonlyMap<string, readonly DailyCandidate[]>;
  maxDifficulty: number;
  now: Date;
  seed: string;
}): DailyPick[] {
  const used = new Set<string>();
  const picks: DailyPick[] = [];
  for (const section of ["reading", "math"] as const) {
    let count = 0;
    for (const slot of rankSkills(
      input.skills.filter((s) => s.section === section),
      input.now,
      `${input.seed}:${section}`
    )) {
      if (count >= DAILY_TEN_PER_SECTION) break;
      const question = pickQuestion(
        input.candidates.get(slot.skill.skillId) ?? [],
        targetDifficulty(slot.skill.level, input.maxDifficulty),
        input.maxDifficulty,
        used,
        input.seed
      );
      if (!question) continue;
      used.add(question.family);
      picks.push({ questionId: question.questionId, skillId: slot.skill.skillId, why: slot.why });
      count++;
    }
  }
  return picks;
}

/** Skills whose pools the server should load for today: enough to fill five per section. */
export function skillsToLoad(skills: readonly DailySkill[], now: Date, seed: string): string[] {
  return (["reading", "math"] as const).flatMap((section) =>
    rankSkills(
      skills.filter((s) => s.section === section),
      now,
      `${seed}:${section}`
    )
      .slice(0, DAILY_TEN_PER_SECTION + 3)
      .map((slot) => slot.skill.skillId)
  );
}
