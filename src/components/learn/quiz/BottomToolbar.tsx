"use client";

// BottomToolbar — persistent footer for the quiz: flag question,
// open Desmos / Scratchpad (math only), progress dots across the
// whole quiz run.

import { Calculator, Flag, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUIZ_TOTAL_QUESTIONS, useQuiz } from "@/contexts/QuizContext";
import { ProgressDot } from "./ProgressDot";

export function BottomToolbar({
  subject,
  onDesmos,
  onScratchpad,
  onFlag,
  state,
}: {
  subject: "reading" | "math";
  onDesmos: () => void;
  onScratchpad: () => void;
  onFlag: () => void;
  state: ReturnType<typeof useQuiz>["state"];
}) {
  const dots = Array.from({ length: QUIZ_TOTAL_QUESTIONS }, (_, i) => {
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
    <div className="absolute inset-x-0 bottom-0 z-10 flex h-16 items-center border-t border-slate-800 bg-slate-950/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {subject === "math" && (
          <button
            onClick={onDesmos}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
              state.isDesmosOpen
                ? "border-indigo-400 bg-indigo-500 text-white"
                : "border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-white"
            )}
          >
            <Calculator className="h-4 w-4" /> Desmos
          </button>
        )}
        <button
          onClick={onScratchpad}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
            state.isScratchpadOpen
              ? "border-slate-100 bg-slate-200 text-slate-900"
              : "border-slate-700 text-slate-300 hover:border-slate-400 hover:text-white"
          )}
        >
          <PencilLine className="h-4 w-4" /> Scratchpad
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center gap-2">
        {dots.map((d) => (
          <ProgressDot key={d.i} {...d} />
        ))}
      </div>

      <button
        onClick={onFlag}
        className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:border-rose-500 hover:text-rose-400"
      >
        <Flag className="h-4 w-4" /> Flag
      </button>
    </div>
  );
}
