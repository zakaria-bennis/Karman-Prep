"use client";

import { cn } from "@/lib/utils";
import type { PreviewQuestionWithLineage } from "./types";

export function MetadataStrip({ question: q }: { question: PreviewQuestionWithLineage }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-800 bg-slate-900/60 px-5 py-2 font-mono text-[11px] text-slate-400">
      <span className="text-slate-500">id:</span>
      <span className="max-w-[14rem] truncate text-slate-300">{q.id}</span>
      <span className="text-slate-500">pdf:</span>
      <span className="text-slate-300">
        {q.source_pdf ?? "—"} p{q.source_page ?? "—"}
      </span>
      <span className="text-slate-500">slug:</span>
      <span className="text-slate-300">{q.concept_slug ?? "—"}</span>
      <span className="text-slate-500">domain:</span>
      <span className="text-slate-300">{q.domain ?? "—"}</span>
      <span className="text-slate-500">level:</span>
      <span className="text-slate-300">{q.difficulty_level ?? "—"}</span>
      {q.sourceLineage?.signals?.source_assets_processed_at && (
        <>
          <span className="text-slate-500">assets:</span>
          <span className="text-slate-300">
            {q.sourceLineage.signals.source_assets_processed_status ?? "processed"}
          </span>
        </>
      )}
      <span
        className={cn(
          "ml-auto rounded px-1.5 font-bold",
          q.import_status === "needs_review"
            ? "bg-amber-500/15 text-amber-300"
            : "bg-emerald-500/15 text-emerald-300"
        )}
      >
        {q.import_status ?? "ok"}
      </span>
    </div>
  );
}
