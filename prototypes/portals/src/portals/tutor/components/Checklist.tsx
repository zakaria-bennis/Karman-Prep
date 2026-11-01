import { useId, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/design-system/cn";
import { SPRINGS } from "@/design-system/motion";

/*
 * Checklist: the briefing's "what to cover", ticked during the session. The
 * row is ported from Task Checkbox (21st.dev 29942, arihantcodes): the fill
 * scales in on a spring, the check draws itself, the label is struck through;
 * the per-tick confetti and the emerald were left out (one celebration per
 * screen, when the list completes). The remaining counter and the completion
 * state follow Sprint Task Checklist (21st.dev 24947, cnippet); its priority
 * badges and Reset button were not needed.
 */
const CHECK = "M5 12.5L10 17.5L19 7.5";
const spring = { type: "spring", stiffness: 500, damping: 30 } as const;

export function CheckItem({
  id,
  checked,
  onToggle,
  label,
  detail,
  leading,
}: {
  id: string;
  checked: boolean;
  onToggle(): void;
  label: ReactNode;
  detail?: ReactNode;
  leading?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const labelId = useId();
  return (
    <div className="flex min-h-12 items-start gap-3 py-2">
      <motion.button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-labelledby={labelId}
        onClick={onToggle}
        whileTap={reduce ? undefined : { scale: 0.9 }}
        transition={spring}
        className="relative -m-2 grid h-11 w-11 shrink-0 place-items-center rounded-card focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
        data-item={id}
      >
        <motion.span
          className={cn(
            "relative grid h-6 w-6 place-items-center overflow-hidden rounded-control border transition-colors duration-200",
            checked ? "border-accent" : "border-border"
          )}
          initial={false}
          animate={checked && !reduce ? { scale: [1, 0.9, 1.05, 1] } : { scale: 1 }}
          transition={
            checked && !reduce
              ? { duration: 0.4, times: [0, 0.3, 0.7, 1], ease: "easeOut" }
              : { duration: 0.15 }
          }
        >
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 bg-accent"
            initial={false}
            animate={{ scale: checked ? 1 : 0 }}
            transition={
              reduce ? { duration: 0 } : checked ? spring : { duration: 0.15, ease: "easeOut" }
            }
          />
          <svg
            viewBox="0 0 24 24"
            className="relative h-5 w-5 text-accent-ink"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <motion.path
              d={CHECK}
              initial={false}
              animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : checked
                    ? {
                        pathLength: { delay: 0.06, duration: 0.2, ease: "easeOut" },
                        opacity: { delay: 0.06, duration: 0.01 },
                      }
                    : { duration: 0.1 }
              }
            />
          </svg>
        </motion.span>
      </motion.button>
      {leading ? <span className="mt-0.5 shrink-0">{leading}</span> : null}
      <button
        type="button"
        onClick={onToggle}
        className="min-w-0 flex-1 text-left"
        tabIndex={-1}
        aria-hidden="true"
      >
        <span
          id={labelId}
          className={cn(
            "relative block w-fit max-w-full text-body font-medium transition-colors",
            checked ? "text-muted" : "text-text"
          )}
        >
          {label}
          <motion.span
            aria-hidden="true"
            className="absolute left-0 right-0 top-1/2 h-px bg-muted"
            style={{ transformOrigin: checked ? "0% 50%" : "100% 50%" }}
            initial={false}
            animate={{ scaleX: checked ? 1 : 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: checked ? 0.25 : 0.15, ease: [0.22, 1, 0.36, 1] }
            }
          />
        </span>
        {detail ? <span className="block text-dense text-muted">{detail}</span> : null}
      </button>
    </div>
  );
}

export function ChecklistHead({
  done,
  total,
  title,
}: {
  done: number;
  total: number;
  title: string;
}) {
  const all = total > 0 && done === total;
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-section">{title}</h2>
      <motion.span
        key={all ? "all" : "count"}
        initial={false}
        animate={{ opacity: 1 }}
        className={cn(
          "tabular shrink-0 whitespace-nowrap text-dense",
          all ? "font-semibold text-positive" : "text-muted"
        )}
        transition={{ duration: SPRINGS.settle.response }}
        aria-live="polite"
      >
        {all ? `All ${total} covered` : `${total - done} of ${total} left`}
      </motion.span>
    </div>
  );
}
