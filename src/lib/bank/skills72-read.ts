/*
 * Server reads of the bank's 72-skill tags (see ./skills72.ts). A failed read returns an empty map,
 * so callers fall back to what they showed before.
 */
import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { countsByName, skillNamesByQuestion, type Skill72Count, type Skill72Tag } from "./skills72";

/* The count below reads the whole question table. When the database has not run it for a minute or so
   it takes five to twelve seconds (measured 2026-11-26), and it was holding up the portal's first page.
   So the last answer is kept for ten minutes, and a page waits a second and a half at most: after that
   it gets the last known counts (or none, and the caller shows its own), while the read finishes
   behind the page and is kept for the next one. */
const KEEP_MS = 10 * 60_000;
const WAIT_MS = 1500;
let kept: { at: number; counts: Map<string, number> } | null = null;

async function readSkill72Counts(db: SupabaseClient): Promise<Map<string, number> | null> {
  try {
    const { data, error } = await db.from("skill72_live_counts").select("skill_id, questions");
    if (error || !data) return null;
    const counts = countsByName(data as Skill72Count[]);
    kept = { at: Date.now(), counts };
    return counts;
  } catch {
    return null;
  }
}

/** Live questions behind each of the 72, by skill name (the skill72_live_counts view). */
export async function loadSkill72Counts(db: SupabaseClient): Promise<Map<string, number>> {
  if (kept && Date.now() - kept.at < KEEP_MS) return kept.counts;
  const reading = readSkill72Counts(db);
  try {
    // keeps the request open until the read is in, without the page waiting for it
    after(() => reading.then(() => undefined));
  } catch {
    // not inside a request (a script or a test): the read simply runs on
  }
  const late = new Promise<null>((done) => setTimeout(() => done(null), WAIT_MS));
  return (await Promise.race([reading, late])) ?? kept?.counts ?? new Map();
}

/** The skill name of each of these questions that has a tag (read 200 at a time). */
export async function loadSkill72OfQuestions(
  db: SupabaseClient,
  questionIds: readonly string[]
): Promise<Map<string, string>> {
  const rows: Skill72Tag[] = [];
  const ids = [...new Set(questionIds)];
  for (let i = 0; i < ids.length; i += 200) {
    try {
      const { data, error } = await db
        .from("question_skills72")
        .select("question_id, skill_id")
        .in("question_id", ids.slice(i, i + 200));
      if (!error && data) rows.push(...(data as Skill72Tag[]));
    } catch {
      // keep what was read
    }
  }
  return skillNamesByQuestion(rows);
}
