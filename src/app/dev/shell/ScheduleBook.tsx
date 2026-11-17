"use client";

// Booking a session, or moving one (founder, 2026-11-16: "a smooth user experience when scheduling
// sessions ... while seeing the availability of the tutor"; 2026-11-17: "the calendar to look very
// modern and have very clean animations ... not too much unnecessary text").
//   Calendar  the four weeks that can be booked, as whole weeks under the weekday letters. A dot
//             under a date means the tutor has time that day; a filled mark is a session of the
//             student's own; the SAT's day wears a ruby ring. The chosen day is a pill that glides
//             from date to date.
//   Length    60, 90 or 120 minutes (Private 10: 60 only, so the choice is not shown).
//   Times     the tutor's open times that fit, in the student's own time zone, each with a small
//             sun or moon for its part of the day.
//   Work on   the student's weakest skills to tap, in their subject's color, and a line of their own.
//   Weekly    the same time in the weeks after, where it is open and the hours allow.
import gsap from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { calm } from "./homeworkMotion";
import { confirm, press, wave } from "./scheduleMotion";
import {
  DAY,
  HOUR,
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
  subjectOf,
  todOf,
  weekStart,
  weeklyAfter,
  zone,
  type Account,
  type Length,
  type Session,
  type Tod,
} from "./scheduleData";
import { schedule } from "./scheduleStore";
import { chosen, tick } from "./sound";
import page from "./schedule.module.css";
import styles from "./scheduleBook.module.css";

const tutor = TUTOR.split(" ")[0];
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();

/** A small sun for the morning and afternoon, a moon for the evening. */
export function TodIcon({ tod }: { tod: Tod }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
      data-tod={tod}
    >
      {tod === "evening" ? (
        <path
          d="M12.800 9.600A5.200 5.200 0 0 1 6.400 3.200a5.200 5.200 0 1 0 6.400 6.400z"
          fill="currentColor"
          stroke="none"
        />
      ) : tod === "morning" ? (
        <>
          <path d="M4.500 11.500a3.500 3.500 0 0 1 7 0z" fill="currentColor" stroke="none" />
          <path d="M1.500 13.500h13M8 3.500V5M3.200 6.200l1.100 1.100M12.800 6.200l-1.100 1.100" />
        </>
      ) : (
        <>
          <circle cx="8" cy="8" r="3.200" fill="currentColor" stroke="none" />
          <path d="M8 1.500V3M8 13v1.500M1.500 8H3M13 8h1.500M3.400 3.400l1 1M11.600 11.600l1 1M12.600 3.400l-1 1M4.400 11.600l-1 1" />
        </>
      )}
    </svg>
  );
}

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
      <div className={styles.ticket} ref={card} data-tod={todOf(start)}>
        <span className={styles.seal}>
          <svg viewBox="0 0 64 64" width="64" height="64" fill="none" aria-hidden="true">
            <circle data-ring cx="32" cy="32" r="27" pathLength={1} />
            <path data-check d="M20.500 33l8 8 15.500-17" pathLength={1} />
          </svg>
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} data-spark data-n={i % 4} />
          ))}
        </span>
        <b data-line>{moved ? "Moved" : "Booked"}</b>
        <p data-line>{dateLong(start)}</p>
        <p data-line>
          {clock(start)}, {lengthText(minutes)}
        </p>
        {more.length > 0 && (
          <p data-line className={styles.also}>
            Also {more.map((t) => dateShort(t).replace(/^\w+, /, "")).join(", ")}
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

  // the calendar: whole weeks, Monday first, from the first day that can be booked to the last
  const cells = useMemo(() => {
    if (days.length === 0) return [];
    const from = weekStart(days[0].day);
    const to = weekStart(days[days.length - 1].day) + 6 * DAY;
    const out: number[] = [];
    for (let t = from; t <= to + HOUR; t += DAY) out.push(new Date(t + HOUR).setHours(0, 0, 0, 0));
    return out;
  }, [days]);
  const mine = account.sessions.filter((s) => s.state === "booked" && s.id !== moving?.id);

  // the pill that marks the chosen day glides to it
  const grid = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLElement>(null);
  const placed = useRef(false);
  useLayoutEffect(() => {
    const move = () => {
      const cell = grid.current?.querySelector<HTMLElement>("[aria-pressed=true] [data-face]");
      if (!cell || !pill.current || !grid.current) return;
      const box = cell.getBoundingClientRect();
      const frame = grid.current.getBoundingClientRect();
      const to = {
        x: box.left - frame.left,
        y: box.top - frame.top,
        width: box.width,
        height: box.height,
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
    else
      schedule.book({
        start,
        minutes,
        focus,
        note: note.trim() || undefined,
        weekly: more,
      });
    onBooked();
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

  const month = new Date(day).toLocaleDateString("en-US", { month: "long" });
  return (
    <div className={styles.book}>
      <header className={styles.head}>
        <h2>{moving ? "Move" : "Book"}</h2>
        {moving ? (
          <button type="button" className={page.quiet} onClick={onMoved}>
            Keep {dateShort(moving.start)}
          </button>
        ) : (
          <p>
            {month} <span>{zone()}</span>
          </p>
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
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
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
                      disabled={!can}
                      data-open={open > 0 || undefined}
                      data-sat={sat || undefined}
                      aria-label={`${dateLong(cell)}${open > 0 ? `, ${open} open` : ", nothing open"}${own ? ", you have a session" : ""}${sat ? ", your SAT" : ""}`}
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
                        <span>
                          {sat ? (
                            <em>SAT</em>
                          ) : own ? (
                            <i data-mark="mine" data-tod={todOf(own.start)} />
                          ) : open > 0 ? (
                            <i data-mark="open" />
                          ) : null}
                        </span>
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

            {today && today.times.length > 0 ? (
              <ul className={styles.times} ref={times} aria-label={`Open times, ${dateLong(day)}`}>
                {today.times.map((t) => (
                  <li key={t}>
                    <button
                      type="button"
                      aria-pressed={t === start}
                      data-tod={todOf(t)}
                      onClick={(e) => {
                        tick();
                        press(e.currentTarget);
                        setTime(t);
                      }}
                    >
                      <TodIcon tod={todOf(t)} />
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
                    : "Nothing open this day."}
              </p>
            )}
          </div>

          {!moving && (
            <div className={styles.focus}>
              <h3>Work on</h3>
              <div className={styles.chips}>
                {WEAKEST.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    aria-pressed={focus.includes(skill)}
                    data-kind={subjectOf(skill)}
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
                placeholder={`Note for ${tutor}`}
                aria-label={`A note for ${tutor}`}
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
              <b>Every week</b>
              {weekly && start !== null && (
                <small>
                  {more.length > 0
                    ? `Also ${more.map((t) => dateShort(t).replace(/^\w+, /, "")).join(", ")}`
                    : "No later week has this time open."}
                </small>
              )}
            </label>
          )}

          <footer className={styles.foot} data-set={start !== null || undefined}>
            <p aria-live="polite">
              {start === null ? (
                "Pick a time"
              ) : (
                <>
                  <b>{dateShort(start)}</b> {clock(start)}, {lengthText(minutes)}
                  {more.length > 0 && ` + ${more.length} more`}
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
