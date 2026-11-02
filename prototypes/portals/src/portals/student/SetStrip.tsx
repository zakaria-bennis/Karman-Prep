import { useEffect, useRef, useState } from "react";
import { cn } from "@/design-system/cn";
import { Icon } from "@/design-system/icons";
import { formatClock } from "@/design-system/components/Timer";

/*
 * The question-set indicator (rule 56): one square a question, right in the
 * accent, wrong in the negative colour, the current one ringed, the rest
 * empty. It is the student portal's own mark: the same strip sits on Home as
 * today's set and on the end screen as the set that just finished.
 */
export type CellState = "right" | "wrong" | "current" | "todo" | "answered" | "flagged";

export function SetStrip({
  cells,
  size = "md",
  label = "Questions",
  onPick,
  className,
}: {
  cells: CellState[];
  size?: "sm" | "md";
  label?: string;
  /** A test module lets the student jump to a question. */
  onPick?(index: number): void;
  className?: string;
}) {
  const last = useRef<CellState[]>(cells);
  const just = cells.findIndex((c, i) => c !== last.current[i] && (c === "right" || c === "wrong"));
  useEffect(() => {
    last.current = cells;
  });
  const px = size === "sm" ? 10 : 14;
  const right = cells.filter((c) => c === "right").length;
  const wrong = cells.filter((c) => c === "wrong").length;
  return (
    <div
      className={cn("flex flex-wrap items-center gap-1", className)}
      role="group"
      aria-label={`${label}: ${right} right, ${wrong} wrong, ${cells.length} in all`}
    >
      {cells.map((c, i) => {
        const cls = cn(
          "k-cell rounded-[3px]",
          c === "right" && "bg-accent",
          c === "wrong" && "bg-negative",
          c === "answered" && "bg-text/55",
          c === "flagged" && "border-2 border-notice bg-transparent",
          c === "todo" && "bg-text/[0.14]",
          c === "current" && "border-2 border-accent bg-transparent"
        );
        const style = { width: px, height: px };
        return onPick ? (
          <button
            key={i}
            type="button"
            aria-label={`Question ${i + 1}, ${c}`}
            aria-current={c === "current" ? "step" : undefined}
            onClick={() => onPick(i)}
            className="grid h-11 w-11 min-w-11 place-items-center rounded-control focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
          >
            <span className={cls} style={style} data-just={i === just || undefined} />
          </button>
        ) : (
          <span
            key={i}
            aria-hidden="true"
            className={cls}
            style={style}
            data-just={i === just || undefined}
          />
        );
      })}
    </div>
  );
}

/** Elapsed time for an untimed set, in tabular figures, with a face that hides (rule 56). */
export function Stopwatch({
  running = true,
  hiddenByDefault = false,
  className,
}: {
  running?: boolean;
  hiddenByDefault?: boolean;
  className?: string;
}) {
  const [s, setS] = useState(0);
  const [hidden, setHidden] = useState(hiddenByDefault);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setS((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      role="timer"
      aria-label={hidden ? "Timer hidden" : `${formatClock(s)} elapsed`}
    >
      <span className="tabular text-dense font-semibold" aria-hidden={hidden}>
        {hidden ? "" : formatClock(s)}
      </span>
      <button
        type="button"
        onClick={() => setHidden((v) => !v)}
        aria-pressed={hidden}
        aria-label={hidden ? "Show timer" : "Hide timer"}
        className="grid h-11 w-11 min-w-11 place-items-center rounded-control text-muted hover:text-text"
      >
        <Icon name={hidden ? "eye" : "eyeOff"} size={20} />
      </button>
    </div>
  );
}
