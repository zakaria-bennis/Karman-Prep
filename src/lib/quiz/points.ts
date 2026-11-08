import { createAdminClient } from "@/lib/supabase/server";

export type AwardPoints = 0 | 10 | 15;
export const HARD_FROM = 5;

/** 10 points per correct answer in instant mode, 15 when the internal difficulty is 5 to 7. */
export function pointsFor(correct: boolean, difficulty: number): AwardPoints {
  if (!correct) return 0;
  return difficulty >= HARD_FROM ? 15 : 10;
}

/** Records an award once per key. Returns the points awarded now, or 0 if the key already existed. */
export async function awardPoints(
  key: string,
  clerkId: string,
  points: 10 | 15,
  skillId: string | null
): Promise<AwardPoints> {
  const { data, error } = await createAdminClient()
    .from("student_point_awards")
    .upsert(
      { award_key: key, student_id: clerkId, points, skill_id: skillId },
      { onConflict: "award_key", ignoreDuplicates: true }
    )
    .select();
  if (error) throw error;
  return data && data.length ? points : 0;
}

/** Awards points for a graded answer; never throws into grading (points are a reward, not a record). */
export async function awardForAnswer(input: {
  key: string;
  clerkId: string | null;
  correct: boolean;
  difficulty: number;
  skillId: string | null;
}): Promise<AwardPoints> {
  const points = pointsFor(input.correct, input.difficulty);
  if (!points || !input.clerkId) return 0;
  try {
    return await awardPoints(input.key, input.clerkId, points, input.skillId);
  } catch {
    return 0;
  }
}
