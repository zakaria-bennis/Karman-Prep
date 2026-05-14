"use client";

// ============================================================
// QuestionPreview — pixel-faithful re-render of a bank question in
// the same split-view / fonts / explanation-toggle UI students see
// in QuizEngine. Driven purely by local state so admins can click
// through choices and explanations without affecting the database.
//
// Mirrors the production QuizEngine layout. Kept as a separate
// component (rather than reusing QuizEngine directly) because
// QuizEngine pulls real quiz state from useQuiz(); we don't want
// preview to thread through that pipeline.
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import MathText from "@/components/learn/MathText";
import { cn } from "@/lib/utils";
import type { QuizQuestionWithChoices, AnswerLetter } from "@/types/quiz";

const LETTERS: AnswerLetter[] = ["A", "B", "C", "D"];

export function QuestionPreview({ q }: { q: QuizQuestionWithChoices }) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);

  // Reset all preview state whenever the active question changes.
  useEffect(() => {
    setSelectedAnswer(null);
    setIsSubmitted(false);
    setShowExplanations(false);
  }, [q.id]);

  const sortedChoices = useMemo(
    () => [...q.answer_choices].sort((a, b) => (a.letter > b.letter ? 1 : -1)),
    [q]
  );
  const correctLetter = q.correct_answer;
  const hasPassage = !!(q.passage_intro || q.passage || q.passage_a || q.passage_b);
  const inExplanationMode = isSubmitted && showExplanations;
  const perChoiceMap = q.explanation_per_choice as Record<string, string | undefined> | null;

  // ── Buttons row at the bottom of the choices ─────────────────
  const choicesButtonRow = !isSubmitted ? (
    selectedAnswer ? (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 flex justify-end"
      >
        <button
          onClick={() => setIsSubmitted(true)}
          className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors"
        >
          Simulate submit
        </button>
      </motion.div>
    ) : null
  ) : !showExplanations ? (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 flex flex-wrap justify-end gap-3"
    >
      <button
        onClick={() => {
          setIsSubmitted(false);
          setSelectedAnswer(null);
        }}
        className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-sm transition-colors"
      >
        Reset
      </button>
      <button
        onClick={() => setShowExplanations(true)}
        className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-colors"
      >
        Show explanations
      </button>
    </motion.div>
  ) : null;

  // ── Choices block (renders left in explanation mode, right otherwise) ──
  const choicesBlock = q.answer_format === "numeric_entry" ? (
    <div className="mt-7">
      <input
        type="text"
        placeholder="Type your answer…"
        value={selectedAnswer ?? ""}
        onChange={(e) => !isSubmitted && setSelectedAnswer(e.target.value)}
        disabled={isSubmitted}
        className={cn(
          "w-full rounded-xl border px-5 py-4 text-[16px] text-slate-100 bg-slate-900 border-slate-700",
          "focus:outline-none focus:border-blue-500"
        )}
      />
      {isSubmitted && (
        <div className="mt-3 text-sm">
          <span className="text-slate-400">Correct answer: </span>
          <span className="font-semibold text-emerald-300">
            <MathText text={q.correct_answer} />
          </span>
          {q.numeric_tolerance ? (
            <span className="text-slate-500"> (±{q.numeric_tolerance})</span>
          ) : null}
        </div>
      )}
    </div>
  ) : (
    <div className="mt-7 space-y-3">
      {sortedChoices.map((choice) => {
        const letter = choice.letter;
        const isSelected = selectedAnswer === letter;
        const isCorrect = letter === correctLetter;
        const showCorrect = isSubmitted && isCorrect;
        const showWrong = isSubmitted && isSelected && !isCorrect;
        return (
          <button
            key={letter}
            onClick={() => !isSubmitted && setSelectedAnswer(letter)}
            disabled={isSubmitted}
            className={cn(
              "w-full text-left rounded-xl border px-5 py-3.5 transition-all",
              "flex items-start gap-4",
              !isSubmitted && "hover:border-blue-500 hover:bg-blue-500/5 cursor-pointer",
              isSelected && !isSubmitted && "border-blue-500 bg-blue-500/10",
              !isSelected && !isSubmitted && "border-slate-700 bg-slate-900",
              showCorrect && "border-emerald-500 bg-emerald-500/15",
              showWrong && "border-rose-500 bg-rose-500/15",
              isSubmitted && !isSelected && !isCorrect && "opacity-50 border-slate-800"
            )}
          >
            <span className={cn(
              "shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-[13px] mt-0.5",
              !isSubmitted && !isSelected && "bg-slate-800 text-slate-300",
              !isSubmitted && isSelected && "bg-blue-500 text-white",
              showCorrect && "bg-emerald-500 text-white",
              showWrong && "bg-rose-500 text-white",
              isSubmitted && !isSelected && !isCorrect && "bg-slate-800 text-slate-500"
            )}>
              {showCorrect ? <Check className="w-3.5 h-3.5" /> : letter}
            </span>
            <span className="text-[16px] text-slate-100 leading-[1.5] flex-1">
              <MathText text={choice.choice_text} />
            </span>
          </button>
        );
      })}
    </div>
  );

  const questionPanel = (
    <div className="max-w-xl mx-auto">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">
        {q.topic_cluster}
      </p>
      <h2 className="text-[19px] md:text-[20px] font-medium leading-[1.5] text-slate-100">
        <MathText text={q.question_text} />
      </h2>
      {choicesBlock}
      {choicesButtonRow}
    </div>
  );

  const explanationsPanel = (
    <motion.div
      key="explanations"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ duration: 0.2 }}
      className="max-w-xl mx-auto"
    >
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-4">
        Explanation
      </h3>

      {q.explanation_text && (
        <div className="mb-6 text-[16px] leading-[1.6] text-slate-100">
          <MathText text={q.explanation_text} className="whitespace-pre-wrap block" />
        </div>
      )}

      {perChoiceMap && q.answer_format === "multiple_choice" && (
        <div className="space-y-3 mb-6">
          {LETTERS.map((letter) => {
            const expl = perChoiceMap[letter];
            if (!expl) return null;
            const isCorrect = letter === correctLetter;
            const isStudentChoice = selectedAnswer === letter;
            return (
              <div
                key={letter}
                className={cn(
                  "rounded-xl border px-4 py-3 flex items-start gap-3",
                  isCorrect && "border-emerald-500/40 bg-emerald-500/5",
                  !isCorrect && isStudentChoice && "border-rose-500/40 bg-rose-500/5",
                  !isCorrect && !isStudentChoice && "border-slate-800 bg-slate-900/40"
                )}
              >
                <span className={cn(
                  "shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-[13px] mt-0.5",
                  isCorrect && "bg-emerald-500 text-white",
                  !isCorrect && isStudentChoice && "bg-rose-500 text-white",
                  !isCorrect && !isStudentChoice && "bg-slate-800 text-slate-300"
                )}>
                  {letter}
                </span>
                <div className="flex-1 text-[16px] leading-[1.5] text-slate-100">
                  {(isCorrect || isStudentChoice) && (
                    <span className={cn(
                      "inline-block text-[10px] font-bold uppercase tracking-wider mr-2 align-middle",
                      isCorrect ? "text-emerald-300" : "text-rose-300"
                    )}>
                      {isCorrect ? "Correct" : "Your answer"}
                    </span>
                  )}
                  <MathText text={expl} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {q.desmos_strategy && (
        <div className="mb-6 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300 mb-2">
            Desmos strategy
          </div>
          <div className="text-[16px] leading-[1.6] text-sky-100">
            <MathText text={q.desmos_strategy} className="whitespace-pre-wrap block" />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-slate-800/60">
        <button
          onClick={() => setShowExplanations(false)}
          className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-sm transition-colors"
        >
          Hide explanations
        </button>
      </div>
    </motion.div>
  );

  // Quiet tinted card matching the QuizEngine treatment.
  const hasFigure = !!q.image_url;
  const figureCard = hasFigure ? (
    <figure className="mb-6 rounded-xl border border-slate-700/50 bg-slate-200 p-3 shadow-md shadow-black/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={q.image_url!}
        alt={q.image_alt ?? ""}
        className="max-h-[28rem] w-auto mx-auto block object-contain rounded"
      />
    </figure>
  ) : null;

  const passageBlock = (
    <article className="max-w-prose mx-auto font-serif text-[17px] leading-[1.7] text-slate-100">
      {q.passage_a && q.passage_b ? (
        <>
          <section className="mb-7">
            <div className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
              Text 1
            </div>
            <MathText text={q.passage_a} className="whitespace-pre-wrap block" />
          </section>
          <section>
            <div className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
              Text 2
            </div>
            <MathText text={q.passage_b} className="whitespace-pre-wrap block" />
          </section>
        </>
      ) : (
        <>
          {q.passage_intro && (
            <p className="mb-5">
              <MathText text={q.passage_intro} />
            </p>
          )}
          {q.passage && (
            <MathText text={q.passage} className="whitespace-pre-wrap block" />
          )}
        </>
      )}
    </article>
  );

  // ── Layout ───────────────────────────────────────────────────
  if (hasPassage || hasFigure) {
    return (
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 min-h-[640px]">
        {/* LEFT */}
        <div className="px-6 md:px-10 py-8 overflow-y-auto max-h-[calc(100vh-13rem)]">
          {figureCard}
          {hasPassage && passageBlock}
          {inExplanationMode && (
            <div className="mt-10 pt-6 border-t border-slate-700/50">{questionPanel}</div>
          )}
        </div>
        {/* RIGHT */}
        <div className="px-6 md:px-10 py-8 overflow-y-auto max-h-[calc(100vh-13rem)]">
          <AnimatePresence mode="wait" initial={false}>
            {inExplanationMode ? explanationsPanel : (
              <motion.div
                key="question"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
              >
                {questionPanel}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (inExplanationMode) {
    return (
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 min-h-[640px]">
        <div className="px-6 md:px-10 py-8 overflow-y-auto max-h-[calc(100vh-13rem)]">
          {questionPanel}
        </div>
        <div className="px-6 md:px-10 py-8 overflow-y-auto max-h-[calc(100vh-13rem)]">
          {explanationsPanel}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      {questionPanel}
    </div>
  );
}
