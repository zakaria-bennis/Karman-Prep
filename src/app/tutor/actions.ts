"use server";

// ============================================================
// Server Actions — Tutor portal
// Role-gated: tutor or admin only.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { revalidatePath } from "next/cache";
import { canTutorAccessStudent, assertStudentFlag } from "@/lib/auth/tutor-access";
import { flagTargetSchema, questionTargetSchema } from "./action-schemas";
import { resolveFlaggedQuestion, updateQuestion } from "@/lib/supabase/queries/quiz";
import type { QuizQuestion } from "@/types/quiz";

async function guardTutor(studentId: string): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  const ok = await canTutorAccessStudent(userId, studentId);
  if (!ok) throw new Error("Access to this student is required");
  return userId;
}

export async function actionResolveFlag(flagId: string, studentId: string) {
  const parsed = flagTargetSchema.parse({ flagId, studentId });
  const tutorId = await guardTutor(parsed.studentId);
  await assertStudentFlag(parsed.studentId, { flagId: parsed.flagId });
  await resolveFlaggedQuestion(parsed.flagId, tutorId);
  revalidatePath(`/tutor/${studentId}`);
}

export async function actionEditFlaggedQuestion(
  questionId: string,
  patch: Partial<
    Pick<
      QuizQuestion,
      | "question_text"
      | "difficulty"
      | "correct_answer"
      | "explanation_text"
      | "explanation_per_choice"
      | "topic_cluster"
      | "desmos_strategy"
    >
  >,
  studentId: string
) {
  const parsed = questionTargetSchema.parse({ questionId, patch, studentId });
  await guardTutor(parsed.studentId);
  await assertStudentFlag(parsed.studentId, { questionId: parsed.questionId });
  await updateQuestion(parsed.questionId, parsed.patch);
  revalidatePath(`/tutor/${studentId}`);
}
