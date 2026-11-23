"use server";

import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import {
  answerQuestion,
  answerSchema,
  openDailyTen,
  resumeRun,
  sectionSchema,
  startDiagnostic,
  startDomainQuiz,
  startPracticeSet,
  submitSection,
} from "@/lib/assembler/runs";
import { PlanLimitError } from "@/lib/assembler/plan-gate";
import { startTimeTrial, trialSectionSchema } from "@/lib/assembler/time-trial-run";
import type { RunView } from "@/lib/assembler/run-types";
import { trackServer } from "@/lib/analytics/server";
import { saveSignals } from "@/lib/assembler/signals-store";
import { PaceError, assertAnswerPace, assertStartPace } from "@/lib/assembler/pace-guard";

async function studentId(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId || !["student", "admin"].includes((await fetchUserRole(userId)) ?? "")) {
    throw new Error("Student access required");
  }
  return userId;
}

/** The student, once it is seen they are not opening quizzes faster than a person would. */
async function paced(): Promise<string> {
  const id = await studentId();
  await assertStartPace(id);
  return id;
}

export type RunActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; limit?: boolean };

/** Never show database or stack details to a student. */
function failure(error: unknown): { ok: false; error: string; limit?: boolean } {
  if (error instanceof PlanLimitError) return { ok: false, error: error.message, limit: true };
  const message = error instanceof Error ? error.message : "";
  console.error("[quiz runs]", message);
  if (error instanceof PaceError)
    return { ok: false, error: "That was very fast. Take a minute, then carry on." };
  if (message === "Student access required")
    return { ok: false, error: "Sign in with a student account to practice." };
  if (message === "No distinct approved questions are available")
    return { ok: false, error: "Not enough questions here yet. Try another skill." };
  if (message === "Question is not next in this session")
    return {
      ok: false,
      error: "This question was already answered in another tab. Reload to continue.",
    };
  return { ok: false, error: "We could not finish that. Your saved answers are safe. Try again." };
}

async function wrap<T>(work: () => Promise<T>): Promise<RunActionResult<T>> {
  try {
    return { ok: true, value: await work() };
  } catch (error) {
    return failure(error);
  }
}

const zone = z.string().max(64).optional();

export async function actionOpenDailyTen(input: { timeZone?: string }) {
  return wrap(async () => openDailyTen(await studentId(), zone.parse(input.timeZone) ?? ""));
}

export async function actionStartPracticeSet(input: { skillId: string }) {
  return wrap(async () =>
    startPracticeSet(
      await paced(),
      z.object({ skillId: z.string().min(1).max(160) }).parse(input).skillId
    )
  );
}

export async function actionStartDomainQuiz(input: { domainId: string }) {
  return wrap(async () =>
    startDomainQuiz(
      await paced(),
      z.object({ domainId: z.string().min(1).max(60) }).parse(input).domainId
    )
  );
}

export async function actionStartTimeTrial(input: { section: string }) {
  return wrap(async () =>
    startTimeTrial(
      await studentId(),
      z.object({ section: trialSectionSchema }).parse(input).section
    )
  );
}

export async function actionStartDiagnostic() {
  return wrap(async () => {
    const id = await studentId();
    const view = await startDiagnostic(id);
    await trackServer("test_started", id, { kind: "diagnostic" }); // analytics funnel step
    return view;
  });
}

export async function actionResumeRun(input: { runId: string }) {
  return wrap(async () =>
    resumeRun(await studentId(), z.object({ runId: z.string().uuid() }).parse(input).runId)
  );
}

export async function actionAnswerRunQuestion(input: z.input<typeof answerSchema>) {
  return wrap(async () => {
    const id = await studentId();
    // faster than a person can read and answer: the next answer waits out the minute
    await assertAnswerPace(id);
    return answerQuestion(id, answerSchema.parse(input));
  });
}

export async function actionSubmitRunSection(
  input: z.input<typeof sectionSchema>
): Promise<RunActionResult<RunView>> {
  return wrap(async () => submitSection(await studentId(), sectionSchema.parse(input)));
}

/** How questions of a run were answered, as the browser saw it (time worked, time away, changes
 *  of mind, the calculator and so on; src/lib/quiz/signals.ts). Never needed for the quiz to go
 *  on: a failure here is quiet. */
export async function actionNoteAnswerSignals(input: unknown) {
  return wrap(async () => saveSignals(await studentId(), input));
}
