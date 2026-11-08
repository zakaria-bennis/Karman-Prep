"use client";

/*
 * Step 1 of the post-payment questionnaire: SAT or PSAT, then the test date (founder,
 * 2026-11-07). SAT dates come from the sat_dates table; a PSAT date is set by the school, so the
 * student types it in. "Not registered yet" is always an answer. No score goal is asked
 * (founder rule: never a score goal anywhere).
 */
import { cn } from "@/lib/utils";
import {
  MAX_DAYS_AHEAD,
  addDays,
  type TestType,
} from "@/components/student-portal/account/test-dates";
import { Label } from "./shared";

export interface SatDateOption {
  iso: string;
  label: string;
}

/** The answer when the student hasn't registered for a date yet. */
export const NOT_REGISTERED = "not_registered";

const choice = (on: boolean) =>
  cn(
    "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
    on
      ? "border-info/40 bg-info text-ivory"
      : "border-ivory/10 bg-surface/[0.03] text-ivory hover:border-ivory/30"
  );

export function SatScheduleStep(props: {
  satDates: SatDateOption[];
  today: string;
  testType: TestType;
  setTestType: (v: TestType) => void;
  satTestDate: string;
  setSatTestDate: (v: string) => void;
}) {
  const { testType, satTestDate, setSatTestDate } = props;
  const psatTyped = testType === "psat" && satTestDate !== NOT_REGISTERED ? satTestDate : "";
  return (
    <div className="space-y-6">
      <div>
        <Label>Which test are you preparing for?</Label>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Test">
          {(["sat", "psat"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={testType === t}
              onClick={() => {
                if (t === testType) return;
                props.setTestType(t);
                setSatTestDate("");
              }}
              className={choice(testType === t)}
            >
              {t === "sat" ? "SAT" : "PSAT"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>
          {testType === "sat" ? "Which SAT date are you registered for?" : "When is your PSAT?"}
        </Label>
        {testType === "sat" ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {props.satDates.map((d) => (
              <button
                key={d.iso}
                type="button"
                aria-pressed={satTestDate === d.iso}
                onClick={() => setSatTestDate(d.iso)}
                className={choice(satTestDate === d.iso)}
              >
                {d.label}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="date"
            aria-label="PSAT date"
            min={props.today}
            max={addDays(props.today, MAX_DAYS_AHEAD)}
            value={psatTyped}
            onChange={(e) => setSatTestDate(e.target.value)}
            className="w-full rounded-lg border border-ivory/10 bg-surface/[0.03] px-3 py-2 text-base text-ivory"
          />
        )}
        <button
          type="button"
          aria-pressed={satTestDate === NOT_REGISTERED}
          onClick={() => setSatTestDate(NOT_REGISTERED)}
          className={cn(choice(satTestDate === NOT_REGISTERED), "mt-2 w-full")}
        >
          Not registered yet
        </button>
      </div>
    </div>
  );
}
