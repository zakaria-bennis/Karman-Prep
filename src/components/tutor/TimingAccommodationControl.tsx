"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { actionSetTimingAccommodation } from "@/app/tutor/timing-actions";
import type { TimingAccommodation } from "@/lib/quiz/timer";

const OPTIONS: { value: TimingAccommodation; label: string }[] = [
  { value: "standard", label: "Standard time" },
  { value: "time_and_half", label: "Time and a half" },
  { value: "double", label: "Double time" },
];

/** Extra time for timed sections, the diagnostic and full tests. */
export function TimingAccommodationControl({
  studentClerkId,
  value,
}: {
  studentClerkId: string;
  value: TimingAccommodation;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <fieldset className="mt-3">
      <legend className="text-xs font-semibold text-[color:var(--mute)]">Timed sections</legend>
      <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label="Timed sections">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={current === o.value}
            disabled={pending}
            className={`min-h-11 rounded-lg border px-3 text-sm font-semibold ${
              current === o.value
                ? "border-[color:var(--info)] bg-[color-mix(in_srgb,var(--info)_10%,transparent)] text-[color:var(--ink)]"
                : "border-[color:var(--line)] text-[color:var(--mute)]"
            }`}
            onClick={() =>
              start(async () => {
                setError("");
                try {
                  await actionSetTimingAccommodation({ studentClerkId, value: o.value });
                  setCurrent(o.value);
                  router.refresh();
                } catch {
                  setError("That did not save. Try again.");
                }
              })
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-sm text-[color:var(--late)]">
          {error}
        </p>
      )}
    </fieldset>
  );
}
