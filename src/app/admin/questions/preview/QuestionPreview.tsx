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
import QuestionTable from "@/components/learn/QuestionTable";
import ChartFigure from "@/components/learn/ChartFigure";
import GeometryFigure from "@/components/learn/GeometryFigure";
import { cn } from "@/lib/utils";
import type { QuizQuestionWithChoices, AnswerLetter } from "@/types/quiz";
import { EditableMathText } from "./EditableMathText";
import { EditedChip } from "@/components/admin/EditedChip";

const LETTERS: AnswerLetter[] = ["A", "B", "C", "D"];

/** Optional inline-edit hooks. When provided, the question, passage,
 *  and explanation texts become click-to-edit. The history chip
 *  appears next to fields listed in `editedFields`. */
export interface PreviewEditProps {
  questionId: string;
  editedFields: Set<string>;
  onSave: (field: string, value: string) => Promise<void>;
}

export function QuestionPreview({
  q,
  edit,
}: {
  q: QuizQuestionWithChoices;
  edit?: PreviewEditProps;
}) {
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
          className="rounded-xl bg-info px-8 py-3 text-sm font-bold text-ivory transition-colors hover:bg-info-bright"
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
        className="rounded-xl border border-bronze bg-surface-raised px-6 py-3 text-sm font-semibold text-ivory transition-colors hover:bg-surface-raised"
      >
        Reset
      </button>
      <button
        onClick={() => setShowExplanations(true)}
        className="rounded-xl bg-info px-8 py-3 text-sm font-bold text-ivory transition-colors hover:bg-info-bright"
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
            "w-full rounded-xl border border-bronze bg-surface px-5 py-4 text-[16px] text-ivory",
            "focus:border-info/40 focus:outline-none"
          )}
        />
        {isSubmitted && (
          <div className="mt-3 text-sm">
            <span className="text-taupe">Correct answer: </span>
            <span className="font-semibold text-success-bright">
              <MathText text={q.correct_answer} />
            </span>
            {q.numeric_tolerance ? (
              <span className="text-taupe"> (±{q.numeric_tolerance})</span>
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
                !isSubmitted && "cursor-pointer hover:border-info/40 hover:bg-info/5",
                isSelected && !isSubmitted && "border-info/40 bg-info/10",
                !isSelected && !isSubmitted && "border-bronze bg-surface",
                showCorrect && "border-success/40 bg-success/15",
                showWrong && "border-error/40 bg-error/15",
                isSubmitted && !isSelected && !isCorrect && "border-bronze opacity-50"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                  !isSubmitted && !isSelected && "bg-surface-raised text-ivory",
                  !isSubmitted && isSelected && "bg-info text-ivory",
                  showCorrect && "bg-success text-night",
                  showWrong && "bg-error text-ivory",
                  isSubmitted && !isSelected && !isCorrect && "bg-surface-raised text-taupe"
                )}
              >
                {showCorrect ? <Check className="h-3.5 w-3.5" /> : letter}
              </span>
              <span className="flex-1 text-[16px] leading-[1.5] text-ivory">
                <MathText text={choice.choice_text} />
              </span>
            </button>
          );
        })}
      </div>
    );

  const questionPanel = (
    <div className="mx-auto max-w-xl">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
        {q.topic_cluster}
      </p>
      <h2 className="text-[19px] font-medium leading-[1.5] text-ivory md:text-[20px]">
        {edit ? (
          <>
            <EditableMathText
              value={q.question_text ?? ""}
              onSave={(v) => edit.onSave("question_text", v)}
            />
            <FieldChip edit={edit} field="question_text" />
          </>
        ) : (
          <MathText text={q.question_text} />
        )}
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
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
        Explanation
      </h3>

      {(edit || q.explanation_text) && (
        <div className="mb-6 text-[16px] leading-[1.6] text-ivory">
          {edit ? (
            <>
              <EditableMathText
                value={q.explanation_text ?? ""}
                onSave={(v) => edit.onSave("explanation_text", v)}
                className="block whitespace-pre-wrap"
              />
              <FieldChip edit={edit} field="explanation_text" />
            </>
          ) : (
            <MathText text={q.explanation_text} className="block whitespace-pre-wrap" />
          )}
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
                  isCorrect && "border-success/40 bg-success/5",
                  !isCorrect && isStudentChoice && "border-error/40 bg-error/5",
                  !isCorrect && !isStudentChoice && "border-bronze bg-surface/40"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold",
                    isCorrect && "bg-success text-night",
                    !isCorrect && isStudentChoice && "bg-error text-ivory",
                    !isCorrect && !isStudentChoice && "bg-surface-raised text-ivory"
                  )}
                >
                  {letter}
                </span>
                <div className="flex-1 text-[16px] leading-[1.5] text-ivory">
                  {(isCorrect || isStudentChoice) && (
                    <span
                      className={cn(
                        "mr-2 inline-block align-middle text-[10px] font-bold uppercase tracking-wider",
                        isCorrect ? "text-success-bright" : "text-error-bright"
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

      {(edit || q.desmos_strategy) && (
        <div className="mb-6 rounded-xl border border-info/30 bg-info/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-info-bright">
            Desmos strategy
            {edit && <FieldChip edit={edit} field="desmos_strategy" />}
          </div>
          <div className="text-[16px] leading-[1.6] text-info-bright">
            {edit ? (
              <EditableMathText
                value={q.desmos_strategy ?? ""}
                onSave={(v) => edit.onSave("desmos_strategy", v)}
                className="block whitespace-pre-wrap"
                allowEmpty
                placeholder="(no Desmos strategy — click to add)"
              />
            ) : (
              <MathText text={q.desmos_strategy ?? ""} className="block whitespace-pre-wrap" />
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3 border-t border-bronze/60 pt-2">
        <button
          onClick={() => setShowExplanations(false)}
          className="rounded-xl border border-bronze bg-surface-raised px-6 py-3 text-sm font-semibold text-ivory transition-colors hover:bg-surface-raised"
        >
          Hide explanations
        </button>
      </div>
    </motion.div>
  );

  // Figure card — mirror the student QuizEngine's native-figure dispatch
  // exactly so preview shows what a student actually sees:
  //   figure_kind='table'     → QuestionTable (HTML)
  //   figure_kind='chart'     → ChartFigure (SVG)
  //   figure_kind='geometric' → GeometryFigure (SVG, post-gate)
  //   else                    → the raster image_url screenshot.
  const isNativeTable = q.figure_kind === "table" && q.figure_table_data;
  const isNativeChart = q.figure_kind === "chart" && q.figure_chart_data;
  const isNativeGeometry = q.figure_kind === "geometric" && q.figure_geometry_data;
  const hasFigure = !!q.image_url || isNativeTable || isNativeChart || isNativeGeometry;
  const figureCard = isNativeTable ? (
    <div className="mb-6 flex justify-center">
      <QuestionTable data={q.figure_table_data!} />
    </div>
  ) : isNativeChart ? (
    <div className="mb-6 flex justify-center">
      <ChartFigure
        data={q.figure_chart_data!}
        subject={q.subject ?? null}
        alt={q.image_alt ?? undefined}
        className="max-w-2xl"
      />
    </div>
  ) : isNativeGeometry ? (
    <div className="mb-6 flex justify-center">
      <GeometryFigure data={q.figure_geometry_data!} className="max-w-2xl" />
    </div>
  ) : q.image_url ? (
    <figure className="mb-6 rounded-xl border border-bronze/50 bg-surface p-3 shadow-md shadow-black/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={q.image_url}
        alt={q.image_alt ?? ""}
        className="mx-auto block max-h-[28rem] w-auto rounded object-contain"
      />
    </figure>
  ) : null;

  const passageBlock = (
    <article className="mx-auto max-w-prose font-serif text-[17px] leading-[1.7] text-ivory">
      {q.passage_a && q.passage_b ? (
        <>
          <section className="mb-7">
            <div className="mb-2 flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-taupe">
              Text 1{edit && <FieldChip edit={edit} field="passage_a" />}
            </div>
            {edit ? (
              <EditableMathText
                value={q.passage_a ?? ""}
                onSave={(v) => edit.onSave("passage_a", v)}
                className="block whitespace-pre-wrap"
              />
            ) : (
              <MathText text={q.passage_a} className="block whitespace-pre-wrap" />
            )}
          </section>
          <section>
            <div className="mb-2 flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-taupe">
              Text 2{edit && <FieldChip edit={edit} field="passage_b" />}
            </div>
            {edit ? (
              <EditableMathText
                value={q.passage_b ?? ""}
                onSave={(v) => edit.onSave("passage_b", v)}
                className="block whitespace-pre-wrap"
              />
            ) : (
              <MathText text={q.passage_b} className="block whitespace-pre-wrap" />
            )}
          </section>
        </>
      ) : (
        <>
          {(edit || q.passage_intro) && (
            <p className="mb-5">
              {edit ? (
                <>
                  <EditableMathText
                    value={q.passage_intro ?? ""}
                    onSave={(v) => edit.onSave("passage_intro", v)}
                    allowEmpty
                    placeholder="(no passage intro — click to add)"
                  />
                  <FieldChip edit={edit} field="passage_intro" />
                </>
              ) : (
                <MathText text={q.passage_intro ?? ""} />
              )}
            </p>
          )}
          {(edit || q.passage) &&
            (edit ? (
              <>
                <EditableMathText
                  value={q.passage ?? ""}
                  onSave={(v) => edit.onSave("passage", v)}
                  className="block whitespace-pre-wrap"
                  allowEmpty
                  placeholder="(no passage — click to add)"
                />
                <FieldChip edit={edit} field="passage" />
              </>
            ) : (
              <MathText text={q.passage ?? ""} className="block whitespace-pre-wrap" />
            ))}
        </>
      )}
    </article>
  );

  // ── Layout ───────────────────────────────────────────────────
  if (hasPassage || hasFigure) {
    return (
      <div className="grid min-h-[640px] divide-y divide-bronze md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* LEFT */}
        <div className="max-h-[calc(100vh-13rem)] overflow-y-auto px-6 py-8 md:px-10">
          {figureCard}
          {hasPassage && passageBlock}
          {inExplanationMode && (
            <div className="mt-10 border-t border-bronze/50 pt-6">{questionPanel}</div>
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
      <div className="grid min-h-[640px] divide-y divide-bronze md:grid-cols-2 md:divide-x md:divide-y-0">
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

/** Small wrapper so callers don't need to thread questionId / editedFields
 *  through every chip site — just `<FieldChip edit={edit} field="…" />`. */
function FieldChip({ edit, field }: { edit: PreviewEditProps; field: string }) {
  if (!edit.editedFields.has(field)) return null;
  return (
    <span className="ml-2 align-middle">
      <EditedChip questionId={edit.questionId} fieldKey={field} fieldLabel={field} />
    </span>
  );
}
