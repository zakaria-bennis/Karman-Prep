"use client";

// ============================================================
// Diagnostic Assessment — 35-question timed client.
// Each question has a 90-second budget; running out auto-
// advances. Submitting on the last question posts answers
// to /api/diagnostic/submit, which returns a ScoredDiagnostic
// that drives the inline results screen.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle, XCircle, Lightbulb, Highlighter, Ban } from "lucide-react";
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
import { DiagnosticHeader } from "./parts/DiagnosticHeader";
import { ExitConfirmModal } from "./parts/ExitConfirmModal";

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
  const sectionStartIdx = questions.findIndex((q) => DOMAIN_SECTION[q.domain] === currentSection);
  const sectionLength = questions.filter((q) => DOMAIN_SECTION[q.domain] === currentSection).length;
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

  // Memoized via useCallback so the keydown effect below (which lists
  // handleNext in its deps) only re-binds the listener when an actual
  // dep changes, not on every render. handleSubmit's identity changes
  // when `questions` or `answers` changes — that's correct: the
  // listener re-binds with the fresh closure.
  const handleSubmit = useCallback(async () => {
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
  }, [questions, answers]);

  const handleNext = useCallback(() => {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setShowExplanation(false);
    }
  }, [isLast, handleSubmit]);

  // Keyboard shortcuts:
  //   Escape — close calculator / scratchpad (whichever is open).
  //   Enter  — advance to the next question once an answer is picked
  //            (mirrors what the on-screen primary button does, so a
  //            student doesn't have to scroll past the explanation
  //            on long questions to click "Next Question").
  // Guards:
  //   · isEditable — when focus is in an input / textarea / contenteditable
  //     (e.g. the annotation editor textarea, which has its own Escape
  //     handler), we leave the key alone so the focused element wins.
  //   · Modal-open checks for Enter — Enter inside the exit confirm or
  //     question navigator overlays would feel like the overlay is
  //     submitting; bail.
  useEffect(() => {
    if (scoring) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (isEditable) return;

      if (e.key === "Escape") {
        if (desmosOpen || scratchpadOpen) {
          e.preventDefault();
          if (desmosOpen) setDesmosOpen(false);
          if (scratchpadOpen) setScratchpadOpen(false);
        }
        return;
      }

      if (e.key === "Enter") {
        if (exitConfirmOpen || navigatorOpen || desmosOpen || scratchpadOpen) return;
        if (!isAnswered || isSubmitting) return;
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    scoring,
    desmosOpen,
    scratchpadOpen,
    exitConfirmOpen,
    navigatorOpen,
    isAnswered,
    isSubmitting,
    handleNext,
  ]);

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

  // Section timer warning color stages.
  const totalSectionSec = SECTION_SECONDS[currentSection];
  const timerPct = (sectionTimeLeft / totalSectionSec) * 100;
  const minutesLeft = Math.floor(sectionTimeLeft / 60);
  const timerColor =
    sectionTimeLeft > 5 * 60 ? "#3B82F6" : sectionTimeLeft > 60 ? "#F59E0B" : "#EF4444";

  return (
    <div
      ref={shellRef}
      className="relative flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950"
    >
      <DiagnosticHeader
        sectionPosition={sectionPosition}
        sectionLength={sectionLength}
        isMathQuestion={isMathQuestion}
        desmosOpen={desmosOpen}
        scratchpadOpen={scratchpadOpen}
        isBookmarked={isBookmarked}
        currentSection={currentSection}
        sectionTimeLeft={sectionTimeLeft}
        timerColor={timerColor}
        timerPct={timerPct}
        minutesLeft={minutesLeft}
        onOpenExit={() => setExitConfirmOpen(true)}
        onOpenNavigator={() => setNavigatorOpen(true)}
        onToggleDesmos={() => setDesmosOpen((o) => !o)}
        onToggleScratchpad={() => setScratchpadOpen((o) => !o)}
        onToggleBookmark={toggleBookmark}
      />

      {/* Question — switches to split-pane when a passage is present
          (R&W convention from Bluebook: passage on the left, prompt
          + choices on the right). */}
      <div className="flex flex-1 items-start justify-center p-4 pt-8">
        <div className={cn("w-full", question.passage ? "max-w-6xl" : "max-w-2xl")}>
          {/* Domain tag */}
          <div className="mb-4 flex items-center gap-2">
            <span
              className="rounded-md px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: DOMAIN_COLORS[question.domain as SATDomain]?.hex + "20",
                color: DOMAIN_COLORS[question.domain as SATDomain]?.hex,
              }}
            >
              {DOMAIN_LABELS[question.domain as SATDomain] || question.domain}
            </span>
            <span className="text-xs text-slate-400">
              {"★".repeat(question.difficulty)}
              {"☆".repeat(3 - question.difficulty)}
            </span>
          </div>

          <div
            className={cn(
              question.passage ? "grid items-start gap-6 lg:grid-cols-2 lg:gap-10" : ""
            )}
          >
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
              <h2 className="mb-6 font-sans text-lg font-semibold leading-relaxed text-slate-900 dark:text-white sm:text-xl">
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
                              isCrossed &&
                                "bg-slate-200 text-slate-400 line-through dark:bg-slate-700/60",
                              !isCrossed && isAnswered && isCorrect && "bg-emerald-500 text-white",
                              !isCrossed &&
                                isAnswered &&
                                isSelected &&
                                !isCorrect &&
                                "bg-red-400 text-white"
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
                              !isCrossed &&
                                isAnswered &&
                                isCorrect &&
                                "text-emerald-700 dark:text-emerald-300",
                              !isCrossed &&
                                isAnswered &&
                                isSelected &&
                                !isCorrect &&
                                "text-red-600 dark:text-red-400",
                              !isCrossed &&
                                isAnswered &&
                                !isSelected &&
                                !isCorrect &&
                                "text-slate-500",
                              !isCrossed && !isAnswered && "text-slate-700 dark:text-slate-200"
                            )}
                          >
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
                            toggleHighlightChoice(letter);
                          }}
                          aria-label={
                            isHighlighted
                              ? `Remove highlight from choice ${letter}`
                              : `Highlight choice ${letter}`
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
                            toggleCrossOut(letter);
                          }}
                          aria-label={
                            isCrossed ? `Restore choice ${letter}` : `Cross out choice ${letter}`
                          }
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
                })}
              </div>

              {/* Hint reveal — shown when the student has spent a hint
              on this question. Renders the question's explanation
              before they've answered, framed as a study tip.
              Uses MathText so any $...$ in the explanation typesets
              cleanly (e.g. "$3x = 21$, so $x = 7$"). */}
              {hintShownThisQuestion && !showExplanation && (
                <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/[0.08] p-4 text-sm text-amber-100">
                  <div className="mb-1 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-300" />
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
                      Hint
                    </span>
                  </div>
                  <div className="leading-relaxed">
                    <MathText text={question.explanation} />
                  </div>
                </div>
              )}

              {/* Explanation */}
              {showExplanation && (
                <div
                  className={cn(
                    "mt-4 rounded-xl border p-4 text-sm",
                    selected === question.correct
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                  )}
                >
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
                  className="btn-primary mt-5 w-full"
                >
                  {isSubmitting ? "Saving results..." : isLast ? "See My Results" : "Next Question"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {/* Bottom row — Hint on the left, Skip on the right
                  (when no answer chosen yet) or just Hint when
                  answered. Hint is always shown so its counter
                  is consistently visible across questions. */}
              <div
                className={cn(
                  "mt-3 flex items-center gap-3",
                  isAnswered ? "justify-start" : "justify-between"
                )}
              >
                <HintButton
                  used={hintsUsed}
                  alreadyOpenedOnThisQuestion={hintShownThisQuestion}
                  onUse={useHint}
                />
                {!isAnswered && (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1.5 py-2 text-sm text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Skip this question
                    <ArrowRight className="h-3.5 w-3.5" />
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
        <div key={`desmos-host-${question.id}`} className={desmosOpen ? "" : "hidden"}>
          <DesmosWindow onClose={() => setDesmosOpen(false)} constraintsRef={shellRef} />
        </div>
      )}

      {/* Scratchpad — same persistence pattern as Desmos. */}
      {isMathQuestion && (
        <div key={`scratch-host-${question.id}`} className={scratchpadOpen ? "" : "hidden"}>
          <Scratchpad onClose={() => setScratchpadOpen(false)} constraintsRef={shellRef} />
        </div>
      )}

      <ExitConfirmModal
        open={exitConfirmOpen}
        onKeepGoing={() => setExitConfirmOpen(false)}
        onExit={exitDiagnostic}
      />

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
