"use client";

// ============================================================
// Diagnostic Assessment — 35-question timed client.
// Each question has a 90-second budget; running out auto-
// advances. Submitting on the last question posts answers
// to /api/diagnostic/submit, which returns a ScoredDiagnostic
// that drives the inline results screen.
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import {
  ArrowRight, CheckCircle, XCircle, Calculator,
  PencilLine, Lightbulb, Highlighter, Ban, Bookmark, BookmarkCheck,
  LayoutGrid, X, AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS, DOMAIN_LABELS, DOMAIN_SECTION, type SATDomain } from "@/types";
import type { ScoredDiagnostic } from "@/lib/diagnostic-scoring";
import DesmosWindow from "@/components/learn/DesmosWindow";
import Scratchpad from "@/components/learn/Scratchpad";
import MathText from "@/components/learn/MathText";
import DiagnosticResults from "./DiagnosticResults";
import { HighlightablePassage, type PassageHighlight } from "./HighlightablePassage";
import { HintButton, MAX_HINTS } from "./HintButton";
import { QuestionNavigator } from "./QuestionNavigator";

interface DiagnosticQuestion {
  id: string;
  domain: SATDomain;
  difficulty: 1 | 2 | 3;
  conceptId: string;
  /** Italic source-attribution line shown above the passage. */
  passageIntro?: string;
  /** Long-form passage rendered in the left column when present. */
  passage?: string;
  text: string;
  options: string[];
  correct: string;
  explanation: string;
}

interface Props {
  questions: DiagnosticQuestion[];
  /** Whether the viewing user is already a paying / trialing
   *  subscriber. Drives the post-results CTA copy. */
  isSubscribed: boolean;
}

// Per-section time budgets — proportional to the real Digital SAT.
// (SAT Math: 22q in 35 min ≈ 95 s/q; R&W: 27q in 32 min ≈ 71 s/q.
//  Our diagnostic: 20 math + 15 R&W → 32 min math + 18 min R&W.)
const SECTION_SECONDS: Record<"math" | "rw", number> = {
  math: 32 * 60,
  rw: 18 * 60,
};
const SECTION_LABELS: Record<"math" | "rw", string> = {
  math: "Math",
  rw: "Reading & Writing",
};

export default function DiagnosticClient({ questions, isSubscribed }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scoring, setScoring] = useState<ScoredDiagnostic | null>(null);
  const [desmosOpen, setDesmosOpen] = useState(false);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const router = useRouter();
  // Constrain Desmos / Scratchpad drag to the diagnostic shell.
  const shellRef = useRef<HTMLDivElement>(null);

  // Per-question UI state — keyed by question id so it survives
  // navigation and resets cleanly between questions.
  const [crossedOut, setCrossedOut] = useState<Record<string, Set<string>>>({});
  const [highlightedChoices, setHighlightedChoices] = useState<Record<string, Set<string>>>({});
  const [highlights, setHighlights] = useState<Record<string, PassageHighlight[]>>({});
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  // Hint state — global counter (max 3) plus the set of question
  // ids that have already had a hint revealed (max 1 per question).
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintedQuestionIds, setHintedQuestionIds] = useState<Set<string>>(new Set());

  // Section timer — one timer per SAT section that resets when the
  // student moves into a new section. Keyed object so we can keep
  // separate countdowns running per section.
  const [sectionTime, setSectionTime] = useState<Record<"math" | "rw", number>>({
    math: SECTION_SECONDS.math,
    rw: SECTION_SECONDS.rw,
  });

  const question = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const isAnswered = selected !== null;
  const currentSection = DOMAIN_SECTION[question.domain];
  const isMathQuestion = currentSection === "math";
  const questionCrossed = crossedOut[question.id] ?? new Set<string>();
  const questionHighlightedChoices = highlightedChoices[question.id] ?? new Set<string>();
  const questionHighlights = highlights[question.id] ?? [];
  const hintShownThisQuestion = hintedQuestionIds.has(question.id);
  const isBookmarked = bookmarked.has(question.id);
  const sectionTimeLeft = sectionTime[currentSection];

  // Per-section numbering — when the test transitions from R&W
  // (now first) into Math, the visible "Question X / N" resets
  // so the student tracks their position within the section
  // rather than across the whole diagnostic.
  const sectionStartIdx = questions.findIndex(
    (q) => DOMAIN_SECTION[q.domain] === currentSection
  );
  const sectionLength = questions.filter(
    (q) => DOMAIN_SECTION[q.domain] === currentSection
  ).length;
  const sectionPosition = currentIdx - sectionStartIdx + 1;

  // Browser-level guard — warn the student if they try to close
  // the tab or hit refresh while the diagnostic is in progress.
  // Disabled once results are in (nothing more to lose).
  useEffect(() => {
    if (scoring) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Modern browsers ignore the custom string and show a generic
      // prompt — setting returnValue is what triggers it.
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [scoring]);

  function exitDiagnostic() {
    // Where to send them — paying users back to their dashboard,
    // anonymous/non-payers back to the landing page.
    const exitTarget = isSubscribed ? "/dashboard/student" : "/";
    // Replace so the back button doesn't drop them right back here.
    router.replace(exitTarget);
  }

  // ─── Section timer ────────────────────────────────────────
  // Decrement the active section's clock once per second. When the
  // section runs out, jump to the first question of the next
  // section (or submit if this was the last section). Prior section
  // budgets remain intact so the user can't "borrow" time by
  // skipping ahead — each section has its own dedicated clock.
  useEffect(() => {
    if (scoring) return;
    if (sectionTimeLeft <= 0) return;
    const interval = setInterval(() => {
      setSectionTime((prev) => {
        const cur = prev[currentSection];
        if (cur <= 1) {
          clearInterval(interval);
          // Section expired — jump past the last question of this
          // section. If R&W, that means submit.
          handleSectionExpired();
          return { ...prev, [currentSection]: 0 };
        }
        return { ...prev, [currentSection]: cur - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection, scoring]);

  function handleSectionExpired() {
    // Find the first question whose section differs from the
    // current one. If none, submit.
    const nextSectionStart = questions.findIndex(
      (q, i) => i > currentIdx && DOMAIN_SECTION[q.domain] !== currentSection
    );
    if (nextSectionStart === -1) {
      handleSubmit();
    } else {
      setCurrentIdx(nextSectionStart);
      setSelected(null);
      setShowExplanation(false);
    }
  }

  // ─── Per-question helpers ─────────────────────────────────
  function toggleCrossOut(letter: string) {
    setCrossedOut((prev) => {
      const next = new Set(prev[question.id] ?? []);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return { ...prev, [question.id]: next };
    });
  }

  function toggleHighlightChoice(letter: string) {
    setHighlightedChoices((prev) => {
      const next = new Set(prev[question.id] ?? []);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return { ...prev, [question.id]: next };
    });
  }

  function setHighlightsForQuestion(next: PassageHighlight[]) {
    setHighlights((prev) => ({ ...prev, [question.id]: next }));
  }

  function toggleBookmark() {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(question.id)) next.delete(question.id);
      else next.add(question.id);
      return next;
    });
  }

  function useHint() {
    if (hintShownThisQuestion || hintsUsed >= MAX_HINTS) return;
    setHintsUsed((n) => n + 1);
    setHintedQuestionIds((s) => new Set([...s, question.id]));
  }

  function handleSelect(option: string) {
    if (isAnswered) return;
    const letter = option.charAt(0);
    setSelected(letter);
    setAnswers((prev) => ({ ...prev, [question.id]: letter }));
    setShowExplanation(true);
  }

  async function handleSubmit() {
    setIsSubmitting(true);

    // Build answer payload — the API needs domain + difficulty +
    // conceptId so the scoring engine can do its difficulty-weighted
    // and foundation-aware analysis.
    const payload = questions.map((q) => ({
      questionId: q.id,
      selectedAnswer: answers[q.id] || "",
      domain: q.domain,
      difficulty: q.difficulty,
      conceptId: q.conceptId,
      correct: answers[q.id] === q.correct,
    }));

    try {
      const res = await fetch("/api/diagnostic/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });

      const data = (await res.json()) as { scoring?: ScoredDiagnostic; error?: string };

      if (res.ok && data.scoring) {
        setScoring(data.scoring);
      } else {
        console.error("Submit error:", data.error);
      }
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNext() {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  }

  if (scoring) {
    return (
      <DiagnosticResults
        scoring={scoring}
        totalQuestions={questions.length}
        answers={answers}
        questions={questions}
        isSubscribed={isSubscribed}
        bookmarkedIds={Array.from(bookmarked)}
      />
    );
  }

  // Section timer formatting + warning color stages.
  const totalSectionSec = SECTION_SECONDS[currentSection];
  const timerPct = (sectionTimeLeft / totalSectionSec) * 100;
  const minutesLeft = Math.floor(sectionTimeLeft / 60);
  const timerColor =
    sectionTimeLeft > 5 * 60 ? "#3B82F6"
      : sectionTimeLeft > 60   ? "#F59E0B"
      :                          "#EF4444";
  function fmtClock(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div ref={shellRef} className="relative min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Exit — opens a confirmation modal because the
                diagnostic must be completed in one session and any
                in-flight answers will be discarded. */}
            <button
              type="button"
              onClick={() => setExitConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors"
              aria-label="Exit diagnostic"
              title="Exit diagnostic (progress will be lost)"
            >
              <X className="w-3.5 h-3.5" />
              Exit
            </button>
            <div>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Question {sectionPosition} / {sectionLength}
              </span>
              <span className="ml-2 text-xs text-slate-500">SAT Diagnostic</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Calculator (Desmos) — math questions only.
                Pinkish-red active accent so it stands apart from
                the white tools to its right. */}
            {isMathQuestion && (
              <button
                type="button"
                onClick={() => setDesmosOpen((o) => !o)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                  desmosOpen
                    ? "bg-rose-500 text-white border-rose-500"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-rose-200 hover:border-rose-400 hover:text-rose-600 dark:hover:text-rose-300"
                )}
                aria-pressed={desmosOpen}
                aria-label="Toggle Desmos calculator"
              >
                <Calculator className="w-3.5 h-3.5" />
                Calculator
              </button>
            )}

            {/* Scratchpad — pristine white accent. */}
            {isMathQuestion && (
              <button
                type="button"
                onClick={() => setScratchpadOpen((o) => !o)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                  scratchpadOpen
                    ? "bg-white text-slate-900 border-white"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white hover:border-white hover:text-slate-900 hover:bg-white/90 dark:hover:bg-white dark:hover:text-slate-900"
                )}
                aria-pressed={scratchpadOpen}
                aria-label="Toggle scratchpad"
              >
                <PencilLine className="w-3.5 h-3.5" />
                Scratchpad
              </button>
            )}

            {/* Question navigator — opens a slide-in grid of all
                35 questions with status pips for jump navigation. */}
            <button
              type="button"
              onClick={() => setNavigatorOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              aria-label="Open question navigator"
              title="All questions"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Questions
            </button>

            {/* Bookmark — pristine white. Active state inverts to
                solid white so the student sees at a glance that the
                question is flagged for review. */}
            <button
              type="button"
              onClick={toggleBookmark}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                isBookmarked
                  ? "bg-white text-slate-900 border-white"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white hover:border-white hover:text-slate-900 hover:bg-white/90 dark:hover:bg-white dark:hover:text-slate-900"
              )}
              aria-pressed={isBookmarked}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark for review"}
              title={isBookmarked ? "Bookmarked — click to remove" : "Bookmark for review"}
            >
              {isBookmarked
                ? <BookmarkCheck className="w-3.5 h-3.5" />
                : <Bookmark className="w-3.5 h-3.5" />}
              {isBookmarked ? "Saved" : "Bookmark"}
            </button>

            {/* Section timer — clock for the active SAT section.
                Shows "Math 31:42" or "Reading & Writing 17:08", with
                a circular progress ring that turns amber under 5
                minutes and red under 1 minute. When the section's
                clock hits zero, we auto-advance past the last
                question of the section (or submit if R&W). */}
            <div className="flex items-center gap-2 pl-1.5 ml-1 border-l border-slate-200 dark:border-slate-800 pl-3">
              <svg width="32" height="32" className="-rotate-90">
                <circle cx="16" cy="16" r="12" strokeWidth="3" fill="none" className="stroke-slate-200 dark:stroke-slate-700" />
                <circle
                  cx="16" cy="16" r="12" strokeWidth="3" fill="none"
                  stroke={timerColor}
                  strokeLinecap="round"
                  strokeDasharray={75.4}
                  strokeDashoffset={75.4 - (timerPct / 100) * 75.4}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {SECTION_LABELS[currentSection]}
                </span>
                <span className="text-sm font-mono font-bold" style={{ color: timerColor }}>
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
        <div className="max-w-6xl mx-auto mt-2">
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(sectionPosition / sectionLength) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question — switches to split-pane when a passage is present
          (R&W convention from Bluebook: passage on the left, prompt
          + choices on the right). */}
      <div className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className={cn("w-full", question.passage ? "max-w-6xl" : "max-w-2xl")}>
          {/* Domain tag */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className="px-2.5 py-1 rounded-md text-xs font-semibold"
              style={{
                backgroundColor: DOMAIN_COLORS[question.domain as SATDomain]?.hex + "20",
                color: DOMAIN_COLORS[question.domain as SATDomain]?.hex,
              }}
            >
              {DOMAIN_LABELS[question.domain as SATDomain] || question.domain}
            </span>
            <span className="text-xs text-slate-400">
              {"★".repeat(question.difficulty)}{"☆".repeat(3 - question.difficulty)}
            </span>
          </div>

          <div className={cn(
            question.passage ? "grid lg:grid-cols-2 gap-6 lg:gap-10 items-start" : ""
          )}>
            {/* Passage column — only when passage is present. Highlight
                + annotate is wired through HighlightablePassage. */}
            {question.passage && (
              <HighlightablePassage
                passage={question.passage}
                passageIntro={question.passageIntro}
                highlights={questionHighlights}
                onChange={setHighlightsForQuestion}
              />
            )}

            {/* Prompt + answer choices column */}
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-6 leading-relaxed font-sans">
                <MathText text={question.text} />
              </h2>

              <div className="space-y-3">
                {question.options.map((option) => {
                  const letter = option.charAt(0);
                  const isSelected = selected === letter;
                  const isCorrect = letter === question.correct;
                  const isCrossed = questionCrossed.has(letter);
                  const isHighlighted = questionHighlightedChoices.has(letter);
                  const choiceBody = option.replace(/^[A-D]\)\s*/, "");
                  const choiceDisabled = isAnswered || isCrossed;

                  return (
                    <div key={option} className="group relative">
                      <button
                        onClick={() => !isCrossed && handleSelect(option)}
                        disabled={choiceDisabled}
                        className={cn(
                          "w-full text-left pl-4 pr-20 py-4 rounded-xl border-2 text-sm font-medium transition-all",
                          isCrossed && "border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/40 opacity-50 cursor-not-allowed",
                          !isCrossed && isHighlighted && !isAnswered && "border-amber-400/60 bg-amber-400/[0.06] dark:bg-amber-400/[0.08] hover:border-amber-400 hover:bg-amber-400/[0.12]",
                          !isCrossed && !isHighlighted && !isAnswered && "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20",
                          !isCrossed && isAnswered && isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20",
                          !isCrossed && isAnswered && isSelected && !isCorrect && "border-red-400 bg-red-50 dark:bg-red-900/20",
                          !isCrossed && isAnswered && !isSelected && !isCorrect && "border-slate-200 dark:border-slate-700 opacity-50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 relative",
                            !isAnswered && !isCrossed && !isHighlighted && "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
                            !isAnswered && !isCrossed && isHighlighted && "bg-amber-400/30 text-amber-700 dark:text-amber-200",
                            isCrossed && "bg-slate-200 dark:bg-slate-700/60 text-slate-400 line-through",
                            !isCrossed && isAnswered && isCorrect && "bg-emerald-500 text-white",
                            !isCrossed && isAnswered && isSelected && !isCorrect && "bg-red-400 text-white",
                          )}>
                            {!isCrossed && isAnswered && isCorrect ? <CheckCircle className="w-4 h-4" /> :
                             !isCrossed && isAnswered && isSelected ? <XCircle className="w-4 h-4" /> : letter}
                          </span>
                          <span className={cn(
                            "flex-1",
                            isCrossed && "line-through text-slate-400",
                            !isCrossed && isAnswered && isCorrect && "text-emerald-700 dark:text-emerald-300",
                            !isCrossed && isAnswered && isSelected && !isCorrect && "text-red-600 dark:text-red-400",
                            !isCrossed && isAnswered && !isSelected && !isCorrect && "text-slate-500",
                            !isCrossed && !isAnswered && "text-slate-700 dark:text-slate-200"
                          )}>
                            <MathText text={choiceBody} />
                          </span>
                        </div>
                      </button>

                      {/* Hover-revealed action icons — appear on the
                          right edge when the user hovers the choice
                          (or whenever a state is already active so
                          the indicator doesn't disappear). Two big
                          tap targets: cross-out + highlight. */}
                      <div
                        className={cn(
                          "absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-1 transition-opacity",
                          isCrossed || isHighlighted
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                        )}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleHighlightChoice(letter);
                          }}
                          aria-label={isHighlighted ? `Remove highlight from choice ${letter}` : `Highlight choice ${letter}`}
                          title={isHighlighted ? "Remove highlight" : "Highlight"}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                            isHighlighted
                              ? "bg-amber-400/20 text-amber-300"
                              : "text-slate-400 hover:bg-amber-400/15 hover:text-amber-300"
                          )}
                        >
                          <Highlighter className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCrossOut(letter);
                          }}
                          aria-label={isCrossed ? `Restore choice ${letter}` : `Cross out choice ${letter}`}
                          title={isCrossed ? "Restore choice" : "Cross out"}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                            isCrossed
                              ? "bg-rose-400/20 text-rose-300"
                              : "text-slate-400 hover:bg-rose-400/15 hover:text-rose-300"
                          )}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
            })}
          </div>

          {/* Hint reveal — shown when the student has spent a hint
              on this question. Renders the question's explanation
              before they've answered, framed as a study tip.
              Uses MathText so any $...$ in the explanation typesets
              cleanly (e.g. "$3x = 21$, so $x = 7$"). */}
          {hintShownThisQuestion && !showExplanation && (
            <div className="mt-4 p-4 rounded-xl text-sm border border-amber-400/40 bg-amber-400/[0.08] text-amber-100">
              <div className="flex items-center gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Hint</span>
              </div>
              <div className="leading-relaxed">
                <MathText text={question.explanation} />
              </div>
            </div>
          )}

          {/* Explanation */}
          {showExplanation && (
            <div className={cn(
              "mt-4 p-4 rounded-xl text-sm border",
              selected === question.correct
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700"
            )}>
              {selected !== question.correct && (
                <span className="font-bold">Correct answer: {question.correct}. </span>
              )}
              <MathText text={question.explanation} />
            </div>
          )}

          {/* Next / Submit */}
          {isAnswered && (
            <button
              onClick={handleNext}
              disabled={isSubmitting}
              className="btn-primary w-full mt-5"
            >
              {isSubmitting ? "Saving results..." : isLast ? "See My Results" : "Next Question"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

              {/* Bottom row — Hint on the left, Skip on the right
                  (when no answer chosen yet) or just Hint when
                  answered. Hint is always shown so its counter
                  is consistently visible across questions. */}
              <div className={cn(
                "mt-3 flex items-center gap-3",
                isAnswered ? "justify-start" : "justify-between"
              )}>
                <HintButton
                  used={hintsUsed}
                  alreadyOpenedOnThisQuestion={hintShownThisQuestion}
                  onUse={useHint}
                />
                {!isAnswered && (
                  <button
                    onClick={handleNext}
                    className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1.5 transition-colors py-2"
                  >
                    Skip this question
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desmos floating window — drag-constrained to the shell.
          Keyed on question.id so the calculator state resets when
          you advance to a new question, but PERSISTS across open/
          close toggles within the same question (the component
          stays mounted; only its visibility flips via CSS, so the
          internal Desmos calculator instance is preserved). */}
      {isMathQuestion && (
        <div
          key={`desmos-host-${question.id}`}
          className={desmosOpen ? "" : "hidden"}
        >
          <DesmosWindow
            onClose={() => setDesmosOpen(false)}
            constraintsRef={shellRef}
          />
        </div>
      )}

      {/* Scratchpad — same persistence pattern as Desmos. */}
      {isMathQuestion && (
        <div
          key={`scratch-host-${question.id}`}
          className={scratchpadOpen ? "" : "hidden"}
        >
          <Scratchpad
            onClose={() => setScratchpadOpen(false)}
            constraintsRef={shellRef}
          />
        </div>
      )}

      {/* Exit confirmation — discards all in-flight progress and
          routes the student away from the diagnostic. */}
      {exitConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setExitConfirmOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-diag-title"
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1026] shadow-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-300" />
              <h2 id="exit-diag-title" className="text-lg font-extrabold text-white">
                Exit the diagnostic?
              </h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              The diagnostic must be completed in one session. If you leave now, your
              answers, highlights, and bookmarks for this attempt will be{" "}
              <span className="font-semibold text-rose-300">discarded</span> and you'll
              start fresh next time.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setExitConfirmOpen(false)}
                className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06]"
              >
                Keep going
              </button>
              <button
                type="button"
                onClick={exitDiagnostic}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-sm font-semibold shadow-[0_4px_14px_rgba(244,63,94,0.4)]"
              >
                <X className="w-4 h-4" />
                Exit and discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question navigator — slide-in panel with status pips and
          jump-to-question. Mounts at top-level so its overlay
          covers the entire diagnostic shell, not just the question
          column. */}
      <QuestionNavigator
        open={navigatorOpen}
        questions={questions}
        currentIdx={currentIdx}
        answers={answers}
        bookmarkedIds={bookmarked}
        hintedIds={hintedQuestionIds}
        currentSection={currentSection}
        onClose={() => setNavigatorOpen(false)}
        onJump={(idx) => {
          // Cross-section jumps are blocked at the navigator
          // level, but defend in depth here too in case the prop
          // ever flows from another source.
          if (DOMAIN_SECTION[questions[idx].domain] !== currentSection) return;
          setCurrentIdx(idx);
          setSelected(answers[questions[idx].id] ?? null);
          setShowExplanation(false);
        }}
      />
    </div>
  );
}
