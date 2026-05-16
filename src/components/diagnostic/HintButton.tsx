"use client";

// ============================================================
// HintButton — bottom-left of every diagnostic question.
//
// · Light-bulb outline icon + "Hint" label + "X of 3" counter.
// · Global cap: 3 hints across the entire diagnostic.
// · Once you spend a hint on a question, that question's hint
//   stays open even if you navigate away and come back (state
//   lives in the parent — we just render here).
// · Disabled + grayed when the global counter is exhausted AND
//   the current question hasn't been hinted yet.
// ============================================================

import { Lightbulb, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Number of hints used so far (0-3). */
  used: number;
  /** Whether this specific question already has a hint open
   *  (clicking a second time does nothing — no double-spend). */
  alreadyOpenedOnThisQuestion: boolean;
  onUse: () => void;
}

export const MAX_HINTS = 3;

export function HintButton({ used, alreadyOpenedOnThisQuestion, onUse }: Props) {
  const exhausted = used >= MAX_HINTS && !alreadyOpenedOnThisQuestion;

  return (
    <button
      type="button"
      onClick={() => {
        if (alreadyOpenedOnThisQuestion || exhausted) return;
        onUse();
      }}
      disabled={exhausted}
      title={
        exhausted
          ? "You've used all 3 hints"
          : alreadyOpenedOnThisQuestion
            ? "Hint already shown for this question"
            : "Use a hint"
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
        exhausted
          ? "cursor-not-allowed border-slate-700/50 bg-transparent text-slate-400 opacity-60"
          : alreadyOpenedOnThisQuestion
            ? "cursor-default border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
            : "border-amber-400/40 bg-amber-400/[0.06] text-amber-300 hover:border-amber-400/60 hover:bg-amber-400/15"
      )}
    >
      {alreadyOpenedOnThisQuestion ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Lightbulb className="h-3.5 w-3.5" />
      )}
      <span>{alreadyOpenedOnThisQuestion ? "Hint shown" : "Hint"}</span>
      <span
        className={cn(
          "ml-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold",
          exhausted
            ? "bg-slate-800/60 text-slate-400"
            : alreadyOpenedOnThisQuestion
              ? "bg-emerald-400/20 text-emerald-200"
              : "bg-amber-400/20 text-amber-200"
        )}
      >
        {used} of {MAX_HINTS}
      </span>
    </button>
  );
}
