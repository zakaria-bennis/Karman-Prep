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
        "flex items-start gap-2 border border-warning/35 bg-warning/[0.08] px-3 py-2 text-xs text-warning-bright",
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning-bright" />
      <div className="min-w-0 flex-1">
        This PDF page has orphan crops the matcher could not pair with a database row.
        {href && (
          <>
            {" "}
            <Link href={href} className="font-semibold underline decoration-warning-bright/50">
              Open inspector
            </Link>
            .
          </>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded p-0.5 text-warning-bright/70 hover:bg-warning/10 hover:text-warning-bright"
        aria-label="Dismiss orphan crop warning"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
