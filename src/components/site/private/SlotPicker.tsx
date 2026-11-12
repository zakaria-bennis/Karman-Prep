"use client";

// A day and a time, picked the way a booking page does it: a row of dates you flick through, then the open
// times for that day. The Private tutoring page uses it twice: in the session demo (SessionDemo.tsx) and in
// the free-call form (CallForm.tsx). Dates run from tomorrow; which hours are open is worked out from the
// date, so the server and the browser draw the same thing.
import { useEffect, useMemo, useRef } from "react";

const DAY = 864e5;
export const fmtTime = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? "pm" : "am"}`;
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
export const longDay = (d: Date) =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

export type Hours = "sessions" | "calls";

/** The open hours on a date. Sessions: after school, a different mix each day. Calls: the working day. */
export function openHours(d: Date, kind: Hours): number[] {
  const dow = d.getUTCDay();
  if (dow === 0) return [];
  if (kind === "calls")
    return dow === 6 ? [10, 11, 12, 13] : [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const seed = d.getUTCDate() * 7 + dow * 3;
  return [15, 16, 17, 18, 19, 20].filter(
    (h, i) => (seed + i * 5) % 3 !== 0 && !(dow === 6 && h > 17)
  );
}

/** The days on offer, from tomorrow. */
export function useDays(today: string, count = 21) {
  return useMemo(() => {
    const start = new Date(`${today}T12:00:00Z`).getTime();
    return Array.from({ length: count }, (_, i) => new Date(start + (i + 1) * DAY));
  }, [today, count]);
}

export interface SlotWords {
  pickDay: string;
  pickTime: string;
  earlier: string;
  later: string;
  none: string;
}

export default function SlotPicker({
  days,
  kind,
  day,
  hour,
  onDay,
  onHour,
  w,
  tap,
}: {
  days: Date[];
  kind: Hours;
  day: Date;
  hour: number | null;
  onDay: (d: Date) => void;
  onHour: (h: number) => void;
  w: SlotWords;
  /** While the demo plays: the thing being pressed, "day" or "hour". */
  tap?: "day" | "hour" | null;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const open = openHours(day, kind);
  const month = day.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  // the picked day stays in view; only the strip moves, never the page
  useEffect(() => {
    const el = strip.current;
    const on = el?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!el || !on) return;
    const left = on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2;
    el.scrollTo({ left, behavior: "smooth" });
  }, [day]);

  const flick = (dir: 1 | -1) =>
    strip.current?.scrollBy({ left: dir * strip.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <div className="sp">
      <div className="sp-top">
        <b>{month}</b>
        <span>
          <button type="button" aria-label={w.earlier} onClick={() => flick(-1)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M12 4.5 6.5 10l5.5 5.5" />
            </svg>
          </button>
          <button type="button" aria-label={w.later} onClick={() => flick(1)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M8 4.5 13.5 10 8 15.5" />
            </svg>
          </button>
        </span>
      </div>
      <div className="sp-days" role="radiogroup" aria-label={w.pickDay} ref={strip}>
        {days.map((d) => {
          const on = dayKey(d) === dayKey(day);
          return (
            <button
              key={dayKey(d)}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={longDay(d)}
              disabled={!openHours(d, kind).length}
              data-tap={(on && tap === "day") || undefined}
              onClick={() => onDay(d)}
            >
              <span>{d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}</span>
              <b>{d.getUTCDate()}</b>
            </button>
          );
        })}
      </div>
      <div className="sp-times" role="radiogroup" aria-label={w.pickTime} key={dayKey(day)}>
        {open.length ? (
          open.map((h, i) => (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={hour === h}
              data-tap={(hour === h && tap === "hour") || undefined}
              style={{ "--i": i } as React.CSSProperties}
              onClick={() => onHour(h)}
            >
              {fmtTime(h)}
            </button>
          ))
        ) : (
          <p>{w.none}</p>
        )}
      </div>
    </div>
  );
}
