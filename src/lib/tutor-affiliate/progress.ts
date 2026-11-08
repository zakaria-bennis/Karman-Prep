// Progress at a glance for a tutor's students: a ring per course and a
// square per skill, built from each student's practice answers.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { CATALOG_SKILLS, SKILL_DOMAINS } from "@/data/curriculum/skill-catalog";
import type { SkillLevel } from "@/components/portal/skill-levels";
import { levelFromHistory } from "@/lib/levels/rules";
import { coursePercent } from "@/lib/progress-glance/levels";
import { loadSavedLevels } from "@/lib/progress-glance/server";

export interface DomainGlance {
  id: string;
  label: string;
  /** Rounded average of the Domain's skill levels. */
  level: SkillLevel;
  skills: { id: string; name: string; level: SkillLevel }[];
}

export interface CourseGlance {
  label: string;
  percent: number;
  domains: DomainGlance[];
}

export interface StudentGlance {
  math: CourseGlance;
  reading: CourseGlance;
  lastActive: string | null;
}

type SessionRow = {
  student_id: string;
  skill_id: string;
  catalog_practice_responses: { is_correct: boolean; answered_at: string }[] | null;
};

function db(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}

function course(
  subject: "math" | "reading",
  label: string,
  levels: Map<string, SkillLevel>
): CourseGlance {
  const domains = SKILL_DOMAINS.filter((d) => d.subject === subject).map((domain) => {
    const skills = CATALOG_SKILLS.filter((s) => s.domainId === domain.id).map((s) => ({
      id: s.id,
      name: s.label,
      level: levels.get(s.id) ?? (0 as SkillLevel),
    }));
    const avg = skills.length ? skills.reduce((n, s) => n + s.level, 0) / skills.length : 0;
    return { id: domain.id, label: domain.label, level: Math.round(avg) as SkillLevel, skills };
  });
  return {
    label,
    percent: coursePercent(domains.flatMap((d) => d.skills.map((s) => s.level))),
    domains,
  };
}

export async function fetchStudentGlances(
  clerkIds: readonly string[]
): Promise<Map<string, StudentGlance>> {
  const result = new Map<string, StudentGlance>();
  if (!clerkIds.length) return result;
  const { data, error } = await db()
    .from("catalog_practice_sessions")
    .select("student_id, skill_id, catalog_practice_responses(is_correct, answered_at)")
    .in("student_id", [...clerkIds])
    .limit(5000);
  if (error) throw new Error("Student progress could not be loaded.");

  const answers = new Map<string, Map<string, { right: boolean; at: string }[]>>();
  const lastActive = new Map<string, string>();
  for (const row of (data ?? []) as SessionRow[]) {
    const bySkill = answers.get(row.student_id) ?? new Map();
    answers.set(row.student_id, bySkill);
    const list = bySkill.get(row.skill_id) ?? [];
    bySkill.set(row.skill_id, list);
    for (const r of row.catalog_practice_responses ?? []) {
      list.push({ right: r.is_correct, at: r.answered_at });
      if (r.answered_at > (lastActive.get(row.student_id) ?? "")) {
        lastActive.set(row.student_id, r.answered_at);
      }
    }
  }

  const now = new Date();
  const saved = await loadSavedLevels(clerkIds, now);
  for (const clerkId of clerkIds) {
    const levels = new Map<string, SkillLevel>();
    for (const [skillId, list] of answers.get(clerkId) ?? []) {
      levels.set(
        skillId,
        levelFromHistory(
          list.map((a) => ({ correct: a.right, at: a.at })),
          now
        ).level
      );
    }
    // A higher level the quiz flows saved wins, so the tutor sees what the student sees.
    for (const [skillId, level] of saved.get(clerkId) ?? [])
      levels.set(skillId, Math.max(levels.get(skillId) ?? 0, level) as SkillLevel);
    result.set(clerkId, {
      math: course("math", "SAT Math", levels),
      reading: course("reading", "SAT Reading and Writing", levels),
      lastActive: lastActive.get(clerkId) ?? null,
    });
  }
  return result;
}
