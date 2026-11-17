"use client";

// Booking a session, or moving one (founder, 2026-11-16: "a smooth user experience when scheduling
// sessions ... while seeing the availability of the tutor"; like Calendly, 2026-11-12: a row of dates
// to flick through, then the open times, then the date and time right above Confirm, then an
// animated confirmation).
//   Days     the next four weeks, from 24 hours out. A day with nothing open is dimmed; the SAT's
//            day wears a ruby ring.
//   Length   60, 90 or 120 minutes (Private 10: 60 only, so the choice is not shown).
//   Times    the tutor's open times that fit the length, in the student's own time zone.
//   Work on  the student's weakest skills to tap, and a line of their own.
//   Weekly   the same time in the weeks after, where it is open and the hours allow.
import { useEffect, useMemo, useRef, useState } from "react";
import { confirm, bring, press, wave } from "./scheduleMotion";
import {
  RULES,
  SAT_DAY,
  TUTOR,
  WEAKEST,
  choices,
  clock,
  dateLong,
  dateShort,
  hours,
  lengthText,
  lengthsFor,
  weeklyAfter,
  zone,
  type Account,
  type Length,
  type Session,
} from "./scheduleData";
import { schedule } from "./scheduleStore";
import { chosen, tick } from "./sound";
import page from "./schedule.module.css";
import styles from "./scheduleBook.module.css";

const Arrow = ({ back = false }: { back?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path d={back ? "M14.500 6.500L9 12l5.500 5.500" : "M9.500 6.500L15 12l-5.500 5.500"} />
  </svg>
);

/** The ticket shown when a session has been booked or moved. */
function Booked({
  start,
  minutes,
  more,
  moved,
  onDone,
}: {
  start: number;
  minutes: Length;
  more: number[];
  moved: boolean;
  onDone: () => void;
}) {
  const card = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (!card.current) return;
    return confirm(card.current, () => done.current());
  }, []);
  return (
    <div className={styles.booked} role="status">
      <div className={styles.ticket} ref={card}>
        <span className={styles.seal}>
          <svg viewBox="0 0 64 64" width="64" height="64" fill="none" aria-hidden="true">
            <circle data-ring cx="32" cy="32" r="27" pathLength={1} />
            <path data-check d="M20.500 33l8 8 15.500-17" pathLength={1} />
          </svg>
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} data-spark />
          ))}
        </span>
        <b data-line>{moved ? "Moved" : "Booked"}</b>
        <p data-line>{dateLong(start)}</p>
        <p data-line>
          {clock(start)} {zone()}, {lengthText(minutes)} with {TUTOR.split(" ")[0]}
        </p>
        {more.length > 0 && (
          <p data-line className={styles.also}>
            And every week after: {more.map((t) => dateShort(t).replace(/^\w+, /, "")).join(", ")}
          </p>
        )}
        <button type="button" data-line className={page.quiet} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}

export default function Book({
  account,
  now,
  moving,
  full,
  onMoved,
  onBuy,
  onChat,
}: {
  account: Account;
  now: number;
  /** The session being moved, when this is a move and not a new booking. */
  moving: Session | null;
  /** The tutor has nothing open (shown as its own state). */
  full: boolean;
  onMoved: () => void;
  onBuy: () => void;
  onChat: () => void;
}) {
  const lengths = lengthsFor(account.pack);
  const [minutes, setMinutes] = useState<Length>(moving?.minutes ?? lengths[0]);
  // the page's clock ticks every second; the open times only need the minute
  const minute = Math.floor(now / 60_000) * 60_000;
  const days = useMemo(
    () => choices(account, minute, minutes, moving ?? undefined, full),
    [account, minute, minutes, moving, full]
  );
  const firstOpen = days.find((d) => d.times.length > 0)?.day ?? days[0]?.day ?? 0;
  const [picked, setPicked] = useState<number | null>(null);
  const day = picked ?? firstOpen;
  const today = days.find((d) => d.day === day) ?? days[0];
  const [time, setTime] = useState<number | null>(null);
  const start = time !== null && today?.times.includes(time) ? time : null;
  const [focus, setFocus] = useState<string[]>(moving?.focus ?? []);
  const [note, setNote] = useState(moving?.note ?? "");
  const [weekly, setWeekly] = useState(false);
  const [done, setDone] = useState<{ start: number; minutes: Length; more: number[] } | null>(null);

  const more = useMemo(
    () => (start !== null && weekly && !moving ? weeklyAfter(account, minute, start, minutes) : []),
    [account, minute, start, weekly, moving, minutes]
  );
  const left = hours(account).left + (moving ? moving.minutes / 60 : 0);
  const nothing = days.every((d) => d.times.length === 0);
  const short = nothing && days.every((d) => d.why === "hours");

  const row = useRef<HTMLDivElement>(null);
  const times = useRef<HTMLUListElement>(null);
  useEffect(() => wave(times.current), [day, minutes]);
  useEffect(() => {
    bring(row.current, row.current?.querySelector<HTMLElement>("[aria-pressed=true]") ?? null);
  }, [day]);

  const step = (by: number) => {
    const el = row.current;
    if (!el) return;
    el.scrollBy({ left: by * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const send = () => {
    if (start === null) return;
    chosen();
    if (moving) schedule.move(moving.id, start, now);
    else
      schedule.book({
        start,
        minutes,
        focus,
        note: note.trim() || undefined,
        weekly: more,
      });
    setDone({ start, minutes, more });
  };

  if (done)
    return (
      <Booked
        {...done}
        moved={!!moving}
        onDone={() => {
          setDone(null);
          setTime(null);
          setWeekly(false);
          setFocus([]);
          setNote("");
          if (moving) onMoved();
        }}
      />
    );

  return (
    <div className={styles.book}>
      <header className={styles.head}>
        <h2>{moving ? "Move" : "Book"}</h2>
        <p>
          {TUTOR} <span>Times in {zone() || "your time zone"}</span>
        </p>
      </header>
      {moving && (
        <p className={styles.moving}>
          <span>
            Moving {dateShort(moving.start)}, {clock(moving.start)}
          </span>
          <button type="button" className={page.quiet} onClick={onMoved}>
            Keep it
          </button>
        </p>
      )}

      {nothing ? (
        short ? (
          <div className={styles.none}>
            <b>No hours left</b>
            <p>Add hours to book your next session.</p>
            <button type="button" className={page.go} onClick={onBuy}>
              Add hours
            </button>
          </div>
        ) : (
          <div className={styles.none}>
            <b>Nothing open</b>
            <p>
              {TUTOR.split(" ")[0]} has no open times in the next four weeks. Send a message and you
              will work out a time together.
            </p>
            <button type="button" className={page.go} onClick={onChat}>
              Message {TUTOR.split(" ")[0]}
            </button>
          </div>
        )
      ) : (
        <>
          <div className={styles.days}>
            <button
              type="button"
              className={styles.step}
              aria-label="Earlier days"
              onClick={() => step(-1)}
            >
              <Arrow back />
            </button>
            <div className={styles.row} ref={row} role="group" aria-label="Day">
              {days.map((d, i) => {
                const date = new Date(d.day);
                const open = d.times.length;
                const sat = new Date(SAT_DAY).toDateString() === date.toDateString();
                return (
                  <button
                    key={d.day}
                    type="button"
                    className={styles.day}
                    aria-pressed={d.day === day}
                    data-open={open > 0 || undefined}
                    data-sat={sat || undefined}
                    aria-label={`${dateLong(d.day)}, ${open === 0 ? "nothing open" : `${open} open`}${sat ? ", your SAT" : ""}`}
                    onClick={(e) => {
                      tick();
                      press(e.currentTarget);
                      setPicked(d.day);
                      setTime(null);
                    }}
                  >
                    <small>
                      {i === 0 || date.getDate() === 1
                        ? date.toLocaleDateString("en-US", { month: "short" })
                        : date.toLocaleDateString("en-US", { weekday: "short" })}
                    </small>
                    <b>{date.getDate()}</b>
                    <i>
                      {sat
                        ? "SAT"
                        : i === 0 || date.getDate() === 1
                          ? date.toLocaleDateString("en-US", { weekday: "short" })
                          : ""}
                    </i>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className={styles.step}
              aria-label="Later days"
              onClick={() => step(1)}
            >
              <Arrow />
            </button>
          </div>

          {lengths.length > 1 && !moving && (
            <div className={styles.lengths} role="group" aria-label="Length">
              {lengths.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={m === minutes}
                  disabled={left < m / 60}
                  onClick={(e) => {
                    tick();
                    press(e.currentTarget);
                    setMinutes(m);
                    setTime(null);
                  }}
                >
                  {m} min
                </button>
              ))}
            </div>
          )}

          {today && today.times.length > 0 ? (
            <ul className={styles.times} ref={times} aria-label={`Open times, ${dateLong(day)}`}>
              {today.times.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    aria-pressed={t === start}
                    onClick={(e) => {
                      tick();
                      press(e.currentTarget);
                      setTime(t);
                    }}
                  >
                    {clock(t)}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.shut}>
              {today?.why === "week"
                ? "Private 10 has 60 minutes a week, and this week's session is booked."
                : today?.why === "hours"
                  ? "Not enough hours left for a session this long."
                  : `Nothing open on ${dateLong(day)}.`}
            </p>
          )}

          {!moving && (
            <div className={styles.focus}>
              <h3>Work on</h3>
              <div className={styles.chips}>
                {WEAKEST.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    aria-pressed={focus.includes(skill)}
                    onClick={(e) => {
                      tick();
                      press(e.currentTarget);
                      setFocus(
                        focus.includes(skill) ? focus.filter((f) => f !== skill) : [...focus, skill]
                      );
                    }}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              <input
                className={styles.note}
                value={note}
                maxLength={120}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything else for your tutor"
                aria-label="A note for your tutor"
              />
            </div>
          )}

          {!moving && (
            <label className={styles.weekly}>
              <input
                type="checkbox"
                checked={weekly}
                onChange={(e) => setWeekly(e.target.checked)}
              />
              <span aria-hidden="true" />
              <b>Every week at this time</b>
              {weekly && start !== null && (
                <small>
                  {more.length > 0
                    ? `Also books ${more.map((t) => dateShort(t).replace(/^\w+, /, "")).join(", ")}. Each can be moved.`
                    : "No later week has this time open."}
                </small>
              )}
            </label>
          )}

          <footer className={styles.foot}>
            <p aria-live="polite">
              {start === null ? (
                "Pick a time"
              ) : (
                <>
                  <b>{dateLong(start)}</b> at {clock(start)}, {lengthText(minutes)}
                  {more.length > 0 && `, and ${more.length} more`}
                </>
              )}
            </p>
            <button type="button" className={page.go} disabled={start === null} onClick={send}>
              {moving ? "Move session" : "Confirm session"}
            </button>
            {moving && start !== null && moving.start - now < RULES.noticeHours * 3_600_000 && (
              <small>This uses your one late change.</small>
            )}
          </footer>
        </>
      )}
    </div>
  );
}
