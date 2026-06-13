"use client";

// ============================================================
// InspectorClient — worklist table with filters + bulk multi-
// select. Each row links to /admin/questions/inspect/[id] for the
// deep view. Filters are URL-synced; multi-select is local state.
//
// Bulk actions:
//   · Resolve all findings on selected rows
//   · Accept selected as live (auto-resolves findings)
//   · Flag selected as needs-review (leaves findings open)
// ============================================================

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCheck,
  Flag,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  actionBulkAcceptQuestions,
  actionBulkFlagQuestions,
  actionBulkResolveFindings,
} from "@/app/admin/inspector-actions";
import type {
  InspectorRow,
  InspectorSummary,
  FindingSeverity,
  FindingSource,
} from "@/lib/supabase/queries/quiz/findings";

interface Props {
  rows: InspectorRow[];
  summary: InspectorSummary;
  filterOptions: {
    source_pdfs: string[];
    categories: string[];
  };
  activeFilters: {
    severity?: FindingSeverity;
    source?: FindingSource;
    category?: string;
    source_pdf?: string;
    domain?: string;
    q?: string;
    include_resolved?: boolean;
  };
}

const SEVERITY_CHIPS: Record<
  FindingSeverity,
  { label: string; icon: typeof AlertOctagon; cls: string }
> = {
  BLOCKING: {
    label: "Blocking",
    icon: AlertOctagon,
    cls: "bg-error/15 text-error-bright border-error/30",
  },
  WARNING: {
    label: "Warning",
    icon: AlertTriangle,
    cls: "bg-warning/15 text-warning-bright border-warning/30",
  },
  NOTICE: {
    label: "Notice",
    icon: Info,
    cls: "bg-surface-raised/15 text-ivory border-bronze/30",
  },
};

const DOMAINS = [
  "algebra",
  "advanced_math",
  "geometry",
  "data_analysis",
  "info_ideas",
  "craft_structure",
  "expression_ideas",
  "conventions",
];

export default function InspectorClient({ rows, filterOptions, activeFilters }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<"resolving" | "accepting" | "flagging" | null>(null);
  const [bulkFeedback, setBulkFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const visibleIds = rows.map((r) => r.question_id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  function toggleRow(id: string) {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function bulkResolve() {
    const ids = [...selectedIds];
    setBulkBusy("resolving");
    setBulkFeedback(null);
    startTransition(async () => {
      try {
        const r = await actionBulkResolveFindings({
          questionIds: ids,
          note: "Bulk-resolved via Inspector worklist",
        });
        setBulkFeedback({
          kind: "success",
          message: `Resolved ${r.resolved} finding${r.resolved === 1 ? "" : "s"} across ${ids.length} question${ids.length === 1 ? "" : "s"}.`,
        });
        setSelectedIds(new Set());
        router.refresh();
      } catch (err) {
        setBulkFeedback({
          kind: "error",
          message: `Bulk resolve failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBulkBusy(null);
      }
    });
  }

  function bulkAccept() {
    const ids = [...selectedIds];
    setBulkBusy("accepting");
    setBulkFeedback(null);
    startTransition(async () => {
      try {
        const r = await actionBulkAcceptQuestions({ questionIds: ids });
        setBulkFeedback({
          kind: "success",
          message: `Accepted ${r.accepted} question${r.accepted === 1 ? "" : "s"} as live · auto-resolved ${r.resolvedFindings} finding${r.resolvedFindings === 1 ? "" : "s"}.`,
        });
        setSelectedIds(new Set());
        router.refresh();
      } catch (err) {
        setBulkFeedback({
          kind: "error",
          message: `Bulk accept failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBulkBusy(null);
      }
    });
  }

  function bulkFlag() {
    const ids = [...selectedIds];
    setBulkBusy("flagging");
    setBulkFeedback(null);
    startTransition(async () => {
      try {
        const r = await actionBulkFlagQuestions({ questionIds: ids });
        setBulkFeedback({
          kind: "success",
          message: `Flagged ${r.flagged} question${r.flagged === 1 ? "" : "s"} as needs-review.`,
        });
        setSelectedIds(new Set());
        router.refresh();
      } catch (err) {
        setBulkFeedback({
          kind: "error",
          message: `Bulk flag failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        setBulkBusy(null);
      }
    });
  }

  function setFilter(key: string, value: string | undefined) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/admin/questions/inspect?${next.toString()}`);
  }

  function clearAll() {
    router.push("/admin/questions/inspect");
  }

  const anyFilterActive =
    !!activeFilters.severity ||
    !!activeFilters.source ||
    !!activeFilters.category ||
    !!activeFilters.source_pdf ||
    !!activeFilters.domain ||
    !!activeFilters.q ||
    activeFilters.include_resolved;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="rounded-xl border border-bronze bg-surface/50 p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <FilterSelect
            label="Severity"
            value={activeFilters.severity ?? ""}
            onChange={(v) => setFilter("severity", v)}
            options={[
              { value: "", label: "All severities" },
              { value: "BLOCKING", label: "Blocking only" },
              { value: "WARNING", label: "Warning & up" },
              { value: "NOTICE", label: "Notice only" },
            ]}
          />
          <FilterSelect
            label="Source"
            value={activeFilters.source ?? ""}
            onChange={(v) => setFilter("source", v)}
            options={[
              { value: "", label: "Both auditor + grader" },
              { value: "auditor", label: "Deterministic auditor" },
              { value: "grader", label: "LLM grader" },
            ]}
          />
          <FilterSelect
            label="Category"
            value={activeFilters.category ?? ""}
            onChange={(v) => setFilter("category", v)}
            options={[
              { value: "", label: "All categories" },
              ...filterOptions.categories.map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            label="Domain"
            value={activeFilters.domain ?? ""}
            onChange={(v) => setFilter("domain", v)}
            options={[
              { value: "", label: "All domains" },
              ...DOMAINS.map((d) => ({ value: d, label: d })),
            ]}
          />
          <FilterSelect
            label="Source PDF"
            value={activeFilters.source_pdf ?? ""}
            onChange={(v) => setFilter("source_pdf", v)}
            options={[
              { value: "", label: "All source PDFs" },
              ...filterOptions.source_pdfs.map((p) => ({ value: p, label: p })),
            ]}
          />
          <div className="flex flex-col">
            <label className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-taupe">
              Search
            </label>
            <input
              type="text"
              placeholder="question text…"
              defaultValue={activeFilters.q ?? ""}
              onKeyDown={(e) => {
                if (e.key === "Enter") setFilter("q", (e.target as HTMLInputElement).value);
              }}
              className="rounded-md border border-bronze bg-night px-2.5 py-1.5 text-xs text-ivory placeholder-taupe/70 focus:border-gold/40 focus:outline-none"
            />
          </div>
        </div>
        {anyFilterActive && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={clearAll}
              className="rounded-md border border-bronze px-2.5 py-1 text-xs font-medium text-ivory hover:bg-surface-raised"
            >
              Clear all filters
            </button>
            <label className="ml-auto flex items-center gap-1.5 text-xs text-taupe">
              <input
                type="checkbox"
                checked={!!activeFilters.include_resolved}
                onChange={(e) => setFilter("include_resolved", e.target.checked ? "true" : "")}
                className="h-3.5 w-3.5 rounded border-bronze bg-night"
              />
              Include resolved findings
            </label>
          </div>
        )}
      </div>

      {/* Bulk action bar — visible only when at least one row is selected */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.06] px-4 py-3">
          <span className="text-sm font-semibold text-gold-bright">
            {selectedIds.size} selected
          </span>
          <span className="text-xs text-taupe">·</span>
          <button
            onClick={bulkResolve}
            disabled={bulkBusy !== null}
            className="inline-flex items-center gap-1.5 rounded-md bg-surface-raised/20 px-3 py-1.5 text-xs font-semibold text-ivory hover:bg-surface-raised/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {bulkBusy === "resolving" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Resolve all findings
          </button>
          <button
            onClick={bulkAccept}
            disabled={bulkBusy !== null}
            className="inline-flex items-center gap-1.5 rounded-md bg-success/15 px-3 py-1.5 text-xs font-semibold text-success-bright hover:bg-success/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {bulkBusy === "accepting" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Accept as live
          </button>
          <button
            onClick={bulkFlag}
            disabled={bulkBusy !== null}
            className="inline-flex items-center gap-1.5 rounded-md bg-warning/15 px-3 py-1.5 text-xs font-semibold text-warning-bright hover:bg-warning/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {bulkBusy === "flagging" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Flag className="h-3.5 w-3.5" />
            )}
            Flag as needs-review
          </button>
          <button
            onClick={clearSelection}
            className="ml-auto inline-flex items-center gap-1 text-xs text-taupe hover:text-ivory"
          >
            <X className="h-3 w-3" /> Clear selection
          </button>
        </div>
      )}

      {bulkFeedback && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
            bulkFeedback.kind === "success"
              ? "border-success/40 bg-success/[0.06] text-success-bright"
              : "border-error/40 bg-error/[0.06] text-error-bright"
          )}
        >
          {bulkFeedback.kind === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{bulkFeedback.message}</span>
          <button
            onClick={() => setBulkFeedback(null)}
            className="text-xs underline opacity-70 hover:opacity-100"
          >
            dismiss
          </button>
        </div>
      )}

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-bronze bg-surface/30 p-12 text-center">
          <p className="text-sm font-semibold text-ivory">No findings match the current filter.</p>
          <p className="mt-1 text-xs text-taupe">
            {anyFilterActive
              ? "Try clearing filters to see everything."
              : "Run the audit + grader scripts and ingest-findings to populate."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-bronze bg-surface/40">
          <table className="w-full text-sm">
            <thead className="border-b border-bronze bg-surface/60">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-taupe">
                <th className="w-8 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all visible rows"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }}
                    onChange={toggleAllVisible}
                    className="h-3.5 w-3.5 cursor-pointer rounded border-bronze bg-night"
                  />
                </th>
                <th className="px-4 py-2.5">Question</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Domain</th>
                <th className="px-4 py-2.5">Findings</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bronze">
              {rows.map((r) => {
                const worst = SEVERITY_CHIPS[r.worst_severity];
                const WorstIcon = worst.icon;
                const isSelected = selectedIds.has(r.question_id);
                return (
                  <tr
                    key={r.question_id}
                    className={cn(
                      "transition-colors hover:bg-surface-raised/40",
                      isSelected && "bg-gold/[0.04]"
                    )}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select row ${r.question_id}`}
                        checked={isSelected}
                        onChange={() => toggleRow(r.question_id)}
                        className="h-3.5 w-3.5 cursor-pointer rounded border-bronze bg-night"
                      />
                    </td>
                    <td className="px-4 py-3 text-ivory">
                      <div
                        className={cn(
                          "max-w-xl truncate text-sm",
                          r.worst_severity === "BLOCKING" && "font-medium"
                        )}
                        title={r.question_text}
                      >
                        {r.question_text.slice(0, 140)}
                        {r.question_text.length > 140 && "…"}
                      </div>
                      <div className="mt-0.5 text-[11px] text-taupe">
                        {r.concept_slug ?? "(no concept)"}
                        {r.latest_category ? ` · last: ${r.latest_category}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-taupe">
                      {r.source_pdf ? (
                        <>
                          <div className="font-mono">{r.source_pdf}</div>
                          <div className="text-taupe">p {r.source_page ?? "?"}</div>
                        </>
                      ) : (
                        <span className="text-taupe">unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-ivory">{r.domain ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                            worst.cls
                          )}
                        >
                          <WorstIcon className="h-3 w-3" />
                          {r.total_count}
                        </span>
                        {r.blocking_count > 0 && r.worst_severity !== "BLOCKING" && (
                          <span className="text-[10px] text-error">{r.blocking_count}🔴</span>
                        )}
                        {r.warning_count > 0 && r.worst_severity === "BLOCKING" && (
                          <span className="text-[10px] text-warning-bright">
                            {r.warning_count}🟡
                          </span>
                        )}
                        {r.notice_count > 0 && r.worst_severity !== "NOTICE" && (
                          <span className="text-[10px] text-taupe">{r.notice_count}⚪</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.is_live ? (
                        <span className="rounded bg-success/10 px-1.5 py-0.5 text-success-bright">
                          live
                        </span>
                      ) : (
                        <span className="rounded bg-warning/10 px-1.5 py-0.5 text-warning-bright">
                          {r.import_status ?? "draft"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/questions/inspect/${r.question_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gold hover:text-gold-bright"
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string | undefined) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-taupe">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="rounded-md border border-bronze bg-night px-2.5 py-1.5 text-xs text-ivory focus:border-gold/40 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
