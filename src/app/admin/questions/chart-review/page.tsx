// ============================================================
// /admin/questions/chart-review — review queue for AI-extracted
// chart data that didn't clear the auto-publish confidence
// threshold. Side-by-side: original screenshot vs. AI's SVG.
//
// Phase 4d, Sub-PR B. The extraction pipeline (Sub-PR C) drops
// rows here with figure_chart_data set and figure_kind='image'
// (i.e. NOT yet promoted to 'chart'). The admin works through
// the queue and approves / edits / rejects each one.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { WbPage, WbTabs } from "@/components/admin/workbench";
import {
  selectPendingChartReviews,
  selectLiveCharts,
  selectChartReviewCounts,
} from "@/lib/supabase/queries/quiz/charts";
import ChartReviewClient from "./ChartReviewClient";

export const metadata: Metadata = { title: "Admin — Chart review | Karman" };

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ChartReviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab: "pending" | "live" = params.tab === "live" ? "live" : "pending";

  const [rows, counts] = await Promise.all([
    tab === "pending" ? selectPendingChartReviews() : selectLiveCharts(),
    selectChartReviewCounts(),
  ]);

  return (
    <WbPage
      title="Chart review"
      summary="AI-extracted chart figures waiting for approval before they replace the screenshot students see."
      actions={
        <>
          <Link className="wb-btn" href="/admin/questions/inspect">
            Inspector worklist
          </Link>
          <Link className="wb-btn" href="/admin/curriculum">
            Back to admin
          </Link>
        </>
      }
    >
      <WbTabs
        label="Chart list"
        param="tab"
        value={tab}
        basePath="/admin/questions/chart-review"
        options={[
          { value: "pending", label: "Pending review", count: counts.pending },
          { value: "live", label: "Live charts", count: counts.live },
        ]}
      />

      {rows.length === 0 ? (
        <div className="wb-empty">
          {tab === "pending" ? (
            counts.pending === 0 ? (
              <>
                <b>No charts pending review.</b>
                The extractor hasn&apos;t run yet, or every extraction so far cleared the
                auto-publish threshold.
              </>
            ) : (
              <b>Empty for the current filter.</b>
            )
          ) : (
            <>
              <b>No live charts yet.</b>
              High-confidence extractions land here once they are promoted.
            </>
          )}
        </div>
      ) : (
        <ChartReviewClient rows={rows} />
      )}
    </WbPage>
  );
}
