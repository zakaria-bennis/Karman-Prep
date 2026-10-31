import { reviewedPassageForQuestion } from "@/lib/question-bank/reviewed-passage";
import type { QuizQuestionWithChoices, StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";

/** The hand-drawn SVG a student sees: figure_kind 'image' with no raster image_url. */
export function studentFigureSvg(question: QuizQuestionWithChoices): string | null {
  return question.figure_kind === "image" &&
    !question.image_url &&
    typeof question.figure_svg === "string" &&
    question.figure_svg
    ? question.figure_svg
    : null;
}

export function toStudentQuizQuestion(question: QuizQuestionWithChoices): StudentQuizQuestion {
  return {
    id: question.id,
    node_id: question.node_id,
    question_text: question.question_text,
    question_type: question.question_type,
    difficulty: question.difficulty,
    difficulty_level: question.difficulty_level,
    answer_format: question.answer_format,
    hint: question.hint,
    image_url: question.image_url,
    image_alt: question.image_alt,
    subject: question.subject,
    topic_cluster: question.topic_cluster,
    display_order: question.display_order,
    passage_intro: question.passage_intro,
    passage: question.passage,
    reviewed_passage: reviewedPassageForQuestion(question),
    passage_a: question.passage_a,
    passage_b: question.passage_b,
    figure_kind: question.figure_kind,
    figure_table_data: question.figure_table_data,
    figure_chart_data: question.figure_chart_data,
    figure_geometry_data: question.figure_geometry_data,
    // Only an SVG figure carries the key, so every other question's payload (and its
    // catalogQuestionPayloadHash seal) is unchanged.
    ...(studentFigureSvg(question) ? { figure_svg: studentFigureSvg(question) } : {}),
    // Likewise only a question or choice with a figure_spec carries that key.
    ...(question.figure_spec != null ? { figure_spec: question.figure_spec } : {}),
    answer_choices: question.answer_choices.map((choice) => ({
      id: choice.id,
      question_id: choice.question_id,
      letter: choice.letter,
      choice_text: choice.choice_text,
      choice_table_data: choice.choice_table_data ?? null,
      ...(choice.choice_figure_spec != null
        ? { choice_figure_spec: choice.choice_figure_spec }
        : {}),
    })),
  };
}

export function toStudentQuizReview(
  question: QuizQuestionWithChoices,
  isCorrect: boolean,
  studentAnswer: string
): StudentQuizReview {
  return {
    correct_answer: question.correct_answer,
    numeric_tolerance: question.numeric_tolerance,
    explanation_text: question.explanation_text,
    explanation_per_choice: question.explanation_per_choice,
    desmos_strategy: question.desmos_strategy,
    isCorrect,
    studentAnswer,
  };
}
