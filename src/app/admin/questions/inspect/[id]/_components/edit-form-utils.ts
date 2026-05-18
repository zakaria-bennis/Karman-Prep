// ============================================================
// Shared shape + constructor for the Inspector edit form.
// Lives outside the EditForm component so the parent
// InspectorDetailClient + the save-handler patch builder can
// both reference the field names without an import cycle.
// ============================================================

import type { QuizQuestionWithChoices } from "@/types/quiz";

/** Initial form state derived from a question + its choices. */
export function makeInitialForm(question: QuizQuestionWithChoices) {
  const byLetter = new Map(question.answer_choices.map((c) => [c.letter, c.choice_text]));
  return {
    question_text: question.question_text ?? "",
    hint: question.hint ?? "",
    explanation_text: question.explanation_text ?? "",
    desmos_strategy: question.desmos_strategy ?? "",
    image_alt: question.image_alt ?? "",
    passage_intro: question.passage_intro ?? "",
    passage: question.passage ?? "",
    passage_a: question.passage_a ?? "",
    passage_b: question.passage_b ?? "",
    numeric_tolerance: question.numeric_tolerance != null ? String(question.numeric_tolerance) : "",
    correct_answer: question.correct_answer ?? "",
    choice_a: byLetter.get("A") ?? "",
    choice_b: byLetter.get("B") ?? "",
    choice_c: byLetter.get("C") ?? "",
    choice_d: byLetter.get("D") ?? "",
  };
}

export type EditFormShape = ReturnType<typeof makeInitialForm>;
