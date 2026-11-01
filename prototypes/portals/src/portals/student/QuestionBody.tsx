import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/design-system/cn";
import { Icon } from "@/design-system/icons";
import type { DemoQuestion } from "@/mock";
import { MathText, stripLetter } from "./math";

/*
 * The question itself: the passage in the serif face, the question line, and
 * four choices as a radio group. The choice rows are ported from Choicebox
 * (21st.dev 34718, halaska-studio: selectable rows with a title and a
 * right-aligned meta slot, role radio, one selected) with its description
 * line dropped and a Bluebook-style cross-out added on each row. The passage
 * takes the highlighter: with it on, a selection becomes a mark.
 */
const LETTERS = ["A", "B", "C", "D"];

export function QuestionBody({
  question,
  chosen,
  checked,
  highlighting,
  onSelect,
  className,
}: {
  question: DemoQuestion;
  chosen?: string;
  /** After a check: the correct letter is shown and the rows lock. */
  checked?: { correct: boolean; chosen: string };
  highlighting: boolean;
  onSelect(letter: string): void;
  className?: string;
}) {
  const passage = useRef<HTMLDivElement>(null);
  const [crossed, setCrossed] = useState<Record<string, boolean>>({});
  const rows = useRef<(HTMLButtonElement | null)[]>([]);

  const highlight = () => {
    if (!highlighting) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !passage.current) return;
    const range = sel.getRangeAt(0);
    if (!passage.current.contains(range.commonAncestorContainer)) return;
    try {
      const mark = document.createElement("mark");
      mark.className = "k-hl";
      range.surroundContents(mark);
    } catch {
      /* a selection across paragraphs is left as it is */
    }
    sel.removeAllRanges();
  };

  const onKey = (e: KeyboardEvent, i: number) => {
    const n = LETTERS.length;
    const to =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? (i + 1) % n
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? (i - 1 + n) % n
          : -1;
    if (to < 0) return;
    e.preventDefault();
    rows.current[to]?.focus();
    if (!checked) onSelect(LETTERS[to]);
  };

  return (
    <div
      className={cn(
        "grid gap-5",
        question.passage && "md:grid-cols-2 md:gap-8 md:[&>*]:min-w-0",
        className
      )}
    >
      {question.passage ? (
        <div
          ref={passage}
          data-highlighting={highlighting || undefined}
          onMouseUp={highlight}
          onTouchEnd={highlight}
          className="k-passage font-serif text-[17px] leading-[27px] text-text"
        >
          {question.passage.split("\n\n").map((p, i) => (
            <p key={i} className={i ? "mt-3" : ""}>
              <MathText text={p} />
            </p>
          ))}
        </div>
      ) : null}
      <div className="grid content-start gap-5">
        <p className="text-[17px] font-semibold leading-[26px]">
          <MathText text={question.text} />
        </p>
        <div role="radiogroup" aria-label="Answer choices" className="grid gap-2">
          {question.options.map((opt, i) => {
            const letter = LETTERS[i];
            const on = chosen === letter;
            const right = checked && letter === question.correct;
            const wrong = checked && on && !checked.correct;
            const out = crossed[letter] && !on;
            return (
              <div key={letter} className="flex items-stretch gap-1">
                <button
                  ref={(n) => {
                    rows.current[i] = n;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-disabled={checked ? true : undefined}
                  tabIndex={on || (!chosen && i === 0) ? 0 : -1}
                  onClick={() => !checked && onSelect(letter)}
                  onKeyDown={(e) => onKey(e, i)}
                  className={cn(
                    "flex min-h-12 flex-1 items-center gap-3 rounded-card border px-3 py-2.5 text-left text-body transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
                    right
                      ? "border-positive bg-positive-bg text-positive-ink"
                      : wrong
                        ? "border-negative bg-negative-bg text-negative-ink"
                        : on
                          ? "border-accent bg-accent/10"
                          : "border-line bg-raised/40 hover:border-border",
                    out && "text-muted line-through"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-dense font-semibold",
                      right
                        ? "border-positive bg-positive-bg text-positive-ink"
                        : wrong
                          ? "border-negative bg-negative-bg text-negative-ink"
                          : on
                            ? "border-accent bg-accent text-accent-ink"
                            : "border-border"
                    )}
                  >
                    {right ? (
                      <Icon name="check" size={20} />
                    ) : wrong ? (
                      <Icon name="cross" size={20} />
                    ) : (
                      letter
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <MathText text={stripLetter(opt)} />
                  </span>
                </button>
                {checked ? null : (
                  <button
                    type="button"
                    aria-label={out ? `Restore choice ${letter}` : `Cross out choice ${letter}`}
                    aria-pressed={out}
                    onClick={() => setCrossed((c) => ({ ...c, [letter]: !c[letter] }))}
                    className={cn(
                      "grid w-11 shrink-0 place-items-center rounded-card text-muted hover:text-text",
                      out && "text-text"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full border border-border text-small font-semibold",
                        out && "line-through"
                      )}
                      aria-hidden="true"
                    >
                      {letter}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
