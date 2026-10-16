"use client";

// DiagnosticHeader — top bar for the active diagnostic:
//   · Exit button + question counter
//   · Calculator (Desmos) + Scratchpad toggles (math only)
//   · Question navigator opener
//   · Bookmark toggle
//   · Section timer (circular ring + clock)
//   · Per-section progress bar
//
// Used by DiagnosticClient only.

import { Bookmark, BookmarkCheck, LayoutGrid, PencilLine, X } from "lucide-react";
import { CalculatorTrigger } from "@/components/calculator/CalculatorScope";
import { HighlightTool, QuizSettings, TimerToggle } from "@/components/learn/quiz/QuizTools";
import { cn } from "@/lib/utils";

export function DiagnosticHeader({
  sectionPosition,
  sectionLength,
  scratchpadOpen,
  isBookmarked,
  sectionTimeLeft,
  onOpenExit,
  onOpenNavigator,
  onToggleScratchpad,
  onToggleBookmark,
}: {
  sectionPosition: number;
  sectionLength: number;
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
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
          <div>
            <span className="text-sm font-semibold text-ivory dark:text-ivory">
              Question {sectionPosition} / {sectionLength}
            </span>
            <span className="ml-2 text-xs text-taupe">SAT Diagnostic</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CalculatorTrigger />

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

          {/* Question navigator — opens a slide-in grid of all
              35 questions with status pips for jump navigation. */}
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

          <HighlightTool />
          <QuizSettings />
          <TimerToggle seconds={sectionTimeLeft} countdown />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-auto mt-2 max-w-6xl">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface dark:bg-surface-raised">
          <div
            className="h-full rounded-full bg-info transition-all duration-300"
            style={{ width: `${(sectionPosition / sectionLength) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
