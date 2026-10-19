import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { requireRole } from "@/lib/supabase/queries/admin";
import { createAdminClient } from "@/lib/supabase/server";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import RapidReviewClient from "./RapidReviewClient";

export const metadata: Metadata = { title: "Rapid question review | Karman" };
export const dynamic = "force-dynamic";

export default async function RapidQuestionReviewPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");
  if (!(await requireRole(userId, ["admin"]))) redirect("/");

  const { data, error } = await createAdminClient()
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .is("archived_at", null)
    .order("source_pdf", { ascending: true })
    .order("source_page", { ascending: true });

  if (error) {
    return (
      <div className="p-6 text-sm text-error-bright">
        Unable to load stored questions: {error.message}
      </div>
    );
  }

  return <RapidReviewClient questions={(data ?? []) as QuizQuestionWithChoices[]} />;
}
