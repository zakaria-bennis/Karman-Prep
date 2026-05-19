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
import { ChevronRight, LineChart, Microscope, BarChart3 } from "lucide-react";
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
    <div className="mx-auto max-w-7xl px-5 py-8">
      <div className="mb-6">
        <Link
          href="/admin/curriculum"
          className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
        >
          <ChevronRight className="h-3 w-3 rotate-180" /> Back to admin
        </Link>
        <div className="flex items-start justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <LineChart className="h-5 w-5 text-violet-400" /> Chart review
          </h1>
          <Link
            href="/admin/questions/inspect"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Microscope className="h-3.5 w-3.5" /> Inspector worklist
          </Link>
        </div>
        <p className="mt-1.5 text-sm text-slate-400">
          AI-extracted chart figures awaiting human approval before they replace the raster
          screenshot for students.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-1 border-b border-slate-800">
        <TabLink
          href="/admin/questions/chart-review"
          active={tab === "pending"}
          label="Pending review"
          count={counts.pending}
        />
        <TabLink
          href="/admin/questions/chart-review?tab=live"
          active={tab === "live"}
          label="Live charts"
          count={counts.live}
          icon={BarChart3}
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-12 text-center text-sm text-slate-400">
          {tab === "pending"
            ? counts.pending === 0
              ? "No charts pending review. The AI extractor either hasn't run yet, or every extraction so far cleared the auto-publish threshold."
              : "Empty for the current filter."
            : "No charts have been promoted to live yet. Once Sub-PR C's rollout runs, high-confidence extractions land here automatically."}
        </div>
      ) : (
        <ChartReviewClient rows={rows} />
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  label,
  count,
  icon: Icon,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  icon?: typeof BarChart3;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "border-b-2 border-violet-400 px-3 py-2 text-sm font-semibold text-white"
          : "border-b-2 border-transparent px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
      }
    >
      <span className="inline-flex items-center gap-1.5">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
        <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px]">{count}</span>
      </span>
    </Link>
  );
}
