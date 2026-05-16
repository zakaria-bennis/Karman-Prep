"use client";

// ============================================================
// AnswerChoiceButton — one row of the answer-choice list.
// Carved out of the old monolithic DiagnosticClient.tsx
// (audit M1). Owns the visual state matrix for a single choice
// (crossed-out, highlighted, selected, correct/incorrect) plus
// the hover-reveal toolbar with highlight + cross-out icons.
// ============================================================

import { Ban, CheckCircle, Highlighter, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import MathText from "@/components/learn/MathText";

interface Props {
  option: string;
  correctLetter: string;
  isAnswered: boolean;
  isSelected: boolean;
  isCrossed: boolean;
  isHighlighted: boolean;
  onSelect: () => void;
  onToggleCrossOut: () => void;
  onToggleHighlight: () => void;
}

export function AnswerChoiceButton({
  option,
  correctLetter,
  isAnswered,
  isSelected,
  isCrossed,
  isHighlighted,
  onSelect,
  onToggleCrossOut,
  onToggleHighlight,
}: Props) {
  const letter = option.charAt(0);
  const isCorrect = letter === correctLetter;
  const choiceBody = option.replace(/^[A-D]\)\s*/, "");
  const choiceDisabled = isAnswered || isCrossed;

  return (
    <div className="group relative">
      <button
        onClick={() => !isCrossed && onSelect()}
        disabled={choiceDisabled}
        className={cn(
          "w-full rounded-xl border-2 py-4 pl-4 pr-20 text-left text-sm font-medium transition-all",
          isCrossed &&
            "cursor-not-allowed border-slate-200 bg-slate-100/60 opacity-50 dark:border-slate-700 dark:bg-slate-800/40",
          !isCrossed &&
            isHighlighted &&
            !isAnswered &&
            "border-amber-400/60 bg-amber-400/[0.06] hover:border-amber-400 hover:bg-amber-400/[0.12] dark:bg-amber-400/[0.08]",
          !isCrossed &&
            !isHighlighted &&
            !isAnswered &&
            "border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-blue-900/20",
          !isCrossed &&
            isAnswered &&
            isCorrect &&
            "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
          !isCrossed &&
            isAnswered &&
            isSelected &&
            !isCorrect &&
            "border-red-400 bg-red-50 dark:bg-red-900/20",
          !isCrossed &&
            isAnswered &&
            !isSelected &&
            !isCorrect &&
            "border-slate-200 opacity-50 dark:border-slate-700"
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              !isAnswered &&
                !isCrossed &&
                !isHighlighted &&
                "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
              !isAnswered &&
                !isCrossed &&
                isHighlighted &&
                "bg-amber-400/30 text-amber-700 dark:text-amber-200",
              isCrossed && "bg-slate-200 text-slate-400 line-through dark:bg-slate-700/60",
              !isCrossed && isAnswered && isCorrect && "bg-emerald-500 text-white",
              !isCrossed && isAnswered && isSelected && !isCorrect && "bg-red-400 text-white"
            )}
          >
            {!isCrossed && isAnswered && isCorrect ? (
              <CheckCircle className="h-4 w-4" />
            ) : !isCrossed && isAnswered && isSelected ? (
              <XCircle className="h-4 w-4" />
            ) : (
              letter
            )}
          </span>
          <span
            className={cn(
              "flex-1",
              isCrossed && "text-slate-400 line-through",
              !isCrossed && isAnswered && isCorrect && "text-emerald-700 dark:text-emerald-300",
              !isCrossed &&
                isAnswered &&
                isSelected &&
                !isCorrect &&
                "text-red-600 dark:text-red-400",
              !isCrossed && isAnswered && !isSelected && !isCorrect && "text-slate-500",
              !isCrossed && !isAnswered && "text-slate-700 dark:text-slate-200"
            )}
          >
            <MathText text={choiceBody} />
          </span>
        </div>
      </button>

      {/* Hover-revealed action icons — appear on the right edge
          when the user hovers the choice (or whenever a state
          is already active so the indicator doesn't disappear).
          Two big tap targets: highlight + cross-out. */}
      <div
        className={cn(
          "absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 transition-opacity",
          isCrossed || isHighlighted
            ? "opacity-100"
            : "opacity-0 focus-within:opacity-100 group-hover:opacity-100"
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleHighlight();
          }}
          aria-label={
            isHighlighted ? `Remove highlight from choice ${letter}` : `Highlight choice ${letter}`
          }
          title={isHighlighted ? "Remove highlight" : "Highlight"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            isHighlighted
              ? "bg-amber-400/20 text-amber-300"
              : "text-slate-400 hover:bg-amber-400/15 hover:text-amber-300"
          )}
        >
          <Highlighter className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCrossOut();
          }}
          aria-label={isCrossed ? `Restore choice ${letter}` : `Cross out choice ${letter}`}
          title={isCrossed ? "Restore choice" : "Cross out"}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            isCrossed
              ? "bg-rose-400/20 text-rose-300"
              : "text-slate-400 hover:bg-rose-400/15 hover:text-rose-300"
          )}
        >
          <Ban className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
