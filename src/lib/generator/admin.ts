/*
 * Admin views of generated questions (founder, 2026-11-22 round 2). Students never reach any of this:
 * every function here returns nothing unless the caller is a real admin (users.role, not the "view as"
 * lens), checked on the server. Server only.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminOrNull } from "@/lib/auth/admin-guard";
import { createAdminClient } from "@/lib/supabase/server";
import { SKILLS72, skill72 } from "@/lib/skills/ids72";
import { HIDE } from "./persist";
import { generatedHidden } from "./switch";

const db = () => createAdminClient() as unknown as SupabaseClient;

export type OriginCounts = Record<string, { original: number; generated: number }>;

/** What an admin sees about generated questions in the portal; null for everyone else. */
export interface GeneratedAdminView {
  /** Live practice questions behind each of the 72, by skill name. */
  counts: OriginCounts;
  /** Whether the sitewide switch is hiding every generated question. */
  hidden: boolean;
}

const COUNTS_FRESH_MS = 5 * 60_000;
let countsCache: { counts: OriginCounts; at: number } | null = null;

/** One skill's live practice questions of one origin, counted directly (before the view exists). */
async function countOne(client: SupabaseClient, skillId: string, origin: string): Promise<number> {
  const { count, error } = await client
    .from("question_skills72")
    .select("question_id, quiz_questions!inner(id)", { count: "exact", head: true })
    .eq("skill_id", skillId)
    .eq("quiz_questions.origin", origin)
    .eq("quiz_questions.is_live", true)
    .eq("quiz_questions.pool", "practice");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Live practice questions per skill, original and generated, by skill name. Read from the
 *  skill72_origin_counts view (migration 20261122060000); until that is applied, counted skill by
 *  skill. Kept for five minutes. Empty when unreadable. */
export async function loadOriginCounts(client: SupabaseClient = db()): Promise<OriginCounts> {
  if (countsCache && Date.now() - countsCache.at < COUNTS_FRESH_MS) return countsCache.counts;
  const out: OriginCounts = {};
  try {
    const { data, error } = await client
      .from("skill72_origin_counts")
      .select("skill_id, origin, questions");
    if (!error && data) {
      for (const row of data as { skill_id: string; origin: string; questions: number }[]) {
        const name = skill72(row.skill_id)?.name;
        if (!name) continue;
        const entry = (out[name] ??= { original: 0, generated: 0 });
        if (row.origin === "generated") entry.generated += row.questions;
        else entry.original += row.questions;
      }
    } else {
      for (let i = 0; i < SKILLS72.length; i += 12) {
        await Promise.all(
          SKILLS72.slice(i, i + 12).map(async (skill) => {
            const [original, generated] = await Promise.all([
              countOne(client, skill.id, "original"),
              countOne(client, skill.id, "generated"),
            ]);
            out[skill.name] = { original, generated };
          })
        );
      }
    }
  } catch {
    // an empty map: the Library shows its usual counts
    return out;
  }
  countsCache = { counts: out, at: Date.now() };
  return out;
}

/** The admin's view for the portal, or null when the viewer is not an admin. */
export async function generatedAdminView(): Promise<GeneratedAdminView | null> {
  if (!(await adminOrNull())) return null;
  const [counts, hidden] = await Promise.all([loadOriginCounts(), generatedHidden()]);
  return { counts, hidden };
}

/** Which of these questions are generated: for the admin's "Generated" mark. Empty for non-admins. */
export async function generatedAmong(questionIds: readonly string[]): Promise<string[]> {
  if (!questionIds.length || !(await adminOrNull())) return [];
  const out: string[] = [];
  const ids = [...new Set(questionIds)];
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db()
      .from("quiz_questions")
      .select("id")
      .eq("origin", "generated")
      .in("id", ids.slice(i, i + 200));
    for (const row of (data ?? []) as { id: string }[]) out.push(row.id);
  }
  return out;
}

/** Pulls a generated question out of every pool and keeps the admin's reason. Originals are refused. */
export async function reportGeneratedQuestion(
  questionId: string,
  reason: string,
  reportedBy: string
): Promise<void> {
  const client = db();
  const { data, error } = await client
    .from("quiz_questions")
    .select("id, origin")
    .eq("id", questionId)
    .maybeSingle();
  if (error || !data) throw new Error("That question was not found");
  if ((data as { origin: string }).origin !== "generated")
    throw new Error("Only generated questions can be reported here");
  const hide = await client.from("quiz_questions").update(HIDE).eq("id", questionId);
  if (hide.error) throw new Error("The question could not be hidden");
  // the reason is kept when the reports table exists; the question is hidden either way
  await client
    .from("generated_question_reports")
    .insert({ question_id: questionId, reported_by: reportedBy, reason })
    .then(
      () => undefined,
      () => undefined
    );
}
