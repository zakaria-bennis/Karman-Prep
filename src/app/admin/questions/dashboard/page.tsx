// ============================================================
// /admin/questions/dashboard — quality dashboard.
//
// Read-only aggregate view of every open finding in the bank,
// cut by severity / code / source_pdf / domain / source. Lets
// admin see at a glance:
//   · How clean is the bank right now?  (open vs total)
//   · Which audit codes fire most often?  (top 10)
//   · Which test/import batch has the most issues?  (by source_pdf)
//   · Which SAT domain has the most issues?  (by domain)
//
// Clicking a row drills into the Inspector worklist with that
// filter pre-applied (e.g. ?source_pdf=…&severity=BLOCKING),
// so the dashboard works as a "where do I start triage" funnel.
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  WbPage,
  WbPill,
  WbSection,
  WbStats,
  WbTable,
  type Tone,
} from "@/components/admin/workbench";
import {
  selectQualityDashboardData,
  type QualityDashboardData,
} from "@/lib/supabase/queries/quiz/findings";

export const metadata: Metadata = { title: "Admin — Quality Dashboard | Karman" };

const INSPECT = "/admin/questions/inspect";
const n = (value: number) => value.toLocaleString("en-US");

const SEVERITY: Record<string, { label: string; tone: Tone }> = {
  BLOCKING: { label: "Blocking", tone: "fail" },
  WARNING: { label: "Warning", tone: "warn" },
  NOTICE: { label: "Notice", tone: "neutral" },
};

type CodeRow = QualityDashboardData["top_codes"][number];
type SourceRow = QualityDashboardData["by_source"][number];
type PdfRow = QualityDashboardData["by_source_pdf"][number];
type DomainRow = QualityDashboardData["by_domain"][number];

const CELL = { minWidth: 0, overflowWrap: "anywhere" } as const;

export default async function QualityDashboardPage() {
  const data = await selectQualityDashboardData();

  const cleanPct =
    data.totals.questions_clean + data.totals.questions_affected > 0
      ? Math.round(
          (data.totals.questions_clean /
            (data.totals.questions_clean + data.totals.questions_affected)) *
            100
        )
      : 0;
  const resolvedPct =
    data.totals.total_findings > 0
      ? Math.round((data.totals.resolved / data.totals.total_findings) * 100)
      : 0;

  return (
    <WbPage
      title="Quality dashboard"
      summary="Every open audit and grader finding across the question bank. Click a row to open those questions in the inspector."
      actions={
        <Link className="wb-btn" href={INSPECT}>
          Open inspector worklist
        </Link>
      }
    >
      {data.totals.open === 0 && (
        <p className="wb-alert" data-tone="ok">
          No open findings. The bank is clean.
        </p>
      )}

      <WbStats
        items={[
          {
            label: `Open findings · ${n(data.totals.resolved)} resolved (${resolvedPct}%)`,
            value: n(data.totals.open),
          },
          {
            label: `Blocking · ${n(data.totals.warning_open)} warning, ${n(data.totals.notice_open)} notice`,
            value: n(data.totals.blocking_open),
          },
          {
            label: `Questions affected · ${n(data.totals.questions_clean)} clean (${cleanPct}%)`,
            value: n(data.totals.questions_affected),
          },
          {
            label: "Distinct audit and grader codes firing",
            value: n(data.totals.unique_codes),
          },
        ]}
      />

      <div className="wb-grid" data-columns="2">
        <WbSection title="Top 10 codes">
          <WbTable<CodeRow>
            caption="Top 10 finding codes"
            rows={data.top_codes}
            rowKey={(c) => c.code}
            empty="No findings. The bank is clean."
            columns={[
              {
                key: "code",
                label: "Code",
                cell: (c) => (
                  <span style={CELL}>
                    <code>{c.code}</code>
                    <small>{c.category}</small>
                  </span>
                ),
              },
              {
                key: "severity",
                label: "Severity",
                cell: (c) => {
                  const sev = SEVERITY[c.severity] ?? { label: c.severity, tone: "neutral" };
                  return <WbPill tone={sev.tone}>{sev.label}</WbPill>;
                },
              },
              { key: "open", label: "Open", numeric: true, cell: (c) => n(c.open) },
              {
                key: "resolved",
                label: "Resolved",
                numeric: true,
                cell: (c) => (c.resolved > 0 ? n(c.resolved) : "—"),
              },
            ]}
          />
        </WbSection>

        <WbSection title="By source">
          <WbTable<SourceRow>
            caption="Findings by source"
            rows={data.by_source}
            rowKey={(s) => s.source}
            empty="No findings recorded yet."
            columns={[
              {
                key: "source",
                label: "Source",
                cell: (s) => (
                  <Link href={`${INSPECT}?source=${s.source}`}>
                    {s.source === "auditor" ? "Deterministic auditor" : "LLM grader"}
                  </Link>
                ),
              },
              { key: "open", label: "Open", numeric: true, cell: (s) => n(s.open) },
              {
                key: "resolved",
                label: "Resolved",
                numeric: true,
                cell: (s) => (s.resolved > 0 ? n(s.resolved) : "—"),
              },
            ]}
          />
        </WbSection>

        <WbSection title="By test batch">
          <WbTable<PdfRow>
            caption="Findings by test batch (source PDF)"
            rows={data.by_source_pdf.slice(0, 10)}
            rowKey={(p) => p.source_pdf}
            empty="No source PDF on any flagged question."
            columns={[
              {
                key: "pdf",
                label: "Source PDF",
                cell: (p) => (
                  <span style={CELL}>
                    <Link
                      href={`${INSPECT}?source_pdf=${encodeURIComponent(p.source_pdf)}`}
                      title={p.source_pdf}
                    >
                      {p.source_pdf}
                    </Link>
                    <small>
                      {n(p.questions_affected)} of {n(p.total_questions)} questions affected,{" "}
                      {p.total_questions > 0
                        ? Math.round(
                            ((p.total_questions - p.questions_affected) / p.total_questions) * 100
                          )
                        : 0}
                      % clean
                    </small>
                  </span>
                ),
              },
              {
                key: "blocking",
                label: "Blocking",
                numeric: true,
                cell: (p) => (p.blocking > 0 ? <WbPill tone="fail">{n(p.blocking)}</WbPill> : "—"),
              },
              { key: "open", label: "Open", numeric: true, cell: (p) => n(p.open) },
            ]}
          />
        </WbSection>

        <WbSection title="By SAT domain">
          <WbTable<DomainRow>
            caption="Findings by SAT domain"
            rows={data.by_domain}
            rowKey={(d) => d.domain}
            empty="No domain on any flagged question."
            columns={[
              {
                key: "domain",
                label: "Domain",
                cell: (d) => (
                  <span style={CELL}>
                    <Link href={`${INSPECT}?domain=${encodeURIComponent(d.domain)}`}>
                      {d.domain}
                    </Link>
                    <small>{n(d.questions_affected)} questions affected</small>
                  </span>
                ),
              },
              {
                key: "blocking",
                label: "Blocking",
                numeric: true,
                cell: (d) => (d.blocking > 0 ? <WbPill tone="fail">{n(d.blocking)}</WbPill> : "—"),
              },
              { key: "open", label: "Open", numeric: true, cell: (d) => n(d.open) },
            ]}
          />
        </WbSection>
      </div>
    </WbPage>
  );
}
