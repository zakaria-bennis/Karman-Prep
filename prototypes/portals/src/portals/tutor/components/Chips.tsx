import { useRef, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/design-system/cn";
import { Initials } from "./Initials";

/*
 * Chips: who an assignment goes to. Each chip is a pressed or unpressed
 * button; selecting grows a check in beside the label and arrow keys move
 * between chips. The chip model is ported from Chip Group (21st.dev 35042,
 * kuratlielia); its width-lag spring, height morph and "+N more" fold were
 * left out (a cohort has five students, nothing folds).
 */
export interface ChipOption {
  id: string;
  label: string;
  initial?: string;
  hue?: number;
}

export function Chips({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: ChipOption[];
  value: string[];
  onChange(next: string[]): void;
  label: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = options.length;
    const next =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? (i + 1) % n
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? (i - 1 + n) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    refs.current[next]?.focus();
  };
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o, i) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            ref={(n) => {
              refs.current[i] = n;
            }}
            type="button"
            aria-pressed={on}
            tabIndex={i === 0 ? 0 : -1}
            onClick={() => toggle(o.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "inline-flex min-h-tap items-center gap-2 rounded-pill border px-3 text-dense font-medium transition-colors",
              on
                ? "border-accent bg-accent/15 text-text"
                : "border-border/70 bg-surface text-text hover:bg-raised",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            )}
          >
            {o.initial !== undefined && o.hue !== undefined ? (
              <Initials initial={o.initial} hue={o.hue} size={24} />
            ) : null}
            <motion.span
              aria-hidden="true"
              className="grid overflow-hidden"
              initial={false}
              animate={{ width: on ? 16 : 0, opacity: on ? 1 : 0 }}
              transition={
                reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 32 }
              }
            >
              <svg
                viewBox="0 0 24 24"
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  d="M4 12.5 9.5 18 20 6.5"
                  initial={false}
                  animate={{ pathLength: on ? 1 : 0 }}
                  transition={reduce ? { duration: 0 } : { duration: 0.2 }}
                />
              </svg>
            </motion.span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
