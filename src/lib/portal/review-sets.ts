/*
 * Curated review homework on real data (rules: review-set-rules.ts; table review_sets, migration
 * 20261122050200). Server only.
 *   weekSet          this week's set for a student, built as a draft the first time it is asked for
 *                    (by the tutor's page) when skills are due. Nothing is built for a student without
 *                    a tutor or on a plan that does not get one.
 *   sendReviewSet    the tutor's one tap: the draft goes to the student's Homework.
 *   studentSets      the sets a student has been sent, for Homework, each with whether it is done.
 *   startReviewSet   the student starts it: fresh questions of each skill, shared out by size, as a
 *                    review run, so its ending, coins, levels and spaced reviews are the review's.
 * A table not there yet reads as no sets.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { assertQuestionsLeft } from "@/lib/assembler/plan-gate";
import { answeredInRuns, findOpenRun, insertRun, loadResponses } from "@/lib/assembler/run-store";
import type { RunRecord, RunView } from "@/lib/assembler/run-types";
import { buildView } from "@/lib/assembler/run-view";
import { stableHash } from "@/lib/catalog-practice/picker";
import { loadReviews } from "@/lib/play/server/reviews";
import { pool72 } from "@/lib/play/server/pool72";
import type { PlanId } from "@/lib/plans/catalog";
import { skill72 } from "@/lib/skills/ids72";
import {
  dueOnFor,
  examSaturday,
  getsReviewSets,
  reviewSetSize,
  shareOut,
  skillsDueBy,
} from "./review-set-rules";

const db = () => createAdminClient() as unknown as SupabaseClient;

export type ReviewSet = {
  id: string;
  studentId: string;
  /** The Saturday exam it is due before; due the Friday before. */
  weekOf: string;
  dueOn: string;
  skillIds: string[];
  skills: string[];
  size: number;
  status: "draft" | "sent";
  sentAt: string | null;
};

type Row = {
  id: string;
  student_id: string;
  week_of: string;
  skill_ids: string[];
  size: number;
  status: "draft" | "sent";
  sent_at: string | null;
};
const COLUMNS = "id, student_id, week_of, skill_ids, size, status, sent_at";

const setOf = (r: Row): ReviewSet => ({
  id: r.id,
  studentId: r.student_id,
  weekOf: r.week_of,
  dueOn: dueOnFor(r.week_of),
  skillIds: r.skill_ids,
  skills: r.skill_ids.map((id) => skill72(id)?.name ?? id),
  size: r.size,
  status: r.status,
  sentAt: r.sent_at,
});

const scopeOf = (setId: string) => `review-set:${setId}`;

/** This week's set for the student, built as a draft when skills are due and none exists yet. */
export async function weekSet(
  student: { clerkId: string; planId: PlanId; hasTutor: boolean },
  today: string
): Promise<ReviewSet | null> {
  if (!getsReviewSets(student.planId, student.hasTutor)) return null;
  const weekOf = examSaturday(today);
  const found = await db()
    .from("review_sets")
    .select(COLUMNS)
    .eq("student_id", student.clerkId)
    .eq("week_of", weekOf)
    .maybeSingle()
    .then(
      (r) => r,
      () => ({ data: null, error: true })
    );
  if (found.error) return null;
  if (found.data) return setOf(found.data as Row);
  const due = skillsDueBy(await loadReviews(student.clerkId), weekOf);
  if (!due.length) return null;
  const made = await db()
    .from("review_sets")
    .upsert(
      {
        student_id: student.clerkId,
        week_of: weekOf,
        skill_ids: due,
        size: reviewSetSize(due.length),
      },
      { onConflict: "student_id,week_of", ignoreDuplicates: false }
    )
    .select(COLUMNS)
    .single();
  return made.data ? setOf(made.data as Row) : null;
}

/** Sends a draft to the student. The caller has checked the sender may see this student. */
export async function sendReviewSet(
  setId: string,
  studentClerkId: string,
  sentBy: string | null
): Promise<boolean> {
  const { data, error } = await db()
    .from("review_sets")
    .update({ status: "sent", sent_at: new Date().toISOString(), sent_by: sentBy })
    .eq("id", setId)
    .eq("student_id", studentClerkId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (error) console.error("[review-sets] send failed:", error.message);
  return !!data;
}

/** The sets the student was sent in the last five weeks, newest first, with whether each is done. */
export async function studentSets(
  clerkId: string,
  today: string
): Promise<(ReviewSet & { done: boolean })[]> {
  const since = examSaturday(today);
  const from = new Date(Date.parse(`${since}T00:00:00Z`) - 35 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const { data, error } = await db()
    .from("review_sets")
    .select(COLUMNS)
    .eq("student_id", clerkId)
    .eq("status", "sent")
    .gte("week_of", from)
    .order("week_of", { ascending: false })
    .limit(6)
    .then(
      (r) => r,
      () => ({ data: null, error: true })
    );
  if (error || !data?.length) return [];
  const sets = (data as Row[]).map(setOf);
  const { data: runs } = await db()
    .from("quiz_runs")
    .select("scope")
    .eq("student_id", clerkId)
    .in(
      "scope",
      sets.map((s) => scopeOf(s.id))
    )
    .not("completed_at", "is", null)
    .then(
      (r) => r,
      () => ({ data: null })
    );
  const done = new Set(((runs ?? []) as { scope: string }[]).map((r) => r.scope));
  return sets.map((s) => ({ ...s, done: done.has(scopeOf(s.id)) }));
}

async function view(run: RunRecord): Promise<RunView> {
  return buildView(run, await loadResponses(run.id));
}

/** Starts (or picks up) a sent set as a review run of fresh questions. */
export async function startReviewSet(clerkId: string, setId: string): Promise<RunView> {
  const { data } = await db()
    .from("review_sets")
    .select(COLUMNS)
    .eq("id", setId)
    .eq("student_id", clerkId)
    .eq("status", "sent")
    .maybeSingle();
  if (!data) throw new Error("Nothing to review");
  const set = setOf(data as Row);
  const scope = scopeOf(set.id);
  const open = await findOpenRun(clerkId, "practice-set", scope);
  if (open) return view(open);

  const access = await assertQuestionsLeft(clerkId);
  const [pool, answered] = await Promise.all([
    pool72(set.skillIds, access.maxDifficulty, access.practiceSet),
    answeredInRuns(clerkId),
  ]);
  const share = shareOut(set.skillIds, set.size);
  const ids: string[] = [];
  const skills: Record<string, { s: string; d: string }> = {};
  for (const skillId of set.skillIds) {
    const fresh = pool.items
      .filter((i) => i.skill72 === skillId && !answered.has(i.id) && pool.snapshots.has(i.id))
      .sort(
        (a, b) =>
          stableHash(`set:${set.id}:${a.id}`) - stableHash(`set:${set.id}:${b.id}`) ||
          (a.id < b.id ? -1 : 1)
      )
      .slice(0, share.get(skillId) ?? 0);
    for (const item of fresh) {
      ids.push(item.id);
      skills[item.id] = { s: item.skill72, d: item.domain72 };
    }
  }
  if (!ids.length) throw new Error("Nothing to review");
  const subject = pool.items.find((i) => i.id === ids[0])?.section ?? "reading";
  const title = "Review set";
  return view(
    await insertRun({
      studentId: clerkId,
      kind: "practice-set",
      runKey: `practice-set:${scope}`,
      scope,
      form: {
        title,
        grading: "instant",
        sections: [{ key: "main", title, subject, seconds: null, questionIds: ids }],
        play: { mode: "review", skills },
      },
      snapshots: ids.map((id) => pool.snapshots.get(id)!),
      sequence: ids,
    })
  );
}
