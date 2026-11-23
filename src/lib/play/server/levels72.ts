/*
 * Server only. Each student's level on each of the 72 skills (student_skill72_levels, migration
 * 20261122040000). A skill with a row reads it; a skill without one reads the old sub-skill levels
 * through the bridge (src/lib/portal/skill-bridge.ts), so nothing a student earned before is lost.
 * A table not there yet reads as no rows, and a failed write is logged, never thrown into a quiz.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { bridgedLevel } from "@/lib/portal/skill-bridge";
import { SKILLS72 } from "@/lib/skills/ids72";
import { loadSkillLevels } from "@/lib/student/skill-levels-server";
import { clampLevel72 } from "../mastery";
import type { Level72 } from "../types";

const db = () => createAdminClient() as unknown as SupabaseClient;

export type Stored72 = Map<string, { level: Level72; sets: number }>;

/** Only the rows: the 72-skills this student has a level saved for. */
export async function readStored72(clerkId: string): Promise<Stored72> {
  const out: Stored72 = new Map();
  const { data, error } = await db()
    .from("student_skill72_levels")
    .select("skill_id, level, sets")
    .eq("student_id", clerkId)
    .limit(200)
    .then(
      (r) => r,
      () => ({ data: null, error: true })
    );
  if (error || !data) return out;
  for (const r of data as { skill_id: string; level: number; sets: number }[])
    out.set(r.skill_id, { level: clampLevel72(r.level), sets: r.sets ?? 0 });
  return out;
}

/** Every 72-skill's level by id: a saved row first, else the bridge from the old levels. */
export async function loadLevels72(
  clerkId: string
): Promise<{ levels: Map<string, Level72>; stored: Stored72 }> {
  const [stored, subs] = await Promise.all([
    readStored72(clerkId),
    loadSkillLevels(clerkId).catch(() => new Map()),
  ]);
  const levels = new Map<string, Level72>();
  for (const s of SKILLS72)
    levels.set(s.id, stored.get(s.id)?.level ?? (bridgedLevel(s.name, subs) as Level72));
  return { levels, stored };
}

/** Saves levels (and, for a finished skill set, one more set) for some 72-skills. */
export async function saveLevels72(
  clerkId: string,
  rows: { skillId: string; level: Level72; sets: number }[]
): Promise<void> {
  if (!rows.length) return;
  const now = new Date().toISOString();
  const { error } = await db()
    .from("student_skill72_levels")
    .upsert(
      rows.map((r) => ({
        student_id: clerkId,
        skill_id: r.skillId,
        level: r.level,
        sets: r.sets,
        updated_at: now,
      })),
      { onConflict: "student_id,skill_id" }
    )
    .then(
      (r) => r,
      (e: unknown) => ({ error: e })
    );
  if (error) console.error("[play] 72-skill levels not saved", error);
}
