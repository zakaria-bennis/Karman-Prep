"use client";

// DiagnosticHeader — top bar for the active diagnostic:
//   · Exit button + diagnostic label
//   · Calculator + Scratchpad toggles (math only)
//   · Question navigator opener
//   · Bookmark toggle
//   · Section timer (circular ring + clock)
//
// Used by DiagnosticClient only.

import { Bookmark, BookmarkCheck, LayoutGrid, PencilLine, X } from "lucide-react";
import { CalculatorTrigger } from "@/components/calculator/CalculatorScope";
import { TimerToggle, HighlightTool } from "@/components/learn/quiz/QuizTools";
import { QuizMenu } from "@/components/learn/quiz/QuizMenu";
import { cn } from "@/lib/utils";

export function DiagnosticHeader({
  isMathQuestion,
  scratchpadOpen,
  isBookmarked,
  sectionTimeLeft,
  minutesLeft,
  timerColor,
  onOpenExit,
  onOpenNavigator,
  onToggleScratchpad,
  onToggleBookmark,
}: {
  isMathQuestion: boolean;
  scratchpadOpen: boolean;
  isBookmarked: boolean;
  currentSection: "math" | "rw";
  sectionTimeLeft: number;
  timerColor: string;
  timerPct: number;
  minutesLeft: number;
  onOpenExit: () => void;
  onOpenNavigator: () => void;
  onToggleScratchpad: () => void;
  onToggleBookmark: () => void;
}) {
  return (
    <div className="border-b border-bronze bg-surface px-4 py-3 dark:border-bronze dark:bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Exit — opens a confirmation modal because the
              diagnostic must be completed in one session and any
              in-flight answers will be discarded. */}
          <button
            type="button"
            onClick={onOpenExit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bronze px-2.5 py-1.5 text-xs font-semibold text-taupe transition-colors hover:border-error/40 hover:text-error dark:border-bronze dark:text-ivory dark:hover:text-error-bright"
            aria-label="Exit diagnostic"
            title="Exit diagnostic (progress will be lost)"
          >
            <X className="h-3.5 w-3.5" />
            Exit
          </button>
          <span className="text-sm font-semibold text-ivory">SAT Diagnostic</span>
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-2">
          {isMathQuestion && <CalculatorTrigger />}
          <HighlightTool />
          <QuizMenu subject={isMathQuestion ? "math" : "reading"} />

          {/* Scratchpad — pristine white accent. */}
          {
            <button
              type="button"
              onClick={onToggleScratchpad}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                scratchpadOpen
                  ? "border-ivory bg-surface text-ivory"
                  : "border-bronze text-taupe hover:border-ivory hover:bg-surface/90 hover:text-ivory dark:border-bronze dark:text-ivory dark:hover:bg-surface dark:hover:text-ivory"
              )}
              aria-pressed={scratchpadOpen}
              aria-label="Toggle scratchpad"
            >
              <PencilLine className="h-3.5 w-3.5" />
              Scratchpad
            </button>
          }

          {/* Question navigator — prompt labels preserve jump navigation
              without showing ordinals or source identifiers. */}
          <button
            type="button"
            onClick={onOpenNavigator}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bronze px-2.5 py-1.5 text-xs font-semibold text-taupe transition-colors hover:border-info/40 hover:text-info dark:border-bronze dark:text-ivory dark:hover:text-info-bright"
            aria-label="Open question navigator"
            title="All questions"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Questions
          </button>

          {/* Bookmark — pristine white. Active state inverts to
              solid white so the student sees at a glance that the
              question is flagged for review. */}
          <button
            type="button"
            onClick={onToggleBookmark}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
              isBookmarked
                ? "border-ivory bg-surface text-ivory"
                : "border-bronze text-taupe hover:border-ivory hover:bg-surface/90 hover:text-ivory dark:border-bronze dark:text-ivory dark:hover:bg-surface dark:hover:text-ivory"
            )}
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark for review"}
            title={isBookmarked ? "Bookmarked — click to remove" : "Bookmark for review"}
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-3.5 w-3.5" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
            {isBookmarked ? "Saved" : "Bookmark"}
          </button>

          <TimerToggle seconds={sectionTimeLeft} countdown color={timerColor} />
          {minutesLeft <= 0 && sectionTimeLeft > 0 && (
            <span className="sr-only">Less than a minute remaining</span>
          )}
        </div>
      </div>
    </div>
  );
}
