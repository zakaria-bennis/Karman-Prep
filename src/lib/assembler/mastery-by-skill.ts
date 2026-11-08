/*
 * Mastery estimates per catalog skill from the student's run answers, for the Daily 10's
 * weak-skills-first pick. Split out of runs.ts.
 */
import { loadStoredLevels } from "@/lib/levels/server";
import { estimateSkill } from "@/lib/student/mastery";
import { subSkillsOfSkill } from "@/lib/subskills/taxonomy";
import type { QuizDifficultyLevel } from "@/types/quiz";
import { answeredInRuns } from "./run-store";

/** Mastery estimates per skill from the student's run answers (for weak skills first). */
export async function masteryBySkill(clerkId: string, now: Date): Promise<Map<string, number>> {
  const levels = await loadStoredLevels(clerkId);
  const out = new Map<string, number>();
  const history = await answeredInRuns(clerkId);
  if (!history.size) return out;
  // Observations come from saved run answers, with difficulty, newest first.
  const { createAdminClient } = await import("@/lib/supabase/server");
  const { data } = await createAdminClient()
    .from("quiz_run_responses" as never)
    .select("skill_id, difficulty, is_correct, answered_at, run_id, quiz_runs!inner(student_id)")
    .eq("quiz_runs.student_id", clerkId)
    .order("answered_at", { ascending: false })
    .limit(800);
  const bySkill = new Map<string, { correct: boolean; difficulty: number; ageDays: number }[]>();
  for (const row of (data ?? []) as {
    skill_id: string;
    difficulty: number;
    is_correct: boolean;
    answered_at: string;
  }[]) {
    const list = bySkill.get(row.skill_id) ?? [];
    list.push({
      correct: row.is_correct,
      difficulty: row.difficulty,
      ageDays: (now.getTime() - Date.parse(row.answered_at)) / 86_400_000,
    });
    bySkill.set(row.skill_id, list);
  }
  for (const [skillId, obs] of bySkill) {
    if (!subSkillsOfSkill(skillId).some((s) => levels.has(s.id)) && !levels.has(skillId)) continue;
    out.set(
      skillId,
      estimateSkill(obs.map((o) => ({ ...o, difficulty: o.difficulty as QuizDifficultyLevel })))
        .mastery
    );
  }
  return out;
}
