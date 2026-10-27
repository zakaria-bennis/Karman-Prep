"use server";
// Bookmarks, tutor flags and problem reports from the quiz shell (quiz engine spec, Data).
import { z } from "zod";
import { safeAuth } from "@/lib/auth/dev-auth";
import { flagQuestion } from "@/lib/supabase/queries/quiz/flags";
import {
  getSavedFor,
  getSavedQuestion,
  setSavedQuestion,
  type SavedSource,
} from "@/lib/supabase/queries/quiz/saved";
import { hasTutor } from "@/lib/supabase/queries/quiz/tutor-link";

const questionId = z.string().uuid();
const nodeId = z.string().min(1).max(64).nullable();

async function student() {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export async function actionToggleBookmark(input: {
  questionId: string;
}): Promise<{ saved: boolean }> {
  const { questionId: id } = z.object({ questionId }).parse(input);
  const userId = await student();
  const current = await getSavedQuestion(userId, id);
  if (current === "tutor_flag") return { saved: true };
  await setSavedQuestion(userId, id, current ? null : "bookmark");
  return { saved: !current };
}

export async function actionFlagForTutor(input: {
  questionId: string;
  nodeId: string | null;
  note: string | null;
}) {
  const parsed = z
    .object({ questionId, nodeId, note: z.string().max(2000).nullable() })
    .parse(input);
  const userId = await student();
  if (parsed.nodeId)
    await flagQuestion({
      question_id: parsed.questionId,
      student_id: userId,
      node_id: parsed.nodeId,
      flag_note: parsed.note?.trim() || null,
    });
  await setSavedQuestion(userId, parsed.questionId, "tutor_flag");
}

export async function actionReportProblem(input: {
  questionId: string;
  nodeId: string | null;
  note: string;
}) {
  const parsed = z
    .object({ questionId, nodeId, note: z.string().trim().min(1).max(2000) })
    .parse(input);
  const userId = await student();
  await flagQuestion({
    question_id: parsed.questionId,
    student_id: userId,
    node_id: parsed.nodeId ?? "unknown",
    flag_note: `Problem report: ${parsed.note}`,
  });
}

/** What the quiz shell needs about the signed-in student: tutor link and saved markers. */
export async function actionQuizStudentState(input: {
  questionIds: string[];
}): Promise<{ hasTutor: boolean; saved: Record<string, SavedSource> }> {
  const { questionIds } = z.object({ questionIds: z.array(questionId).max(200) }).parse(input);
  const { userId } = await safeAuth();
  if (!userId) return { hasTutor: false, saved: {} };
  const [tutor, saved] = await Promise.all([hasTutor(userId), getSavedFor(userId, questionIds)]);
  return { hasTutor: tutor, saved };
}
