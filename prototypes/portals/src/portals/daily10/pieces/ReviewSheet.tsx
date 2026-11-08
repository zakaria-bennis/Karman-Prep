import { Sheet } from "@/design-system/components/Sheet";
import { Icon } from "@/design-system/icons";
import { MathText, stripLetter } from "../../student/math";
import type { Answer } from "../mock";

/*
 * One question from today's set, opened from a path dot or the review row: the
 * passage and stem in the question face, the four choices with the right one
 * marked, the explanation, and a link to the next missed one. The text is set
 * by the student portal's MathText (read-only import): inline math in the
 * serif face, and a fill-in blank as one solid underline (rule 55).
 */
export function ReviewSheet({
  answer,
  misses,
  onClose,
  onPick,
}: {
  answer: Answer | null;
  misses: number[];
  onClose(): void;
  onPick(n: number): void;
}) {
  const a = answer;
  const next = a ? (misses.find((n) => n > a.n) ?? misses.find((n) => n !== a.n)) : undefined;
  return (
    <Sheet open={a !== null} onClose={onClose} title={a ? `Question ${a.n}` : "Question"}>
      {a ? (
        <div className="grid gap-4">
          <p className={`text-dense font-semibold ${a.ok ? "text-positive" : "text-negative"}`}>
            {a.ok ? "Right" : "Missed"}
            <span className="font-normal text-muted">
              {" "}
              {a.q.section}, {a.q.skill.toLowerCase()}
            </span>
          </p>
          {a.q.passage ? (
            <p className="font-serif text-[16px] leading-[1.6]">
              <MathText text={a.q.passage} />
            </p>
          ) : null}
          <p className="font-serif text-[16px] leading-[1.6]">
            <MathText text={a.q.text} />
          </p>
          <ol className="grid gap-2" aria-label="Choices">
            {a.q.options.map((o) => {
              const letter = o.charAt(0);
              const right = letter === a.q.correct;
              return (
                <li
                  key={letter}
                  className={`flex items-center gap-3 rounded-card border px-3 py-2 text-body ${
                    right ? "border-positive bg-positive-bg text-positive-ink" : "border-line"
                  }`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[13px] font-semibold">
                    {letter}
                  </span>
                  <span className="flex-1">
                    <MathText text={stripLetter(o)} />
                  </span>
                  {right ? <Icon name="check" size={20} label="Right answer" /> : null}
                </li>
              );
            })}
          </ol>
          <div>
            <h3 className="text-section">Why</h3>
            <p className="mt-1 text-body text-muted">
              <MathText text={a.q.explanation} />
            </p>
          </div>
          {next !== undefined && next !== a.n ? (
            <button
              type="button"
              onClick={() => onPick(next)}
              className="inline-flex min-h-tap items-center gap-1 self-start font-semibold text-accent underline-offset-4 hover:underline"
            >
              Next missed, question {next}
              <Icon name="chevronRight" size={20} />
            </button>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
