"use client";

import { cn } from "@/lib/utils";
import { Label, COMMON_TZ } from "./shared";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
const TIMES = ["morning", "afternoon", "evening"] as const;

export function AvailabilityStep(props: {
  availableDays: string[];
  setAvailableDays: (v: string[]) => void;
  availableTimes: string[];
  setAvailableTimes: (v: string[]) => void;
  timeZone: string;
  setTimeZone: (v: string) => void;
}) {
  function toggleDay(d: string) {
    props.setAvailableDays(
      props.availableDays.includes(d)
        ? props.availableDays.filter((x) => x !== d)
        : [...props.availableDays, d]
    );
  }
  function toggleTime(t: string) {
    props.setAvailableTimes(
      props.availableTimes.includes(t)
        ? props.availableTimes.filter((x) => x !== t)
        : [...props.availableTimes, t]
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <Label>Which days are you available?</Label>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-7">
          {DAYS.map((d) => {
            const on = props.availableDays.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-[11px] font-semibold capitalize transition-colors",
                  on
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30"
                )}
              >
                {d.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>What times work for you?</Label>
        <div className="grid grid-cols-3 gap-2">
          {TIMES.map((t) => {
            const on = props.availableTimes.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTime(t)}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-xs font-semibold capitalize transition-colors",
                  on
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/30"
                )}
              >
                <div>{t}</div>
                <div className="text-[10px] font-normal opacity-70">
                  {t === "morning" ? "9–12" : t === "afternoon" ? "12–5" : "5–11"}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label>Your time zone</Label>
        <select
          value={props.timeZone}
          onChange={(e) => props.setTimeZone(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none"
        >
          {COMMON_TZ.map((tz) => (
            <option key={tz} value={tz} className="bg-slate-900">
              {tz}
            </option>
          ))}
          {!COMMON_TZ.includes(props.timeZone) && (
            <option value={props.timeZone} className="bg-slate-900">
              {props.timeZone}
            </option>
          )}
        </select>
      </div>
    </div>
  );
}
