/*
 * Reinforce (founder, 2026-11-22 round 2): after an exam, the skills that cost the most points. A missed
 * scored question's cost is how much the section score would rise had it been right: the section is
 * re-scored with that one answer turned right (the same maximum-likelihood estimate as the real score,
 * unrounded), and the costs add up per skill (the 72). The word is "Reinforce", never "Fix it". Pure.
 */
import { mle } from "@/lib/sat-engine/irt";
import { paramsOf } from "@/lib/sat-engine/params";
import { rawScale } from "@/lib/sat-engine/scale";
import { skill72 } from "@/lib/skills/ids72";
import type { ExamSection } from "./plan";

export type ScoredAnswer = {
  section: ExamSection;
  item: Parameters<typeof paramsOf>[0];
  correct: boolean;
  trial: boolean;
  /** The question's skill among the 72, when tagged. */
  skill72: string | null;
};

export type ReinforceSkill = {
  skillId: string;
  name: string;
  /** Scale points the misses in this skill cost, rounded. */
  points: number;
  missed: number;
  total: number;
};

/** How many scale points each scored miss cost, in answer order (0 for right answers and trial questions). */
export function missCosts(answers: readonly ScoredAnswer[]): number[] {
  const costs = answers.map(() => 0);
  for (const section of ["reading", "math"] as const) {
    const indexes = answers.flatMap((a, i) => (a.section === section && !a.trial ? [i] : []));
    if (!indexes.length) continue;
    const responses = indexes.map((i) => ({
      item: paramsOf(answers[i].item),
      correct: answers[i].correct,
    }));
    const base = rawScale(section, mle(responses).theta);
    indexes.forEach((answerIndex, k) => {
      if (answers[answerIndex].correct) return;
      const flipped = responses.map((r, j) => (j === k ? { ...r, correct: true } : r));
      const gain = Math.min(800, rawScale(section, mle(flipped).theta)) - Math.min(800, base);
      costs[answerIndex] = Math.max(0, gain);
    });
  }
  return costs;
}

/** Every skill with a scored miss, the costliest first. The ending shows three, then See all. */
export function reinforceSkills(answers: readonly ScoredAnswer[]): ReinforceSkill[] {
  const costs = missCosts(answers);
  const bySkill = new Map<string, { points: number; missed: number; total: number }>();
  answers.forEach((a, i) => {
    if (a.trial || !a.skill72) return;
    const s = bySkill.get(a.skill72) ?? { points: 0, missed: 0, total: 0 };
    s.total++;
    if (!a.correct) {
      s.missed++;
      s.points += costs[i];
    }
    bySkill.set(a.skill72, s);
  });
  return [...bySkill.entries()]
    .filter(([, s]) => s.missed > 0)
    .map(([skillId, s]) => ({
      skillId,
      name: skill72(skillId)?.name ?? "A skill",
      points: Math.max(1, Math.round(s.points)),
      missed: s.missed,
      total: s.total,
    }))
    .sort((a, b) => b.points - a.points || b.missed - a.missed);
}
