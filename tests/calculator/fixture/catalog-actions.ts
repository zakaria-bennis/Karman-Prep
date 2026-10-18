import { actionStartQuiz } from "./actions";
export const catalogQuestions = (await actionStartQuiz("math")).questions.slice(0, 2);
let answered = 0;
let saved: {
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  correct_answer: string;
  explanation_text: string;
}[] = [];
export const catalogSession = () => ({
  id: "catalog-fixture",
  skillId: "fixture",
  assignmentId: null,
  completedAt: null,
  score: null,
  answered,
  total: 2,
  question: catalogQuestions[answered] ?? null,
  reviews: saved,
});
export async function actionStartCatalogPractice() {
  return catalogSession();
}
export async function actionSubmitCatalogPractice(input: { questionId: string; answer: string }) {
  const review = {
    questionId: input.questionId,
    studentAnswer: input.answer,
    isCorrect: input.answer === "A",
    correct_answer: "A",
    explanation_text: "Synthetic saved feedback.",
  };
  saved = [...saved, review];
  answered++;
  return review;
}
export async function actionResumeCatalogPractice() {
  return catalogSession();
}
export async function actionCompleteCatalogPractice() {
  return { ...catalogSession(), completedAt: "2026-10-15", score: 50 };
}
