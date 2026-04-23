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
  reorderQuestions,
  deleteQuestion,
  resolveFlaggedQuestion,
  type NewQuestionInput,
} from "@/lib/supabase/queries/quiz";
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

export async function actionUpdateQuestion(
  questionId: string,
  patch: Partial<Pick<QuizQuestion, "question_text" | "difficulty" | "correct_answer" | "explanation_text" | "explanation_per_choice" | "topic_cluster" | "desmos_strategy">>,
  nodeId: string
) {
  await guardAdmin();
  await updateQuestion(questionId, patch);
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
    await insertQuestion({
      node_id: nodeId,
      question_text: r.question_text,
      question_type: subject === "reading" ? "evidence_based" : "math_computation",
      difficulty: r.difficulty,
      correct_answer: r.correct_answer,
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
