export const catalogSkillId = "ma-skill-linear-equations-in-one-variable";

export function approvedCatalogEvidence(id = "synthetic-math-M1-Q1", publish = true) {
  return {
    question_id: id,
    B_package_sha256: "a".repeat(64),
    B_student_sha256: "b".repeat(64),
    student_publication_allowed: publish,
    D_original_record: {
      stable_question_id: id,
      content_sha256: "a".repeat(64),
      selectable_skill: "Linear equations in one variable",
      uncertain: false,
      selectable_for_downstream: true,
    },
    approved_tags: {
      schema_version: 1,
      stable_question_id: id,
      catalog_skill_id: catalogSkillId,
      catalog_domain_id: "algebra",
      domain_label: "Algebra",
      skill_label: "Linear equations in one variable",
      tag_binding_manifest_sha256: "c".repeat(64),
      pilot_row_sha256: "d".repeat(64),
      content_sha256: "a".repeat(64),
      student_content_sha256: "b".repeat(64),
      question_payload_sha256: catalogQuestionPayloadHash(
        catalogQuestion() as unknown as QuizQuestionWithChoices
      ),
    },
  };
}

export function catalogQuestion(id = "question-1") {
  return {
    id,
    node_id: null,
    concept_slug: null,
    domain: "algebra",
    subject: "math",
    topic_cluster: "Algebra",
    is_live: true,
    publish_status: "publish_ready",
    difficulty_level: 3,
    answer_format: "multiple_choice",
    question_text: "What is x if x + 2 = 5?",
    correct_answer: "A",
    explanation_text: "Subtract 2.",
    answer_choices: [{ id: "choice-1", question_id: id, letter: "A", choice_text: "3" }],
  };
}
import { catalogQuestionPayloadHash } from "../../src/lib/question-bank/catalog-question-scope";
import type { QuizQuestionWithChoices } from "../../src/types/quiz";
