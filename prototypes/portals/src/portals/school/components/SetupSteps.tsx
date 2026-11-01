import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/design-system/cn";
import { ProgressBar } from "@/design-system/components/ProgressBar";

/*
 * SetupSteps: a new school's first morning as a list of steps with the
 * progress at its true ratio. Ported from Onboarding Steps with Progress
 * (21st.dev 29458, ephraimduncan): the step list with the done ones struck
 * through and the current one outlined, the "n of m" with a bar. Its
 * numbered ids, Tabler check icon and help card were left out; the check
 * draws itself on the settle easing and the current step carries the
 * screen's one action beside it. Done steps are facts, not clicks.
 */
export interface SetupStep {
  id: string;
  label: string;
  /** Only a state (done, or waiting on someone), never a subtitle. */
  detail?: string;
  done: boolean;
  action?: { label: string; onClick(): void };
}

const CHECK = "M5 12.5L10 17.5L19 7.5";

export function SetupSteps({ steps, className }: { steps: SetupStep[]; className?: string }) {
  const reduce = useReducedMotion();
  const done = steps.filter((s) => s.done).length;
  const current = steps.find((s) => !s.done);
  return (
    <div className={cn("grid gap-3", className)}>
      <ProgressBar value={done} max={steps.length} label={`${done} of ${steps.length} done`} />
      <ol className="grid gap-2">
        {steps.map((s) => {
          const now = s === current;
          return (
            <li
              key={s.id}
              aria-current={now ? "step" : undefined}
              className={cn(
                "flex items-start gap-3 rounded-card border px-3 py-3",
                now ? "border-accent bg-raised" : "border-line"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                  s.done
                    ? "border-accent bg-accent text-accent-ink"
                    : now
                      ? "border-accent"
                      : "border-border"
                )}
              >
                {s.done ? (
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
                      d={CHECK}
                      initial={reduce ? false : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </svg>
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn("block text-body font-medium", s.done && "text-muted line-through")}
                >
                  {s.label}
                </span>
                {s.detail ? <span className="block text-dense text-muted">{s.detail}</span> : null}
              </span>
              {!s.done && s.action ? (
                <button
                  type="button"
                  onClick={s.action.onClick}
                  className="min-h-tap shrink-0 self-center text-dense font-semibold text-accent"
                >
                  {s.action.label}
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
