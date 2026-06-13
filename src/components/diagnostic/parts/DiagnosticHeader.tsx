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

import { Bookmark, BookmarkCheck, Calculator, LayoutGrid, PencilLine, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTION_LABELS: Record<"math" | "rw", string> = {
  math: "Math",
  rw: "Reading & Writing",
};

function fmtClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function DiagnosticHeader({
  sectionPosition,
  sectionLength,
  isMathQuestion,
  desmosOpen,
  scratchpadOpen,
  isBookmarked,
  currentSection,
  sectionTimeLeft,
  timerColor,
  timerPct,
  minutesLeft,
  onOpenExit,
  onOpenNavigator,
  onToggleDesmos,
  onToggleScratchpad,
  onToggleBookmark,
}: {
  sectionPosition: number;
  sectionLength: number;
  isMathQuestion: boolean;
  desmosOpen: boolean;
  scratchpadOpen: boolean;
  isBookmarked: boolean;
  currentSection: "math" | "rw";
  sectionTimeLeft: number;
  timerColor: string;
  timerPct: number;
  minutesLeft: number;
  onOpenExit: () => void;
  onOpenNavigator: () => void;
  onToggleDesmos: () => void;
  onToggleScratchpad: () => void;
  onToggleBookmark: () => void;
}) {
  return (
    <div className="border-b border-bronze bg-surface px-4 py-3 dark:border-bronze dark:bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
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

        <div className="flex items-center gap-2">
          {/* Calculator (Desmos) — math questions only. */}
          {isMathQuestion && (
            <button
              type="button"
              onClick={onToggleDesmos}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors",
                desmosOpen
                  ? "border-error/40 bg-error text-ivory"
                  : "border-bronze text-taupe hover:border-error/40 hover:text-error dark:border-bronze dark:text-error-bright dark:hover:text-error-bright"
              )}
              aria-pressed={desmosOpen}
              aria-label="Toggle Desmos calculator"
            >
              <Calculator className="h-3.5 w-3.5" />
              Calculator
            </button>
          )}

          {/* Scratchpad — pristine white accent. */}
          {isMathQuestion && (
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
          )}

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

          {/* Section timer — clock for the active SAT section.
              Shows "Math 31:42" or "Reading & Writing 17:08", with
              a circular progress ring that turns amber under 5
              minutes and red under 1 minute. */}
          <div className="ml-1 flex items-center gap-2 border-l border-bronze pl-1.5 pl-3 dark:border-bronze">
            <svg width="32" height="32" className="-rotate-90">
              <circle
                cx="16"
                cy="16"
                r="12"
                strokeWidth="3"
                fill="none"
                className="stroke-ivory dark:stroke-ivory"
              />
              <circle
                cx="16"
                cy="16"
                r="12"
                strokeWidth="3"
                fill="none"
                stroke={timerColor}
                strokeLinecap="round"
                strokeDasharray={75.4}
                strokeDashoffset={75.4 - (timerPct / 100) * 75.4}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-taupe dark:text-taupe">
                {SECTION_LABELS[currentSection]}
              </span>
              <span className="font-mono text-sm font-bold" style={{ color: timerColor }}>
                {fmtClock(sectionTimeLeft)}
              </span>
            </div>
            {minutesLeft <= 0 && sectionTimeLeft > 0 && (
              <span className="sr-only">Less than a minute remaining</span>
            )}
          </div>
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
