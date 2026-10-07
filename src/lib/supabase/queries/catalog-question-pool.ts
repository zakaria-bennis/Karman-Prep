import { createAdminClient } from "@/lib/supabase/server";
import { CATALOG_SKILLS } from "@/data/curriculum/skill-catalog";
import {
  catalogPoolInputSchema,
  readCatalogQuestionScope,
  catalogQuestionPayloadHash,
} from "@/lib/question-bank/catalog-question-scope";
import { CLUSTER_BY_DOMAIN } from "@/lib/question-bank/taxonomy";
import {
  numericAnswerSetFromEvidence,
  reviewedNumericAnswers,
} from "@/lib/question-bank/numeric-answer-set";
import type { QuizQuestionWithChoices } from "@/types/quiz";

/** Canonical catalog read lane; existing node/slug pools and histories are never rewritten. */
export async function fetchCatalogQuestionPool(input: unknown): Promise<QuizQuestionWithChoices[]> {
  const scope = catalogPoolInputSchema.parse(input);
  const skill = CATALOG_SKILLS.find((candidate) => candidate.id === scope.skillId)!;
  const db = createAdminClient();
  const evidence = new Map<string, unknown>();
  const seen = new Set<string>();
  // The ID is selected from the fixed catalog before entering PostgREST filter syntax.
  const filter = [
    `raw_model_response->approved_tags->>catalog_skill_id.eq.${skill.id}`,
    `raw_model_response->evidence->approved_tags->>catalog_skill_id.eq.${skill.id}`,
  ].join(",");
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db
      .from("answer_key_entries")
      .select("id, question_id, raw_model_response")
      .or(filter)
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error("Reviewed skill questions could not be loaded");
    for (const key of data ?? []) {
      if (!key.question_id || seen.has(key.question_id)) {
        throw new Error("Reviewed skill evidence is ambiguous");
      }
      seen.add(key.question_id);
      const tag = readCatalogQuestionScope(key.raw_model_response);
      if (tag.skill.id !== skill.id) throw new Error("Reviewed skill scope differs");
      if (tag.publicationAllowed) evidence.set(key.question_id, key.raw_model_response);
    }
    if ((data ?? []).length < pageSize) break;
  }
  const ids = [...evidence.keys()];
  const questions: QuizQuestionWithChoices[] = [];
  for (let offset = 0; offset < ids.length; offset += 200) {
    const { data, error } = await db
      .from("quiz_questions")
      .select("*, answer_choices(*)")
      .in("id", ids.slice(offset, offset + 200))
      .eq("is_live", true)
      .in("publish_status", ["publish_ready", "publish_ready_with_verified_repair"])
      .eq("subject", skill.subject)
      .eq("domain", skill.domainId)
      .eq("topic_cluster", CLUSTER_BY_DOMAIN[skill.domainId as keyof typeof CLUSTER_BY_DOMAIN])
      .gte("difficulty_level", scope.minimumDifficulty)
      .lte("difficulty_level", scope.maximumDifficulty)
      .order("id", { ascending: true });
    if (error) throw new Error("Reviewed skill questions could not be loaded");
    for (const row of data ?? []) {
      const raw = evidence.get(row.id);
      const tag = readCatalogQuestionScope(raw);
      if (
        tag.tags.question_payload_sha256 !==
        catalogQuestionPayloadHash(row as QuizQuestionWithChoices)
      ) {
        throw new Error("Reviewed skill question snapshot differs from the approved delivery");
      }
      questions.push({
        ...row,
        reviewed_numeric_answers:
          row.answer_format === "numeric_entry"
            ? reviewedNumericAnswers(row, numericAnswerSetFromEvidence(raw))
            : undefined,
      } as QuizQuestionWithChoices);
    }
  }
  return questions.sort((left, right) => left.id.localeCompare(right.id));
}
