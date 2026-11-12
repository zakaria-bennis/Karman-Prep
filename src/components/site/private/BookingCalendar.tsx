"use client";

// A working booking calendar for the Private tutoring page: real dates from today, the tutor's open times
// on each day, a day and a time to pick, and a confirmation. Nothing is sent anywhere; it shows how picking
// a session works. Five looks (TEMPORARY, for the founder to choose from in PrivateLab.tsx):
//   month  a month grid beside that day's times
//   week   a strip of the next days over time chips (phone-first)
//   day    the tutor's day as a timeline of taken and open hours
//   phone  the week look inside a phone
//   card   a small month beside a confirmation card
// Which times are open is worked out from the date, so it is the same on the server and in the browser.
import { useMemo, useState } from "react";

export type CalendarLook = "month" | "week" | "day" | "phone" | "card";

export interface CalendarWords {
  pickDay: string;
  pickTime: string;
  zone: string;
  length: string;
  withTutor: string;
  confirm: string;
  booked: string;
  taken: string;
  none: string;
  move: string;
}

const HOURS = [15, 16, 17, 18, 19, 20];
const DAY = 864e5;
const fmtTime = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? "pm" : "am"}`;
const key = (d: Date) => d.toISOString().slice(0, 10);

/** Open hours for a date: none on Sundays, and a steady pattern otherwise. */
function openHours(d: Date): number[] {
  const dow = d.getUTCDay();
  if (dow === 0) return [];
  const seed = d.getUTCDate() * 7 + dow * 3;
  return HOURS.filter((h, i) => (seed + i * 5) % 3 !== 0 && !(dow === 6 && h > 17));
}

export default function BookingCalendar({
  look,
  w,
  today,
}: {
  look: CalendarLook;
  w: CalendarWords;
  /** Today as YYYY-MM-DD, from the server, so both renders agree. */
  today: string;
}) {
  const start = useMemo(() => new Date(`${today}T12:00:00Z`), [today]);
  const days = useMemo(
    () => Array.from({ length: 28 }, (_, i) => new Date(start.getTime() + (i + 1) * DAY)),
    [start]
  );
  const firstOpen = days.find((d) => openHours(d).length > 1) ?? days[0];
  const [day, setDay] = useState(firstOpen);
  const [hour, setHour] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const open = openHours(day);
  const pick = (d: Date) => {
    setDay(d);
    setHour(null);
    setDone(false);
  };
  const long = day.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const month = day.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const times = (
    <div className="bc-times" role="radiogroup" aria-label={w.pickTime}>
      {open.length ? (
        open.map((h) => (
          <button
            key={h}
            type="button"
            role="radio"
            aria-checked={hour === h}
            onClick={() => {
              setHour(h);
              setDone(false);
            }}
          >
            {fmtTime(h)}
          </button>
        ))
      ) : (
        <p>{w.none}</p>
      )}
    </div>
  );

  const summary = (
    <div className="bc-sum" data-done={done || undefined} aria-live="polite">
      <p>
        <b>{long}</b>
        <span>
          {hour === null ? w.pickTime : `${fmtTime(hour)} ${w.zone}`} · {w.length} {w.withTutor}
        </span>
      </p>
      <button type="button" disabled={hour === null} onClick={() => setDone(true)}>
        {done ? (
          <>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4.5 10.5l3.5 3.5 7.5-8" />
            </svg>
            {w.booked}
          </>
        ) : (
          w.confirm
        )}
      </button>
      <small>{w.move}</small>
    </div>
  );

  /* a month grid: the weeks that hold the next 28 days */
  const grid = () => {
    const first = new Date(days[0].getTime() - days[0].getUTCDay() * DAY);
    const cells = Array.from({ length: 35 }, (_, i) => new Date(first.getTime() + i * DAY));
    return (
      <div className="bc-month">
        <p>{month}</p>
        <div className="bc-dow" aria-hidden="true">
          {["S", "M", "T", "W", "T", "F", "S"].map((x, i) => (
            <span key={i}>{x}</span>
          ))}
        </div>
        <div className="bc-grid" role="radiogroup" aria-label={w.pickDay}>
          {cells.map((d) => {
            const can = d > start && d <= days[days.length - 1] && openHours(d).length > 0;
            return (
              <button
                key={key(d)}
                type="button"
                role="radio"
                aria-checked={key(d) === key(day)}
                disabled={!can}
                onClick={() => pick(d)}
              >
                {d.getUTCDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const strip = (
    <div className="bc-strip" role="radiogroup" aria-label={w.pickDay}>
      {days.slice(0, 7).map((d) => (
        <button
          key={key(d)}
          type="button"
          role="radio"
          aria-checked={key(d) === key(day)}
          disabled={!openHours(d).length}
          onClick={() => pick(d)}
        >
          <span>{d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}</span>
          <b>{d.getUTCDate()}</b>
        </button>
      ))}
    </div>
  );

  if (look === "day")
    return (
      <div className="bc" data-look="day">
        {strip}
        <ol className="bc-line">
          {HOURS.map((h) => {
            const free = open.includes(h);
            return (
              <li key={h} data-free={free || undefined} data-on={hour === h || undefined}>
                <span>{fmtTime(h)}</span>
                <button
                  type="button"
                  disabled={!free}
                  onClick={() => {
                    setHour(h);
                    setDone(false);
                  }}
                >
                  {free ? (hour === h ? w.length : w.pickTime) : w.taken}
                </button>
              </li>
            );
          })}
        </ol>
        {summary}
      </div>
    );
  if (look === "week" || look === "phone")
    return (
      <div className="bc" data-look={look}>
        <div className="bc-screen">
          <p className="bc-head">
            <b>{month}</b>
            <span>{w.zone}</span>
          </p>
          {strip}
          {times}
          {summary}
        </div>
      </div>
    );
  return (
    <div className="bc" data-look={look}>
      {grid()}
      <div className="bc-side">
        <p className="bc-head">
          <b>{long}</b>
          <span>{w.zone}</span>
        </p>
        {times}
        {summary}
      </div>
    </div>
  );
}
