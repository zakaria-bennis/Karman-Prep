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
import { WbPage, WbStats } from "@/components/admin/workbench";
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
    <WbPage
      title="Question review"
      summary="Triage imported questions. Flagged rows need a decision; bank rows need a curriculum node before they go live."
      actions={
        <>
          <Link className="wb-btn" href="/admin/questions/rejected">
            Rejected ({rejectedCount})
          </Link>
          <Link className="wb-btn" href="/admin/curriculum">
            Back to admin
          </Link>
        </>
      }
    >
      <WbStats
        items={[
          { label: "In the bank", value: counts.bank },
          { label: "Flagged", value: counts.flagged },
          { label: "Partial emit", value: counts.partial_emit },
          { label: "Skip", value: counts.skip },
        ]}
      />

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
    </WbPage>
  );
}
