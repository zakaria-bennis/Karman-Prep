// ============================================================
// /admin/questions/review — triage page for PDF-imported
// questions. Two tabs:
//
//   · Flagged — import_status = 'needs_review' rows. Admin can
//     Accept (optionally assigning a curriculum node), Reject
//     (DELETE), or open the source PDF location for context.
//
//   · Bank — node_id IS NULL, import_status = 'ok' rows. The
//     PDF-routine-imported questions waiting to be routed into
//     a specific Learn node before they go live for students.
//
// Filters: flag_type · domain · source_pdf  (Flagged tab only).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import {
  selectQuestionsNeedingReview,
  selectNeedsReviewSourcePdfs,
  selectBankQuestions,
} from "@/lib/supabase/queries/quiz";
import ReviewClient from "./ReviewClient";

export const metadata: Metadata = { title: "Admin — Question review | Karman" };

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    flag_type?: string;
    domain?: string;
    source_pdf?: string;
  }>;
}

export default async function QuestionReviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeTab: "flagged" | "bank" = params.tab === "bank" ? "bank" : "flagged";

  const flag_type =
    params.flag_type === "skip" || params.flag_type === "partial_emit"
      ? params.flag_type
      : undefined;

  const [flagged, sourcePdfs, bankAll, allFlagged] = await Promise.all([
    selectQuestionsNeedingReview({
      flag_type,
      domain: params.domain || undefined,
      source_pdf: params.source_pdf || undefined,
    }),
    selectNeedsReviewSourcePdfs(),
    selectBankQuestions(),
    selectQuestionsNeedingReview(), // unfiltered, for header counts
  ]);

  const counts = {
    flagged: allFlagged.length,
    bank: bankAll.length,
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
          {counts.bank} in bank · {counts.flagged} flagged ({counts.partial_emit} partial_emit · {counts.skip} skip)
        </p>
      </div>

      <ReviewClient
        activeTab={activeTab}
        flagged={flagged}
        bank={bankAll}
        sourcePdfs={sourcePdfs}
        counts={counts}
        activeFilters={{
          flag_type,
          domain: params.domain || undefined,
          source_pdf: params.source_pdf || undefined,
        }}
      />
    </div>
  );
}
