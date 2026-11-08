/*
 * /dashboard/student/progress — how the student is doing and where they stand (founder,
 * 2026-11-07). Everything visual: one predicted score and its history, skills by level in a
 * ring, what moved this week, time and effort, personal bests, then streak and rewards at the
 * bottom. Section scores show only once a source stores them (the diagnostic stores the total).
 * The old Mastered list and the predicted-SAT chart are folded in here.
 */
import type { Metadata } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Panel } from "@/components/portal";
import StudentPortal, { STUDENT_ROUTES } from "@/components/student-portal/StudentPortal";
import {
  BestsCard,
  MovedCard,
  RewardsCard,
  ScoreCard,
  SkillsCard,
  TimeCard,
} from "@/components/student-portal/progress/ProgressCards";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { loadStudentContext } from "@/lib/student/context";
import {
  monthEffort,
  personalBests,
  practiceSets,
  scoreHistory,
  weeklyEffort,
  whatMoved,
  type TrialRun,
} from "@/lib/student/progress";
import {
  loadSkillAnswers,
  loadStoredLevels,
  levelsBySkill,
  withStored,
} from "@/lib/student/skill-levels-server";
import { summarisePoints, type PointAward } from "@/lib/student/skill-points";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Progress" };
export const dynamic = "force-dynamic";

/** The diagnostic: where a first predicted score comes from. */
const DIAGNOSTIC_HREF = "/learn/diagnostic";

type DiagnosticRow = { taken_at: string; score_range_low: number; score_range_high: number };
type AwardRow = { award_key: string; skill_id: string | null; points: number; created_at: string };

/** Every point award, a page at a time (the API returns at most 1,000 rows per call). */
async function loadAwards(db: SupabaseClient, clerkId: string): Promise<PointAward[]> {
  const out: PointAward[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await db
      .from("student_point_awards")
      .select("award_key, skill_id, points, created_at")
      .eq("student_id", clerkId)
      .order("award_key", { ascending: true })
      .range(page * 1000, page * 1000 + 999);
    if (error || !data) break;
    for (const r of data as AwardRow[]) {
      out.push({
        awardKey: r.award_key,
        skillId: r.skill_id,
        points: r.points,
        createdAt: r.created_at,
      });
    }
    if (data.length < 1000) break;
  }
  return out;
}

export default async function StudentProgressPage() {
  const ctx = await loadStudentContext();
  const db = createAdminClient() as unknown as SupabaseClient;
  const nowMs = Date.now();

  const [answers, stored, diagnostics, trials, awards] = await Promise.all([
    loadSkillAnswers(ctx.clerkId),
    loadStoredLevels(ctx.clerkId, nowMs),
    db
      .from("diagnostic_results")
      .select("taken_at, score_range_low, score_range_high")
      .eq("user_id", ctx.userId)
      .order("taken_at", { ascending: true })
      .limit(100),
    db
      .from("time_trial_runs")
      .select("beat, finished, elapsed_seconds, section")
      .eq("student_id", ctx.clerkId)
      .limit(1000),
    loadAwards(db, ctx.clerkId),
  ]);

  const history = scoreHistory((diagnostics.data ?? []) as DiagnosticRow[]);
  const levels = withStored(levelsBySkill(answers, nowMs), stored);
  const skillLevels = CATALOG_SKILLS.map((s) => levels.get(s.id) ?? 0);
  const labels = new Map(CATALOG_SKILLS.map((s) => [s.id, s.label]));
  const moves = whatMoved(answers, labels, nowMs);
  const weeks = weeklyEffort(answers, nowMs);
  const month = monthEffort(answers, nowMs);
  const bests = personalBests({
    sets: practiceSets(answers),
    trials: (trials.data ?? []) as TrialRun[],
  });
  const tokens = summarisePoints(awards, nowMs).total;

  const side = (
    <>
      <TimeCard weeks={weeks} questions={month.questions} paceSeconds={month.paceSeconds} />
      {bests.length > 0 && <BestsCard bests={bests} />}
      <RewardsCard current={ctx.streak.current} longest={ctx.streak.longest} tokens={tokens} />
    </>
  );

  return (
    <StudentPortal ctx={ctx} title="Progress">
      <Panel side={side} label="Your progress">
        <ScoreCard history={history} testHref={DIAGNOSTIC_HREF} />
        <SkillsCard levels={skillLevels} href={STUDENT_ROUTES.library} />
        <MovedCard moves={moves} />
      </Panel>
    </StudentPortal>
  );
}
