/*
 * Everything the student portal shows about the signed-in student, read in one go on the server.
 * The sources are the ones the old portal read (src/lib/student/), so nothing new is stored.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SkillLevel } from "@/components/portal/skill-levels";
import type { StudentContext } from "@/lib/student/context";
import { dailyTenDays } from "@/lib/student/daily-ten";
import { predictedFromRange } from "@/lib/student/progress";
import {
  levelsBySubSkill,
  loadRunAnswers,
  loadSkillAnswers,
  loadStoredLevels,
  withStored,
  type SkillAnswer,
} from "@/lib/student/skill-levels-server";
import { subSkillQuestionCount } from "@/lib/subskills/map";
import { createAdminClient } from "@/lib/supabase/server";
import { SECTIONS, SKILLS } from "@/app/dev/shell/skills72";
import type { PortalData } from "./data";
import { portalPlanOf } from "./plan";
import { dayKey, streaks } from "@/lib/student/streak";
import { loadHomework } from "./homework";
import { loadSittings } from "./mistakes";
import { between, buildStudent, type ProgressInput } from "./progress";
import { bridgedLevel, bridgedQuestions } from "./skill-bridge";

const NAMES = SECTIONS.flatMap((s) => SKILLS[s].flatMap((d) => d.skills.map((k) => k.name)));

const proficientOf = (levels: ReadonlyMap<string, SkillLevel>) =>
  NAMES.filter((name) => bridgedLevel(name, levels) === 3).length;

type RunRow = {
  kind: string;
  completed_at: string;
  result: {
    right?: number;
    total?: number;
    predicted?: { reading: number; math: number; total: number };
  } | null;
};

/** A read that may fail (a table not there yet) and then counts as empty. */
async function rows<T>(q: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  try {
    const { data, error } = await q;
    return error || !data ? [] : (data as T[]);
  } catch {
    return [];
  }
}

export async function loadPortalData(ctx: StudentContext): Promise<PortalData> {
  const db = createAdminClient() as unknown as SupabaseClient;
  const nowMs = Date.now();
  const [answers, runAnswers, stored, daily, runs, diagnostics, challenges, sessions, trials] =
    await Promise.all([
      loadSkillAnswers(ctx.clerkId),
      loadRunAnswers(ctx.clerkId),
      loadStoredLevels(ctx.clerkId, nowMs),
      dailyTenDays(ctx.clerkId),
      rows<RunRow>(
        db
          .from("quiz_runs")
          .select("kind, completed_at, result")
          .eq("student_id", ctx.clerkId)
          .not("completed_at", "is", null)
          .limit(2000)
      ),
      rows<{ taken_at: string; score_range_low: number; score_range_high: number }>(
        db
          .from("diagnostic_results")
          .select("taken_at, score_range_low, score_range_high")
          .eq("user_id", ctx.userId)
          .limit(100)
      ),
      rows<{ day: string }>(
        db.from("daily_challenge_answers").select("day").eq("student_id", ctx.clerkId).limit(2000)
      ),
      rows<{ completed_at: string | null }>(
        db
          .from("catalog_practice_sessions")
          .select("completed_at")
          .eq("student_id", ctx.clerkId)
          .not("completed_at", "is", null)
          .limit(2000)
      ),
      rows<{ started_at: string }>(
        db.from("time_trial_runs").select("started_at").eq("student_id", ctx.clerkId).limit(2000)
      ),
    ]);

  const every: SkillAnswer[] = [...answers, ...runAnswers];
  const levels = withStored(levelsBySubSkill(every, nowMs), stored);
  const skills = Object.fromEntries(
    NAMES.map((name) => [
      name,
      {
        level: bridgedLevel(name, levels),
        questions: bridgedQuestions(name, subSkillQuestionCount),
      },
    ])
  );

  const exams: ProgressInput["exams"][number][] = [
    ...runs
      .filter((r) => (r.kind === "full-test" || r.kind === "diagnostic") && r.result?.predicted)
      .map((r) => ({
        at: r.completed_at,
        total: r.result!.predicted!.total,
        rw: r.result!.predicted!.reading,
        math: r.result!.predicted!.math,
        right: r.result!.right,
        asked: r.result!.total,
      })),
    ...diagnostics.map((d) => ({
      at: d.taken_at,
      total: predictedFromRange(d.score_range_low, d.score_range_high),
    })),
  ];
  const student = buildStudent({
    nowMs,
    answers: every,
    exams,
    dailyDays: daily,
    challengeDays: [...new Set(challenges.map((c) => c.day))],
    sets: [
      ...runs
        .filter((r) => r.kind === "practice-set" || r.kind === "domain-quiz")
        .map((r) => r.completed_at),
      ...sessions.map((s) => s.completed_at as string),
    ],
    bursts: trials.map((t) => t.started_at),
    testDate: ctx.testDate,
    proficientAt: (so, atMs) => proficientOf(levelsBySubSkill(so as readonly SkillAnswer[], atMs)),
    proficientNow: Object.values(skills).filter((s) => s.level === 3).length,
  });

  const today = dayKey(nowMs);
  const plan = portalPlanOf(ctx.plan.id);
  const run = streaks([...new Set(challenges.map((c) => c.day))].sort(), today);
  const [sittings, homework] = await Promise.all([
    loadSittings(db, ctx.clerkId, (at) => student.days - between(dayKey(at), today)),
    plan === "practice" ? null : loadHomework(db, ctx, daily, student.days, nowMs),
  ]);

  return {
    plan,
    firstName: ctx.firstName,
    skills,
    student: { ...student, sittings },
    homework,
    streak: run.current,
    bestStreak: run.longest,
  };
}
