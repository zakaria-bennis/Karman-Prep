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
            "cursor-not-allowed border-bronze bg-surface/60 opacity-50 dark:border-bronze dark:bg-surface-raised/40",
          !isCrossed &&
            isHighlighted &&
            !isAnswered &&
            "border-warning/60 bg-warning/[0.06] hover:border-warning/40 hover:bg-warning/[0.12] dark:bg-warning/[0.08]",
          !isCrossed &&
            !isHighlighted &&
            !isAnswered &&
            "border-bronze bg-surface hover:border-info/40 hover:bg-info/10 dark:border-bronze dark:bg-surface-raised dark:hover:bg-info/20",
          !isCrossed &&
            isAnswered &&
            isCorrect &&
            "border-success/40 bg-success/10 dark:bg-success/20",
          !isCrossed &&
            isAnswered &&
            isSelected &&
            !isCorrect &&
            "border-error/40 bg-error/10 dark:bg-error/20",
          !isCrossed &&
            isAnswered &&
            !isSelected &&
            !isCorrect &&
            "border-bronze opacity-50 dark:border-bronze"
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              !isAnswered &&
                !isCrossed &&
                !isHighlighted &&
                "bg-surface text-taupe dark:bg-surface-raised dark:text-ivory",
              !isAnswered &&
                !isCrossed &&
                isHighlighted &&
                "bg-warning/30 text-warning dark:text-warning-bright",
              isCrossed && "bg-surface text-taupe line-through dark:bg-surface-raised/60",
              !isCrossed && isAnswered && isCorrect && "bg-success text-night",
              !isCrossed && isAnswered && isSelected && !isCorrect && "bg-error text-ivory"
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
              isCrossed && "text-taupe line-through",
              !isCrossed && isAnswered && isCorrect && "text-success dark:text-success-bright",
              !isCrossed && isAnswered && isSelected && !isCorrect && "text-error dark:text-error",
              !isCrossed && isAnswered && !isSelected && !isCorrect && "text-taupe",
              !isCrossed && !isAnswered && "text-ivory dark:text-ivory"
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
              ? "bg-warning/20 text-warning-bright"
              : "text-taupe hover:bg-warning/15 hover:text-warning-bright"
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
              ? "bg-error/20 text-error-bright"
              : "text-taupe hover:bg-error/15 hover:text-error-bright"
          )}
        >
          <Ban className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
