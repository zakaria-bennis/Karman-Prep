import { z } from "zod";
import type { QuizQuestionWithChoices, StudentQuizQuestion, StudentQuizReview } from "@/types/quiz";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import {
  catalogQuestionPayloadHash,
  readCatalogQuestionScope,
} from "@/lib/question-bank/catalog-question-scope";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const catalogQuestionBindingSchema = z
  .object({
    questionId: z.string().uuid(),
    stableQuestionId: z.string().min(1),
    catalogSkillId: z.string().min(1),
    payloadSha256: digest,
  })
  .strict();
export type CatalogQuestionBinding = z.infer<typeof catalogQuestionBindingSchema>;

export type CatalogDeliverySnapshot = {
  binding: CatalogQuestionBinding;
  student: StudentQuizQuestion;
  answer: {
    correctAnswer: string;
    numericTolerance: number | null;
    reviewedNumericAnswers: string[] | null;
    answerFormat: QuizQuestionWithChoices["answer_format"];
  };
  review: Pick<
    StudentQuizReview,
    "explanation_text" | "explanation_per_choice" | "desmos_strategy"
  >;
  evidence: {
    sourceVersion: string | null;
    contentSha256: string;
    studentContentSha256: string;
    /** Null for later reviewed batches, which are sealed by the delivered payload instead. */
    pilotRowSha256: string | null;
    tagBindingManifestSha256: string;
  };
};

/** Server only. The private evidence and delivered bytes must agree before allocation. */
export function buildCatalogDeliverySnapshot(
  question: QuizQuestionWithChoices,
  rawEvidence: unknown
): CatalogDeliverySnapshot {
  const scope = readCatalogQuestionScope(rawEvidence);
  if (
    !scope.publicationAllowed ||
    scope.tags.question_payload_sha256 !== catalogQuestionPayloadHash(question)
  ) {
    throw new Error("Reviewed question version is unavailable");
  }
  return {
    binding: {
      questionId: question.id,
      stableQuestionId: scope.tags.stable_question_id,
      catalogSkillId: scope.skill.id,
      payloadSha256: scope.tags.question_payload_sha256,
    },
    student: toStudentQuizQuestion(question),
    answer: {
      correctAnswer: question.correct_answer,
      numericTolerance: question.numeric_tolerance,
      reviewedNumericAnswers: question.reviewed_numeric_answers ?? null,
      answerFormat: question.answer_format,
    },
    review: {
      explanation_text: question.explanation_text,
      explanation_per_choice: question.explanation_per_choice,
      desmos_strategy: question.desmos_strategy,
    },
    evidence: {
      sourceVersion:
        (question as QuizQuestionWithChoices & { source_version?: string | null }).source_version ??
        null,
      contentSha256: scope.tags.content_sha256,
      studentContentSha256: scope.tags.student_content_sha256,
      pilotRowSha256: scope.tags.pilot_row_sha256 ?? null,
      tagBindingManifestSha256: scope.tags.tag_binding_manifest_sha256,
    },
  };
}

export function requireMatchingBinding(
  snapshot: CatalogDeliverySnapshot,
  requested: CatalogQuestionBinding
): void {
  const binding = catalogQuestionBindingSchema.parse(requested);
  if (
    Object.keys(binding).some(
      (key) =>
        binding[key as keyof CatalogQuestionBinding] !==
        snapshot.binding[key as keyof CatalogQuestionBinding]
    )
  )
    throw new Error("Reviewed question version changed");
}

/** Only this projection may cross the student action boundary before a saved answer. */
export function toCatalogStudentQuestion(snapshot: CatalogDeliverySnapshot): StudentQuizQuestion {
  const question = toStudentQuizQuestion(snapshot.student as QuizQuestionWithChoices);
  // The frozen DTO deliberately omits raw source metadata. Its validated display
  // annotation must be preserved, rather than re-derived from missing metadata.
  if (snapshot.student.reviewed_passage === undefined) return question;
  const display = z
    .object({ intro: z.string(), excerpt: z.string(), copyright: z.string() })
    .strict()
    .safeParse(snapshot.student.reviewed_passage);
  if (!display.success) throw new Error("Saved practice session is invalid");
  return {
    ...question,
    reviewed_passage: {
      intro: display.data.intro,
      excerpt: display.data.excerpt,
      copyright: display.data.copyright,
    },
  };
}
