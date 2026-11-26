"use client";

// A day and a time, picked the way a booking page does it: a row of dates you flick through, then the open
// times for that day. The Private tutoring page uses it twice: in the session demo (SessionDemo.tsx) and in
// the free-call form (CallForm.tsx). Dates run from today to thirty days on; the arrows page through them.
// Which hours are open is worked out from the date, so the server and the browser draw the same thing; once
// the page is up, hours that have already passed today are taken off.
import { useEffect, useMemo, useRef, useState } from "react";

const DAY = 864e5;
/** An hour of the day as "1:00 pm"; a quarter past it is 13.25 and reads "1:15 pm". */
export const fmtTime = (h: number) => {
  const hour = Math.floor(h);
  const minutes = String(Math.round((h - hour) * 60)).padStart(2, "0");
  return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? "pm" : "am"}`;
};
/** The same, as it is said: "1 pm", "1:15 pm". */
export const sayTime = (time: string) => time.replace(":00", "");
export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
export const longDay = (d: Date) =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

export type Hours = "sessions" | "calls";

/** The open times on a date, as hours of the day. Sessions: after school, on the hour, a different mix
 *  each day. Calls: every quarter hour from 8am to midnight (founder, 2026-11-25). */
export function openHours(d: Date, kind: Hours): number[] {
  // calls: the founder's hours, 8am to midnight Central, every day (2026-11-13); the last starts at 11:45pm
  if (kind === "calls") return Array.from({ length: 64 }, (_, i) => 8 + i / 4);
  const dow = d.getUTCDay();
  if (dow === 0) return [];
  const seed = d.getUTCDate() * 7 + dow * 3;
  return [15, 16, 17, 18, 19, 20].filter(
    (h, i) => (seed + i * 5) % 3 !== 0 && !(dow === 6 && h > 17)
  );
}

/** The days on offer: today and the thirty days after it. */
export function useDays(today: string, count = 31) {
  return useMemo(() => {
    const start = new Date(`${today}T12:00:00Z`).getTime();
    return Array.from({ length: count }, (_, i) => new Date(start + i * DAY));
  }, [today, count]);
}

/** The time it is now in Central Time, where the hours are kept, as an hour of the day (1:30 pm is
 *  13.5). Null until the page is up. */
export function useCentralHour(): number | null {
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    const read = () => {
      const [h, m] = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        minute: "numeric",
        hourCycle: "h23",
      })
        .format(new Date())
        .split(":")
        .map(Number);
      setHour(h + m / 60);
    };
    read();
    const t = setInterval(read, 60_000);
    return () => clearInterval(t);
  }, []);
  return hour;
}

/** The hours still open on a day: all of them, except that today loses the ones already gone. */
export function hoursLeft(d: Date, kind: Hours, first: Date, nowHour: number | null): number[] {
  const all = openHours(d, kind);
  return nowHour !== null && dayKey(d) === dayKey(first) ? all.filter((h) => h > nowHour) : all;
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
  timeLabel = (_d, h) => fmtTime(h),
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
  /** How a time reads (the call form shows it in the visitor's own time zone). */
  timeLabel?: (d: Date, h: number) => string;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const nowHour = useCentralHour();
  const open = hoursLeft(day, kind, days[0], nowHour);
  // calls sit four to a row, one row an hour: a quarter that has passed leaves its place empty, so
  // each column stays one quarter (:00, :15, :30, :45)
  const rows: (number | null)[] =
    kind === "calls" && open.length
      ? Array.from({ length: (24 - Math.floor(open[0])) * 4 }, (_, i) => {
          const h = Math.floor(open[0]) + i / 4;
          return open.includes(h) ? h : null;
        })
      : open;
  const [edge, setEdge] = useState({ start: true, end: false });
  /** The day in the middle of the strip: the month label follows it as the dates are flicked through. */
  const [mid, setMid] = useState<string | null>(null);
  const month = new Date(`${mid ?? dayKey(day)}T12:00:00Z`).toLocaleDateString("en-US", {
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

  // the arrows page a week at a time and go quiet at either end
  const flick = (dir: 1 | -1) => {
    const el = strip.current;
    const one = el?.querySelector<HTMLElement>("button");
    if (!el || !one) return;
    const step = one.offsetWidth + 8;
    el.scrollBy({ left: dir * step * 7, behavior: "smooth" });
  };
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const read = () => {
      setEdge({
        start: el.scrollLeft < 4,
        end: el.scrollLeft + el.clientWidth > el.scrollWidth - 4,
      });
      const centre = el.getBoundingClientRect().left + el.clientWidth / 2;
      const at = [...el.querySelectorAll<HTMLElement>("button")].find(
        (b) => b.getBoundingClientRect().right >= centre
      );
      setMid(at?.dataset.day ?? null);
    };
    read();
    el.addEventListener("scroll", read, { passive: true });
    return () => el.removeEventListener("scroll", read);
  }, [days]);

  return (
    <div className="sp">
      <div className="sp-top">
        <b key={month} className="sp-month">
          {month}
        </b>
        <span>
          <button
            type="button"
            aria-label={w.earlier}
            disabled={edge.start}
            onClick={() => flick(-1)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M12 4.5 6.5 10l5.5 5.5" />
            </svg>
          </button>
          <button type="button" aria-label={w.later} disabled={edge.end} onClick={() => flick(1)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M8 4.5 13.5 10 8 15.5" />
            </svg>
          </button>
        </span>
      </div>
      <div className="sp-days" role="radiogroup" aria-label={w.pickDay} ref={strip}>
        {days.map((d) => {
          const on = dayKey(d) === dayKey(day);
          const n = hoursLeft(d, kind, days[0], nowHour).length;
          return (
            <button
              key={dayKey(d)}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={longDay(d)}
              data-day={dayKey(d)}
              disabled={!n}
              data-tap={(on && tap === "day") || undefined}
              onClick={() => onDay(d)}
            >
              <span>{d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}</span>
              <b>{d.getUTCDate()}</b>
              <i data-many={n > 3 || undefined} />
            </button>
          );
        })}
      </div>
      <div
        className="sp-times"
        role="radiogroup"
        aria-label={w.pickTime}
        key={dayKey(day)}
        data-quarters={kind === "calls" || undefined}
      >
        {open.length ? (
          rows.map((h, i) =>
            h === null ? (
              <span key={`gone-${i}`} aria-hidden="true" />
            ) : (
              <button
                key={h}
                type="button"
                role="radio"
                aria-checked={hour === h}
                data-tap={(hour === h && tap === "hour") || undefined}
                style={{ "--i": kind === "calls" ? Math.min(i >> 2, 8) : i } as React.CSSProperties}
                onClick={() => onHour(h)}
              >
                {timeLabel(day, h)}
              </button>
            )
          )
        ) : (
          <p>{w.none}</p>
        )}
      </div>
    </div>
  );
}
