"use client";

// ============================================================
// PreviewClient — list + filter UI sitting above the QuestionPreview
// renderer. Filters narrow the question pool; current selection is
// driven by index into the filtered list, navigated with prev/next or
// the dropdown.
// ============================================================

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuizQuestionWithChoices } from "@/types/quiz";
import { QuestionPreview } from "./QuestionPreview";

type Subject = "all" | "reading" | "math";
type Status = "all" | "ok" | "needs_review";

export default function PreviewClient({ initial }: { initial: QuizQuestionWithChoices[] }) {
  const [subject, setSubject] = useState<Subject>("all");
  const [status, setStatus] = useState<Status>("all");
  const [pdf, setPdf] = useState<string>("all");
  const [domain, setDomain] = useState<string>("all");
  const [idx, setIdx] = useState(0);

  // Distinct PDFs / domains for filter dropdowns.
  const allPdfs = useMemo(
    () => Array.from(new Set(initial.map((q) => q.source_pdf || "(unknown)"))).sort(),
    [initial]
  );
  const allDomains = useMemo(
    () => Array.from(new Set(initial.map((q) => q.domain || "(unknown)"))).sort(),
    [initial]
  );

  const filtered = useMemo(() => {
    return initial.filter((q) => {
      if (subject !== "all" && q.subject !== subject) return false;
      if (status !== "all" && q.import_status !== status) return false;
      if (pdf !== "all" && (q.source_pdf || "(unknown)") !== pdf) return false;
      if (domain !== "all" && (q.domain || "(unknown)") !== domain) return false;
      return true;
    });
  }, [initial, subject, status, pdf, domain]);

  // Keep idx in range when filters change.
  const safeIdx = filtered.length > 0 ? Math.min(idx, filtered.length - 1) : 0;
  const current = filtered[safeIdx];

  function jump(delta: number) {
    setIdx((cur) => {
      const next = cur + delta;
      if (next < 0) return 0;
      if (next >= filtered.length) return filtered.length - 1;
      return next;
    });
  }

  function selectRow(i: number) {
    setIdx(i);
  }

  return (
    <div>
      {/* Filter + nav toolbar */}
      <div className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>

          <select
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value as Subject);
              setIdx(0);
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All subjects</option>
            <option value="reading">Reading</option>
            <option value="math">Math</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as Status);
              setIdx(0);
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All statuses</option>
            <option value="ok">ok</option>
            <option value="needs_review">needs_review</option>
          </select>

          <select
            value={pdf}
            onChange={(e) => {
              setPdf(e.target.value);
              setIdx(0);
            }}
            className="max-w-[18rem] rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All PDFs</option>
            {allPdfs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              setIdx(0);
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All domains</option>
            {allDomains.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Counter + nav */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {filtered.length === 0 ? (
                "0 questions"
              ) : (
                <>
                  <span className="font-semibold text-slate-300">{safeIdx + 1}</span>
                  {" of "}
                  {filtered.length}
                </>
              )}
            </span>
            <button
              onClick={() => jump(-1)}
              disabled={safeIdx === 0 || filtered.length === 0}
              className="rounded-md border border-slate-700 bg-slate-800 p-1.5 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous question"
            >
              <ChevronLeft className="h-4 w-4 text-slate-200" />
            </button>
            <button
              onClick={() => jump(1)}
              disabled={safeIdx >= filtered.length - 1 || filtered.length === 0}
              className="rounded-md border border-slate-700 bg-slate-800 p-1.5 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next question"
            >
              <ChevronRight className="h-4 w-4 text-slate-200" />
            </button>
          </div>
        </div>
      </div>

      {/* 2-pane: list + preview */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-5 py-4 lg:grid-cols-[20rem_1fr]">
        {/* Left: list of filtered questions */}
        <aside className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/30 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-xs italic text-slate-500">
              No questions match these filters.
            </div>
          ) : (
            filtered.map((q, i) => (
              <button
                key={q.id}
                onClick={() => selectRow(i)}
                className={cn(
                  "flex w-full items-start gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-800/50",
                  i === safeIdx && "bg-slate-800"
                )}
              >
                <span className="mt-0.5 w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-slate-500">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-[12px] leading-snug text-slate-200">
                    {q.question_text || "(no question text)"}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="rounded bg-slate-800 px-1.5 text-slate-300">{q.subject}</span>
                    <span className="rounded bg-slate-800 px-1.5 text-slate-300">
                      L{q.difficulty_level ?? "—"}
                    </span>
                    <span className="max-w-[8rem] truncate">{q.concept_slug ?? "(no slug)"}</span>
                    {q.import_status === "needs_review" && (
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                    )}
                  </span>
                </span>
              </button>
            ))
          )}
        </aside>

        {/* Right: live preview */}
        <main className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          {current ? (
            <>
              {/* Metadata strip above the preview, mirrors what the
                  admin needs to know about this row but never shown to
                  students. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-800 bg-slate-900/60 px-5 py-2 font-mono text-[11px] text-slate-400">
                <span className="text-slate-500">id:</span>
                <span className="max-w-[14rem] truncate text-slate-300">{current.id}</span>
                <span className="text-slate-500">pdf:</span>
                <span className="text-slate-300">
                  {current.source_pdf ?? "—"} p{current.source_page ?? "—"}
                </span>
                <span className="text-slate-500">slug:</span>
                <span className="text-slate-300">{current.concept_slug ?? "—"}</span>
                <span className="text-slate-500">domain:</span>
                <span className="text-slate-300">{current.domain ?? "—"}</span>
                <span className="text-slate-500">level:</span>
                <span className="text-slate-300">{current.difficulty_level ?? "—"}</span>
                <span
                  className={cn(
                    "ml-auto rounded px-1.5 font-bold",
                    current.import_status === "needs_review"
                      ? "bg-amber-500/15 text-amber-300"
                      : "bg-emerald-500/15 text-emerald-300"
                  )}
                >
                  {current.import_status ?? "ok"}
                </span>
              </div>
              <QuestionPreview q={current} />
            </>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No question selected.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
