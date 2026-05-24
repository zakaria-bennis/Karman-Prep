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
import { ChevronRight, ClipboardCheck, Archive } from "lucide-react";
import {
  selectQuestionsNeedingReview,
  selectNeedsReviewSourcePdfs,
  selectBankQuestions,
} from "@/lib/supabase/queries/quiz";
import { selectRejectedQuestionCount } from "@/lib/supabase/queries/quiz/rejected";
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

  const [flagged, sourcePdfs, bankAll, allFlagged, rejectedCount] = await Promise.all([
    selectQuestionsNeedingReview({
      flag_type,
      domain: params.domain || undefined,
      source_pdf: params.source_pdf || undefined,
    }),
    selectNeedsReviewSourcePdfs(),
    selectBankQuestions(),
    selectQuestionsNeedingReview(), // unfiltered, for header counts
    selectRejectedQuestionCount(),
  ]);

  const counts = {
    flagged: allFlagged.length,
    bank: bankAll.length,
    skip: allFlagged.filter((q) => q.import_flag_type === "skip").length,
    partial_emit: allFlagged.filter((q) => q.import_flag_type === "partial_emit").length,
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <div className="mb-6">
        <Link
          href="/admin/curriculum"
          className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to admin
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <ClipboardCheck className="h-5 w-5 text-amber-400" /> Question review
          </h1>
          <Link
            href="/admin/questions/rejected"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-white"
          >
            <Archive className="h-3.5 w-3.5" />
            Rejected
            {rejectedCount > 0 && (
              <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                {rejectedCount}
              </span>
            )}
          </Link>
        </div>
        <p className="mt-1.5 text-sm text-slate-400">
          {counts.bank} in bank · {counts.flagged} flagged ({counts.partial_emit} partial_emit ·{" "}
          {counts.skip} skip)
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
