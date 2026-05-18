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
import {
  ChevronRight,
  Microscope,
  CheckCircle2,
  Activity,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  selectInspectorWorklist,
  selectInspectorSummary,
  selectInspectorFilterOptions,
  selectRecentActivity,
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

  // When the worklist is scoped to a single source_pdf, propagate
  // that scope to the summary header + Recent Activity panel so all
  // three views agree on what "all findings" means right now. Same
  // pattern Linear / Notion use when you filter by a project: every
  // count in the chrome reflects the current scope, not the whole bank.
  const scopeOpts = filter.source_pdf ? { sourcePdf: filter.source_pdf } : undefined;
  const [rows, summary, filterOpts, activity24h, activity7d] = await Promise.all([
    selectInspectorWorklist(filter),
    selectInspectorSummary(scopeOpts),
    selectInspectorFilterOptions(),
    selectRecentActivity(24, scopeOpts),
    selectRecentActivity(168, scopeOpts),
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
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Microscope className="h-5 w-5 text-violet-400" /> Inspector
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          {summary.questions_with_findings} questions with findings · {summary.total_findings} total
          (<span className="text-rose-400">{summary.blocking} blocking</span> ·{" "}
          <span className="text-amber-300">{summary.warning} warning</span> ·{" "}
          <span className="text-slate-400">{summary.notice} notice</span>) · {summary.unique_codes}{" "}
          distinct codes
          {filter.source_pdf && (
            <>
              {" · "}
              <span className="rounded-md border border-violet-500/40 bg-violet-500/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-violet-200">
                scoped: {filter.source_pdf}
              </span>{" "}
              <Link
                href="/admin/questions/inspect"
                className="text-[10px] text-slate-400 underline hover:text-slate-200"
              >
                clear
              </Link>
            </>
          )}
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

      {/* ── Recent activity (audit diff) ──
          Two side-by-side cards: last 24h + last 7d. Useful for spotting
          a fresh audit run (sudden burst of new findings) and tracking
          triage velocity (resolved > new = winning). Net change is
          color-coded green when shrinking, rose when growing. */}
      {(activity24h.new_findings > 0 ||
        activity24h.resolved_findings > 0 ||
        activity7d.new_findings > 0 ||
        activity7d.resolved_findings > 0) && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ActivityCard label="Last 24 hours" data={activity24h} />
          <ActivityCard label="Last 7 days" data={activity7d} />
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

// ── Recent-activity panel ─────────────────────────────────
// Server-rendered side-by-side card. No interactivity — purely
// informational. Net change colored:
//   · negative (resolved > new) → emerald, TrendingDown icon (good)
//   · positive (new > resolved) → rose, TrendingUp icon (backlog growing)
//   · zero                       → slate, Activity icon (steady)
function ActivityCard({
  label,
  data,
}: {
  label: string;
  data: Awaited<ReturnType<typeof selectRecentActivity>>;
}) {
  const isShrinking = data.net_change < 0;
  const isGrowing = data.net_change > 0;
  const Icon = isShrinking ? TrendingDown : isGrowing ? TrendingUp : Activity;
  const netClass = isShrinking
    ? "text-emerald-300"
    : isGrowing
      ? "text-rose-300"
      : "text-slate-400";
  const netSign = data.net_change > 0 ? "+" : "";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Activity className="h-3.5 w-3.5 text-slate-400" />
          {label}
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${netClass}`}>
          <Icon className="h-3.5 w-3.5" />
          {netSign}
          {data.net_change} net
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">New findings</div>
          <div className="mt-0.5 text-lg font-bold text-slate-100">{data.new_findings}</div>
          {data.new_findings > 0 && (
            <div className="mt-0.5 flex items-center gap-2 text-[10px]">
              {data.new_blocking > 0 && (
                <span className="text-rose-300">{data.new_blocking} blocking</span>
              )}
              {data.new_warning > 0 && (
                <span className="text-amber-300">{data.new_warning} warning</span>
              )}
              {data.new_notice > 0 && (
                <span className="text-slate-400">{data.new_notice} notice</span>
              )}
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Resolved</div>
          <div className="mt-0.5 text-lg font-bold text-emerald-300">{data.resolved_findings}</div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            {data.new_findings === 0 && data.resolved_findings === 0
              ? "no activity"
              : isShrinking
                ? "backlog shrinking"
                : isGrowing
                  ? "backlog growing"
                  : "steady"}
          </div>
        </div>
      </div>
    </div>
  );
}
