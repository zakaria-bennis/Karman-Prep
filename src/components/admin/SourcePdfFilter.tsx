"use client";

// ============================================================
// SourcePdfFilter — searchable dropdown that filters the page's
// question list by source_pdf.
//
// Drops into any admin questions page that wants to scope to one
// uploaded PDF at a time. Uses URL search params so the
// selection survives page refresh / shareable links.
//
// Usage in a page client component:
//
//   <SourcePdfFilter sources={sources} />
//
// And in the corresponding server component:
//
//   const sourcePdfs = await fetchSourcePdfList();
//   const filtered = filterBySourcePdfFromSearchParams(rows, searchParams);
// ============================================================

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X, FileText, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SourcePdfFilterOption {
  source_pdf: string;
  active_count: number;
  archived_count: number;
  most_recent?: string;
}

interface Props {
  sources: SourcePdfFilterOption[];
  /** URL search-param name. Default "source_pdf". */
  paramName?: string;
  /** Show archived counts as a secondary number. Default true. */
  showArchivedCounts?: boolean;
}

export default function SourcePdfFilter({
  sources,
  paramName = "source_pdf",
  showArchivedCounts = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(paramName) ?? null;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside. Standard "popover"
  // dismiss behavior — without it the dropdown blocks clicks on
  // the underlying question list.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return sources;
    const q = query.toLowerCase();
    return sources.filter((s) => s.source_pdf.toLowerCase().includes(q));
  }, [sources, query]);

  function applySelection(value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(paramName);
    else next.set(paramName, value);
    router.push(`${pathname}?${next.toString()}`);
    setOpen(false);
    setQuery("");
  }

  const totalActive = sources.reduce((acc, s) => acc + s.active_count, 0);
  const buttonLabel = current ?? `All files (${totalActive})`;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold",
          current
            ? "border-gold/40 bg-gold/40 text-gold-bright"
            : "border-bronze bg-surface text-ivory hover:border-bronze"
        )}
      >
        <FileText className="h-3.5 w-3.5" />
        <span className="max-w-[220px] truncate">{buttonLabel}</span>
        {current && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear filter"
            onClick={(e) => {
              e.stopPropagation();
              applySelection(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                applySelection(null);
              }
            }}
            className="cursor-pointer rounded p-0.5 hover:bg-gold/15"
          >
            <X className="h-3 w-3" />
          </span>
        )}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-[320px] rounded-md border border-bronze bg-night shadow-xl">
          <div className="border-b border-bronze p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-taupe" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search filename…"
                autoFocus
                className="w-full rounded border border-bronze bg-surface py-1 pl-7 pr-2 text-xs text-ivory placeholder:text-taupe focus:border-gold/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            <button
              type="button"
              onClick={() => applySelection(null)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-surface",
                !current && "bg-surface text-gold-bright"
              )}
            >
              <span className="font-semibold">All files</span>
              <span className="text-taupe">{totalActive} active</span>
            </button>

            {filtered.length === 0 && (
              <div className="px-3 py-3 text-center text-xs text-taupe">
                No files match &ldquo;{query}&rdquo;.
              </div>
            )}

            {filtered.map((s) => (
              <button
                key={s.source_pdf}
                type="button"
                onClick={() => applySelection(s.source_pdf)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-xs hover:bg-surface",
                  current === s.source_pdf && "bg-surface text-gold-bright"
                )}
              >
                <span className="max-w-[200px] truncate text-left">{s.source_pdf}</span>
                <span className="flex items-center gap-2 text-taupe">
                  <span>{s.active_count}</span>
                  {showArchivedCounts && s.archived_count > 0 && (
                    <span className="text-taupe">
                      <span className="font-mono">+{s.archived_count}</span>
                      <span className="ml-0.5 text-[10px]">arc</span>
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
