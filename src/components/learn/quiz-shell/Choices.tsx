"use client";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalculatorChoiceAction,
  CalculatorTableAction,
} from "@/components/calculator/CalculatorSourceAction";
import { useCalculator } from "@/components/calculator/CalculatorScope";
import { useMemo, useState } from "react";
import { describeChoiceTable } from "@/lib/question-bank/choice-table";
import { hasFigureChoices, withSpecTables } from "@/lib/figures/engine/choice-routing";
import type { StudentQuizQuestion } from "@/types/quiz";
import MathText from "../MathText";
import QuestionTable from "../QuestionTable";
import FigureChoices from "../figures/FigureChoices";
import { useSpecParser } from "../figures/engine-loader";
import styles from "./pane.module.css";
import ink from "./ink.module.css";
import { CrossIcon, TickIcon } from "./icons";
import { BOUNCE, useShellMotion, useStateTransition } from "./motion";
import { usePencil } from "./pencil-context";

export type ChoiceState = {
  answer: string | null;
  crossedOut: string[];
  /** Set once graded or in review: the correct letter. */
  correct: string | null;
  locked: boolean;
};

/** A wrong pick shakes like a head saying no: quick, then smaller each time, then still. */
const SHAKE = [0, -8, 7, -5, 3, -1, 0];
/** A right pick lifts a little and settles back into place. */
const LIFT = [0, -5, 0];
const LIFT_SCALE = [1, 1.018, 1];

function suffix(letter: string, s: ChoiceState): string {
  if (s.correct === letter) return ", correct answer";
  if (s.correct && s.answer === letter) return ", your answer";
  if (s.crossedOut.includes(letter)) return ", crossed out";
  return "";
}

/** Answer choices as one radio group, with the eliminator and calculator Transfer per choice. */
export function Choices({
  q,
  state,
  eliminatorOn,
  onPick,
  onCross,
  pickOffer = null,
}: {
  q: StudentQuizQuestion;
  state: ChoiceState;
  eliminatorOn: boolean;
  onPick(letter: string): void;
  onCross(letter: string): void;
  /** A letter the student circled with the pencil: offer it, never pick it (spec: "Pick C?"). */
  pickOffer?: string | null;
}) {
  const hasCalculator = useCalculator() !== null;
  const { reduced } = useShellMotion();
  // Answer feedback plays when the answer is graded in front of the student, not when a graded
  // question is opened again in review (each question mounts its own choices).
  const [gradedAtMount] = useState(() => !!state.correct);
  const live = !reduced && !gradedAtMount;
  // No press squash while the pencil is writing across the choices.
  const pencilOn = !!usePencil()?.pencilOn;
  const strike = useStateTransition();
  // A table choice_figure_spec takes the table-choice path; drawn ones the figure grid.
  const parse = useSpecParser(q);
  const choices = useMemo(
    () =>
      withSpecTables(
        [...q.answer_choices].sort((a, b) => (a.letter > b.letter ? 1 : -1)),
        parse
      ),
    [q.answer_choices, parse]
  );
  const figureChoices = useMemo(() => hasFigureChoices(choices, parse), [choices, parse]);
  const tables = choices.length > 0 && choices.every((c) => c.choice_table_data);
  const stem = { text: q.question_text, serializedFunctionLines: q.subject === "math" };

  if (figureChoices) {
    return (
      <FigureChoices
        radio
        choices={choices}
        selected={state.answer}
        onSelect={(letter) => !state.locked && onPick(letter)}
        disabled={state.locked}
        submitted={!!state.correct}
        correctLetter={state.correct ?? undefined}
        crossed={(letter) => state.crossedOut.includes(letter)}
        onToggleCrossed={eliminatorOn && !state.locked ? onCross : undefined}
        serializedFunctionLines={q.subject === "math"}
      />
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Answer choices"
      className={tables ? styles.tableChoices : styles.choices}
    >
      {choices.map((c) => {
        const letter = c.letter;
        const selected = state.answer === letter;
        const crossed = state.crossedOut.includes(letter);
        const isCorrect = state.correct === letter;
        const isWrong = !!state.correct && selected && !isCorrect;
        const disabled = state.locked;
        const pick = () => !disabled && !crossed && onPick(letter);
        const crossButton = eliminatorOn && !state.locked && (
          <button
            type="button"
            className={styles.cross}
            aria-label={crossed ? `Restore choice ${letter}` : `Cross out choice ${letter}`}
            onClick={() => onCross(letter)}
          >
            {crossed ? "Undo" : <s>{letter}</s>}
          </button>
        );
        const mark = isCorrect ? (
          <span className={styles.mark}>
            <TickIcon />
          </span>
        ) : isWrong ? (
          <span className={`${styles.mark} ${styles.markWrong}`}>
            <CrossIcon />
          </span>
        ) : null;

        if (c.choice_table_data) {
          const table = c.choice_table_data;
          return (
            <div
              key={letter}
              data-ink-choice={letter}
              className={`${styles.tableChoice} ${crossed ? styles.crossed : ""} ${
                isCorrect ? styles.correct : isWrong ? styles.wrong : ""
              }`}
            >
              <div
                className={styles.tableChoiceHead}
                data-calculator-cluster={hasCalculator ? "" : undefined}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={disabled || crossed}
                  className={styles.choice}
                  style={{ flex: "0 1 auto", minHeight: 44 }}
                  onClick={pick}
                >
                  <span data-choice-badge className={styles.badge}>
                    <span className={styles.badgeLetter}>{letter}</span>
                  </span>
                  <span className={styles.srOnly}>
                    <MathText text={describeChoiceTable(table)} />
                    {suffix(letter, state)}
                  </span>
                </button>
                {mark}
                <span className={styles.spacer} />
                {crossButton}
                {
                  <CalculatorTableAction
                    slot="cluster"
                    rows={table.rows}
                    headers={table.header_row ?? undefined}
                    itemId={`choice:${letter}`}
                  />
                }
              </div>
              <div className={styles.tableScroll} onClick={pick}>
                <QuestionTable
                  data={table}
                  ariaLabel={`Choice ${letter} data table`}
                  className="my-2 w-auto max-w-full shadow-none"
                />
              </div>
            </div>
          );
        }

        return (
          <div key={letter} className={styles.choiceRow} data-ink-choice={letter}>
            <motion.button
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              className={`${styles.choice} ${crossed ? styles.crossed : ""} ${
                isCorrect ? styles.correct : isWrong ? styles.wrong : ""
              }`}
              onClick={pick}
              whileTap={disabled || reduced || pencilOn ? undefined : { scale: 0.985 }}
              animate={
                isWrong && live
                  ? { x: SHAKE }
                  : isCorrect && selected && live
                    ? { y: LIFT, scale: LIFT_SCALE }
                    : { x: 0, y: 0, scale: 1 }
              }
              // A spring cannot run a keyframe list: the shake and the lift are short tweens.
              transition={
                isWrong && live
                  ? { x: { type: "tween", duration: 0.5, ease: "easeOut" } }
                  : isCorrect && selected && live
                    ? { type: "tween", duration: 0.55, times: [0, 0.35, 1], ease: "easeOut" }
                    : BOUNCE
              }
            >
              {isCorrect && live && (
                // A ring of the right colour washes out from the right answer: at once when it
                // was the student's pick, a beat after the shake when it shows what was right.
                <motion.span
                  className={styles.ripple}
                  aria-hidden="true"
                  initial={{ opacity: 0.7, scale: 0.97 }}
                  animate={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.75, ease: "easeOut", delay: selected ? 0.05 : 0.4 }}
                />
              )}
              <span data-choice-badge className={styles.badge}>
                <AnimatePresence>
                  {selected && (
                    <motion.span
                      className={styles.badgeFill}
                      initial={reduced ? { opacity: 0 } : { scale: 0 }}
                      animate={reduced ? { opacity: 1 } : { scale: 1 }}
                      exit={reduced ? { opacity: 0 } : { scale: 0 }}
                      transition={BOUNCE}
                    />
                  )}
                </AnimatePresence>
                <span className={styles.badgeLetter}>{letter}</span>
              </span>
              <span className={styles.choiceText}>
                <MathText text={c.choice_text} serializedFunctionLines={q.subject === "math"} />
                <span className={styles.srOnly}>{suffix(letter, state)}</span>
              </span>
              {mark}
              <motion.span
                className={styles.strike}
                aria-hidden="true"
                initial={false}
                animate={{ scaleX: crossed ? 1 : 0 }}
                transition={strike}
              />
            </motion.button>
            <AnimatePresence>
              {pickOffer === letter && !state.locked && !crossed && (
                <motion.button
                  type="button"
                  className={ink.pick}
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, x: -8 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={reduced ? { duration: 0.15 } : BOUNCE}
                  onClick={() => onPick(letter)}
                >
                  Pick {letter}?
                </motion.button>
              )}
            </AnimatePresence>
            {(crossButton || hasCalculator) && (
              <div
                className={styles.tools}
                data-calculator-cluster={hasCalculator ? "" : undefined}
              >
                {crossButton}
                {q.subject === "math" && (
                  <CalculatorChoiceAction text={c.choice_text} letter={letter} stem={stem} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
