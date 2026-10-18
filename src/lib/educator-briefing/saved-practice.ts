import { z } from "zod";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import {
  catalogQuestionBindingSchema,
  toCatalogStudentQuestion,
  type CatalogDeliverySnapshot,
} from "@/lib/catalog-practice/delivery-contract";

const uuid = z.string().uuid();
const instant = z.string().datetime({ offset: true });
export const savedSessionSchema = z.object({
  id: uuid,
  student_id: z.string().min(1),
  skill_id: z.string().min(1),
  assignment_id: uuid.nullable(),
  snapshots: z.array(z.unknown()).min(1).max(10),
  started_at: instant,
  completed_at: instant.nullable(),
  score: z.number().int().min(0).max(100).nullable(),
});
export const savedResponseSchema = z.object({
  session_id: uuid,
  ordinal: z.number().int().min(0).max(9),
  question_id: uuid,
  student_answer: z.string(),
  is_correct: z.boolean(),
  answered_at: instant,
});
export type SavedSession = z.infer<typeof savedSessionSchema>;
export type SavedResponse = z.infer<typeof savedResponseSchema>;

/** Read the historical snapshot; never regrade, replace it with today's pool, or expose its key. */
export function presentSavedSession(session: SavedSession, responses: SavedResponse[]) {
  const skill = CATALOG_SKILLS.find((item) => item.id === session.skill_id);
  if (!skill) throw new Error("Saved practice skill is unavailable");
  if (responses.some((response) => response.session_id !== session.id)) {
    throw new Error("Saved answers belong to a different session");
  }
  const ordered = [...responses].sort((a, b) => a.ordinal - b.ordinal);
  if (
    ordered.some((response, index) => response.ordinal !== index) ||
    ordered.length > session.snapshots.length
  ) {
    throw new Error("Saved answer order is invalid");
  }
  if (session.completed_at && ordered.length !== session.snapshots.length) {
    throw new Error("Completed practice answer details are unavailable");
  }
  const seen = new Set<string>();
  const questions = session.snapshots.map((raw, index) => {
    const snapshot = raw as CatalogDeliverySnapshot;
    const binding = catalogQuestionBindingSchema.parse(snapshot?.binding);
    if (binding.catalogSkillId !== session.skill_id || seen.has(binding.questionId)) {
      throw new Error("Saved question binding is invalid");
    }
    seen.add(binding.questionId);
    const question = toCatalogStudentQuestion(snapshot);
    if (
      question.id !== binding.questionId ||
      typeof question.question_text !== "string" ||
      question.subject !== skill.subject ||
      !["multiple_choice", "numeric_entry"].includes(question.answer_format)
    ) {
      throw new Error("Saved question display is invalid");
    }
    if (question.answer_choices.some((choice) => choice.question_id !== question.id)) {
      throw new Error("Saved choice binding is invalid");
    }
    const response = ordered[index] ?? null;
    if (response && response.question_id !== question.id)
      throw new Error("Saved answer differs from its question");
    return {
      question,
      originalAnswer: response?.student_answer ?? null,
      originalCorrect: response?.is_correct ?? null,
      answeredAt: response?.answered_at ?? null,
    };
  });
  return {
    id: session.id,
    skillId: skill.id,
    skillLabel: skill.label,
    assignmentId: session.assignment_id,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    score: session.score,
    answered: ordered.length,
    total: questions.length,
    questions,
  };
}

export type SavedPracticeReview = ReturnType<typeof presentSavedSession>;

export function practiceSummary(review: SavedPracticeReview) {
  const { questions, ...metadata } = review;
  return {
    ...metadata,
    missed: questions.flatMap((item, index) =>
      item.originalCorrect === false
        ? [
            {
              ordinal: index,
              questionText: item.question.question_text,
              originalAnswer: item.originalAnswer!,
            },
          ]
        : []
    ),
  };
}
