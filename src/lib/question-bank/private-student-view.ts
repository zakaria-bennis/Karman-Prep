import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { fetchUserRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { toStudentQuizQuestion } from "@/lib/student-quiz-payload";
import { catalogQuestionPayloadHash } from "./catalog-question-scope";
import type { QuizQuestionWithChoices } from "@/types/quiz";

const requestSchema = z
  .object({
    questionId: z.string().uuid(),
    payloadSha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

export class PrivateStudentViewError extends Error {
  constructor(public readonly reason: "unauthorized" | "unavailable") {
    super("Private student view is unavailable");
  }
}

/** Read one pinned, held row. Never authorize using an impersonated/dev identity. */
export async function readPrivateStudentView(request: unknown) {
  const { userId } = await auth();
  if (!userId) throw new PrivateStudentViewError("unauthorized");
  if ((await fetchUserRole(userId)) !== "admin") {
    throw new PrivateStudentViewError("unavailable");
  }
  const parsed = requestSchema.safeParse(request);
  if (!parsed.success) throw new PrivateStudentViewError("unavailable");
  const { questionId, payloadSha256 } = parsed.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .eq("id", questionId)
    .eq("is_live", false)
    .eq("import_status", "needs_review")
    .eq("publish_status", "needs_human_review")
    .is("archived_at", null)
    .maybeSingle();
  if (error || !data) throw new PrivateStudentViewError("unavailable");
  const question = data as QuizQuestionWithChoices & {
    publish_status: string | null;
    archived_at: string | null;
  };
  if (
    question.id !== questionId ||
    question.is_live !== false ||
    question.import_status !== "needs_review" ||
    question.publish_status !== "needs_human_review" ||
    question.archived_at != null ||
    catalogQuestionPayloadHash(question) !== payloadSha256
  ) {
    throw new PrivateStudentViewError("unavailable");
  }

  // The unanswered student mapper deliberately omits keys, explanations,
  // correctness, provenance, source metadata and grading-only answer sets.
  return { question: toStudentQuizQuestion(question), payloadSha256 };
}
