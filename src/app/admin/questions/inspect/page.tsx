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
import { WbPage, WbSection, WbStats } from "@/components/admin/workbench";
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

  const hasActivity =
    activity24h.new_findings > 0 ||
    activity24h.resolved_findings > 0 ||
    activity7d.new_findings > 0 ||
    activity7d.resolved_findings > 0;

  return (
    <WbPage
      title="Inspector"
      summary={
        <>
          Questions with at least one open audit or grader finding, worst first. Filled by{" "}
          <code>scripts/question-audit/ingest-findings.mjs</code>; run it again after each audit
          pass.
        </>
      }
      actions={
        <>
          <Link className="wb-btn" href="/admin/questions/chart-review">
            Chart review
          </Link>
          <Link className="wb-btn" href="/admin/questions/geometry-review">
            Geometry review
          </Link>
          <Link className="wb-btn" href="/admin/questions/dashboard">
            Quality dashboard
          </Link>
          <Link className="wb-btn" href="/admin/curriculum">
            Back to admin
          </Link>
        </>
      }
    >
      {params.accepted && (
        <p className="wb-alert" data-tone="ok" role="status">
          Question accepted as live. All its findings were resolved.
        </p>
      )}

      {filter.source_pdf && (
        <p className="wb-note">
          Counts are scoped to <code>{filter.source_pdf}</code>.{" "}
          <Link href="/admin/questions/inspect">Clear</Link>
        </p>
      )}

      <WbStats
        items={[
          { label: "Questions with findings", value: summary.questions_with_findings },
          { label: "Findings in total", value: summary.total_findings },
          { label: "Blocking", value: summary.blocking },
          { label: "Warning", value: summary.warning },
          { label: "Notice", value: summary.notice },
          { label: "Distinct codes", value: summary.unique_codes },
        ]}
      />

      {/* Recent activity (audit diff): last 24h and last 7d. Spots a
          fresh audit run and tracks triage speed (resolved > new = winning). */}
      {hasActivity && (
        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
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
    </WbPage>
  );
}

// Recent-activity panel. Server-rendered, informational only.
// Net change: negative (resolved > new) is good, positive means the
// backlog is growing.
function ActivityCard({
  label,
  data,
}: {
  label: string;
  data: Awaited<ReturnType<typeof selectRecentActivity>>;
}) {
  const isShrinking = data.net_change < 0;
  const isGrowing = data.net_change > 0;
  const netColor = isShrinking ? "var(--good)" : isGrowing ? "var(--late)" : "var(--mute)";
  const netSign = data.net_change > 0 ? "+" : "";
  const newParts = [
    data.new_blocking > 0 ? `${data.new_blocking} blocking` : null,
    data.new_warning > 0 ? `${data.new_warning} warning` : null,
    data.new_notice > 0 ? `${data.new_notice} notice` : null,
  ].filter(Boolean);
  return (
    <WbSection title={label}>
      <dl className="wb-dl">
        <dt>Net change</dt>
        <dd style={{ color: netColor, fontWeight: 600 }}>
          {netSign}
          {data.net_change}{" "}
          <span className="wb-note">
            {data.new_findings === 0 && data.resolved_findings === 0
              ? "no activity"
              : isShrinking
                ? "backlog shrinking"
                : isGrowing
                  ? "backlog growing"
                  : "steady"}
          </span>
        </dd>
        <dt>New findings</dt>
        <dd>
          {data.new_findings}
          {newParts.length > 0 && <span className="wb-note"> ({newParts.join(", ")})</span>}
        </dd>
        <dt>Resolved</dt>
        <dd style={{ color: "var(--good)" }}>{data.resolved_findings}</dd>
      </dl>
    </WbSection>
  );
}
