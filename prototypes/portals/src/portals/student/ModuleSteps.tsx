import { cn } from "@/design-system/cn";

/*
 * The test's five steps as a row of segments: Reading and Writing 1 and 2,
 * the break, Math 1 and 2. Ported from Progress Bar Stepper (21st.dev 29801,
 * sean0205, stepper.tsx: a role tablist of items whose indicator is a bar that
 * fills when completed); its numbered triggers, keyboard jumping and the
 * unused button file were left out, since a test module is never skipped
 * back to. The current step's name is written once under the bars.
 */
export const TEST_STEPS = [
  { id: "rw1", label: "Reading and Writing, module 1" },
  { id: "rw2", label: "Reading and Writing, module 2" },
  { id: "break", label: "Break" },
  { id: "m1", label: "Math, module 1" },
  { id: "m2", label: "Math, module 2" },
] as const;
export type TestStepId = (typeof TEST_STEPS)[number]["id"];

export function ModuleSteps({
  current,
  className,
}: {
  current: TestStepId | "done";
  className?: string;
}) {
  const at = current === "done" ? TEST_STEPS.length : TEST_STEPS.findIndex((s) => s.id === current);
  return (
    <div className={cn("grid gap-2", className)}>
      <div
        role="tablist"
        aria-label="Test steps"
        aria-orientation="horizontal"
        className="flex gap-1.5"
      >
        {TEST_STEPS.map((s, i) => {
          const state = i < at ? "completed" : i === at ? "active" : "inactive";
          return (
            <span
              key={s.id}
              role="tab"
              aria-selected={state === "active"}
              aria-disabled="true"
              aria-label={`${s.label}, ${state}`}
              data-state={state}
              className={cn(
                "h-1.5 rounded-pill",
                s.id === "break" ? "w-6 shrink-0" : "flex-1",
                state === "completed" && "bg-accent",
                state === "active" && "bg-accent/45",
                state === "inactive" && "bg-text/10"
              )}
            />
          );
        })}
      </div>
      <p className="text-dense text-muted">
        {current === "done" ? "Test finished" : TEST_STEPS[at].label}
        <span className="tabular">
          {" "}
          ({Math.min(at + 1, TEST_STEPS.length)} of {TEST_STEPS.length})
        </span>
      </p>
    </div>
  );
}
