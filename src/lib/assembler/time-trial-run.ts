/*
 * Server only. Time trials on the quiz-run machinery: one timed section ("time-trial" run, scope
 * = section) at the student's current pace, graded when it is submitted or its time runs out
 * (submitSection in runs.ts), then scored by the pure round rule in src/lib/student/time-trial.ts.
 * The round's result lives in quiz_runs.result.trial, so the next round's pace is read from the
 * latest finished run. Each round is also written to time_trial_runs for Progress and Homework.
 * The accuracy baseline is read from the student's untimed answers and the diagnostic and
 * full-length tests, and frozen into the run when the round starts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { loadSkillAnswers } from "@/lib/student/skill-levels-server";
import {
  BASELINE_WINDOW_DAYS,
  DEFAULT_BASELINE,
  TRIAL_FLOOR,
  baselineAccuracy,
  nextStanding,
  scoreRound,
  trialSeconds,
  trialSectionTitle,
  type BaselineAnswer,
  type TrialRoundResult,
  type TrialSection,
  type TrialStart,
} from "@/lib/student/time-trial";
import { loadAdmittedBank, skillsInSection } from "./bank";
import { assembleTrialModule } from "./forms";
import { PlanLimitError, loadQuizAccess } from "./plan-gate";
import {
  answeredInRuns,
  findOpenRun,
  insertRun,
  latestFinishedRun,
  loadResponses,
  updateRun,
} from "./run-store";
import type { RunRecord, RunResponse, RunView } from "./run-types";
import { buildView, sectionQuestionIds } from "./run-view";

export const trialSectionSchema = z.enum(["reading", "math"]);

/** Below this many questions a round would not mean much; the bank is too thin. */
const MIN_TRIAL_QUESTIONS = 5;

export type TrialStatus = {
  section: TrialSection;
  /** The next round's pace and the baseline it will be judged by (the open round's, if any). */
  start: TrialStart;
  /** A round in this section was started and not submitted: starting resumes it. */
  open: boolean;
  last: TrialRoundResult | null;
};

const roundOf = (run: RunRecord | null): TrialRoundResult | null => run?.result?.trial ?? null;

/** Run kinds that count toward the baseline: untimed practice, the diagnostic and full tests. */
const BASELINE_RUN_KINDS = ["daily-ten", "practice-set", "domain-quiz", "full-test", "diagnostic"];
const sectionOfSkill = new Map(
  CATALOG_SKILLS.map((s) => [s.id, (s.subject === "math" ? "math" : "reading") as TrialSection])
);

/** The student's recent answers outside time trials, by section, for the accuracy baseline. */
export async function loadBaselineAnswers(clerkId: string): Promise<BaselineAnswer[]> {
  const since = new Date(Date.now() - BASELINE_WINDOW_DAYS * 86_400_000).toISOString();
  const db = createAdminClient() as unknown as SupabaseClient;
  const [runs, catalog] = await Promise.all([
    db
      .from("quiz_run_responses")
      .select("skill_id, is_correct, answered_at, quiz_runs!inner(student_id, kind)")
      .eq("quiz_runs.student_id", clerkId)
      .in("quiz_runs.kind", BASELINE_RUN_KINDS)
      .gte("answered_at", since)
      .order("answered_at", { ascending: false })
      .limit(1000),
    loadSkillAnswers(clerkId).catch(() => []),
  ]);
  const out: BaselineAnswer[] = [];
  const rows = (runs.data ?? []) as {
    skill_id: string;
    is_correct: boolean;
    answered_at: string;
  }[];
  for (const r of rows) {
    const section = sectionOfSkill.get(r.skill_id);
    if (section) out.push({ section, correct: r.is_correct, at: r.answered_at });
  }
  for (const a of catalog) {
    const section = sectionOfSkill.get(a.skillId);
    if (section) out.push({ section, correct: a.correct, at: a.at });
  }
  return out;
}

/** Each section's next round, for the start screen. */
export async function loadTrialStatus(clerkId: string): Promise<TrialStatus[]> {
  const answers = await loadBaselineAnswers(clerkId);
  return Promise.all(
    (["reading", "math"] as const).map(async (section) => {
      const [open, finished] = await Promise.all([
        findOpenRun(clerkId, "time-trial", section),
        latestFinishedRun(clerkId, "time-trial", section),
      ]);
      const last = roundOf(finished);
      const start: TrialStart = open?.form.trial
        ? { ...open.form.trial, baseline: open.form.trial.baseline ?? DEFAULT_BASELINE }
        : { ...nextStanding(last), baseline: baselineAccuracy(section, answers) };
      return { section, start, open: !!open, last };
    })
  );
}

/** Starts the section's next round, or resumes the open one. */
export async function startTimeTrial(clerkId: string, rawSection: string): Promise<RunView> {
  const section = trialSectionSchema.parse(rawSection);
  const open = await findOpenRun(clerkId, "time-trial", section);
  if (open) return buildView(open, await loadResponses(open.id));
  const access = await loadQuizAccess(clerkId);
  if (access.questionsLeft === 0)
    throw new PlanLimitError("You have used the Free plan's 100 questions.");
  const [finished, history, bank, answers] = await Promise.all([
    latestFinishedRun(clerkId, "time-trial", section),
    answeredInRuns(clerkId),
    loadAdmittedBank(skillsInSection(section), access.maxDifficulty),
    loadBaselineAnswers(clerkId),
  ]);
  const standing: TrialStart = {
    ...nextStanding(roundOf(finished)),
    baseline: baselineAccuracy(section, answers),
  };
  const picked = assembleTrialModule(bank.items, {
    section,
    maxDifficulty: access.maxDifficulty,
    seed: `${clerkId}:time-trial:${section}:${Date.now()}`,
    answered: new Set(history.keys()),
  });
  const ids = picked.map((i) => i.id).slice(0, access.questionsLeft ?? picked.length);
  if (ids.length < MIN_TRIAL_QUESTIONS)
    throw new Error("No distinct approved questions are available");
  const title = `${trialSectionTitle(section)}, round ${standing.round}`;
  const run = await insertRun({
    studentId: clerkId,
    kind: "time-trial",
    runKey: `time-trial:${section}:${crypto.randomUUID()}`,
    scope: section,
    form: {
      title: "Time trial",
      grading: "end",
      trial: standing,
      sections: [
        {
          key: section === "reading" ? "rw1" : "m1",
          title,
          subject: section,
          // A shorter round (Free plan's last questions, a thin bank) keeps the per-question pace.
          seconds: trialSeconds(section, standing.multiplier, ids.length),
          questionIds: ids,
        },
      ],
    },
    snapshots: ids.map((id) => bank.snapshots.get(id)!),
    sequence: [],
  });
  return buildView(run, []);
}

/** Pure: the round's result from the finished run's answers and the time it took. */
export function trialRoundOf(
  run: RunRecord,
  responses: readonly RunResponse[],
  elapsedSeconds: number
): TrialRoundResult | null {
  const section = trialSectionSchema.safeParse(run.scope);
  const form = run.form.sections[0];
  if (!section.success || !form) return null;
  const ids = new Set(sectionQuestionIds(run, 0));
  const rows = responses.filter((r) => ids.has(r.questionId));
  const start: TrialStart = {
    ...(run.form.trial ?? nextStanding(null)),
    baseline: run.form.trial?.baseline ?? DEFAULT_BASELINE,
  };
  return scoreRound({
    section: section.data,
    start,
    limitSeconds: form.seconds ?? trialSeconds(section.data, start.multiplier, ids.size),
    elapsedSeconds,
    correct: rows.filter((r) => r.isCorrect).length,
    answered: rows.filter((r) => r.studentAnswer.trim() !== "").length,
    questions: ids.size,
  });
}

/** After submitSection finished a time-trial run: store the round with the run's result, then
 *  (best effort) in time_trial_runs and against an open tutor-assigned trial. */
export async function finishTimeTrial(
  run: RunRecord,
  responses: readonly RunResponse[],
  elapsedSeconds: number
): Promise<RunRecord> {
  if (!run.completedAt || !run.result || run.result.trial) return run;
  const trial = trialRoundOf(run, responses, elapsedSeconds);
  if (!trial) return run;
  const result = { ...run.result, trial };
  await updateRun(run.id, run.studentId, { result });
  await recordRound(run, trial).catch((error) =>
    console.error("[time trial] history row", error instanceof Error ? error.message : "")
  );
  return { ...run, result };
}

async function recordRound(run: RunRecord, trial: TrialRoundResult) {
  const db = createAdminClient() as unknown as SupabaseClient;
  const now = new Date().toISOString();
  // A tutor-assigned trial in this section that is open now counts as done with this round.
  const { data: assigned } = await db
    .from("student_assignments")
    .select("id")
    .eq("student_id", run.studentId)
    .eq("kind", "time_trial")
    .eq("section", trial.section)
    .is("completed_at", null)
    .not("unlocked_at", "is", null)
    .lte("unlocked_at", now)
    .order("scheduled_for", { ascending: true })
    .limit(1);
  const assignmentId = (assigned?.[0]?.id as string | undefined) ?? null;
  // time_trial_runs keeps "goal" as the tightest pace the trials aim for (0.75x), so its
  // next_target >= goal check holds for every round.
  const { error } = await db.from("time_trial_runs").insert({
    student_id: run.studentId,
    assignment_id: assignmentId,
    section: trial.section,
    target_seconds: trial.limitSeconds,
    goal_seconds: trialSeconds(trial.section, TRIAL_FLOOR, trial.questions),
    elapsed_seconds: trial.elapsedSeconds,
    questions: trial.questions,
    correct: trial.correct,
    finished: trial.answered === trial.questions,
    beat: trial.held,
    reason: trial.held ? "beat" : trial.timeUp ? "unfinished" : "rushed",
    next_target_seconds: trialSeconds(trial.section, trial.nextMultiplier, trial.questions),
    started_at: run.startedAt,
  });
  if (error) throw new Error(error.message);
  if (assignmentId)
    await db
      .from("student_assignments")
      .update({ completed_at: now })
      .eq("id", assignmentId)
      .is("completed_at", null);
}
