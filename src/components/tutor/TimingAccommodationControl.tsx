"use client";
import { useRouter } from "next/navigation";
import "./student-detail.css";
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
    <fieldset className="kp-st-timing">
      <legend className="kp-meta">Timed sections</legend>
      <div className="kp-st-actions" role="radiogroup" aria-label="Timed sections">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={current === o.value}
            disabled={pending}
            className="kp-st-btn"
            data-tone={current === o.value ? "on" : undefined}
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
        <p role="alert" className="kp-msg" data-tone="error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
