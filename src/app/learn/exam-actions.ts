"use server";

/*
 * Server actions for the full-length exams (src/lib/exams/service.ts does the work). Every input is checked
 * with Zod; the student is the signed-in student (or an admin trying it on their own account). The test
 * switch that opens exams on other days works only for an admin or in development.
 */
import { after } from "next/server";
import { cookies } from "next/headers";
import { TEST_COOKIE, examAccess, mayTest, userIdOf } from "@/lib/exams/access";
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { fetchUserRole } from "@/lib/supabase/queries/admin";

import { learnPaceNorms, recalibrateForm } from "@/lib/exams/calibration";
import {
  ExamError,
  endBreak,
  examList,
  saveAnswers,
  sittingState,
  startExam,
  submitModule,
  type ExamList,
  type SittingView,
} from "@/lib/exams/service";
import { deleteSitting, findSitting, storeTimeZone } from "@/lib/exams/store";

export type ExamActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; kind?: string };

async function student(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId || !["student", "admin"].includes((await fetchUserRole(userId)) ?? "")) {
    throw new ExamError("Sign in with a student account to take an exam.", "state");
  }
  return userId;
}

function failure(error: unknown): { ok: false; error: string; kind?: string } {
  if (error instanceof ExamError) return { ok: false, error: error.message, kind: error.kind };
  console.error("[exams]", error instanceof Error ? error.message : error);
  return { ok: false, error: "That did not go through. Your saved answers are safe. Try again." };
}

async function wrap<T>(work: () => Promise<T>): Promise<ExamActionResult<T>> {
  try {
    return { ok: true, value: await work() };
  } catch (error) {
    return failure(error);
  }
}

/** Learn from this exam's answers after the student has their result (never delays it). */
function learnLater(form: number, finishedNow: boolean) {
  if (!finishedNow) return;
  after(async () => {
    try {
      await recalibrateForm(form);
      await learnPaceNorms();
    } catch (error) {
      console.error("[exams] calibration", error instanceof Error ? error.message : error);
    }
  });
}

const formSchema = z.number().int().min(1).max(99);
const zoneSchema = z.string().max(64).nullable();
const moduleSchema = z.enum(["rw1", "rw2", "m1", "m2"]);
const answersSchema = z
  .array(
    z.object({
      questionId: z.string().uuid(),
      answer: z.string().max(40).nullable(),
      seconds: z.number().min(0).max(86400),
      changes: z.number().int().min(0).max(999),
      flagged: z.boolean(),
    })
  )
  .max(40);

export async function actionExamList(input: {
  timeZone: string | null;
}): Promise<ExamActionResult<ExamList>> {
  return wrap(async () => {
    const id = await student();
    const zone = zoneSchema.parse(input.timeZone);
    if (zone) await storeTimeZone(id, zone);
    return examList(id, await examAccess(id), new Date());
  });
}

export async function actionExamStart(input: {
  form: number;
  timeZone: string | null;
}): Promise<ExamActionResult<SittingView>> {
  return wrap(async () => {
    const id = await student();
    const form = formSchema.parse(input.form);
    const zone = zoneSchema.parse(input.timeZone);
    if (zone) await storeTimeZone(id, zone);
    return startExam({
      studentId: id,
      form,
      access: await examAccess(id),
      timeZone: zone,
      now: new Date(),
    });
  });
}

export async function actionExamState(input: {
  form: number;
}): Promise<ExamActionResult<SittingView | null>> {
  return wrap(async () => {
    const id = await student();
    const form = formSchema.parse(input.form);
    const state = await sittingState(id, form, await userIdOf(id), new Date());
    if (state) learnLater(form, state.finishedNow);
    return state?.view ?? null;
  });
}

export async function actionExamSave(input: {
  sittingId: string;
  module: string;
  answers: unknown;
}): Promise<ExamActionResult<{ saved: number }>> {
  return wrap(async () =>
    saveAnswers({
      studentId: await student(),
      sittingId: z.string().uuid().parse(input.sittingId),
      module: moduleSchema.parse(input.module),
      answers: answersSchema.parse(input.answers),
      now: new Date(),
    })
  );
}

export async function actionExamSubmit(input: {
  sittingId: string;
  module: string;
  answers: unknown;
}): Promise<ExamActionResult<SittingView>> {
  return wrap(async () => {
    const id = await student();
    const out = await submitModule({
      studentId: id,
      userId: await userIdOf(id),
      sittingId: z.string().uuid().parse(input.sittingId),
      module: moduleSchema.parse(input.module),
      answers: answersSchema.parse(input.answers),
      now: new Date(),
    });
    learnLater(out.view.form, out.finishedNow);
    return out.view;
  });
}

export async function actionExamEndBreak(input: {
  sittingId: string;
}): Promise<ExamActionResult<SittingView>> {
  return wrap(async () => {
    const id = await student();
    const out = await endBreak({
      studentId: id,
      userId: await userIdOf(id),
      sittingId: z.string().uuid().parse(input.sittingId),
      now: new Date(),
    });
    return out.view;
  });
}

/** Admin or development only: open exams on any day (a cookie on this browser). */
export async function actionExamTestSwitch(input: {
  on: boolean;
}): Promise<ExamActionResult<boolean>> {
  return wrap(async () => {
    await student();
    if (!(await mayTest())) throw new ExamError("Only an admin can use the test switch.", "state");
    const jar = await cookies();
    if (z.boolean().parse(input.on))
      jar.set(TEST_COOKIE, "1", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    else jar.delete(TEST_COOKIE);
    return input.on;
  });
}

/** Admin or development only: delete your own sitting of an exam so you can take it again. */
export async function actionExamReset(input: { form: number }): Promise<ExamActionResult<boolean>> {
  return wrap(async () => {
    const id = await student();
    if (!(await mayTest())) throw new ExamError("Only an admin can reset an exam.", "state");
    const sitting = await findSitting(id, formSchema.parse(input.form));
    if (sitting) await deleteSitting(sitting.id);
    return true;
  });
}
