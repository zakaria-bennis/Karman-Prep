"use client";

// Booking a session, or moving one (founder, 2026-11-16 and 2026-11-17: "the calendar to look very
// modern and have very clean animations ... not too much unnecessary text").
//   Calendar  the four weeks that can be booked, as whole weeks from Sunday to Saturday. A day the
//             tutor has time is a shaded square, a day with none is left clear; a day with a
//             session of the student's own is filled with that session's color; the SAT's day has
//             a bold outline. The chosen day is a pill that glides from date to date.
//   Length    60, 90 or 120 minutes (Private 10: 60 only, so the choice is not shown).
//   Times     every time the tutor works that day, in the student's own time: the open ones to
//             press, the taken ones grayed out. Each has a small picture of the sky at that time
//             (a rising sun, a sun, a setting sun, a moon), from the estimated sunrise and sunset.
//   Work on   the five things that most need work (skills, and the test itself: pacing,
//             strategy), to tap, and a line of the student's own.
import gsap from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { calm } from "./homeworkMotion";
import Cheer from "./ScheduleCheer";
import { SkyIcon } from "./ScheduleSky";
import { press, wave } from "./scheduleMotion";
import {
  DAY,
  HOUR,
  RECOMMENDED,
  RULES,
  SAT_DAY,
  TUTOR,
  choices,
  clock,
  dateLong,
  dateShort,
  hours,
  lengthText,
  lengthsFor,
  skyOf,
  weekStart,
  type Account,
  type Length,
  type Session,
} from "./scheduleData";
import { schedule } from "./scheduleStore";
import { LEVELS } from "./skills72";
import { chosen, tick } from "./sound";
import page from "./schedule.module.css";
import styles from "./scheduleBook.module.css";

const tutor = TUTOR.split(" ")[0];
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

export default function Book({
  account,
  now,
  moving,
  full,
  onBooked,
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
  onBooked: () => void;
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
  const mine = useMemo(
    () => account.sessions.filter((s) => s.state === "booked" && s.id !== moving?.id),
    [account, moving]
  );
  const firstOpen = days.find((d) => d.times.length > 0)?.day ?? days[0]?.day ?? 0;
  const [picked, setPicked] = useState<number | null>(null);
  const day = picked ?? firstOpen;
  const today = days.find((d) => d.day === day) ?? days[0];
  const [time, setTime] = useState<number | null>(null);
  const start = time !== null && today?.times.includes(time) ? time : null;
  const [focus, setFocus] = useState<string[]>(moving?.focus ?? []);
  const [note, setNote] = useState(moving?.note ?? "");
  const [done, setDone] = useState<{ start: number; minutes: Length } | null>(null);

  const left = hours(account).left + (moving ? moving.minutes / 60 : 0);
  const nothing = days.every((d) => d.times.length === 0);
  const short = nothing && days.every((d) => d.why === "hours");

  // the calendar: whole weeks, Sunday first, from the first day that can be booked to the last
  const cells = useMemo(() => {
    if (days.length === 0) return [];
    const from = weekStart(days[0].day);
    const to = weekStart(days[days.length - 1].day) + 6 * DAY;
    const out: number[] = [];
    for (let t = from; t <= to + HOUR; t += DAY) out.push(new Date(t + HOUR).setHours(0, 0, 0, 0));
    // a week with no day that can be booked, and no session in it, is left off
    const live = (cell: number) =>
      (days.find((d) => d.day === cell)?.times.length ?? 0) > 0 ||
      mine.some((s) => sameDay(s.start, cell));
    const weeks: number[] = [];
    for (let w = 0; w < out.length; w += 7) {
      const week = out.slice(w, w + 7);
      if (week.some(live)) weeks.push(...week);
    }
    return weeks.length > 0 ? weeks : out;
  }, [days, mine]);

  // the pill that marks the chosen day glides to it
  const grid = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLElement>(null);
  const placed = useRef(false);
  useLayoutEffect(() => {
    const move = () => {
      const cell = grid.current?.querySelector<HTMLElement>("[aria-pressed=true] [data-face]");
      const button = cell?.parentElement;
      if (!cell || !button || !pill.current) return;
      // where the square is laid out, whatever is moving at the moment (the dates arrive in a wave)
      const to = {
        x: button.offsetLeft + cell.offsetLeft,
        y: button.offsetTop + cell.offsetTop,
        width: cell.offsetWidth,
        height: cell.offsetHeight,
      };
      if (!placed.current || calm()) gsap.set(pill.current, { ...to, opacity: 1 });
      else
        gsap.to(pill.current, {
          ...to,
          opacity: 1,
          duration: 0.5,
          ease: "back.out(1.5)",
          overwrite: true,
        });
      placed.current = true;
    };
    move();
    const sized = new ResizeObserver(() => {
      placed.current = false;
      move();
    });
    if (grid.current) sized.observe(grid.current);
    return () => sized.disconnect();
  }, [day, cells]);
  // the dates come in as a wave once, when the calendar opens
  useEffect(() => {
    if (calm() || !grid.current) return;
    gsap.fromTo(
      grid.current.querySelectorAll("button"),
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: { each: 0.012, from: "start" },
        ease: "power3.out",
        clearProps: "transform,opacity",
      }
    );
  }, []);

  const times = useRef<HTMLUListElement>(null);
  useEffect(() => wave(times.current), [day, minutes]);

  const send = () => {
    if (start === null) return;
    chosen();
    if (moving) schedule.move(moving.id, start, now);
    else schedule.book({ start, minutes, focus, note: note.trim() || undefined });
    onBooked();
    setDone({ start, minutes });
  };

  const month = new Date(day).toLocaleDateString("en-US", { month: "long" });
  return (
    <div className={styles.book}>
      {done && (
        <Cheer
          {...done}
          moved={!!moving}
          onDone={() => {
            setDone(null);
            setTime(null);
            setFocus([]);
            setNote("");
            if (moving) onMoved();
          }}
        />
      )}
      <header className={styles.head}>
        <h2>{moving ? "Move" : "Book"}</h2>
        {moving ? (
          <button type="button" className={page.quiet} onClick={onMoved}>
            Keep {dateShort(moving.start)}
          </button>
        ) : (
          <p>{month}</p>
        )}
      </header>

      {nothing ? (
        short ? (
          <div className={styles.none}>
            <b>No hours left</b>
            <button type="button" className={page.go} onClick={onBuy}>
              Add hours
            </button>
          </div>
        ) : (
          <div className={styles.none}>
            <b>Nothing open</b>
            <p>{tutor} has no open times in the next four weeks.</p>
            <button type="button" className={page.go} onClick={onChat}>
              Message {tutor}
            </button>
          </div>
        )
      ) : (
        <>
          <div className={styles.pick}>
            <div className={styles.cal}>
              <div className={styles.week} aria-hidden="true">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
              <div className={styles.grid} ref={grid} role="group" aria-label="Day">
                <i className={styles.pill} ref={pill} aria-hidden="true" />
                {cells.map((cell) => {
                  const info = days.find((d) => d.day === cell);
                  const date = new Date(cell);
                  const open = info?.times.length ?? 0;
                  const sat = sameDay(SAT_DAY, cell);
                  const own = mine.find((s) => sameDay(s.start, cell));
                  const can = !!info && (open > 0 || !!info.why);
                  return (
                    <button
                      key={cell}
                      type="button"
                      className={styles.day}
                      aria-pressed={cell === day}
                      disabled={!can && !own}
                      data-open={open > 0 || undefined}
                      data-sat={sat || undefined}
                      data-own={own ? skyOf(own.start) : undefined}
                      aria-label={`${dateLong(cell)}${open > 0 ? `, ${open} open` : ", nothing open"}${own ? `, your session at ${clock(own.start)}` : ""}${sat ? ", your SAT" : ""}`}
                      onClick={(e) => {
                        tick();
                        press(e.currentTarget.querySelector("[data-face]"));
                        setPicked(cell);
                        setTime(null);
                      }}
                    >
                      {date.getDate() === 1 && (
                        <small>{date.toLocaleDateString("en-US", { month: "short" })}</small>
                      )}
                      <span data-face>
                        <b>{date.getDate()}</b>
                        {sat && <em>SAT</em>}
                      </span>
                    </button>
                  );
                })}
              </div>
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

            {today && today.slots.length > 0 && !today.why ? (
              <ul className={styles.times} ref={times} aria-label={`Times, ${dateLong(day)}`}>
                {today.slots.map(({ t, open }) => (
                  <li key={t}>
                    <button
                      type="button"
                      aria-pressed={t === start}
                      disabled={!open}
                      data-sky={skyOf(t)}
                      aria-label={open ? clock(t) : `${clock(t)}, not available`}
                      onClick={(e) => {
                        tick();
                        press(e.currentTarget);
                        setTime(t);
                      }}
                    >
                      <SkyIcon sky={skyOf(t)} />
                      {clock(t)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.shut}>
                {today?.why === "week"
                  ? "This week's session is booked. Private 10 has one a week."
                  : today?.why === "hours"
                    ? "Not enough hours left for this length."
                    : "Nothing this day."}
              </p>
            )}
          </div>

          {!moving && (
            <div className={styles.focus}>
              <h3>Work on</h3>
              <ol className={styles.picks}>
                {RECOMMENDED.map(({ skill, subject, level }) => {
                  const on = focus.includes(skill);
                  return (
                    <li key={skill}>
                      <button
                        type="button"
                        aria-pressed={on}
                        data-kind={subject}
                        onClick={(e) => {
                          tick();
                          press(e.currentTarget);
                          setFocus(on ? focus.filter((f) => f !== skill) : [...focus, skill]);
                        }}
                      >
                        <i aria-hidden="true">
                          <svg
                            viewBox="0 0 16 16"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path d="M3.500 8.300l3 3 6-6.600" />
                          </svg>
                        </i>
                        <b>{skill}</b>
                        <small>{LEVELS[level]}</small>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <input
                className={styles.note}
                value={note}
                maxLength={120}
                onChange={(e) => setNote(e.target.value)}
                placeholder={`Note for ${tutor}`}
                aria-label={`A note for ${tutor}`}
              />
            </div>
          )}

          <footer className={styles.foot} data-set={start !== null || undefined}>
            <p aria-live="polite">
              {start === null ? (
                "Pick a time"
              ) : (
                <>
                  <b>{dateShort(start)}</b> {clock(start)}, {lengthText(minutes)}
                </>
              )}
            </p>
            <button type="button" className={page.go} disabled={start === null} onClick={send}>
              {moving ? "Move session" : "Confirm"}
            </button>
            {moving && start !== null && moving.start - now < RULES.noticeHours * HOUR && (
              <small>Uses your one late change.</small>
            )}
          </footer>
        </>
      )}
    </div>
  );
}
