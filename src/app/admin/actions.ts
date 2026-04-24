"use server";

// ============================================================
// Server Actions — Admin curriculum UI
// Role-gated: admin only.
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/supabase/queries/admin";
import {
  insertQuestion,
  updateQuestion,
  updateQuestionDifficulty,
  updateQuestionDifficultyLevel,
  reorderQuestions,
  deleteQuestion,
  resolveFlaggedQuestion,
  uploadQuestionImage,
  removeQuestionImage,
  type NewQuestionInput,
} from "@/lib/supabase/queries/quiz";
import {
  upsertTextbook,
  upsertVideoURL,
  uploadVideoFile,
  deleteVideo,
} from "@/lib/supabase/queries/content";
import type { AnswerLetter, QuizDifficulty, QuizQuestion } from "@/types/quiz";

async function guardAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const ok = await requireRole(userId, ["admin"]);
  if (!ok) throw new Error("Admin role required");
  return userId;
}

export async function actionAddQuestion(input: NewQuestionInput) {
  await guardAdmin();
  const q = await insertQuestion(input);
  revalidatePath(`/admin/curriculum/${input.node_id}`);
  return q;
}

export async function actionUpdateQuestionDifficulty(
  questionId: string,
  difficulty: QuizDifficulty,
  nodeId: string
) {
  await guardAdmin();
  await updateQuestionDifficulty(questionId, difficulty);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionUpdateQuestionDifficultyLevel(
  questionId: string,
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7
) {
  await guardAdmin();
  await updateQuestionDifficultyLevel(questionId, level);
}

export async function actionUpdateQuestion(
  questionId: string,
  patch: Partial<Pick<QuizQuestion, "question_text" | "difficulty" | "correct_answer" | "explanation_text" | "explanation_per_choice" | "hint" | "topic_cluster" | "desmos_strategy">>,
  nodeId: string
) {
  await guardAdmin();
  await updateQuestion(questionId, patch);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

// ── Content (textbook + video) actions ────────────────────

export async function actionSaveTextbook(nodeId: string, textbook: string) {
  const userId = await guardAdmin();
  await upsertTextbook(nodeId, textbook, userId);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionSaveVideoURL(
  nodeId: string,
  videoUrl: string | null,
  durationSeconds: number | null
) {
  const userId = await guardAdmin();
  await upsertVideoURL(nodeId, videoUrl, durationSeconds, userId);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionUploadVideo(
  nodeId: string,
  formData: FormData
): Promise<{ publicUrl: string }> {
  const userId = await guardAdmin();
  const file = formData.get("video") as File | null;
  if (!file) throw new Error("No video file in form data");

  const bytes = await file.arrayBuffer();
  const { publicUrl } = await uploadVideoFile(
    nodeId,
    file.name,
    bytes,
    file.type || "video/mp4",
    userId
  );
  revalidatePath(`/admin/curriculum/${nodeId}`);
  return { publicUrl };
}

export async function actionDeleteVideo(nodeId: string, storagePath: string | null) {
  const userId = await guardAdmin();
  await deleteVideo(nodeId, storagePath, userId);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionReorderQuestions(orderedIds: string[], nodeId: string) {
  await guardAdmin();
  await reorderQuestions(orderedIds);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionDeleteQuestion(questionId: string, nodeId: string) {
  await guardAdmin();
  await deleteQuestion(questionId);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionUploadQuestionImage(
  questionId: string,
  nodeId: string,
  formData: FormData,
  alt: string | null
): Promise<{ publicUrl: string }> {
  await guardAdmin();
  const file = formData.get("image") as File | null;
  if (!file) throw new Error("No image file in form data");
  const bytes = await file.arrayBuffer();
  const { publicUrl } = await uploadQuestionImage(
    questionId,
    file.name,
    bytes,
    file.type || "image/png",
    alt
  );
  revalidatePath(`/admin/curriculum/${nodeId}`);
  return { publicUrl };
}

export async function actionRemoveQuestionImage(
  questionId: string,
  nodeId: string,
  storagePath: string | null
) {
  await guardAdmin();
  await removeQuestionImage(questionId, storagePath);
  revalidatePath(`/admin/curriculum/${nodeId}`);
}

export async function actionResolveFlaggedQuestion(flagId: string) {
  const userId = await guardAdmin();
  await resolveFlaggedQuestion(flagId, userId);
  revalidatePath(`/admin/curriculum`);
}

export interface BulkImportRow {
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: AnswerLetter;
  difficulty: QuizDifficulty;
  topic_cluster: string;
  hint?: string;
  explanation_text: string;
  explanation_a?: string;
  explanation_b?: string;
  explanation_c?: string;
  explanation_d?: string;
  desmos_strategy?: string;
}

export async function actionBulkImport(
  nodeId: string,
  subject: "reading" | "math",
  rows: BulkImportRow[]
): Promise<{ inserted: number }> {
  await guardAdmin();
  let inserted = 0;
  for (const r of rows) {
    const legacyLevelMap = { foundational: 2, intermediate: 4, advanced: 5, mastery: 6 } as const;
    await insertQuestion({
      node_id: nodeId,
      question_text: r.question_text,
      question_type: subject === "reading" ? "evidence_based" : "math_computation",
      difficulty: r.difficulty,
      difficulty_level: legacyLevelMap[r.difficulty],
      answer_format: "multiple_choice",
      correct_answer: r.correct_answer,
      numeric_tolerance: null,
      explanation_text: r.explanation_text,
      explanation_per_choice:
        subject === "reading"
          ? {
              A: r.explanation_a,
              B: r.explanation_b,
              C: r.explanation_c,
              D: r.explanation_d,
            }
          : null,
      hint: r.hint ?? null,
      subject,
      topic_cluster: r.topic_cluster,
      desmos_strategy: r.desmos_strategy ?? null,
      choices: [
        { letter: "A", choice_text: r.choice_a },
        { letter: "B", choice_text: r.choice_b },
        { letter: "C", choice_text: r.choice_c },
        { letter: "D", choice_text: r.choice_d },
      ],
    });
    inserted++;
  }
  revalidatePath(`/admin/curriculum/${nodeId}`);
  return { inserted };
}
