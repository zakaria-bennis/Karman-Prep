"use client";

// Schedule's smaller parts: the next session with its clock and Join, the buttons that move or
// cancel a session, a past session with its recording, adding hours, and the offer to keep sessions
// in the family's own calendar.
import { useEffect, useRef, useState } from "react";
import { cut, two } from "./homeworkMotion";
import { Buddy } from "./HomeworkBuddy";
import { TodIcon } from "./ScheduleBook";
import { breathe, fold, pop, press, useCount } from "./scheduleMotion";
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
  recordingUntil,
  subjectOf,
  todOf,
  zone,
  type Account,
  type Session,
} from "./scheduleData";
import { schedule, type Sync } from "./scheduleStore";
import { chosen, tick } from "./sound";
import styles from "./schedule.module.css";
import past from "./schedulePast.module.css";

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
    return <p className={styles.rule}>Inside 24 hours. Message {first} to change it.</p>;
  if (asking)
    return (
      <div className={styles.ask}>
        <p>
          Cancel? {lengthText(session.minutes)} goes back.
          {change.late && " Uses your one late change."}
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
          ? "Uses your one late change"
          : change.why === "moves"
            ? `Moves return ${monthDay(movesBack(now)).replace(/, \d+$/, "")}`
            : `${left} ${left === 1 ? "move" : "moves"} left`}
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
        <p className={styles.with}>
          <i aria-hidden="true">{first[0]}</i>
          {TUTOR}
        </p>
        <h2>{dateLong(session.start)}</h2>
        <p>
          <TodIcon tod={todOf(session.start)} />
          {clock(session.start)} to {clock(endOf(session))} {zone()}
        </p>
        {(session.focus.length > 0 || session.note) && (
          <p className={styles.tags}>
            {session.focus.map((f) => (
              <span key={f} data-kind={subjectOf(f)}>
                {f}
              </span>
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
          Closes {clock(session.start + RULES.graceMinutes * MIN)}. Ends {clock(endOf(session))}.
        </p>
      )}
    </>
  );
}

/** The hours: the student's own character, the number left, and a bead for every hour of the
 *  package (green is free to book, blue is booked, clear is used). The beads pop in when they
 *  change. */
export function Hours({
  left,
  booked,
  used,
  account,
  cheer,
  onBuy,
}: {
  left: number;
  booked: number;
  used: number;
  account: Account;
  cheer: number;
  onBuy: () => void;
}) {
  const shown = useCount(left);
  const beads = useRef<HTMLDivElement>(null);
  // half hours are drawn as half beads, so the row is counted in halves
  const halves = (n: number) => Math.round(n * 2);
  const row: ("used" | "booked" | "left")[] = [
    ...Array<"used">(halves(used)).fill("used"),
    ...Array<"booked">(halves(booked)).fill("booked"),
    ...Array<"left">(halves(left)).fill("left"),
  ];
  const key = `${halves(used)}-${halves(booked)}-${halves(left)}`;
  useEffect(() => pop(beads.current), [key]);
  return (
    <>
      <div className={styles.buddy}>
        <Buddy size={92} cheer={cheer} />
      </div>
      <div className={styles.hours}>
        <p className={styles.count}>
          <b>{hoursText(shown)}</b>
          <span>{left === 1 ? "hour left" : "hours left"}</span>
        </p>
        <div
          className={styles.beads}
          ref={beads}
          role="img"
          aria-label={`${hoursText(left)} hours free, ${hoursText(booked)} booked, ${hoursText(used)} used`}
        >
          {Array.from({ length: Math.ceil(row.length / 2) }, (_, n) => (
            <span key={n}>
              <i data-kind={row[n * 2]} />
              {row[n * 2 + 1] && <i data-kind={row[n * 2 + 1]} />}
            </span>
          ))}
        </div>
        <p className={styles.fine}>
          <span>Use by {monthDay(expiresAt(account)).replace(/ \d+,/, "")}</span>
          {account.pack === "private-10" && <span>60 min a week</span>}
        </p>
      </div>
      <button
        type="button"
        className={styles.plus}
        onClick={(e) => {
          tick();
          press(e.currentTarget);
          onBuy();
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M5 12h14M12 5v14" />
        </svg>
        Add hours
      </button>
    </>
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
    <div className={past.past}>
      <header className={past.paneHead}>
        <h2>{dateLong(session.start)}</h2>
        <button type="button" className={styles.quiet} onClick={onDone}>
          Back
        </button>
      </header>
      {session.state === "missed" ? (
        <p className={past.gone}>
          You had not joined {RULES.graceMinutes} minutes in, so this session closed and its time
          was used.
        </p>
      ) : kept ? (
        <div className={past.player} data-playing={playing || undefined}>
          <div className={past.screen}>
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
        <p className={past.gone}>
          Recordings are kept for {RULES.recordingMonths} months. This one is no longer here.
        </p>
      )}
      {recap && (
        <>
          <section>
            <h3>Notes</h3>
            <p className={past.notes}>{recap.notes}</p>
          </section>
          {recap.covered.length > 0 && (
            <section>
              <h3>Covered</h3>
              <p className={styles.tags} style={{ marginTop: 0 }}>
                {recap.covered.map((skill) => (
                  <span key={skill} data-kind={subjectOf(skill)}>
                    {skill}
                  </span>
                ))}
              </p>
            </section>
          )}
          {recap.homework.length > 0 && (
            <section>
              <h3>Homework</h3>
              <ul className={past.set}>
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
          <b>Added to {said === "apple" ? "Apple" : "Google"} Calendar</b>
        </p>
      ) : (
        <>
          <p>
            <b>Add sessions to your calendar</b>
          </p>
          <div>
            <button type="button" className={styles.add} onClick={() => answer("apple")}>
              Apple
            </button>
            <button type="button" className={styles.add} onClick={() => answer("google")}>
              Google
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
