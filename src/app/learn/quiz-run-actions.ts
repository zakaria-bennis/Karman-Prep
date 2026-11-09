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
  startFullTest,
  startPracticeSet,
  submitSection,
} from "@/lib/assembler/runs";
import { PlanLimitError } from "@/lib/assembler/plan-gate";
import type { RunView } from "@/lib/assembler/run-types";

async function studentId(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId || !["student", "admin"].includes((await fetchUserRole(userId)) ?? "")) {
    throw new Error("Student access required");
  }
  return userId;
}

export type RunActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; limit?: boolean };

/** Never show database or stack details to a student. */
function failure(error: unknown): { ok: false; error: string; limit?: boolean } {
  if (error instanceof PlanLimitError) return { ok: false, error: error.message, limit: true };
  const message = error instanceof Error ? error.message : "";
  console.error("[quiz runs]", message);
  if (message === "Student access required")
    return { ok: false, error: "Sign in with a student account to practice." };
  if (message === "No distinct approved questions are available")
    return {
      ok: false,
      error: "There are not enough reviewed questions for this yet. Try another skill.",
    };
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
      await studentId(),
      z.object({ skillId: z.string().min(1).max(160) }).parse(input).skillId
    )
  );
}

export async function actionStartDomainQuiz(input: { domainId: string }) {
  return wrap(async () =>
    startDomainQuiz(
      await studentId(),
      z.object({ domainId: z.string().min(1).max(60) }).parse(input).domainId
    )
  );
}

export async function actionStartFullTest(input: { form: number }) {
  return wrap(async () =>
    startFullTest(
      await studentId(),
      z.object({ form: z.number().int().min(1).max(4) }).parse(input).form
    )
  );
}

export async function actionStartDiagnostic() {
  return wrap(async () => startDiagnostic(await studentId()));
}

export async function actionResumeRun(input: { runId: string }) {
  return wrap(async () =>
    resumeRun(await studentId(), z.object({ runId: z.string().uuid() }).parse(input).runId)
  );
}

export async function actionAnswerRunQuestion(input: z.input<typeof answerSchema>) {
  return wrap(async () => answerQuestion(await studentId(), answerSchema.parse(input)));
}

export async function actionSubmitRunSection(
  input: z.input<typeof sectionSchema>
): Promise<RunActionResult<RunView>> {
  return wrap(async () => submitSection(await studentId(), sectionSchema.parse(input)));
}
