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

import { CalculatorScope } from "@/components/calculator/CalculatorScope";
import { makeQuestionKey } from "@/components/calculator/question-key";
import { QuestionTransition } from "@/components/learn/quiz/QuizTools";
import { ArrowRight, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOMAIN_LABELS, type SATDomain } from "@/types";
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
    s.sectionTimeLeft > 5 * 60
      ? "rgb(var(--k-info))"
      : s.sectionTimeLeft > 60
        ? "rgb(var(--k-warning))"
        : "rgb(var(--k-error))";

  return (
    <div ref={s.shellRef} className="relative flex min-h-screen flex-col bg-surface dark:bg-night">
      <CalculatorScope
        key={makeQuestionKey("diagnostic", question.id)}
        questionKey={makeQuestionKey("diagnostic", question.id)}
        enabled={s.isMathQuestion}
        open={s.desmosOpen}
        onOpenChange={s.setDesmosOpen}
      >
        <DiagnosticHeader
          isMathQuestion={s.isMathQuestion}
          scratchpadOpen={s.scratchpadOpen}
          isBookmarked={s.isBookmarked}
          currentSection={s.currentSection}
          sectionTimeLeft={s.sectionTimeLeft}
          timerColor={timerColor}
          timerPct={timerPct}
          minutesLeft={minutesLeft}
          onOpenExit={() => s.setExitConfirmOpen(true)}
          onOpenNavigator={() => s.setNavigatorOpen(true)}
          onToggleScratchpad={() => s.setScratchpadOpen((o) => !o)}
          onToggleBookmark={s.toggleBookmark}
        />

        {/* Retake notice — shown for admin-granted retakes so the
          student knows this submission will replace their baseline. */}
        {isRetake && s.currentIdx === 0 && !s.isAnswered ? (
          <div className="mx-auto mt-4 w-full max-w-2xl rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning dark:border-warning/30 dark:bg-warning/10 dark:text-warning-bright">
            <p className="font-semibold">You&rsquo;re retaking the diagnostic</p>
            <p className="mt-0.5 text-xs text-warning/80 dark:text-warning-bright/80">
              Your tutor / admin granted a retake. Submitting will create a fresh diagnostic_results
              row alongside your prior one &mdash; the progress chart will show both so you can
              measure improvement.
            </p>
          </div>
        ) : null}

        {/* Read passage, then prompt, then choices on every viewport. */}
        <QuestionTransition index={s.currentIdx}>
          <div data-question-content className="flex flex-1 items-start justify-center p-4 pt-8">
            <div className={question.passage ? "w-full max-w-6xl" : "w-full max-w-2xl"}>
              {/* Domain tag */}
              <div className="mb-4 flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-md border border-bronze bg-surface px-2.5 py-1 text-xs font-semibold",
                    s.isMathQuestion ? "text-math" : "text-rw"
                  )}
                >
                  {DOMAIN_LABELS[question.domain as SATDomain] || question.domain}
                </span>
                <span className="text-xs text-taupe">
                  {"★".repeat(question.difficulty)}
                  {"☆".repeat(3 - question.difficulty)}
                </span>
              </div>

              <div
                data-question-layout
                className={question.passage ? "grid gap-8 md:grid-cols-2" : "space-y-6"}
              >
                {question.passage && (
                  <HighlightablePassage
                    key={question.id}
                    passage={question.passage}
                    passageIntro={question.passageIntro}
                    highlights={s.questionHighlights}
                    onChange={s.setHighlightsForQuestion}
                  />
                )}

                {/* Prompt + answer choices column */}
                <div>
                  <h2 className="mb-6 font-sans text-lg font-semibold leading-relaxed text-ivory dark:text-ivory sm:text-xl">
                    <MathText text={question.text} calculator={s.isMathQuestion} />
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
                    <div className="mt-4 rounded-xl border border-warning/40 bg-warning/[0.08] p-4 text-sm text-warning-bright">
                      <div className="mb-1 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-warning-bright" />
                        <span className="text-xs font-bold uppercase tracking-widest text-warning-bright">
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
                          ? "border-success/40 bg-success/10 text-success dark:border-success/40 dark:bg-success/20 dark:text-success-bright"
                          : "border-warning/40 bg-warning/10 text-warning dark:border-warning/40 dark:bg-warning/20 dark:text-warning-bright"
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
                        className="flex items-center gap-1.5 py-2 text-sm text-taupe transition-colors hover:text-taupe dark:hover:text-ivory"
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
        </QuestionTransition>
        <div className="flex justify-center gap-4 px-4 pb-6">
          <button
            type="button"
            className="btn-secondary"
            disabled={s.currentIdx <= s.sectionStartIdx}
            onClick={() => s.jumpTo(s.currentIdx - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={s.isSubmitting}
            onClick={s.handleNext}
          >
            {s.isLast ? "See My Results" : "Next"}
          </button>
        </div>
        <Scratchpad
          pageKey={question.id}
          open={s.scratchpadOpen}
          onClose={() => s.setScratchpadOpen(false)}
          constraintsRef={s.shellRef}
        />

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
      </CalculatorScope>
    </div>
  );
}
