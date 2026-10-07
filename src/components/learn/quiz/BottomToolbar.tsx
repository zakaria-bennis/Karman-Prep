"use client";

// BottomToolbar — persistent footer for the quiz: flag question,
// open Desmos / Scratchpad (math only), progress dots across the
// whole quiz run.

import { Flag, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuiz } from "@/contexts/QuizContext";
import ExternalCalculatorLink from "../ExternalCalculatorLink";
import { ProgressDot } from "./ProgressDot";

export function BottomToolbar({
  subject,
  onScratchpad,
  onFlag,
  state,
}: {
  subject: "reading" | "math";
  onScratchpad: () => void;
  onFlag: () => void;
  state: ReturnType<typeof useQuiz>["state"];
}) {
  const dots = Array.from({ length: state.targetLength }, (_, i) => {
    const rec = state.records[i];
    return {
      i,
      isCurrent: i === state.currentIndex,
      isAnswered: rec?.isCorrect === true || rec?.isCorrect === false,
      isCorrect: rec?.isCorrect === true,
      isFlagged: rec?.flagged === true,
    };
  });

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex h-16 items-center border-t border-bronze bg-night/80 px-2 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2">
        <ExternalCalculatorLink subject={subject} />
        <button
          onClick={onScratchpad}
          aria-label="Scratchpad"
          className={cn(
            "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
            state.isScratchpadOpen
              ? "border-bronze bg-surface text-ivory"
              : "border-bronze text-ivory/80 hover:border-taupe/60 hover:text-ivory"
          )}
        >
          <PencilLine className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Scratchpad</span>
        </button>
      </div>

      <div className="hidden flex-1 items-center justify-center gap-2 md:flex">
        {dots.map((d) => (
          <ProgressDot key={d.i} {...d} />
        ))}
      </div>

      <button
        onClick={onFlag}
        aria-label="Flag question"
        className="ml-auto flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-bronze px-3 py-2 text-sm font-semibold text-ivory/80 transition-colors hover:border-error/40 hover:text-error"
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Flag</span>
      </button>
    </div>
  );
}
