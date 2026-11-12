/*
 * Server only. Time trials on the quiz-run machinery: one timed section ("time-trial" run, scope
 * = section) at the student's current pace, graded when it is submitted or its time runs out
 * (submitSection in runs.ts), then scored by the pure round rule in src/lib/student/time-trial.ts.
 * The round's result lives in quiz_runs.result.trial, so the next round's pace is read from the
 * latest finished run. Each round is also written to time_trial_runs for Progress and Homework.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import {
  TRIAL_FLOOR,
  nextStanding,
  scoreRound,
  trialSeconds,
  trialSectionTitle,
  type TrialRoundResult,
  type TrialSection,
  type TrialStanding,
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
  standing: TrialStanding;
  /** A round in this section was started and not submitted: starting resumes it. */
  open: boolean;
  last: TrialRoundResult | null;
};

const roundOf = (run: RunRecord | null): TrialRoundResult | null => run?.result?.trial ?? null;

/** Each section's next round, for the start screen. */
export async function loadTrialStatus(clerkId: string): Promise<TrialStatus[]> {
  return Promise.all(
    (["reading", "math"] as const).map(async (section) => {
      const [open, finished] = await Promise.all([
        findOpenRun(clerkId, "time-trial", section),
        latestFinishedRun(clerkId, "time-trial", section),
      ]);
      const last = roundOf(finished);
      return { section, standing: open?.form.trial ?? nextStanding(last), open: !!open, last };
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
  const [finished, history, bank] = await Promise.all([
    latestFinishedRun(clerkId, "time-trial", section),
    answeredInRuns(clerkId),
    loadAdmittedBank(skillsInSection(section), access.maxDifficulty),
  ]);
  const standing = nextStanding(roundOf(finished));
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
  const standing = run.form.trial ?? nextStanding(null);
  return scoreRound({
    section: section.data,
    standing,
    limitSeconds: form.seconds ?? trialSeconds(section.data, standing.multiplier, ids.size),
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
