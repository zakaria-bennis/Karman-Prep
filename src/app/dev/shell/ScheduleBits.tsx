"use client";

// Schedule's smaller parts: the next session with its clock and Join, the buttons that move or
// cancel a session, a past session with its recording, adding hours, and the offer to keep sessions
// in the family's own calendar.
import { useEffect, useRef, useState } from "react";
import { cut, two } from "./homeworkMotion";
import { breathe, fold, press, useCount } from "./scheduleMotion";
import {
  MIN,
  RULES,
  TUTOR,
  changeOf,
  clock,
  dateLong,
  doorOf,
  endOf,
  expiresAt,
  hoursText,
  lengthText,
  monthDay,
  movesBack,
  movesLeft,
  priceOf,
  recordingUntil,
  zone,
  type Account,
  type Session,
} from "./scheduleData";
import { schedule, type Sync } from "./scheduleStore";
import { chosen, tick } from "./sound";
import styles from "./schedule.module.css";

const first = TUTOR.split(" ")[0];

/** Move and Cancel for one session, with the rule that applies said beside them. */
export function Changes({
  account,
  session,
  now,
  onMove,
}: {
  account: Account;
  session: Session;
  now: number;
  onMove: (session: Session) => void;
}) {
  const change = changeOf(account, session, now);
  const [asking, setAsking] = useState(false);
  const left = movesLeft(account, now);
  if (change.why === "started") return null;
  if (change.why === "pass")
    return (
      <p className={styles.rule}>
        Inside {RULES.noticeHours} hours, and your one late change is used. Message {first} if
        something has come up.
      </p>
    );
  if (asking)
    return (
      <div className={styles.ask}>
        <p>
          Cancel this session? {lengthText(session.minutes)} goes back to your hours.
          {change.late && " This uses your one late change."}
        </p>
        <button
          type="button"
          className={styles.danger}
          onClick={() => {
            tick();
            schedule.cancel(session.id, now);
          }}
        >
          Yes, cancel
        </button>
        <button type="button" className={styles.quiet} onClick={() => setAsking(false)}>
          Keep it
        </button>
      </div>
    );
  return (
    <div className={styles.changes}>
      <button
        type="button"
        className={styles.pill}
        disabled={!change.move}
        onClick={(e) => {
          tick();
          press(e.currentTarget);
          onMove(session);
        }}
      >
        Move
      </button>
      <button type="button" className={styles.pill} onClick={() => setAsking(true)}>
        Cancel
      </button>
      <small>
        {change.late
          ? "Inside 24 hours: a change uses your one late change."
          : change.why === "moves"
            ? `No moves left this month. They come back ${monthDay(movesBack(now)).replace(/, \d+$/, "")}.`
            : `${left} of ${RULES.movesAMonth} moves left this month`}
      </small>
    </div>
  );
}

/** The next session: when it is, a clock counting down to it, and Join once it opens. */
export function Next({
  account,
  session,
  now,
  onMove,
}: {
  account: Account;
  session: Session;
  now: number;
  onMove: (session: Session) => void;
}) {
  const door = doorOf(session, now);
  const join = useRef<HTMLButtonElement>(null);
  useEffect(() => (door === "open" ? breathe(join.current) : undefined), [door]);
  // not joined ten minutes in: the session is closed and its hours are used
  useEffect(() => {
    if (door === "closed") schedule.miss(session.id);
  }, [door, session.id]);
  const left = cut(session.start - now);
  const parts: [number, string][] =
    left.days > 0
      ? [
          [left.days, left.days === 1 ? "day" : "days"],
          [left.hours, "hrs"],
          [left.minutes, "min"],
        ]
      : [
          [left.hours, "hrs"],
          [left.minutes, "min"],
          [left.seconds, "sec"],
        ];
  return (
    <>
      <div className={styles.when}>
        <h2>{dateLong(session.start)}</h2>
        <p>
          {clock(session.start)} to {clock(endOf(session))} {zone()}
          <span>with {TUTOR}</span>
        </p>
        {(session.focus.length > 0 || session.note) && (
          <p className={styles.tags}>
            {session.focus.map((f) => (
              <span key={f}>{f}</span>
            ))}
            {session.note && <em>{session.note}</em>}
          </p>
        )}
      </div>
      {door === "early" && (
        <div className={styles.clock} role="timer" aria-label="Time until this session">
          {parts.map(([n, word]) => (
            <span key={word}>
              <b>{two(n)}</b>
              {word}
            </span>
          ))}
        </div>
      )}
      {door === "open" && (
        <div className={styles.door}>
          <button
            type="button"
            ref={join}
            className={styles.join}
            onClick={() => {
              chosen();
              schedule.join(session.id);
            }}
          >
            Join
          </button>
          <small>
            {now < session.start
              ? `Starts in ${Math.max(1, Math.ceil((session.start - now) / MIN))} min`
              : `Join by ${clock(session.start + RULES.graceMinutes * MIN)}`}
          </small>
        </div>
      )}
      {door === "in" && (
        <p className={styles.live}>
          <i aria-hidden="true" />
          In session until {clock(endOf(session))}
        </p>
      )}
      {door === "early" && (
        <Changes account={account} session={session} now={now} onMove={onMove} />
      )}
      {door === "open" && now >= session.start && (
        <p className={styles.rule}>
          After {RULES.graceMinutes} minutes the session closes and its time is used. It still ends
          at {clock(endOf(session))}.
        </p>
      )}
    </>
  );
}

/** How many hours are left, counted to when they change, with what is booked and when they end. */
export function Hours({
  left,
  booked,
  account,
  onBuy,
}: {
  left: number;
  booked: number;
  account: Account;
  onBuy: () => void;
}) {
  const shown = useCount(left);
  return (
    <div className={styles.hours}>
      <p className={styles.count}>
        <b>{hoursText(shown)}</b>
        <span>{left === 1 ? "hour left" : "hours left"}</span>
      </p>
      <p className={styles.fine}>
        {booked > 0 && <span>{hoursText(booked)} booked</span>}
        <span>Use by {monthDay(expiresAt(account))}</span>
        {account.pack === "private-10" && <span>60 minutes a week</span>}
      </p>
      <button
        type="button"
        className={left < 1 ? styles.go : styles.add}
        onClick={(e) => {
          tick();
          press(e.currentTarget);
          onBuy();
        }}
      >
        Add hours
      </button>
    </div>
  );
}

/** Adding hours: how many, what it comes to, and the button that pays. Either the student or a
 *  parent may buy. (A stand-in: pressing Pay adds the hours; no card is asked for yet.) */
export function Buy({ onDone }: { onDone: (bought: boolean) => void }) {
  const [count, setCount] = useState(2);
  const total = useCount(count * RULES.hourPrice, 2);
  const change = (by: number) => {
    tick();
    setCount(Math.min(40, Math.max(1, count + by)));
  };
  return (
    <div className={styles.buy}>
      <header className={styles.paneHead}>
        <h2>Add hours</h2>
        <button type="button" className={styles.quiet} onClick={() => onDone(false)}>
          Back
        </button>
      </header>
      <div className={styles.stepper}>
        <button
          type="button"
          aria-label="One hour fewer"
          disabled={count <= 1}
          onClick={() => change(-1)}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path d="M6 12h12" />
          </svg>
        </button>
        <p aria-live="polite">
          <b>{count}</b>
          <span>{count === 1 ? "hour" : "hours"}</span>
        </p>
        <button
          type="button"
          aria-label="One hour more"
          disabled={count >= 40}
          onClick={() => change(1)}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path d="M6 12h12M12 6v12" />
          </svg>
        </button>
      </div>
      <ul className={styles.terms}>
        <li>{priceOf(1)} an hour</li>
        <li>Good for {RULES.expiryMonths} months</li>
        <li>Sessions of 60, 90 or 120 minutes</li>
      </ul>
      <button
        type="button"
        className={styles.go}
        onClick={() => {
          chosen();
          schedule.buy(count);
          onDone(true);
        }}
      >
        Pay{" "}
        {total.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: Number.isInteger(count * RULES.hourPrice) ? 0 : 2,
        })}
      </button>
    </div>
  );
}

const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${two(Math.floor(seconds % 60))}`;

/** A past session: its recording (kept 6 months, watched here, never downloaded), the tutor's
 *  notes, what was covered and the homework set. The recording is a stand-in: the bar moves and
 *  no picture plays. */
export function Past({
  session,
  now,
  onDone,
  onHomework,
}: {
  session: Session;
  now: number;
  onDone: () => void;
  onHomework: () => void;
}) {
  const kept = now < recordingUntil(session);
  const [playing, setPlaying] = useState(false);
  const [at, setAt] = useState(0);
  const length = session.minutes * 60;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => setAt((n) => (n + 1 >= length ? (setPlaying(false), length) : n + 1)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [playing, length]);
  const recap = session.recap;
  return (
    <div className={styles.past}>
      <header className={styles.paneHead}>
        <h2>{dateLong(session.start)}</h2>
        <button type="button" className={styles.quiet} onClick={onDone}>
          Back
        </button>
      </header>
      {session.state === "missed" ? (
        <p className={styles.gone}>
          You had not joined {RULES.graceMinutes} minutes in, so this session closed and its time
          was used.
        </p>
      ) : kept ? (
        <div className={styles.player} data-playing={playing || undefined}>
          <div className={styles.screen}>
            <span>{first[0]}</span>
            <span>You</span>
            <button
              type="button"
              aria-label={playing ? "Pause the recording" : "Play the recording"}
              onClick={() => {
                tick();
                setPlaying(!playing);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="currentColor"
                aria-hidden="true"
              >
                {playing ? (
                  <path d="M7 5h3.500v14H7zM13.500 5H17v14h-3.500z" />
                ) : (
                  <path d="M8 5l11 7-11 7z" />
                )}
              </svg>
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={length}
            value={at}
            onChange={(e) => setAt(Number(e.target.value))}
            aria-label="Place in the recording"
            style={{ "--at": `${(at / length) * 100}%` } as React.CSSProperties}
          />
          <p>
            <span>
              {mmss(at)} of {mmss(length)}
            </span>
            <span>Here until {monthDay(recordingUntil(session))}</span>
          </p>
        </div>
      ) : (
        <p className={styles.gone}>
          Recordings are kept for {RULES.recordingMonths} months. This one is no longer here.
        </p>
      )}
      {recap && (
        <>
          <section>
            <h3>Notes</h3>
            <p className={styles.notes}>{recap.notes}</p>
          </section>
          {recap.covered.length > 0 && (
            <section>
              <h3>Covered</h3>
              <p className={styles.tags}>
                {recap.covered.map((skill) => (
                  <span key={skill}>{skill}</span>
                ))}
              </p>
            </section>
          )}
          {recap.homework.length > 0 && (
            <section>
              <h3>Homework</h3>
              <ul className={styles.set}>
                {recap.homework.map((work) => (
                  <li key={work}>
                    <button type="button" onClick={onHomework}>
                      <span>{work}</span>
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M9.500 6.500L15 12l-5.500 5.500" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** Offered once, on first opening: keep sessions in the family's own calendar. Declined, the
 *  choice lives in Settings. (A stand-in: nothing is connected yet.) */
export function SyncOffer({ sync }: { sync: Sync }) {
  const el = useRef<HTMLDivElement>(null);
  const [said, setSaid] = useState<"apple" | "google" | null>(null);
  if (sync !== "ask" && !said) return null;
  const answer = (choice: "apple" | "google" | "later") => {
    tick();
    if (choice === "later") return fold(el.current, () => schedule.sync("later"));
    setSaid(choice);
    window.setTimeout(() => fold(el.current, () => schedule.sync(choice)), 1900);
  };
  return (
    <div className={styles.sync} ref={el} data-arrive>
      <svg
        viewBox="0 0 32 32"
        width="32"
        height="32"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <rect x="5" y="7" width="22" height="20" rx="5" />
        <path d="M5 13h22M11 4.500v5M21 4.500v5" />
        <path d="M11.500 20.500l3 3 6-6.500" />
      </svg>
      {said ? (
        <p role="status">
          <b>Done.</b> Your sessions will show in {said === "apple" ? "Apple" : "Google"} Calendar.
        </p>
      ) : (
        <>
          <p>
            <b>Keep sessions in your own calendar</b>
            <span>Booked, moved and canceled sessions stay in step.</span>
          </p>
          <div>
            <button type="button" className={styles.add} onClick={() => answer("apple")}>
              Apple Calendar
            </button>
            <button type="button" className={styles.add} onClick={() => answer("google")}>
              Google Calendar
            </button>
            <button type="button" className={styles.quiet} onClick={() => answer("later")}>
              Not now
            </button>
          </div>
        </>
      )}
    </div>
  );
}
