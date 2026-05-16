"use client";

// ============================================================
// Diagnostic Assessment — 35-question timed client.
// Each question has a 90-second budget; running out auto-
// advances. Submitting on the last question posts answers
// to /api/diagnostic/submit, which returns a ScoredDiagnostic
// that drives the inline results screen.
//
// State + handlers live in ./_hooks/useDiagnosticState — this
// file owns rendering only. The big answer-choice button moved
// to ./parts/AnswerChoiceButton. Audit M1 split.
// ============================================================

import { ArrowRight, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS, DOMAIN_LABELS, type SATDomain } from "@/types";
import DesmosWindow from "@/components/learn/DesmosWindow";
import Scratchpad from "@/components/learn/Scratchpad";
import MathText from "@/components/learn/MathText";
import DiagnosticResults from "./DiagnosticResults";
import { HighlightablePassage } from "./HighlightablePassage";
import { HintButton } from "./HintButton";
import { QuestionNavigator } from "./QuestionNavigator";
import { DiagnosticHeader } from "./parts/DiagnosticHeader";
import { ExitConfirmModal } from "./parts/ExitConfirmModal";
import { AnswerChoiceButton } from "./parts/AnswerChoiceButton";
import {
  useDiagnosticState,
  SECTION_SECONDS,
  type DiagnosticQuestion,
} from "./_hooks/useDiagnosticState";

interface Props {
  questions: DiagnosticQuestion[];
  /** Whether the viewing user is already a paying / trialing
   *  subscriber. Drives the post-results CTA copy. */
  isSubscribed: boolean;
  /** True when the student is taking the diagnostic for a SECOND+
   *  time (admin granted a retake). Drives the intro copy to make
   *  clear this submission will replace their prior baseline. */
  isRetake?: boolean;
}

export default function DiagnosticClient({ questions, isSubscribed, isRetake }: Props) {
  const s = useDiagnosticState({ questions, isSubscribed });

  if (s.scoring) {
    return (
      <DiagnosticResults
        scoring={s.scoring}
        totalQuestions={questions.length}
        answers={s.answers}
        questions={questions}
        isSubscribed={isSubscribed}
        bookmarkedIds={Array.from(s.bookmarked)}
      />
    );
  }

  const { question } = s;
  const totalSectionSec = SECTION_SECONDS[s.currentSection];
  const timerPct = (s.sectionTimeLeft / totalSectionSec) * 100;
  const minutesLeft = Math.floor(s.sectionTimeLeft / 60);
  const timerColor =
    s.sectionTimeLeft > 5 * 60 ? "#3B82F6" : s.sectionTimeLeft > 60 ? "#F59E0B" : "#EF4444";

  return (
    <div
      ref={s.shellRef}
      className="relative flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950"
    >
      <DiagnosticHeader
        sectionPosition={s.sectionPosition}
        sectionLength={s.sectionLength}
        isMathQuestion={s.isMathQuestion}
        desmosOpen={s.desmosOpen}
        scratchpadOpen={s.scratchpadOpen}
        isBookmarked={s.isBookmarked}
        currentSection={s.currentSection}
        sectionTimeLeft={s.sectionTimeLeft}
        timerColor={timerColor}
        timerPct={timerPct}
        minutesLeft={minutesLeft}
        onOpenExit={() => s.setExitConfirmOpen(true)}
        onOpenNavigator={() => s.setNavigatorOpen(true)}
        onToggleDesmos={() => s.setDesmosOpen((o) => !o)}
        onToggleScratchpad={() => s.setScratchpadOpen((o) => !o)}
        onToggleBookmark={s.toggleBookmark}
      />

      {/* Retake notice — shown for admin-granted retakes so the
          student knows this submission will replace their baseline. */}
      {isRetake && s.currentIdx === 0 && !s.isAnswered ? (
        <div className="mx-auto mt-4 w-full max-w-2xl rounded-lg border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
          <p className="font-semibold">You&rsquo;re retaking the diagnostic</p>
          <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/80">
            Your tutor / admin granted a retake. Submitting will create a fresh diagnostic_results
            row alongside your prior one &mdash; the progress chart will show both so you can
            measure improvement.
          </p>
        </div>
      ) : null}

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
            {question.passage && (
              <HighlightablePassage
                passage={question.passage}
                passageIntro={question.passageIntro}
                highlights={s.questionHighlights}
                onChange={s.setHighlightsForQuestion}
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
                  return (
                    <AnswerChoiceButton
                      key={option}
                      option={option}
                      correctLetter={question.correct}
                      isAnswered={s.isAnswered}
                      isSelected={s.selected === letter}
                      isCrossed={s.questionCrossed.has(letter)}
                      isHighlighted={s.questionHighlightedChoices.has(letter)}
                      onSelect={() => s.handleSelect(option)}
                      onToggleCrossOut={() => s.toggleCrossOut(letter)}
                      onToggleHighlight={() => s.toggleHighlightChoice(letter)}
                    />
                  );
                })}
              </div>

              {/* Hint reveal — shown when the student has spent a hint
                  on this question. Renders the question's explanation
                  before they've answered, framed as a study tip. */}
              {s.hintShownThisQuestion && !s.showExplanation && (
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

              {/* Explanation (post-answer) */}
              {s.showExplanation && (
                <div
                  className={cn(
                    "mt-4 rounded-xl border p-4 text-sm",
                    s.selected === question.correct
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                  )}
                >
                  {s.selected !== question.correct && (
                    <span className="font-bold">Correct answer: {question.correct}. </span>
                  )}
                  <MathText text={question.explanation} />
                </div>
              )}

              {/* Next / Submit */}
              {s.isAnswered && (
                <button
                  onClick={s.handleNext}
                  disabled={s.isSubmitting}
                  className="btn-primary mt-5 w-full"
                >
                  {s.isSubmitting
                    ? "Saving results..."
                    : s.isLast
                      ? "See My Results"
                      : "Next Question"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              {/* Bottom row — Hint on the left, Skip on the right
                  (when no answer chosen yet) or just Hint when
                  answered. */}
              <div
                className={cn(
                  "mt-3 flex items-center gap-3",
                  s.isAnswered ? "justify-start" : "justify-between"
                )}
              >
                <HintButton
                  used={s.hintsUsed}
                  alreadyOpenedOnThisQuestion={s.hintShownThisQuestion}
                  onUse={s.useHint}
                />
                {!s.isAnswered && (
                  <button
                    onClick={s.handleNext}
                    className="flex items-center gap-1.5 py-2 text-sm text-slate-400 transition-colors hover:text-slate-400 dark:hover:text-slate-300"
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
          close toggles within the same question. */}
      {s.isMathQuestion && (
        <div key={`desmos-host-${question.id}`} className={s.desmosOpen ? "" : "hidden"}>
          <DesmosWindow onClose={() => s.setDesmosOpen(false)} constraintsRef={s.shellRef} />
        </div>
      )}

      {s.isMathQuestion && (
        <div key={`scratch-host-${question.id}`} className={s.scratchpadOpen ? "" : "hidden"}>
          <Scratchpad onClose={() => s.setScratchpadOpen(false)} constraintsRef={s.shellRef} />
        </div>
      )}

      <ExitConfirmModal
        open={s.exitConfirmOpen}
        onKeepGoing={() => s.setExitConfirmOpen(false)}
        onExit={s.exitDiagnostic}
      />

      <QuestionNavigator
        open={s.navigatorOpen}
        questions={questions}
        currentIdx={s.currentIdx}
        answers={s.answers}
        bookmarkedIds={s.bookmarked}
        hintedIds={s.hintedQuestionIds}
        currentSection={s.currentSection}
        onClose={() => s.setNavigatorOpen(false)}
        onJump={s.jumpTo}
      />
    </div>
  );
}
