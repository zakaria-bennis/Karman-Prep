// ============================================================
// /admin/questions/inspect — Inspector worklist.
//
// One row per question that has at least one unresolved
// audit-or-grader finding, sorted by worst-severity descending.
// Filters: severity / source / category / source_pdf / domain /
// free-text search.
//
// Clicking a row opens /admin/questions/inspect/[id] for the
// per-question deep view (renders the question as a student
// sees it + lists every finding with action buttons).
//
// Data: question_findings table (populated by
// scripts/question-audit/ingest-findings.mjs).
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Microscope, CheckCircle2, BarChart3 } from "lucide-react";
import {
  selectInspectorWorklist,
  selectInspectorSummary,
  selectInspectorFilterOptions,
} from "@/lib/supabase/queries/quiz/findings";
import InspectorClient from "./InspectorClient";

export const metadata: Metadata = { title: "Admin — Inspector | Karman" };

interface PageProps {
  searchParams: Promise<{
    severity?: string;
    source?: string;
    category?: string;
    source_pdf?: string;
    domain?: string;
    q?: string;
    include_resolved?: string;
    /** When redirected from the detail page after Accept Live, this
     *  is the id of the just-accepted question so we can show a
     *  "✓ accepted" banner. */
    accepted?: string;
  }>;
}

function parseSev(v: string | undefined): "BLOCKING" | "WARNING" | "NOTICE" | undefined {
  return v === "BLOCKING" || v === "WARNING" || v === "NOTICE" ? v : undefined;
}
function parseSrc(v: string | undefined): "auditor" | "grader" | undefined {
  return v === "auditor" || v === "grader" ? v : undefined;
}

export default async function InspectorPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filter = {
    severity: parseSev(params.severity),
    source: parseSrc(params.source),
    category: params.category || undefined,
    source_pdf: params.source_pdf || undefined,
    domain: params.domain || undefined,
    q: params.q || undefined,
    include_resolved: params.include_resolved === "true",
  };

  const [rows, summary, filterOpts] = await Promise.all([
    selectInspectorWorklist(filter),
    selectInspectorSummary(),
    selectInspectorFilterOptions(),
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
            <Microscope className="h-5 w-5 text-violet-400" /> Inspector
          </h1>
          <Link
            href="/admin/questions/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            <BarChart3 className="h-3.5 w-3.5" /> Quality dashboard
          </Link>
        </div>
        <p className="mt-1.5 text-sm text-slate-400">
          {summary.questions_with_findings} questions with findings · {summary.total_findings} total
          (<span className="text-rose-400">{summary.blocking} blocking</span> ·{" "}
          <span className="text-amber-300">{summary.warning} warning</span> ·{" "}
          <span className="text-slate-400">{summary.notice} notice</span>) · {summary.unique_codes}{" "}
          distinct codes
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Populated by{" "}
          <code className="rounded bg-slate-800 px-1 py-0.5">
            scripts/question-audit/ingest-findings.mjs
          </code>
          . Re-run after each audit pass to refresh.
        </p>
      </div>

      {params.accepted && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Question accepted as live · all findings auto-resolved.</span>
        </div>
      )}

      <InspectorClient
        rows={rows}
        filterOptions={filterOpts}
        activeFilters={filter}
        summary={summary}
      />
    </div>
  );
}
