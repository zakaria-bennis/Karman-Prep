"use server";

// ============================================================
// Server Actions — Tutor portal
// Role-gated: tutor or admin only.
// ============================================================

import { safeAuth } from "@/lib/auth/dev-auth";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/queries/admin";
import {
  applyTutorNodeOverride,
  assignCheckpointRetake,
  overrideCheckpointCooldown,
} from "@/lib/supabase/queries/tutor";
import { resolveFlaggedQuestion, updateQuestion } from "@/lib/supabase/queries/quiz";
import type { OverrideStatus, QuizQuestion } from "@/types/quiz";

async function guardTutor(): Promise<string> {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  const ok = await requireRole(userId, ["tutor", "admin"]);
  if (!ok) throw new Error("Tutor or admin role required");
  return userId;
}

export async function actionApplyNodeOverride(input: {
  student_id: string;
  node_id: string;
  override_status: OverrideStatus;
  locked_pathway: boolean;
  reason?: string;
}) {
  const tutorId = await guardTutor();
  await applyTutorNodeOverride({
    tutor_id: tutorId,
    ...input,
  });
  revalidatePath(`/tutor/${input.student_id}`);
}

export async function actionAssignCheckpointRetake(input: {
  student_id: string;
  checkpoint_id: string;
  reason?: string;
}) {
  const tutorId = await guardTutor();
  await assignCheckpointRetake({ tutor_id: tutorId, ...input });
  revalidatePath(`/tutor/${input.student_id}`);
}

export async function actionOverrideCooldown(input: { student_id: string; checkpoint_id: string }) {
  const tutorId = await guardTutor();
  await overrideCheckpointCooldown({ tutor_id: tutorId, ...input });
  revalidatePath(`/tutor/${input.student_id}`);
}

export async function actionResolveFlag(flagId: string, studentId: string) {
  const tutorId = await guardTutor();
  await resolveFlaggedQuestion(flagId, tutorId);
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
  await guardTutor();
  await updateQuestion(questionId, patch);
  revalidatePath(`/tutor/${studentId}`);
}
