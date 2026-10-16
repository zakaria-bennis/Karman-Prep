import type { QuizQuestionWithChoices } from "../../../src/types/quiz";
export async function actionStartQuiz(nodeId: string) {
  const subject = nodeId === "reading" ? "reading" : "math";
  return {
    attemptId: crypto.randomUUID(),
    questions: Array.from(
      { length: 10 },
      (_, i) =>
        ({
          id: `${subject}-${i}`,
          node_id: nodeId,
          subject,
          passage:
            subject === "reading"
              ? "The morning light revealed the quiet valley. A second observation confirmed the result."
              : undefined,
          question_text: `Question ${i + 1}: evaluate $\\sin(30)$ and $(1,2)$.`,
          answer_format: "multiple_choice",
          correct_answer: "A",
          difficulty: 1,
          difficulty_level: 1,
          explanation_text: "Synthetic calculator fixture.",
          topic_cluster: "Calculator fixture",
          figure_kind: "table",
          figure_table_data: {
            header_row: ["x", "y"],
            rows: [
              ["1", "2"],
              ["2", "4"],
              ["3", "6"],
            ],
          },
          answer_choices: ["A", "B", "C", "D"].map((letter, j) => ({
            id: letter,
            letter,
            choice_text: `$${j + 1}$`,
          })),
        }) as unknown as QuizQuestionWithChoices
    ),
  };
}
export async function actionRecordResponse() {}
export async function actionFlagQuestion() {}
export async function actionCompleteQuiz() {
  return { score: 100, confidenceBand: "high", newStatus: "mastered" };
}
