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
import { createAdminClient } from "@/lib/supabase/server";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import PreviewClient from "./PreviewClient";

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

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="mx-auto max-w-7xl px-5 py-6">
        <Link
          href="/admin/curriculum"
          className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to admin
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Eye className="h-5 w-5 text-indigo-400" /> Question preview
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {questions.length.toLocaleString()} question{questions.length === 1 ? "" : "s"} in the
          bank. Each renders identically to the student quiz screen.
        </p>
      </div>
      <PreviewClient initial={questions} />
    </div>
  );
}
