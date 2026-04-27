// ============================================================
// /admin/questions/review — triage page for PDF-imported
// questions whose import_status = 'needs_review'. Admin can
// Accept (optionally assigning a curriculum node), Reject
// (DELETE), or open the source PDF location for context.
//
// Filters: flag_type · domain · source_pdf.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import {
  selectQuestionsNeedingReview,
  selectNeedsReviewSourcePdfs,
} from "@/lib/supabase/queries/quiz";
import ReviewClient from "./ReviewClient";

export const metadata: Metadata = { title: "Admin — Question review | Strata" };

interface PageProps {
  searchParams: Promise<{ flag_type?: string; domain?: string; source_pdf?: string }>;
}

export default async function QuestionReviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const flag_type =
    params.flag_type === "skip" || params.flag_type === "partial_emit"
      ? params.flag_type
      : undefined;

  const [questions, sourcePdfs] = await Promise.all([
    selectQuestionsNeedingReview({
      flag_type,
      domain: params.domain || undefined,
      source_pdf: params.source_pdf || undefined,
    }),
    selectNeedsReviewSourcePdfs(),
  ]);

  // Counts ignore filters so the header always shows totals.
  const allFlagged = await selectQuestionsNeedingReview();
  const counts = {
    total: allFlagged.length,
    skip: allFlagged.filter((q) => q.import_flag_type === "skip").length,
    partial_emit: allFlagged.filter((q) => q.import_flag_type === "partial_emit").length,
  };

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      <div className="mb-6">
        <Link
          href="/admin/curriculum"
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 mb-3"
        >
          <ChevronRight className="w-3 h-3 rotate-180" /> Back to admin
        </Link>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-amber-400" /> Question review
        </h1>
        <p className="text-sm text-slate-400 mt-1.5">
          {counts.total} flagged · {counts.partial_emit} partial_emit · {counts.skip} skip
        </p>
      </div>

      <ReviewClient
        questions={questions}
        sourcePdfs={sourcePdfs}
        activeFilters={{
          flag_type,
          domain: params.domain || undefined,
          source_pdf: params.source_pdf || undefined,
        }}
      />
    </div>
  );
}
