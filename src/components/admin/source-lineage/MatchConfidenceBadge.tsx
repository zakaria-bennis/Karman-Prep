"use client";

import { AlertTriangle, CheckCircle2, XCircle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { compactMatchMethod } from "@/lib/source-lineage/helpers";

interface Props {
  method: string | null | undefined;
  confidence: number | null | undefined;
  className?: string;
}

// Tone selection (note "neutral" added in audit fix):
//   bad      orphan match OR confidence < 0.60     → red XCircle
//   warn     confidence in [0.60, 0.85)            → amber AlertTriangle
//   good     confidence ≥ 0.85                     → green CheckCircle
//   neutral  null confidence (page-level rows like  → slate Minus
//            page_image have no match score to
//            evaluate; using "good" green would
//            falsely imply a verified match)
export function MatchConfidenceBadge({ method, confidence, className }: Props) {
  const isOrphan = method === "orphan";
  let tone: "bad" | "warn" | "good" | "neutral";
  if (isOrphan) {
    tone = "bad";
  } else if (confidence == null) {
    // No confidence to evaluate → neutral. Most common for page_image
    // (page-level rows) which don't have a per-question match score.
    tone = "neutral";
  } else if (confidence < 0.6) {
    tone = "bad";
  } else if (confidence < 0.85) {
    tone = "warn";
  } else {
    tone = "good";
  }

  const Icon =
    tone === "good"
      ? CheckCircle2
      : tone === "warn"
        ? AlertTriangle
        : tone === "bad"
          ? XCircle
          : Minus;
  const label = compactMatchMethod(method);
  const score = confidence == null ? null : confidence.toFixed(2);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold",
        tone === "good" && "border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
        tone === "warn" && "border-amber-500/35 bg-amber-500/10 text-amber-200",
        tone === "bad" && "border-rose-500/35 bg-rose-500/10 text-rose-200",
        tone === "neutral" && "border-slate-500/35 bg-slate-500/10 text-slate-300",
        className
      )}
      title={score ? `Matched via ${label} with confidence ${score}` : label}
    >
      <Icon className="h-3 w-3" />
      <span>{score ? `${label} · ${score}` : label}</span>
    </span>
  );
}
