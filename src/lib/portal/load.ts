/*
 * Everything the student portal shows about the signed-in student, read in one go on the server.
 * The sources are the ones the old portal read (src/lib/student/), so nothing new is stored.
 */
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SkillLevel } from "@/components/portal/skill-levels";
import type { StudentContext } from "@/lib/student/context";
import { loadCalendar } from "@/components/student-portal/calendar/load";
import { challengeAnsweredCount } from "@/lib/daily-ten/challenge";
import { utcDayKey } from "@/lib/daily-challenge/selection";
import { dailyTenDays, doneToday } from "@/lib/student/daily-ten";
import { predictedFromRange } from "@/lib/student/progress";
import type { ExamResult } from "@/lib/exams/result";
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
import { quizAccessFor } from "@/lib/assembler/plan-gate";
import { challengeQuestionsPerDay, getUsage } from "@/lib/plans";
import { SECTIONS, SKILLS } from "@/app/dashboard/student/_portal/skills72";
import type { PortalData } from "./data";
import { portalPlanOf } from "./plan";
import { dayKey, streaks } from "@/lib/student/streak";
import { loadHomework, workshopOf } from "./homework";
import { loadSittings } from "./mistakes";
import { loadRewards } from "./rewards";
import { generatedAdminView } from "@/lib/generator/admin";
import { loadSchedule } from "./schedule";
import { between, buildStudent, type ProgressInput } from "./progress";
import { bridgedLevel, bridgedQuestions } from "./skill-bridge";
import { loadSkill72Counts } from "@/lib/bank/skills72-read";

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
  const [
    answers,
    runAnswers,
    stored,
    daily,
    runs,
    diagnostics,
    challenges,
    sessions,
    trials,
    examSittings,
    tagged,
  ] = await Promise.all([
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
    // The full-length exams (src/lib/exams): each finished one is a scored exam for the prediction.
    rows<{ completed_at: string; result: ExamResult | null }>(
      db
        .from("exam_sittings")
        .select("completed_at, result")
        .eq("student_id", ctx.clerkId)
        .not("completed_at", "is", null)
        .limit(200)
    ),
    // live questions behind each of the 72, from the bank's real tags (Bank stream, 2026-11-22)
    loadSkill72Counts(db),
  ]);

  const every: SkillAnswer[] = [...answers, ...runAnswers];
  const levels = withStored(levelsBySubSkill(every, nowMs), stored);
  const skills = Object.fromEntries(
    NAMES.map((name) => [
      name,
      {
        level: bridgedLevel(name, levels),
        questions: tagged.get(name) ?? bridgedQuestions(name, subSkillQuestionCount),
      },
    ])
  );

  // A diagnostic taken as a quiz run also writes a diagnostic_results row at the same moment; keep only
  // the run, which has the real section scores (the old row has only a score range).
  const diagnosticRuns = new Set(
    runs.filter((r) => r.kind === "diagnostic").map((r) => Date.parse(r.completed_at))
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
    ...examSittings
      .filter((x) => x.result)
      .map((x) => ({
        at: x.completed_at,
        total: x.result!.total,
        rw: x.result!.reading.score,
        math: x.result!.math.score,
        right: x.result!.reading.right + x.result!.math.right,
        asked: x.result!.reading.scored + x.result!.math.scored,
      })),
    ...diagnostics
      .filter((d) => !diagnosticRuns.has(Date.parse(d.taken_at)))
      .map((d) => ({
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
  // days kept with a Streak saver count as kept (src/lib/play/saver.ts)
  const saved = await db
    .from("student_streak_saves")
    .select("day")
    .eq("student_id", ctx.clerkId)
    .limit(1000)
    .then(
      (r) => ((r.data ?? []) as { day: string }[]).map((d) => d.day),
      () => [] as string[]
    );
  const run = streaks([...new Set([...challenges.map((c) => c.day), ...saved])].sort(), today);
  const limited =
    ctx.plan.entitlements.questionLimit !== null ||
    ctx.plan.entitlements.fullLengthTestLimit !== null;
  const [calendar, challengeToday, names, usage, satDates, settings] = await Promise.all([
    ctx.showCalendar ? loadCalendar(ctx, nowMs).catch(() => null) : null,
    challengeAnsweredCount(ctx.clerkId, utcDayKey(new Date(nowMs))).catch(() => 0),
    db
      .from("users")
      .select("first_name, last_name, placement_failure_at")
      .eq("id", ctx.userId)
      .maybeSingle()
      .then(
        (r) =>
          r.data as {
            first_name: string | null;
            last_name: string | null;
            placement_failure_at: string | null;
          } | null,
        () => null
      ),
    // only a plan with limits (Free) needs its usage counted
    limited ? getUsage(ctx.clerkId).catch(() => undefined) : undefined,
    rows<{ test_date: string }>(
      db.from("sat_dates").select("test_date").gte("test_date", today).order("test_date")
    ),
    db
      .from("student_settings")
      .select("prefs, welcomed_at")
      .eq("user_id", ctx.userId)
      .maybeSingle()
      .then(
        (r) =>
          r.data as { prefs: Record<string, unknown> | null; welcomed_at: string | null } | null,
        () => null
      ),
  ]);
  // a Free student whose usage could not be read is shown nothing locked; the server still counts
  const access = quizAccessFor(
    ctx.plan,
    limited ? (usage ?? { questionsAnswered: 0, fullLengthTestsCompleted: 0 }) : undefined
  );
  // Free answers one of the two challenge questions a day; every other plan both
  const done = {
    dailyDone: doneToday(daily, nowMs),
    challengeDone: challengeToday >= challengeQuestionsPerDay(ctx.plan),
  };
  const [sittings, homework, schedule, rewards, generatedAdmin] = await Promise.all([
    loadSittings(db, ctx.clerkId, (at) => student.days - between(dayKey(at), today)),
    // a Practice-menu student with a teacher or tutor (school seat, tutor code) has homework too
    plan === "practice" && !ctx.hasTutor
      ? null
      : loadHomework(db, ctx, calendar, done, student.days, nowMs),
    plan === "private" ? loadSchedule(db, ctx, calendar, nowMs) : null,
    loadRewards(db, ctx.clerkId, nowMs),
    // admins only (users.role): original and generated counts per skill for the Library
    generatedAdminView(),
  ]);
  const working = NAMES.filter((n) => skills[n].level === 1 || skills[n].level === 2);
  const workshops = (calendar?.events ?? [])
    // workshops, and the office hours every paid plan may drop in on
    .map((e) => workshopOf(e, working, calendar?.timeZone ?? "America/Chicago"));

  return {
    plan,
    planId: ctx.plan.id,
    access,
    email: ctx.email,
    satDates: [...new Set(satDates.map((d) => d.test_date.slice(0, 10)))],
    prefs: settings?.prefs ?? {},
    welcomed: Boolean(settings?.welcomed_at),
    // onboarding found no tutor or cohort for them yet (the admin is told); it clears once placed
    placementPending: Boolean(names?.placement_failure_at) && !ctx.hasTutor,
    firstName: ctx.firstName,
    name: [names?.first_name, names?.last_name].filter(Boolean).join(" ") || ctx.firstName || "",
    today: done,
    testDate: ctx.testDate ? ctx.testDate.slice(0, 10) : null,
    workshops,
    skills,
    student: { ...student, sittings },
    homework,
    streak: run.current,
    bestStreak: run.longest,
    schedule,
    rewards,
    generatedAdmin,
  };
}
