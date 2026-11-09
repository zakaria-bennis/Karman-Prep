"use client";

/* SAT or PSAT, and the test date. SAT dates come from the list; a PSAT date is typed in. */
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { actionSaveTest } from "@/app/dashboard/student/settings/actions";
import { MAX_DAYS_AHEAD, addDays, formatTestDate, type TestType } from "./test-dates";
import s from "./settings.module.css";

const NONE = "none";

export default function TestForm({
  initialType,
  initialDate,
  satDates,
  today,
  locked,
}: {
  initialType: TestType | null;
  initialDate: string | null;
  /** Upcoming SAT dates (YYYY-MM-DD). */
  satDates: string[];
  today: string;
  /** Why changes are off (an admin previewing), or null. */
  locked: string | null;
}) {
  const router = useRouter();
  const id = useId();
  const startType: TestType = initialType ?? "sat";
  const [type, setType] = useState<TestType>(startType);
  const [satChoice, setSatChoice] = useState(
    startType === "sat" && initialDate && satDates.includes(initialDate) ? initialDate : NONE
  );
  const [psatDate, setPsatDate] = useState(startType === "psat" && initialDate ? initialDate : "");
  const [psatNone, setPsatNone] = useState(startType === "psat" && !initialDate);
  const [status, setStatus] = useState<{ tone: "good" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const chosenDate =
    type === "sat" ? (satChoice === NONE ? null : satChoice) : psatNone ? null : psatDate || null;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return setStatus({ tone: "error", text: locked });
    if (type === "psat" && !psatNone && !psatDate) {
      return setStatus({ tone: "error", text: "Pick your PSAT date, or tick Not registered yet." });
    }
    setStatus(null);
    start(async () => {
      const r = await actionSaveTest({ testType: type, testDate: chosenDate });
      if (!r.ok) return setStatus({ tone: "error", text: r.error });
      setStatus({ tone: "good", text: `Saved: ${r.summary}.` });
      router.refresh();
    });
  }

  return (
    <form className={s.form} onSubmit={save} noValidate>
      <fieldset className={s.choice}>
        <legend className={s.label}>Which test?</legend>
        {(["sat", "psat"] as const).map((t) => (
          <label key={t} className={s.option}>
            <input
              type="radio"
              name={`${id}-type`}
              value={t}
              checked={type === t}
              onChange={() => {
                setType(t);
                setStatus(null);
              }}
            />
            {t === "sat" ? "SAT" : "PSAT"}
          </label>
        ))}
      </fieldset>

      {type === "sat" ? (
        <label className={s.field}>
          <span className={s.label}>Test date</span>
          <select
            className={s.input}
            value={satChoice}
            onChange={(e) => {
              setSatChoice(e.target.value);
              setStatus(null);
            }}
          >
            <option value={NONE}>Not registered yet</option>
            {satDates.map((d) => (
              <option key={d} value={d}>
                {formatTestDate(d)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className={s.field}>
          <label className={s.label} htmlFor={`${id}-psat`}>
            Test date
          </label>
          <input
            id={`${id}-psat`}
            className={s.input}
            type="date"
            min={today}
            max={addDays(today, MAX_DAYS_AHEAD)}
            value={psatDate}
            disabled={psatNone}
            onChange={(e) => {
              setPsatDate(e.target.value);
              setStatus(null);
            }}
          />
          <label className={s.check}>
            <input
              type="checkbox"
              checked={psatNone}
              onChange={(e) => {
                setPsatNone(e.target.checked);
                setStatus(null);
              }}
            />
            Not registered yet
          </label>
        </div>
      )}

      <div className={s.actions}>
        <button type="submit" className={s.button} disabled={pending}>
          {pending ? "Saving" : "Save"}
        </button>
        {status && (
          <p className={s.status} data-tone={status.tone} role="status">
            {status.text}
          </p>
        )}
      </div>
    </form>
  );
}
