import type { ReactNode } from "react";
import { cn } from "../cn";
import { GlassButton } from "../glass/GlassButton";

/*
 * Stepper: onboarding in steps. The step indicator is a row of segments, not
 * numbers (no 01 02 markers); the current step's name is the heading; Back is
 * a text link and Next is the screen's one highlighted action. The shape
 * follows Step Onboarding Wizard (21st.dev 29526, ziegfiroyt); its numbered
 * boxes, badge and centred card were left out.
 */
export interface Step {
  id: string;
  title: string;
  content: ReactNode;
}

export function Stepper({
  steps,
  current,
  onChange,
  onFinish,
  nextLabel = "Continue",
  finishLabel = "Finish",
  className,
}: {
  steps: Step[];
  current: number;
  onChange(index: number): void;
  onFinish?(): void;
  nextLabel?: string;
  finishLabel?: string;
  className?: string;
}) {
  const step = steps[current];
  const last = current === steps.length - 1;
  return (
    <section
      className={cn("grid gap-5", className)}
      aria-label={`Step ${current + 1} of ${steps.length}: ${step.title}`}
    >
      <div className="flex gap-1.5" aria-hidden="true">
        {steps.map((s, i) => (
          <span
            key={s.id}
            className={cn("h-1 flex-1 rounded-pill", i <= current ? "bg-accent" : "bg-text/10")}
          />
        ))}
      </div>
      <h2 className="text-title">{step.title}</h2>
      <div>{step.content}</div>
      <div className="flex items-center justify-between gap-3">
        {current > 0 ? (
          <button
            type="button"
            onClick={() => onChange(current - 1)}
            className="-ml-2 min-h-tap min-w-tap px-2 text-body font-semibold text-accent"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        <GlassButton
          variant="primary"
          onClick={() => (last ? onFinish?.() : onChange(current + 1))}
        >
          {last ? finishLabel : nextLabel}
        </GlassButton>
      </div>
    </section>
  );
}
