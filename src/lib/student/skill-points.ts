import type { QuizDifficultyLevel } from "@/types/quiz";

/** One row of the quiz-engine table `student_point_awards` (with its `skill_id`). */
export type PointAward = {
  awardKey: string;
  skillId: string | null;
  points: number;
  createdAt: string;
};

/** Same rule as the quiz-engine `pointsFor`: 10 for a right answer, 15 at difficulty 5+. */
export function pointsForAnswer(correct: boolean, difficulty: QuizDifficultyLevel): 0 | 10 | 15 {
  if (!correct) return 0;
  return difficulty >= 5 ? 15 : 10;
}

export type SkillPoints = { total: number; week: number };

export function summarisePoints(
  awards: readonly PointAward[],
  nowMs: number
): { total: number; week: number; bySkill: Map<string, SkillPoints> } {
  const weekAgo = nowMs - 7 * 86_400_000;
  const seen = new Set<string>();
  const bySkill = new Map<string, SkillPoints>();
  let total = 0;
  let week = 0;
  for (const a of awards) {
    // award_key is the primary key; a repeated key is one award.
    if (seen.has(a.awardKey)) continue;
    seen.add(a.awardKey);
    const recent = Date.parse(a.createdAt) >= weekAgo;
    total += a.points;
    if (recent) week += a.points;
    if (!a.skillId) continue;
    const s = bySkill.get(a.skillId) ?? { total: 0, week: 0 };
    s.total += a.points;
    if (recent) s.week += a.points;
    bySkill.set(a.skillId, s);
  }
  return { total, week, bySkill };
}
