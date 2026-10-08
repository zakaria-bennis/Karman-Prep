import type { QuizQuestionWithChoices } from "@/types/quiz";

/** Source-backed display structure; never inferred from a literary-title match. */
export interface ReviewedPassageDisplay {
  intro: string;
  excerpt: string;
  copyright: string;
}

// June recalled-exam copy: PDF SHA80beb6e8..., page12, Reading M2 Q7.
// Independently matches official Practice5, printed19, M2 Q9. These are
// distinct source occurrences; this display repair does not reclassify provenance.
const intro =
  "The following text is adapted from Ann Petry's 1946 novel The Street. Lutie lives in an apartment in Harlem, New York.";
const excerpt =
  "The glow from the sunset was making the street radiant. The street is nice in this light, [Lutie] thought. It was swarming with children who were playing ball and darting back and forth across the sidewalk in complicated games of tag. Girls were skipping double dutch rope, going tirelessly through the exact center of a pair of ropes, jumping first on one foot and then the other.";
const copyright = "©1946 by Ann Petry";
const originalPassage = [intro, excerpt, copyright].join(" ");
const choices: Record<string, string> = {
  A: "Lutie is observing the appearance of the street at a particular time of day and the events occurring on it.",
  B: "Lutie is annoyed by the noise of children playing games on her street.",
  C: "Lutie is puzzled by the rules of certain children's games.",
  D: "Lutie is spending time alone in her apartment because she doesn't want to interact with her neighbors.",
};

export function reviewedPassageForQuestion(
  q: QuizQuestionWithChoices
): ReviewedPassageDisplay | undefined {
  // The legacy app type predates source-identity columns; the DB query selects
  // them. Missing metadata must leave the original passage untouched.
  const source = q as unknown as Record<string, unknown>;
  if (
    q.id !== "8c530273-c1c7-5ee1-8848-296022b0a7f4" ||
    source.source_provider !== "box" ||
    source.source_document_id !== "1892236064593" ||
    source.source_provider_version_id !== "2087157735793" ||
    source.source_version !== "80beb6e8dc44170657fabcd2b557af1c22b4432290cf8b6af29928af7ced937c" ||
    q.source_page !== 12 ||
    source.source_section !== "reading" ||
    source.source_module !== "M2" ||
    source.source_question_number !== 7 ||
    q.passage_intro !== null ||
    q.passage !== originalPassage ||
    q.passage_a !== null ||
    q.passage_b !== null ||
    q.question_text !== "Which choice best describes what is happening in the text?" ||
    q.answer_choices.length !== 4 ||
    new Set(q.answer_choices.map((c) => c.letter)).size !== 4 ||
    q.answer_choices.some((c) => choices[c.letter] !== c.choice_text)
  )
    return undefined;
  return {
    intro: intro.replace("The Street", "<i>The Street</i>"),
    excerpt,
    copyright,
  };
}
