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
  BarChart3,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileText,
  Layers,
  Cpu,
  Microscope,
} from "lucide-react";
import { selectQualityDashboardData } from "@/lib/supabase/queries/quiz/findings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin — Quality Dashboard | Karman" };

const SEVERITY_CLASSES = {
  BLOCKING: "border-error/40 bg-error/[0.08] text-error-bright",
  WARNING: "border-warning/40 bg-warning/[0.08] text-warning-bright",
  NOTICE: "border-bronze bg-surface-raised/40 text-ivory",
} as const;

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
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between border-b border-bronze pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-ivory">
            <BarChart3 className="h-5 w-5 text-gold" />
            Quality dashboard
          </h1>
          <p className="mt-1 text-xs text-taupe">
            Aggregate view of every open audit + grader finding across the question bank.
          </p>
        </div>
        <Link
          href="/admin/questions/inspect"
          className="inline-flex items-center gap-1.5 rounded-md border border-bronze bg-surface/60 px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-surface-raised"
        >
          <Microscope className="h-3.5 w-3.5" /> Open inspector worklist
        </Link>
      </div>

      {/* ── Top stats grid ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Open findings"
          value={data.totals.open}
          sublabel={`${data.totals.resolved} resolved (${resolvedPct}%)`}
          tone="default"
        />
        <StatCard
          label="Blocking"
          value={data.totals.blocking_open}
          sublabel={`${data.totals.warning_open} warning · ${data.totals.notice_open} notice`}
          tone="rose"
        />
        <StatCard
          label="Questions affected"
          value={data.totals.questions_affected}
          sublabel={`${data.totals.questions_clean} clean · ${cleanPct}% of total clean`}
          tone="amber"
        />
        <StatCard
          label="Unique codes"
          value={data.totals.unique_codes}
          sublabel="Distinct audit + grader codes firing"
          tone="violet"
        />
      </div>

      {/* ── Two-column body ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top codes ── */}
        <Card title="Top 10 codes" icon={Layers}>
          {data.top_codes.length === 0 ? (
            <EmptyState message="No findings — clean bank!" />
          ) : (
            <ol className="space-y-2">
              {data.top_codes.map((c) => (
                <li
                  key={c.code}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
                    SEVERITY_CLASSES[c.severity]
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <SeverityIcon severity={c.severity} />
                    <code className="rounded bg-night/60 px-1.5 py-0.5 font-mono text-[10px] text-ivory">
                      {c.code}
                    </code>
                    <span className="truncate text-[10px] text-taupe">{c.category}</span>
                  </div>
                  <div className="ml-2 flex items-center gap-3">
                    <span className="font-semibold">{c.open}</span>
                    {c.resolved > 0 && (
                      <span className="text-[10px] text-taupe">+{c.resolved} resolved</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* By source ── */}
        <Card title="By source" icon={Cpu}>
          {data.by_source.length === 0 ? (
            <EmptyState message="No findings recorded yet." />
          ) : (
            <ul className="space-y-2">
              {data.by_source.map((s) => (
                <li
                  key={s.source}
                  className="flex items-center justify-between rounded-lg border border-bronze bg-surface/40 px-3 py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/questions/inspect?source=${s.source}`}
                      className="font-semibold text-ivory hover:underline"
                    >
                      {s.source === "auditor" ? "Deterministic auditor" : "LLM grader"}
                    </Link>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-ivory">{s.open} open</span>
                    {s.resolved > 0 && <span className="text-taupe">+{s.resolved} resolved</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* By source_pdf ── */}
        <Card title="By test batch (source_pdf)" icon={FileText}>
          {data.by_source_pdf.length === 0 ? (
            <EmptyState message="No source_pdf populated on any flagged row." />
          ) : (
            <ul className="space-y-2">
              {data.by_source_pdf.slice(0, 10).map((p) => {
                const cleanPctRow =
                  p.total_questions > 0
                    ? Math.round(
                        ((p.total_questions - p.questions_affected) / p.total_questions) * 100
                      )
                    : 0;
                return (
                  <li
                    key={p.source_pdf}
                    className="rounded-lg border border-bronze bg-surface/40 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/admin/questions/inspect?source_pdf=${encodeURIComponent(p.source_pdf)}`}
                        className="truncate font-mono text-[11px] text-ivory hover:underline"
                        title={p.source_pdf}
                      >
                        {p.source_pdf}
                      </Link>
                      <span className="ml-2 shrink-0 font-semibold text-ivory">{p.open}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-taupe">
                      <span>{p.questions_affected} questions affected</span>
                      <span>·</span>
                      <span>{p.total_questions} total</span>
                      <span>·</span>
                      <span>{cleanPctRow}% clean</span>
                      {p.blocking > 0 && (
                        <>
                          <span>·</span>
                          <span className="font-semibold text-error-bright">
                            {p.blocking} blocking
                          </span>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* By domain ── */}
        <Card title="By SAT domain" icon={Layers}>
          {data.by_domain.length === 0 ? (
            <EmptyState message="No domain populated on any flagged row." />
          ) : (
            <ul className="space-y-2">
              {data.by_domain.map((d) => (
                <li
                  key={d.domain}
                  className="rounded-lg border border-bronze bg-surface/40 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/admin/questions/inspect?domain=${encodeURIComponent(d.domain)}`}
                      className="font-semibold text-ivory hover:underline"
                    >
                      {d.domain}
                    </Link>
                    <span className="ml-2 font-semibold text-ivory">{d.open}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-taupe">
                    <span>{d.questions_affected} questions affected</span>
                    {d.blocking > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-error-bright">
                          {d.blocking} blocking
                        </span>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data.totals.open === 0 && (
        <div className="mt-6 rounded-xl border border-success/40 bg-success/[0.06] p-5 text-center text-sm text-success-bright">
          <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-success" />
          No open findings. The bank is clean.
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: number;
  sublabel: string;
  tone: "default" | "rose" | "amber" | "violet";
}) {
  const tones: Record<typeof tone, string> = {
    default: "border-bronze bg-surface/50 text-ivory",
    rose: "border-error/30 bg-error/[0.06] text-error-bright",
    amber: "border-warning/30 bg-warning/[0.06] text-warning-bright",
    violet: "border-gold/30 bg-gold/[0.06] text-gold-bright",
  };
  return (
    <div className={cn("rounded-xl border p-4", tones[tone])}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[10px] opacity-60">{sublabel}</div>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Layers;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-bronze bg-surface/30 p-5">
      <div className="mb-3 flex items-center gap-2 border-b border-bronze pb-2 text-sm font-semibold text-ivory">
        <Icon className="h-4 w-4 text-taupe" />
        {title}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-6 text-center text-xs text-taupe">{message}</p>;
}

function SeverityIcon({ severity }: { severity: "BLOCKING" | "WARNING" | "NOTICE" }) {
  if (severity === "BLOCKING")
    return <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-error-bright" />;
  if (severity === "WARNING")
    return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning-bright" />;
  return <Info className="h-3.5 w-3.5 shrink-0 text-taupe" />;
}
