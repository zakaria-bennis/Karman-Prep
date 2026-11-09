/*
 * Server only. Reads and writes `student_skill_levels`. The rules live in `./rules.ts`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { createAdminClient } from "@/lib/supabase/server";
import { clampLevel } from "@/components/portal/skill-levels";
import { subSkillsOfSkill } from "@/lib/subskills/taxonomy";
import { NOT_STARTED, effective, nextDecayAt, type LevelState, type SkillLevel } from "./rules";

/**
 * A catalog skill's state from its sub-skills (founder, 2026-11-08: levels live per sub-skill).
 * The weakest practiced sub-skill speaks for the skill, so the Daily 10 brings it back. A level
 * saved against the whole skill before sub-skills existed counts when no sub-skill has one.
 */
export function skillStateOf(
  stored: ReadonlyMap<string, LevelState>,
  skillId: string,
  now = new Date()
): LevelState {
  const states = subSkillsOfSkill(skillId)
    .map((s) => stored.get(s.id))
    .filter((s): s is LevelState => !!s);
  if (!states.length) return stored.get(skillId) ?? NOT_STARTED;
  return states.reduce((a, b) => (effective(b, now).level < effective(a, now).level ? b : a));
}

const rowSchema = z.object({
  skill_id: z.string(),
  level: z.number().int(),
  run: z.number().int(),
  answered: z.number().int(),
  last_practiced_at: z.string().nullable(),
});

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

/** Stored states by skill id (before decay). Skills never answered are absent. */
export async function loadStoredLevels(clerkId: string): Promise<Map<string, LevelState>> {
  const { data, error } = await db()
    .from("student_skill_levels")
    .select("skill_id, level, run, answered, last_practiced_at")
    .eq("student_id", clerkId);
  if (error) throw new Error("Skill levels could not be loaded");
  const out = new Map<string, LevelState>();
  for (const row of z.array(rowSchema).parse(data ?? [])) {
    out.set(row.skill_id, {
      level: clampLevel(row.level),
      run: row.run,
      answered: row.answered,
      lastPracticedAt: row.last_practiced_at,
    });
  }
  return out;
}

export async function saveLevels(
  clerkId: string,
  states: ReadonlyMap<string, LevelState>
): Promise<void> {
  if (!states.size) return;
  const rows = [...states].map(([skillId, s]) => ({
    student_id: clerkId,
    skill_id: skillId,
    level: s.level,
    run: Math.min(100, s.run),
    answered: s.answered,
    last_practiced_at: s.lastPracticedAt,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db()
    .from("student_skill_levels")
    .upsert(rows, { onConflict: "student_id,skill_id" });
  if (error) throw new Error("Skill levels could not be saved");
}

export type SkillLevelView = {
  skillId: string;
  label: string;
  subject: "reading" | "math";
  domainId: string;
  domainLabel: string;
  /** After decay, as of now. */
  level: SkillLevel;
  /** Right answers in a row so far toward the next level. */
  run: number;
  lastPracticedAt: string | null;
  /** When the skill next drops a level if left alone; null when it cannot drop. */
  decaysAt: string | null;
};

/** Every catalog skill with its level as it stands now. For the student portal and results. */
export async function loadSkillLevels(
  clerkId: string,
  now = new Date()
): Promise<SkillLevelView[]> {
  const stored = await loadStoredLevels(clerkId);
  return CATALOG_SKILLS.map((skill) => {
    const state = effective(skillStateOf(stored, skill.id, now), now);
    return {
      skillId: skill.id,
      label: skill.label,
      subject: skill.subject === "math" ? "math" : "reading",
      domainId: skill.domainId,
      domainLabel: skill.domainLabel,
      level: state.level,
      run: state.run,
      lastPracticedAt: state.lastPracticedAt,
      decaysAt: nextDecayAt(state),
    };
  });
}
