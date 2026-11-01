import { Sheet } from "@/design-system/components/Sheet";
import { cn } from "@/design-system/cn";
import type { CellState } from "./SetStrip";
import { TextLink } from "./Shell";

/*
 * "Go to question": the phone's way to jump inside a test module, as Bluebook
 * does. The strip above the question stays compact (10px cells, two rows) and
 * this sheet holds the 44px numbered cells: answered filled, flagged ringed in
 * the notice colour, the current one ringed in the accent. Finishing the
 * module early lives here too, so the pinned bar keeps one primary.
 */
export function JumpSheet({
  open,
  onClose,
  cells,
  onPick,
  onFinish,
  last,
}: {
  open: boolean;
  onClose(): void;
  cells: CellState[];
  onPick(index: number): void;
  onFinish(): void;
  /** The last question is already in view: the bar's primary finishes the module. */
  last: boolean;
}) {
  const answered = cells.filter((c) => c === "answered").length;
  const flagged = cells.filter((c) => c === "flagged").length;
  return (
    <Sheet open={open} onClose={onClose} title="Go to question" done="Close">
      <p className="pb-3 text-dense text-muted">
        <span className="tabular">{answered}</span> of{" "}
        <span className="tabular">{cells.length}</span> answered
        {flagged ? `, ${flagged} marked for review` : ""}
      </p>
      <div role="group" aria-label="Questions" className="grid grid-cols-6 gap-1.5 sm:grid-cols-7">
        {cells.map((c, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Question ${i + 1}, ${c === "todo" ? "not answered" : c}`}
            aria-current={c === "current" ? "step" : undefined}
            onClick={() => {
              onPick(i);
              onClose();
            }}
            className={cn(
              "tabular grid h-11 min-w-11 place-items-center rounded-control border text-dense font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              c === "answered" && "border-transparent bg-text/55 text-panel",
              c === "flagged" && "border-2 border-notice text-text",
              c === "current" && "border-2 border-accent text-text",
              c === "todo" && "border-line text-text"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {last ? null : (
        <div className="pt-4">
          <TextLink
            onClick={() => {
              onClose();
              onFinish();
            }}
          >
            Finish module now
          </TextLink>
        </div>
      )}
    </Sheet>
  );
}
