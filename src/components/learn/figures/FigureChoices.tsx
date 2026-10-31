"use client";

// ============================================================
// FigureChoices: answer choices that are graphs, charts or shapes (figure
// engine spec §2). Each choice draws its own choice_figure_spec, never a text
// placeholder, and the four share one frame and one size (choiceScenes).
//
// Phones stack the choices one per row with the letter beside each figure;
// wider containers make a 2×2 grid when the four fit at a readable size
// (figure-choices.module.css). The whole choice is one button named
// "Choice A: <the figure's generated description>". Elimination is a sibling
// button, so it never nests inside the choice. Without onSelect the choices
// are a read-only list (review screens).
// ============================================================

import { useMemo, useRef, type KeyboardEvent } from "react";
import { Ban, Check, X } from "lucide-react";
import { choiceScenes } from "@/lib/figures/engine/choices";
import { cn } from "@/lib/utils";
import MathText from "../MathText";
import workspace from "../quiz/workspace.module.css";
import FigureView from "./FigureView";
import styles from "./figure-choices.module.css";

/** The answer-choice fields a figure choice reads (an AnswerChoice fits). */
export type FigureChoiceItem = {
  letter: string;
  /** The stored spec, unvalidated. */
  choice_figure_spec?: unknown;
  /** Shown only when the spec cannot be drawn. */
  choice_text: string;
};

type ChoiceState = "idle" | "selected" | "correct" | "incorrect" | "dimmed";

const STATE_CLASS: Record<ChoiceState, string> = {
  idle: "border-bronze bg-surface",
  selected: "border-info/40 bg-info/10",
  correct: "border-success/40 bg-success/15",
  incorrect: "border-error/40 bg-error/15",
  dimmed: "border-bronze bg-surface opacity-50",
};

const BADGE_CLASS: Record<ChoiceState, string> = {
  idle: "bg-surface-raised text-ivory/80",
  selected: "bg-ivory text-night",
  correct: "bg-success text-night",
  incorrect: "bg-error text-ivory",
  dimmed: "bg-surface-raised text-taupe",
};

const STATUS: Partial<Record<ChoiceState, string>> = {
  correct: "Correct answer",
  incorrect: "Your answer, incorrect",
};

export default function FigureChoices({
  choices,
  selected,
  onSelect,
  disabled = false,
  submitted = false,
  correctLetter,
  crossed,
  onToggleCrossed,
  accent = "info",
  serializedFunctionLines = false,
  radio = false,
  className,
}: {
  /** Every choice of the question, in letter order. */
  choices: FigureChoiceItem[];
  selected?: string | null;
  /** Picks a choice. Without it the choices are a read-only list. */
  onSelect?: (letter: string) => void;
  disabled?: boolean;
  submitted?: boolean;
  /** Known after submit: marks the correct choice and a wrong pick. */
  correctLetter?: string;
  /** Whether a choice is crossed out. */
  crossed?: (letter: string) => boolean;
  /** Shows each choice's cross-out tool. */
  onToggleCrossed?: (letter: string) => void;
  /** The selected look: the quiz's info blue, or the daily challenge's gold. */
  accent?: "info" | "gold";
  /** Math text fallback for a choice whose spec cannot be drawn. */
  serializedFunctionLines?: boolean;
  /**
   * The radio keyboard model (practice surfaces whose text choices are radios): a radiogroup
   * of role="radio" choices, one Tab stop, arrow keys move between choices, Space or Enter
   * selects. Otherwise each choice is a toggle button (the quiz screen).
   */
  radio?: boolean;
  className?: string;
}) {
  const scenes = useMemo(() => choiceScenes(choices.map((c) => c.choice_figure_spec)), [choices]);
  const interactive = !!onSelect;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const isOff = (letter: string) => disabled || submitted || !!crossed?.(letter);
  const enabled = choices.flatMap((c, i) => (isOff(c.letter) ? [] : [i]));
  // The one Tab stop of the radio group: the selected choice, else the first enabled one.
  const selectedIndex = choices.findIndex((c) => c.letter === selected);
  const tabStop = enabled.includes(selectedIndex) ? selectedIndex : (enabled[0] ?? -1);
  const onArrow = (event: KeyboardEvent, index: number) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step || enabled.length === 0) return;
    event.preventDefault();
    const at = enabled.indexOf(index);
    const next = enabled[(at + step + enabled.length) % enabled.length];
    buttons.current[next]?.focus();
  };

  return (
    <div
      data-figure-choices=""
      role={radio && interactive ? "radiogroup" : undefined}
      aria-label={radio && interactive ? "Answer choices" : undefined}
      className={cn(styles.grid, className)}
    >
      {choices.map((choice, i) => {
        const { letter } = choice;
        const scene = scenes[i];
        const isSelected = selected === letter;
        const isCrossed = !!crossed?.(letter);
        const state: ChoiceState = submitted
          ? letter === correctLetter
            ? "correct"
            : isSelected
              ? "incorrect"
              : "dimmed"
          : isSelected
            ? "selected"
            : "idle";
        const stateClass =
          state === "selected" && accent === "gold" ? "border-gold bg-gold/10" : STATE_CLASS[state];
        const status = STATUS[state];
        const what = scene ? scene.description : choice.choice_text.trim();
        const base = what ? `Choice ${letter}: ${what}` : `Choice ${letter}`;
        // The state is part of the name, so it is announced with the choice.
        const name = status ? `${base.replace(/\.$/, "")}. ${status}.` : base;
        const content = (
          <>
            {/* With elimination the column keeps room for the tool under the letter. */}
            <span className={cn(styles.letterColumn, onToggleCrossed && "min-h-[78px]")}>
              <span
                data-choice-letter=""
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold",
                  BADGE_CLASS[state]
                )}
              >
                {letter}
              </span>
              {state === "correct" && <Check aria-hidden className="h-4 w-4 text-success-bright" />}
              {state === "incorrect" && <X aria-hidden className="h-4 w-4 text-error-bright" />}
            </span>
            {scene ? (
              <span className={styles.figure}>
                <FigureView scene={scene} className="block h-auto w-full" />
              </span>
            ) : (
              <span className="min-w-0 flex-1 self-center text-[16px] leading-[1.5] text-ivory">
                <MathText
                  text={choice.choice_text}
                  serializedFunctionLines={serializedFunctionLines}
                />
              </span>
            )}
          </>
        );
        const boxClass = cn(
          "flex w-full min-w-0 items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
          stateClass,
          isCrossed && styles.crossed
        );
        return (
          <div
            key={letter}
            data-figure-choice={letter}
            data-choice-state={state}
            className="group relative min-w-0"
          >
            {interactive ? (
              <button
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                aria-label={name}
                {...(radio
                  ? {
                      role: "radio",
                      "aria-checked": isSelected,
                      tabIndex: i === tabStop ? 0 : -1,
                      onKeyDown: (event: KeyboardEvent) => onArrow(event, i),
                    }
                  : { "aria-pressed": isSelected })}
                disabled={isOff(letter)}
                onClick={() => onSelect(letter)}
                className={cn(
                  boxClass,
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info",
                  !submitted && !disabled && "cursor-pointer hover:border-info/40 hover:bg-info/5"
                )}
              >
                {content}
              </button>
            ) : (
              <div className={boxClass}>{content}</div>
            )}
            {interactive && onToggleCrossed && (
              <div className={cn(workspace.choiceTools, styles.tools)}>
                <button
                  type="button"
                  aria-label={isCrossed ? `Restore choice ${letter}` : `Cross out choice ${letter}`}
                  aria-pressed={isCrossed}
                  onClick={() => onToggleCrossed(letter)}
                  className="flex items-center justify-center text-taupe hover:text-ivory"
                >
                  <Ban size={18} />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
