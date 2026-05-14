"use server";

// ============================================================
// Search actions for the /admin/curriculum search bar.
//
// Bank/node questions live in `quiz_questions` and are queried
// here. Curriculum nodes are static (src/data/curriculum.ts) and
// searched client-side — the result returned from this action
// is question-only.
// ============================================================

import { auth } from "@clerk/nextjs/server";
import { requireRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { searchBankQuestionsInputSchema } from "../schemas";

export interface QuestionSearchResult {
  id: string;
  question_text: string;
  concept_slug: string | null;
  domain: string | null;
  node_id: string | null; // null = bank
  source_pdf: string | null;
  source_page: number | null;
  /** "node" if assigned, "bank" if loose. Drives the click-target route. */
  location: "node" | "bank";
}

const MAX_RESULTS = 10;

/** Search quiz_questions by question_text + concept_slug + source_pdf.
 *  Returns up to MAX_RESULTS, prioritizing live questions over bank. */
export async function actionSearchBankQuestions(query: string): Promise<QuestionSearchResult[]> {
  // Empty result on parse failure (preserves the existing "noisy
  // 1-char hit" behavior — the action's caller treats [] as "no
  // matches" and never surfaces a thrown error).
  const parsed = searchBankQuestionsInputSchema.safeParse({ query: query.trim() });
  if (!parsed.success) return [];

  const { userId } = await auth();
  if (!userId) return [];
  const isAdmin = await requireRole(userId, ["admin"]);
  if (!isAdmin) return [];

  const trimmed = parsed.data.query;

  // Escape % and _ so a user typing literal SQL wildcards doesn't
  // accidentally broaden the search.
  const escaped = trimmed.replace(/[\\%_]/g, (c) => `\\${c}`);
  const pattern = `%${escaped}%`;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("id, question_text, concept_slug, domain, node_id, source_pdf, source_page")
    // Search across the three text fields most useful to a triaging admin.
    .or(`question_text.ilike.${pattern},concept_slug.ilike.${pattern},source_pdf.ilike.${pattern}`)
    // Live questions (node_id IS NOT NULL) generally more interesting
    // than bank rows; sort them first via a custom ORDER BY using a
    // boolean expression. Supabase exposes this through `.order` on
    // a generated column — but simpler: order by node_id (NULLs last)
    // then most-recent.
    .order("node_id", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(MAX_RESULTS);

  if (error) {
    console.error("[search] quiz_questions query failed:", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id as string,
    question_text: (r.question_text as string) ?? "",
    concept_slug: r.concept_slug as string | null,
    domain: r.domain as string | null,
    node_id: r.node_id as string | null,
    source_pdf: r.source_pdf as string | null,
    source_page: r.source_page as number | null,
    location: r.node_id ? "node" : "bank",
  }));
}
