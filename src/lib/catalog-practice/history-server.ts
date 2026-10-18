import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { fetchUserRole, resolveEffectiveClerkId } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { catalogSessionHref } from "./student-entry";
import type { CatalogPracticeHistory } from "./history";

const rowSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().min(1),
  skill_id: z.string(),
  started_at: z.string().datetime({ offset: true }),
  completed_at: z.string().datetime({ offset: true }).nullable(),
  score: z.number().int().min(0).max(100).nullable(),
});

interface MetadataQuery {
  select(columns: string): MetadataQuery;
  eq(column: string, value: string): MetadataQuery;
  is(column: string, value: null): MetadataQuery;
  not(column: string, operator: "is", value: null): MetadataQuery;
  order(column: string, options: { ascending: boolean }): MetadataQuery;
  limit(count: number): PromiseLike<{ data: unknown; error: unknown }>;
}

/** Own-account metadata only. The existing practice action still validates every resume. */
export async function loadOwnCatalogPracticeHistory(): Promise<CatalogPracticeHistory> {
  try {
    const { userId } = await safeAuth();
    if (!userId || !["student", "admin"].includes((await fetchUserRole(userId)) ?? "")) {
      return { status: "unavailable", sessions: [] };
    }
    const { clerkId, isImpersonating } = await resolveEffectiveClerkId(userId);
    // Current practice actions use the real account, not the preview persona.
    if (isImpersonating || clerkId !== userId) return { status: "preview", sessions: [] };
    const db = createAdminClient() as unknown as {
      from(table: "catalog_practice_sessions"): MetadataQuery;
    };
    const owned = () =>
      db
        .from("catalog_practice_sessions")
        .select("id,student_id,skill_id,started_at,completed_at,score")
        .eq("student_id", userId);
    // Read open sessions first. A completion can then appear in either or both reads,
    // but cannot fall between an earlier completed snapshot and a later open snapshot.
    const unfinished = await owned()
      .is("completed_at", null)
      .order("started_at", { ascending: false })
      .limit(50);
    const completed = await owned()
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(50);
    const results = [unfinished, completed];
    if (results.some((result) => result.error)) throw new Error("History unavailable");
    const rows = rowSchema.array().parse(results.flatMap((result) => result.data ?? []));
    if (rows.some((row) => row.student_id !== userId)) throw new Error("History unavailable");
    const skills = new Map(CATALOG_SKILLS.map((skill) => [skill.id, skill]));
    // A completion between the two reads can return a session twice. Prefer its final state.
    rows.sort((a, b) => Number(!!b.completed_at) - Number(!!a.completed_at));
    const seen = new Set<string>();
    const sessions = rows.flatMap((row) => {
      const skill = skills.get(row.skill_id);
      if (!skill) throw new Error("History unavailable");
      if (seen.has(row.id)) return [];
      seen.add(row.id);
      return [
        {
          id: row.id,
          skillId: skill.id,
          title: skill.label,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          score: row.score,
          href: catalogSessionHref(skill.id, row.id),
        },
      ];
    });
    sessions.sort((a, b) => {
      if (!!a.completedAt !== !!b.completedAt) return a.completedAt ? 1 : -1;
      return Date.parse(b.completedAt ?? b.startedAt) - Date.parse(a.completedAt ?? a.startedAt);
    });
    return { status: "ready", sessions };
  } catch {
    return { status: "unavailable", sessions: [] };
  }
}
