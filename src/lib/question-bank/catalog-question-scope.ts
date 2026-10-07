import { z } from "zod";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import { canonicalJson, sha256Hex } from "../../../scripts/pdf-pipeline/reviewed-input-hash";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import type { QuizQuestionWithChoices } from "@/types/quiz";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const tagsSchema = z.object({
  schema_version: z.literal(1),
  stable_question_id: z.string().min(1),
  catalog_skill_id: z.string(),
  catalog_domain_id: z.string(),
  domain_label: z.string(),
  skill_label: z.string(),
  tag_binding_manifest_sha256: digest,
  pilot_row_sha256: digest,
  content_sha256: digest,
  student_content_sha256: digest,
  question_payload_sha256: digest.optional(),
});

export const catalogPoolInputSchema = z
  .object({
    skillId: z.string().refine((id) => CATALOG_SKILLS.some((skill) => skill.id === id)),
    minimumDifficulty: z.number().int().min(1).max(7).default(1),
    maximumDifficulty: z.number().int().min(1).max(7).default(7),
  })
  .strict()
  .refine((input) => input.minimumDifficulty <= input.maximumDifficulty, {
    message: "Minimum difficulty exceeds maximum",
  });

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Private, version-bound metadata. Never infer a catalog tag from a legacy node/slug. */
export function readCatalogQuestionScope(rawEvidence: unknown) {
  const envelope = object(rawEvidence);
  if (!envelope) throw new Error("Reviewed skill evidence is unavailable");
  const generated = envelope.kind === "independently_confirmed_generated";
  const evidence = generated ? object(envelope.evidence) : envelope;
  // Reject ambiguous envelopes rather than silently choosing one tag lane.
  if (!evidence || (generated && envelope.approved_tags != null)) {
    throw new Error("Reviewed skill evidence is ambiguous");
  }
  const parsed = tagsSchema.safeParse(evidence.approved_tags);
  if (!parsed.success) throw new Error("Reviewed skill evidence is unavailable");
  const tags = parsed.data;
  const skill = CATALOG_SKILLS.find((candidate) => candidate.id === tags.catalog_skill_id);
  const assessment = object(evidence.D_original_record);
  if (
    !skill ||
    tags.catalog_domain_id !== skill.domainId ||
    tags.domain_label !== skill.domainLabel ||
    tags.skill_label !== skill.label ||
    evidence.question_id !== tags.stable_question_id ||
    evidence.B_package_sha256 !== tags.content_sha256 ||
    evidence.B_student_sha256 !== tags.student_content_sha256 ||
    assessment?.stable_question_id !== tags.stable_question_id ||
    assessment.content_sha256 !== tags.content_sha256 ||
    assessment.selectable_skill !== skill.label ||
    assessment.uncertain !== false ||
    assessment.selectable_for_downstream !== true
  ) {
    throw new Error("Reviewed skill evidence differs from the approved question version");
  }
  return {
    skill,
    tags,
    // Private pilot evidence explicitly stays nonpublishable even if a row is toggled live.
    publicationAllowed: evidence.student_publication_allowed === true,
  };
}

/** Seal the delivered text/figure/choice/key snapshot, independent of database UUIDs or old node links. */
export function catalogQuestionPayloadHash(question: QuizQuestionWithChoices): string {
  const student = toStudentQuizQuestion(question);
  const { id: _id, node_id: _node, display_order: _order, answer_choices, ...display } = student;
  // The excluded IDs/order never authorize an answer or a catalog mapping.
  void _id;
  void _node;
  void _order;
  const snapshot = {
    ...display,
    domain: question.domain,
    correct_answer: question.correct_answer,
    numeric_tolerance: question.numeric_tolerance,
    explanation_text: question.explanation_text,
    explanation_per_choice: question.explanation_per_choice,
    desmos_strategy: question.desmos_strategy,
    answer_choices: answer_choices
      .map(({ letter, choice_text, choice_table_data }) => ({
        letter,
        choice_text,
        choice_table_data,
      }))
      .sort((left, right) => left.letter.localeCompare(right.letter)),
  };
  return sha256Hex(canonicalJson(JSON.parse(JSON.stringify(snapshot))));
}
