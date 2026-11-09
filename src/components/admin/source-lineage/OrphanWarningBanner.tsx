"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasOrphanCropsOnPage } from "@/lib/source-lineage/helpers";
import type { SourceLineage } from "@/lib/source-lineage/types";

interface Props {
  lineage: SourceLineage | null | undefined;
  questionId: string;
  href?: string;
  className?: string;
}

export function OrphanWarningBanner({ lineage, questionId, href, className }: Props) {
  const [dismissed, setDismissed] = useState(false);
  // Dismissal is keyed by (source_pdf, source_page), not by questionId.
  // A reviewer working through 30 questions on the same orphan-bearing
  // PDF page should dismiss the banner ONCE, not 30 times. The questionId
  // fallback is only used when signals don't carry the pdf+page (e.g.
  // a pre-Phase-3 row where lineage was hand-loaded).
  const pdfPageKey =
    lineage?.signals?.source_pdf != null && lineage?.signals?.source_page != null
      ? `${lineage.signals.source_pdf}::page${lineage.signals.source_page}`
      : `q::${questionId}`;
  const storageKey = `karman.source-lineage.orphan.${pdfPageKey}`;
  const show = hasOrphanCropsOnPage(lineage);

  useEffect(() => {
    if (!show) return;
    setDismissed(sessionStorage.getItem(storageKey) === "1");
  }, [show, storageKey]);

  if (!show || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem(storageKey, "1");
    setDismissed(true);
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 border border-[color-mix(in_srgb,var(--warn)_35%,transparent)] bg-[color-mix(in_srgb,var(--warn)_8%,transparent)] px-3 py-2 text-xs text-[color:var(--warn)]",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--warn)]" />
      <div className="min-w-0 flex-1">
        This PDF page has orphan crops the matcher could not pair with a database row.
        {href && (
          <>
            {" "}
            <Link
              href={href}
              className="font-semibold underline decoration-[color-mix(in_srgb,var(--warn)_50%,transparent)]"
            >
              Open inspector
            </Link>
            .
          </>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded p-0.5 text-[color-mix(in_srgb,var(--warn)_70%,transparent)] hover:bg-[color-mix(in_srgb,var(--warn)_10%,transparent)] hover:text-[color:var(--warn)]"
        aria-label="Dismiss orphan crop warning"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
