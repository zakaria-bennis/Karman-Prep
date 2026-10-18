"use server";

// ============================================================
// Server Actions — Tutor portal
// Role-gated: tutor or admin only.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { revalidatePath } from "next/cache";
import { canTutorAccessStudent, assertStudentFlag } from "@/lib/auth/tutor-access";
import {
  nodeOverrideSchema,
  checkpointSchema,
  flagTargetSchema,
  questionTargetSchema,
} from "./action-schemas";
import {
  applyTutorNodeOverride,
  assignCheckpointRetake,
  overrideCheckpointCooldown,
} from "@/lib/supabase/queries/tutor";
import { resolveFlaggedQuestion, updateQuestion } from "@/lib/supabase/queries/quiz";
import type { OverrideStatus, QuizQuestion } from "@/types/quiz";

async function guardTutor(studentId: string): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  const ok = await canTutorAccessStudent(userId, studentId);
  if (!ok) throw new Error("Access to this student is required");
  return userId;
}

export async function actionApplyNodeOverride(input: {
  student_id: string;
  node_id: string;
  override_status: OverrideStatus;
  locked_pathway: boolean;
  reason?: string;
}) {
  const parsed = nodeOverrideSchema.parse(input);
  const tutorId = await guardTutor(parsed.student_id);
  await applyTutorNodeOverride({
    ...parsed,
    tutor_id: tutorId,
  });
  revalidatePath(`/tutor/${input.student_id}`);
}

export async function actionAssignCheckpointRetake(input: {
  student_id: string;
  checkpoint_id: string;
  reason?: string;
}) {
  const parsed = checkpointSchema.parse(input);
  const tutorId = await guardTutor(parsed.student_id);
  await assignCheckpointRetake({ ...parsed, tutor_id: tutorId });
  revalidatePath(`/tutor/${input.student_id}`);
}

export async function actionOverrideCooldown(input: { student_id: string; checkpoint_id: string }) {
  const parsed = checkpointSchema.parse(input);
  const tutorId = await guardTutor(parsed.student_id);
  await overrideCheckpointCooldown({ ...parsed, tutor_id: tutorId });
  revalidatePath(`/tutor/${input.student_id}`);
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
