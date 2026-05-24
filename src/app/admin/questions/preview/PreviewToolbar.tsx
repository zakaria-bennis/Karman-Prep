"use client";

// ============================================================
// PreviewToolbar — top bar of the preview shell.
//
// Layout:  [ filters ───────────────── ] [ device frame ]  [ N of M ‹ › ]
//
// Filters: subject · status · PDF · domain · has-figure
//   "has-figure" was added in phase 2 — earlier filter set didn't
//   have it, but the figure-validation flow leans on it heavily
//   (admin wants to scan just the figure-bearing rows after a
//   backfill).
//
// Counter + prev/next stays in the toolbar (not the bottom bar)
// because navigating between questions is the most common action
// and the eye is already there when looking at filters.
// ============================================================

import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeviceFrameToggle, type DeviceWidth } from "./DeviceFrame";

export type Subject = "all" | "reading" | "math";
export type Status = "all" | "ok" | "needs_review";
export type HasFigure = "all" | "yes" | "no";

export interface FilterState {
  subject: Subject;
  status: Status;
  pdf: string; // "all" | exact pdf name
  domain: string; // "all" | exact domain
  hasFigure: HasFigure;
}

interface Props {
  filters: FilterState;
  pdfOptions: string[];
  domainOptions: string[];
  device: DeviceWidth;
  currentIndex: number;
  totalCount: number;
  onChangeFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onChangeDevice: (v: DeviceWidth) => void;
  onPrev: () => void;
  onNext: () => void;
  onClearFilters: () => void;
}

export function PreviewToolbar({
  filters,
  pdfOptions,
  domainOptions,
  device,
  currentIndex,
  totalCount,
  onChangeFilter,
  onChangeDevice,
  onPrev,
  onNext,
  onClearFilters,
}: Props) {
  const anyFilterSet =
    filters.subject !== "all" ||
    filters.status !== "all" ||
    filters.pdf !== "all" ||
    filters.domain !== "all" ||
    filters.hasFigure !== "all";

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/40 px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Filter className="h-3.5 w-3.5" />
        <span>Filters</span>
      </div>

      <Select
        value={filters.subject}
        onChange={(v) => onChangeFilter("subject", v as Subject)}
        options={[
          { value: "all", label: "All subjects" },
          { value: "reading", label: "Reading" },
          { value: "math", label: "Math" },
        ]}
      />
      <Select
        value={filters.status}
        onChange={(v) => onChangeFilter("status", v as Status)}
        options={[
          { value: "all", label: "All statuses" },
          { value: "ok", label: "ok" },
          { value: "needs_review", label: "needs_review" },
        ]}
      />
      <Select
        value={filters.pdf}
        onChange={(v) => onChangeFilter("pdf", v)}
        className="max-w-[14rem]"
        options={[
          { value: "all", label: "All PDFs" },
          ...pdfOptions.map((p) => ({ value: p, label: p })),
        ]}
      />
      <Select
        value={filters.domain}
        onChange={(v) => onChangeFilter("domain", v)}
        options={[
          { value: "all", label: "All domains" },
          ...domainOptions.map((d) => ({ value: d, label: d })),
        ]}
      />
      <Select
        value={filters.hasFigure}
        onChange={(v) => onChangeFilter("hasFigure", v as HasFigure)}
        options={[
          { value: "all", label: "Any figures" },
          { value: "yes", label: "Has figure" },
          { value: "no", label: "No figure" },
        ]}
      />

      {anyFilterSet && (
        <button onClick={onClearFilters} className="text-xs text-slate-400 hover:text-slate-200">
          Clear filters
        </button>
      )}

      {/* ── Right side: device frame + nav ────────────────── */}
      <div className="ml-auto flex items-center gap-3">
        <DeviceFrameToggle value={device} onChange={onChangeDevice} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {totalCount === 0 ? (
              "0 questions"
            ) : (
              <>
                <span className="font-semibold text-slate-200">{currentIndex + 1}</span>
                <span className="text-slate-500"> of {totalCount}</span>
              </>
            )}
          </span>
          <button
            onClick={onPrev}
            disabled={currentIndex === 0 || totalCount === 0}
            className="rounded-md border border-slate-700 bg-slate-800 p-1.5 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous question"
          >
            <ChevronLeft className="h-4 w-4 text-slate-200" />
          </button>
          <button
            onClick={onNext}
            disabled={currentIndex >= totalCount - 1 || totalCount === 0}
            className="rounded-md border border-slate-700 bg-slate-800 p-1.5 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next question"
          >
            <ChevronRight className="h-4 w-4 text-slate-200" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-100",
        "focus:border-indigo-500 focus:outline-none",
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
