"use client";

import { cn } from "@/lib/utils";
import type { PreviewQuestionWithLineage } from "./types";

export function MetadataStrip({ question: q }: { question: PreviewQuestionWithLineage }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-bronze bg-surface/60 px-5 py-2 font-mono text-[11px] text-taupe">
      <span className="text-taupe">id:</span>
      <span className="max-w-[14rem] truncate text-ivory">{q.id}</span>
      <span className="text-taupe">pdf:</span>
      <span className="text-ivory">
        {q.source_pdf ?? "—"} p{q.source_page ?? "—"}
      </span>
      <span className="text-taupe">slug:</span>
      <span className="text-ivory">{q.concept_slug ?? "—"}</span>
      <span className="text-taupe">domain:</span>
      <span className="text-ivory">{q.domain ?? "—"}</span>
      <span className="text-taupe">level:</span>
      <span className="text-ivory">{q.difficulty_level ?? "—"}</span>
      {q.sourceLineage?.signals?.source_assets_processed_at && (
        <>
          <span className="text-taupe">assets:</span>
          <span className="text-ivory">
            {q.sourceLineage.signals.source_assets_processed_status ?? "processed"}
          </span>
        </>
      )}
      <span
        className={cn(
          "ml-auto rounded px-1.5 font-bold",
          q.import_status === "needs_review"
            ? "bg-warning/15 text-warning-bright"
            : "bg-success/15 text-success-bright"
        )}
      >
        {q.import_status ?? "ok"}
      </span>
    </div>
  );
}
