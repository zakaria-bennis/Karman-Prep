// Spaced reviews on real data (rules: ../reviews.ts; table student_skill72_reviews, migration
// 20261122040200). Server only. A table not there yet reads as no reviews and saves nothing.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { stableHash } from "@/lib/catalog-practice/picker";
import type { CatalogDeliverySnapshot } from "@/lib/catalog-practice/delivery-contract";
import { dueSkills, nextReview, outcomesOf, REVIEWS_MAX, type ReviewState } from "../reviews";
import { makeMath } from "./generated";
import { pool72, type Item72 } from "./pool72";

const db = () => createAdminClient() as unknown as SupabaseClient;

type Row = { skill_id: string; step: number; due_on: string };
const stateOf = (r: Row): ReviewState => ({ skillId: r.skill_id, step: r.step, dueOn: r.due_on });

/** Every skill's review for this student. */
export async function loadReviews(clerkId: string): Promise<ReviewState[]> {
  const { data, error } = await db()
    .from("student_skill72_reviews")
    .select("skill_id, step, due_on")
    .eq("student_id", clerkId)
    .limit(200)
    .then(
      (r) => r,
      () => ({ data: null, error: true })
    );
  if (error || !data) return [];
  return (data as Row[]).map(stateOf);
}

/** Moves each skill an activity touched along its schedule. Never breaks the activity's ending. */
export async function saveReviewOutcomes(
  clerkId: string,
  answers: readonly { skillId: string; ok: boolean }[],
  today: string
): Promise<void> {
  const outcomes = outcomesOf(answers);
  if (!outcomes.size) return;
  const before = new Map((await loadReviews(clerkId)).map((s) => [s.skillId, s]));
  const rows = [...outcomes].flatMap(([skillId, ok]) => {
    const prev = before.get(skillId);
    const next = nextReview(prev, skillId, ok, today);
    if (prev && next.step === prev.step && next.dueOn === prev.dueOn) return [];
    return [
      {
        student_id: clerkId,
        skill_id: skillId,
        step: next.step,
        due_on: next.dueOn,
        updated_at: new Date().toISOString(),
      },
    ];
  });
  if (!rows.length) return;
  await db()
    .from("student_skill72_reviews")
    .upsert(rows)
    .then(
      () => undefined,
      () => undefined
    );
}

export type ReviewPick = { item: Item72; snapshot: CatalogDeliverySnapshot };

/** Up to five review questions for today's Daily 10: one for each due skill, the most overdue
 *  first, a question of that skill the student has never answered and that is not already in
 *  `taken`. A due Math skill with none left gets one made on demand; any other is skipped. */
export async function pickReviews(
  clerkId: string,
  today: string,
  opts: {
    maxDifficulty: number;
    practiceSet: boolean;
    answered: ReadonlyMap<string, string> | ReadonlySet<string>;
    taken: ReadonlySet<string>;
    max?: number;
  }
): Promise<ReviewPick[]> {
  const due = dueSkills(await loadReviews(clerkId), today, opts.max ?? REVIEWS_MAX);
  if (!due.length) return [];
  // one fresh question a due skill: a dozen of each to choose from
  const pool = (await pool72(due, opts.maxDifficulty, opts.practiceSet, 12).catch(() => null)) ?? {
    items: [],
    snapshots: new Map(),
  };
  const out: ReviewPick[] = [];
  for (const skillId of due) {
    const fresh = pool.items
      .filter(
        (i) =>
          i.skill72 === skillId &&
          !opts.answered.has(i.id) &&
          !opts.taken.has(i.id) &&
          pool.snapshots.has(i.id)
      )
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    if (!fresh.length) {
      // a Math skill with nothing fresh left gets a question made on demand, mid-way up
      const [made] = await makeMath(skillId, Math.min(4, opts.maxDifficulty), opts.practiceSet);
      if (made) out.push(made);
      continue;
    }
    const item = fresh[stableHash(`review:${clerkId}:${today}:${skillId}`) % fresh.length];
    out.push({ item, snapshot: pool.snapshots.get(item.id)! });
  }
  return out;
}
