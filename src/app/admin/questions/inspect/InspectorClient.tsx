"use client";

// ============================================================
// InspectorClient — worklist table with filters.
//
// Each row links to /admin/questions/inspect/[id] for deep view.
// Filters are URL-synced so deep-links work.
// ============================================================

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
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
    cls: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  },
  WARNING: {
    label: "Warning",
    icon: AlertTriangle,
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  NOTICE: {
    label: "Notice",
    icon: Info,
    cls: "bg-slate-500/15 text-slate-300 border-slate-500/30",
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
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
            <label className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Search
            </label>
            <input
              type="text"
              placeholder="question text…"
              defaultValue={activeFilters.q ?? ""}
              onKeyDown={(e) => {
                if (e.key === "Enter") setFilter("q", (e.target as HTMLInputElement).value);
              }}
              className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>
        {anyFilterActive && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={clearAll}
              className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Clear all filters
            </button>
            <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={!!activeFilters.include_resolved}
                onChange={(e) => setFilter("include_resolved", e.target.checked ? "true" : "")}
                className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950"
              />
              Include resolved findings
            </label>
          </div>
        )}
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <p className="text-sm font-semibold text-slate-300">
            No findings match the current filter.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {anyFilterActive
              ? "Try clearing filters to see everything."
              : "Run the audit + grader scripts and ingest-findings to populate."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/60">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5">Question</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5">Domain</th>
                <th className="px-4 py-2.5">Findings</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((r) => {
                const worst = SEVERITY_CHIPS[r.worst_severity];
                const WorstIcon = worst.icon;
                return (
                  <tr key={r.question_id} className="transition-colors hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-200">
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
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {r.concept_slug ?? "(no concept)"}
                        {r.latest_category ? ` · last: ${r.latest_category}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {r.source_pdf ? (
                        <>
                          <div className="font-mono">{r.source_pdf}</div>
                          <div className="text-slate-500">p {r.source_page ?? "?"}</div>
                        </>
                      ) : (
                        <span className="text-slate-600">unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">{r.domain ?? "—"}</td>
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
                          <span className="text-[10px] text-rose-400">{r.blocking_count}🔴</span>
                        )}
                        {r.warning_count > 0 && r.worst_severity === "BLOCKING" && (
                          <span className="text-[10px] text-amber-300">{r.warning_count}🟡</span>
                        )}
                        {r.notice_count > 0 && r.worst_severity !== "NOTICE" && (
                          <span className="text-[10px] text-slate-500">{r.notice_count}⚪</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.is_live ? (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                          live
                        </span>
                      ) : (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-300">
                          {r.import_status ?? "draft"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/questions/inspect/${r.question_id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300"
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
      <label className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-violet-500 focus:outline-none"
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
