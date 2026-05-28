// ============================================================
// /admin/questions/preview — Browse every question in the bank
// rendered identically to the live student quiz screen, with the
// same passage / split-view / explanation-toggle behavior. Pure
// preview — no quiz mechanics, no DB writes, no progress tracking.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Eye, Archive } from "lucide-react";
import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth/dev-auth";
import { requireRole } from "@/lib/supabase/queries/admin";
import { selectSourceLineageForQuestions } from "@/lib/supabase/queries/quiz/source-lineage";
import { fetchSourcePdfList } from "@/lib/supabase/queries/quiz/source-pdfs";
import { createAdminClient } from "@/lib/supabase/server";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import SourcePdfFilter from "@/components/admin/SourcePdfFilter";
import PreviewClient from "./PreviewClient";
import type { PreviewQuestionWithLineage } from "./types";

export const metadata: Metadata = { title: "Admin — Question Preview | Karman" };
export const dynamic = "force-dynamic";

interface PageProps {
  // Next.js 15+ — searchParams is a promise. The shape covers
  // both ?source_pdf=<name> and ?include_archived=true.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminQuestionPreviewPage({ searchParams }: PageProps) {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");
  const isAdmin = await requireRole(userId, ["admin"]);
  if (!isAdmin) redirect("/");

  const params = await searchParams;
  const sourcePdfParam = typeof params.source_pdf === "string" ? params.source_pdf : null;
  const includeArchived = params.include_archived === "true";
  const archivedOnly = params.archived_only === "true";

  const supabase = createAdminClient();
  // Fetch every question with full content + choices. At ~5 KB per row
  // this is fine up to a few thousand rows; revisit pagination once the
  // bank grows past that.
  //
  // Archive filter tri-state:
  //   default                  → archived_at IS NULL  (active only)
  //   ?include_archived=true   → no filter            (active + archived)
  //   ?archived_only=true      → archived_at IS NOT NULL  (archive view)
  let query = supabase
    .from("quiz_questions")
    .select("*, answer_choices(*)")
    .order("source_pdf", { ascending: true })
    .order("source_page", { ascending: true });
  if (sourcePdfParam) query = query.eq("source_pdf", sourcePdfParam);
  if (archivedOnly) query = query.not("archived_at", "is", null);
  else if (!includeArchived) query = query.is("archived_at", null);
  const { data, error } = await query;

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

  // Source-PDF dropdown options for the filter component. Include
  // archived counts so admins can see at a glance which PDFs have
  // legacy content vs purely new-pipeline content.
  const sourcePdfs = await fetchSourcePdfList({ includeArchived: true });

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="px-5 pb-3 pt-5">
        <Link
          href="/admin/curriculum"
          className="mb-2 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to admin
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-white">
              {archivedOnly ? (
                <>
                  <Archive className="h-5 w-5 text-amber-400" /> Archived questions
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5 text-indigo-400" /> Question preview
                </>
              )}
            </h1>
            <p className="mt-0.5 text-xs text-slate-400">
              {questions.length} question{questions.length === 1 ? "" : "s"}
              {sourcePdfParam ? (
                <>
                  {" "}
                  from <span className="font-mono text-slate-300">{sourcePdfParam}</span>
                </>
              ) : archivedOnly ? (
                " archived (hidden from students)"
              ) : (
                " in the bank"
              )}
              {includeArchived && !archivedOnly && (
                <>
                  {" · "}
                  <span className="text-amber-400">including archived</span>
                </>
              )}
              {" · use prev/next to step through; approve / flag / reject from the bottom toolbar."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SourcePdfFilter sources={sourcePdfs} />
            <Link
              href={
                includeArchived
                  ? `/admin/questions/preview${sourcePdfParam ? `?source_pdf=${encodeURIComponent(sourcePdfParam)}` : ""}`
                  : `/admin/questions/preview?include_archived=true${sourcePdfParam ? `&source_pdf=${encodeURIComponent(sourcePdfParam)}` : ""}`
              }
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-slate-600"
            >
              <Archive className="h-3.5 w-3.5" />
              {includeArchived ? "Hide archived" : "Show archived"}
            </Link>
          </div>
        </div>
      </div>
      <PreviewClient initial={questionsWithLineage} />
    </div>
  );
}
