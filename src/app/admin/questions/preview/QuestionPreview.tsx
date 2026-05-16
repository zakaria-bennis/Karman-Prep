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
          className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
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
        className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700"
      >
        Reset
      </button>
      <button
        onClick={() => setShowExplanations(true)}
        className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
      >
        Show explanations
      </button>
    </motion.div>
  ) : null;

  // ── Choices block (renders left in explanation mode, right otherwise) ──
  const choicesBlock =
    q.answer_format === "numeric_entry" ? (
      <div className="mt-7">
        <input
          type="text"
          placeholder="Type your answer…"
          value={selectedAnswer ?? ""}
          onChange={(e) => !isSubmitted && setSelectedAnswer(e.target.value)}
          disabled={isSubmitted}
          className={cn(
            "w-full rounded-xl border border-slate-700 bg-slate-900 px-5 py-4 text-[16px] text-slate-100",
            "focus:border-blue-500 focus:outline-none"
          )}
        />
        {isSubmitted && (
          <div className="mt-3 text-sm">
            <span className="text-slate-400">Correct answer: </span>
            <span className="font-semibold text-emerald-300">
              <MathText text={q.correct_answer} />
            </span>
            {q.numeric_tolerance ? (
              <span className="text-slate-400"> (±{q.numeric_tolerance})</span>
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
                "w-full rounded-xl border px-5 py-3.5 text-left transition-all",
                "flex items-start gap-4",
                !isSubmitted && "cursor-pointer hover:border-blue-500 hover:bg-blue-500/5",
                isSelected && !isSubmitted && "border-blue-500 bg-blue-500/10",
                !isSelected && !isSubmitted && "border-slate-700 bg-slate-900",
                showCorrect && "border-emerald-500 bg-emerald-500/15",
                showWrong && "border-rose-500 bg-rose-500/15",
                isSubmitted && !isSelected && !isCorrect && "border-slate-800 opacity-50"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                  !isSubmitted && !isSelected && "bg-slate-800 text-slate-300",
                  !isSubmitted && isSelected && "bg-blue-500 text-white",
                  showCorrect && "bg-emerald-500 text-white",
                  showWrong && "bg-rose-500 text-white",
                  isSubmitted && !isSelected && !isCorrect && "bg-slate-800 text-slate-400"
                )}
              >
                {showCorrect ? <Check className="h-3.5 w-3.5" /> : letter}
              </span>
              <span className="flex-1 text-[16px] leading-[1.5] text-slate-100">
                <MathText text={choice.choice_text} />
              </span>
            </button>
          );
        })}
      </div>
    );

  const questionPanel = (
    <div className="mx-auto max-w-xl">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {q.topic_cluster}
      </p>
      <h2 className="text-[19px] font-medium leading-[1.5] text-slate-100 md:text-[20px]">
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
      className="mx-auto max-w-xl"
    >
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Explanation
      </h3>

      {q.explanation_text && (
        <div className="mb-6 text-[16px] leading-[1.6] text-slate-100">
          <MathText text={q.explanation_text} className="block whitespace-pre-wrap" />
        </div>
      )}

      {perChoiceMap && q.answer_format === "multiple_choice" && (
        <div className="mb-6 space-y-3">
          {LETTERS.map((letter) => {
            const expl = perChoiceMap[letter];
            if (!expl) return null;
            const isCorrect = letter === correctLetter;
            const isStudentChoice = selectedAnswer === letter;
            return (
              <div
                key={letter}
                className={cn(
                  "flex items-start gap-3 rounded-xl border px-4 py-3",
                  isCorrect && "border-emerald-500/40 bg-emerald-500/5",
                  !isCorrect && isStudentChoice && "border-rose-500/40 bg-rose-500/5",
                  !isCorrect && !isStudentChoice && "border-slate-800 bg-slate-900/40"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                    isCorrect && "bg-emerald-500 text-white",
                    !isCorrect && isStudentChoice && "bg-rose-500 text-white",
                    !isCorrect && !isStudentChoice && "bg-slate-800 text-slate-300"
                  )}
                >
                  {letter}
                </span>
                <div className="flex-1 text-[16px] leading-[1.5] text-slate-100">
                  {(isCorrect || isStudentChoice) && (
                    <span
                      className={cn(
                        "mr-2 inline-block align-middle text-[10px] font-bold uppercase tracking-wider",
                        isCorrect ? "text-emerald-300" : "text-rose-300"
                      )}
                    >
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
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
            Desmos strategy
          </div>
          <div className="text-[16px] leading-[1.6] text-sky-100">
            <MathText text={q.desmos_strategy} className="block whitespace-pre-wrap" />
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-800/60 pt-2">
        <button
          onClick={() => setShowExplanations(false)}
          className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700"
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
        className="mx-auto block max-h-[28rem] w-auto rounded object-contain"
      />
    </figure>
  ) : null;

  const passageBlock = (
    <article className="mx-auto max-w-prose font-serif text-[17px] leading-[1.7] text-slate-100">
      {q.passage_a && q.passage_b ? (
        <>
          <section className="mb-7">
            <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Text 1
            </div>
            <MathText text={q.passage_a} className="block whitespace-pre-wrap" />
          </section>
          <section>
            <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Text 2
            </div>
            <MathText text={q.passage_b} className="block whitespace-pre-wrap" />
          </section>
        </>
      ) : (
        <>
          {q.passage_intro && (
            <p className="mb-5">
              <MathText text={q.passage_intro} />
            </p>
          )}
          {q.passage && <MathText text={q.passage} className="block whitespace-pre-wrap" />}
        </>
      )}
    </article>
  );

  // ── Layout ───────────────────────────────────────────────────
  if (hasPassage || hasFigure) {
    return (
      <div className="grid min-h-[640px] divide-y divide-slate-800 md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* LEFT */}
        <div className="max-h-[calc(100vh-13rem)] overflow-y-auto px-6 py-8 md:px-10">
          {figureCard}
          {hasPassage && passageBlock}
          {inExplanationMode && (
            <div className="mt-10 border-t border-slate-700/50 pt-6">{questionPanel}</div>
          )}
        </div>
        {/* RIGHT */}
        <div className="max-h-[calc(100vh-13rem)] overflow-y-auto px-6 py-8 md:px-10">
          <AnimatePresence mode="wait" initial={false}>
            {inExplanationMode ? (
              explanationsPanel
            ) : (
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
      <div className="grid min-h-[640px] divide-y divide-slate-800 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="max-h-[calc(100vh-13rem)] overflow-y-auto px-6 py-8 md:px-10">
          {questionPanel}
        </div>
        <div className="max-h-[calc(100vh-13rem)] overflow-y-auto px-6 py-8 md:px-10">
          {explanationsPanel}
        </div>
      </div>
    );
  }

  return <div className="mx-auto max-w-3xl px-6 py-8">{questionPanel}</div>;
}
