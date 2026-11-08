import { useId, useRef, type KeyboardEvent } from "react";
import { cn } from "../cn";

/** Underline tabs on a full-width 1px rule; a 2px accent indicator as wide as the label. */
export function Tabs({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: { id: string; label: string; count?: number }[];
  value: string;
  onChange(id: string): void;
  label: string;
  className?: string;
}) {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = tabs.length;
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % n
        : e.key === "ArrowLeft"
          ? (i - 1 + n) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    refs.current[next]?.focus();
    onChange(tabs[next].id);
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex gap-5 overflow-x-auto border-b border-line [scrollbar-width:none]",
        className
      )}
    >
      {tabs.map((t, i) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            ref={(n) => {
              refs.current[i] = n;
            }}
            id={`${id}-${t.id}`}
            role="tab"
            type="button"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "relative -mb-px min-h-tap whitespace-nowrap px-0.5 py-2 text-dense font-semibold transition-colors",
              on ? "text-text" : "text-muted hover:text-text",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent after:transition-opacity after:ease-k",
              on ? "after:opacity-100" : "after:opacity-0"
            )}
          >
            {t.label}
            {t.count !== undefined ? (
              <span className="tabular ml-1.5 text-muted">{t.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
