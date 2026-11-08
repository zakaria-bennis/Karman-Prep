"use client";

/*
 * SAT or PSAT, then the test date (founder, 2026-11-07). SAT dates come from the sat_dates table
 * (passed in by the page); a PSAT date is set by the school, so the student types it in.
 * "Not registered yet" is always an answer.
 */
import { CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_DAYS_AHEAD,
  addDays,
  type TestType,
} from "@/components/student-portal/settings/test-dates";

const NOT_REGISTERED = "not_registered";

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const choice = (on: boolean) =>
  cn(
    "rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all",
    on
      ? "border-info/40 bg-info/10 text-info dark:bg-info/20 dark:text-info-bright"
      : "border-bronze bg-surface text-ivory hover:border-info/40 dark:border-bronze dark:bg-surface-raised/40 dark:text-ivory"
  );

export function SatStep({
  prompt,
  testType,
  onTestType,
  value,
  onChange,
  satDates,
  today,
}: {
  prompt: string;
  testType: TestType;
  onTestType: (t: TestType) => void;
  value: string;
  onChange: (v: string) => void;
  /** Upcoming SAT dates (YYYY-MM-DD). */
  satDates: string[];
  today: string;
}) {
  return (
    <div>
      <h2 className="inline-flex items-center gap-2 text-2xl font-extrabold text-ivory dark:text-ivory">
        <CalendarCheck className="h-5 w-5 text-info" /> {prompt}
      </h2>
      <div className="mt-6 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Test">
        {(["sat", "psat"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={testType === t}
            onClick={() => {
              if (t === testType) return;
              onTestType(t);
              onChange("");
            }}
            className={choice(testType === t)}
          >
            {t === "sat" ? "SAT" : "PSAT"}
          </button>
        ))}
      </div>
      {testType === "sat" ? (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {satDates.map((iso) => (
            <button
              key={iso}
              type="button"
              aria-pressed={value === iso}
              onClick={() => onChange(iso)}
              className={choice(value === iso)}
            >
              {shortDate(iso)}
            </button>
          ))}
        </div>
      ) : (
        <input
          type="date"
          aria-label="PSAT date"
          min={today}
          max={addDays(today, MAX_DAYS_AHEAD)}
          value={value === NOT_REGISTERED ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-4 w-full rounded-xl border-2 border-bronze bg-surface px-4 py-3 text-base text-ivory dark:border-bronze dark:bg-surface-raised/40"
        />
      )}
      <button
        type="button"
        aria-pressed={value === NOT_REGISTERED}
        onClick={() => onChange(NOT_REGISTERED)}
        className={cn(choice(value === NOT_REGISTERED), "mt-2 w-full italic")}
      >
        Not registered yet
      </button>
    </div>
  );
}
