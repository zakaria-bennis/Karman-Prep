"use client";

import { cn } from "@/lib/utils";
import type { PreviewQuestionWithLineage } from "./types";

export function MetadataStrip({ question: q }: { question: PreviewQuestionWithLineage }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 break-words border-b border-[color:var(--line)] bg-[color-mix(in_srgb,var(--card)_60%,transparent)] px-5 py-2 font-mono text-[11px] text-[color:var(--mute)]">
      <span className="text-[color:var(--mute)]">id:</span>
      <span className="max-w-[14rem] truncate text-[color:var(--ink)]">{q.id}</span>
      <span className="text-[color:var(--mute)]">pdf:</span>
      <span className="min-w-0 break-all text-[color:var(--ink)]">
        {q.source_pdf ?? "—"} p{q.source_page ?? "—"}
      </span>
      <span className="text-[color:var(--mute)]">slug:</span>
      <span className="min-w-0 break-all text-[color:var(--ink)]">{q.concept_slug ?? "—"}</span>
      <span className="text-[color:var(--mute)]">domain:</span>
      <span className="min-w-0 break-all text-[color:var(--ink)]">{q.domain ?? "—"}</span>
      <span className="text-[color:var(--mute)]">level:</span>
      <span className="min-w-0 break-all text-[color:var(--ink)]">{q.difficulty_level ?? "—"}</span>
      {q.sourceLineage?.signals?.source_assets_processed_at && (
        <>
          <span className="text-[color:var(--mute)]">assets:</span>
          <span className="min-w-0 break-all text-[color:var(--ink)]">
            {q.sourceLineage.signals.source_assets_processed_status ?? "processed"}
          </span>
        </>
      )}
      <span
        className={cn(
          "ml-auto rounded px-1.5 font-bold",
          q.import_status === "needs_review"
            ? "bg-[color-mix(in_srgb,var(--warn)_15%,transparent)] text-[color:var(--warn)]"
            : "bg-[color-mix(in_srgb,var(--good)_15%,transparent)] text-[color:var(--good)]"
        )}
      >
        {q.import_status ?? "ok"}
      </span>
    </div>
  );
}
