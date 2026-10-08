import { createAdminClient } from "@/lib/supabase/server";
import { fetchCatalogQuestionPool } from "@/lib/supabase/queries/catalog-question-pool";
import {
  buildCatalogDeliverySnapshot,
  type CatalogDeliverySnapshot,
} from "@/lib/catalog-practice/delivery-contract";
import type { AssignmentSelection } from "./service";

export interface SelectedAssignmentQuestion {
  snapshot: CatalogDeliverySnapshot;
  sourcePdf: string | null;
  sourcePage: number | null;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Server-only admission; the client sends IDs, never a key or version hash. */
export const catalogAssignmentSelection: AssignmentSelection<SelectedAssignmentQuestion> = {
  async select(skillId, questionIds) {
    const pool = await fetchCatalogQuestionPool({ skillId });
    const byId = new Map(pool.map((question) => [question.id, question]));
    const selected = questionIds.map((id) => byId.get(id));
    if (selected.some((question) => !question)) {
      throw new Error("Selected question is not in the approved skill pool");
    }

    const { data: evidenceRows, error } = await createAdminClient()
      .from("answer_key_entries")
      .select("question_id, raw_model_response")
      .in("question_id", [...questionIds]);
    if (error) throw new Error("Reviewed question evidence could not be loaded");
    const evidence = new Map<string, unknown>();
    for (const row of evidenceRows ?? []) {
      if (!row.question_id || evidence.has(row.question_id)) {
        throw new Error("Reviewed question evidence is ambiguous");
      }
      evidence.set(row.question_id, row.raw_model_response);
    }

    return selected.map((question) => {
      if (!question) throw new Error("Selected question is unavailable");
      const snapshot = buildCatalogDeliverySnapshot(question, evidence.get(question.id));
      if (snapshot.binding.catalogSkillId !== skillId) {
        throw new Error("Reviewed question skill differs from the assignment");
      }
      return {
        snapshot,
        sourcePdf: question.source_pdf,
        sourcePage: question.source_page,
      };
    });
  },
  questionId(delivery) {
    return delivery.snapshot.binding.questionId;
  },
  sameVersion(saved, current) {
    return canonicalJson(saved) === canonicalJson(current);
  },
};
