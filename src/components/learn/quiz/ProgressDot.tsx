"use client";

// ProgressDot — small status indicator shown along the bottom toolbar
// and inside the active quiz screen, one per question in the run.
// Renders as a colored dot (or a flag icon if the question was flagged
// by the student during the run).

import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProgressDot({
  isCurrent,
  isAnswered,
  isCorrect,
  isFlagged,
}: {
  i: number;
  isCurrent: boolean;
  isAnswered: boolean;
  isCorrect: boolean;
  isFlagged: boolean;
}) {
  return (
    <div className="relative">
      <div
        className={cn(
          "h-2 w-2 rounded-full transition-colors",
          !isAnswered && !isCurrent && "bg-surface-raised",
          isCurrent && "animate-pulse bg-info",
          isAnswered && isCorrect && "bg-success",
          isAnswered && !isCorrect && "bg-error"
        )}
      />
      {isFlagged && <Flag className="absolute -right-1 -top-1 h-2 w-2 text-warning" />}
    </div>
  );
}
