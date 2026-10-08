import { reviewedPassageForQuestion } from "@/lib/question-bank/reviewed-passage";
import type { QuizQuestionWithChoices } from "@/types/quiz";

/** Only student display fields cross the completed-review client boundary. */
export function toQuizReviewContent(q: QuizQuestionWithChoices) {
  return {
    question_text: q.question_text,
    passage_intro: q.passage_intro,
    passage: q.passage,
    reviewed_passage: reviewedPassageForQuestion(q),
    passage_a: q.passage_a,
    passage_b: q.passage_b,
    subject: q.subject,
    answer_format: q.answer_format,
    figure_kind: q.figure_kind,
    figure_table_data: q.figure_table_data,
    figure_chart_data: q.figure_chart_data,
    figure_geometry_data: q.figure_geometry_data,
    image_url: q.image_url,
    image_alt: q.image_alt,
    answer_choices: q.answer_choices.map(({ id, letter, choice_text, choice_table_data }) => ({
      id,
      letter,
      choice_text,
      choice_table_data,
    })),
    correct_answer: q.correct_answer,
    explanation_text: q.explanation_text,
    explanation_per_choice: q.explanation_per_choice,
    desmos_strategy: q.desmos_strategy,
  };
}

export type QuizReviewContent = ReturnType<typeof toQuizReviewContent>;
