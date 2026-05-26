// ============================================================
// /admin/questions/preview — Browse every question in the bank
// rendered identically to the live student quiz screen, with the
// same passage / split-view / explanation-toggle behavior. Pure
// preview — no quiz mechanics, no DB writes, no progress tracking.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Eye } from "lucide-react";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { requireRole } from "@/lib/supabase/queries/admin";
import { selectSourceLineageForQuestions } from "@/lib/supabase/queries/quiz/source-lineage";
import { createAdminClient } from "@/lib/supabase/server";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import PreviewClient from "./PreviewClient";
import type { PreviewQuestionWithLineage } from "./types";

export const metadata: Metadata = { title: "Admin — Question Preview | Karman" };
export const dynamic = "force-dynamic";

export default async function AdminQuestionPreviewPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");
  const isAdmin = await requireRole(userId, ["admin"]);
  if (!isAdmin) redirect("/");

  const supabase = createAdminClient();
  // Fetch every question with full content + choices. At ~5 KB per row
  // this is fine up to a few thousand rows; revisit pagination once the
  // bank grows past that.
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .order("source_pdf", { ascending: true })
    .order("source_page", { ascending: true });

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-rose-300">
        Failed to load questions: {error.message}
      </div>
    );
  }
  const questions = (data ?? []) as QuizQuestionWithChoices[];
  const lineageByQuestionId = await selectSourceLineageForQuestions(questions.map((q) => q.id));
  const questionsWithLineage: PreviewQuestionWithLineage[] = questions.map((q) => ({
    ...q,
    sourceLineage: lineageByQuestionId[q.id] ?? null,
  }));

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="px-5 pb-3 pt-5">
        <Link
          href="/admin/curriculum"
          className="mb-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to admin
        </Link>
        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
          <Eye className="h-5 w-5 text-indigo-400" /> Question preview
        </h1>
        <p className="mt-0.5 text-xs text-slate-400">
          {questions.length} question{questions.length === 1 ? "" : "s"} in the bank · use filters
          and prev/next to step through; approve / flag / reject from the bottom toolbar.
        </p>
      </div>
      <PreviewClient initial={questionsWithLineage} />
    </div>
  );
}
