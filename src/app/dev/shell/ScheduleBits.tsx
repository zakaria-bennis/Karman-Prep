"use client";

// Schedule's smaller parts: the hours as squares beside the student's character, the next session
// on a painting of its own sky, the buttons that move or cancel a session, a past session with its
// recording, and the offer to keep sessions in the family's own calendar.
import gsap from "gsap";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Buddy } from "./HomeworkBuddy";
import { calm, cut, two } from "./homeworkMotion";
import { AppleCalendarLogo, GoogleCalendarLogo } from "./ScheduleLogos";
import PhotoScene from "./SchedulePhoto";
import { PLACE_NAMES, pictureFor, plain, type Place } from "./scenes/photos";
import { breathe, press, useCount } from "./scheduleMotion";
import {
  MIN,
  RULES,
  changeOf,
  clock,
  dateLong,
  doorOf,
  endOf,
  expiresAt,
  hoursText,
  lengthText,
  meetingOf,
  monthDay,
  movesBack,
  movesLeft,
  recordingUntil,
  skyOf,
  subjectOf,
  type Account,
  type Session,
  type Sky,
} from "./scheduleData";
import { schedule, tutorFirst, type Sync } from "./scheduleStore";
import { chosen, tick } from "./sound";
import styles from "./schedule.module.css";
import hrs from "./scheduleHours.module.css";
import past from "./schedulePast.module.css";

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
    return <p className={styles.rule}>Inside 24 hours. Message {tutorFirst()} to change it.</p>;
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
        className={styles.move}
        disabled={!change.move}
        onClick={(e) => {
          tick();
          press(e.currentTarget);
          onMove(session);
        }}
      >
        <svg
          viewBox="0 0 20 20"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M3 7h12M12 3.500L15.500 7 12 10.500M17 13H5M8 9.500L4.500 13 8 16.500" />
        </svg>
        Move
      </button>
      <button type="button" className={styles.cancel} onClick={() => setAsking(true)}>
        <svg
          viewBox="0 0 20 20"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M5.500 5.500l9 9M14.500 5.500l-9 9" />
        </svg>
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

/** How long until a time, said shortly: "2d 16h", "16h 03m", "12m 30s". */
export function until(ms: number): string {
  const left = cut(ms);
  if (left.days > 0) return `${left.days}d ${left.hours}h`;
  if (left.hours > 0) return `${left.hours}h ${two(left.minutes)}m`;
  return `${left.minutes}m ${two(left.seconds)}s`;
}

/** What is behind the next session: a painting made from a real photograph of a place in that
 *  hour's light, brought to life (SchedulePhoto.tsx). Each session has its own place (`seed` is
 *  its start). The page's ?place=beach and so on shows one place, and ?photo=real the plain
 *  photograph, the backup. */
function Backdrop({ sky, seed }: { sky: Sky; seed: number }) {
  const q = useSearchParams();
  const asked = q.get("place") as Place | null;
  const picture = pictureFor(seed, sky, asked && PLACE_NAMES.includes(asked) ? asked : undefined);
  return (
    <PhotoScene
      photo={q.get("photo") === "real" ? plain(picture) : picture}
      night={sky === "night"}
      className={styles.scene}
    />
  );
}

/** The next session, on a painting of a place in the light of its time: when it is, what it is
 *  for, and Join right on the card. Until five minutes before, Join says how long is left; then
 *  it is the page's green button. Move and Cancel sit beside it. */
export function Next({
  account,
  session,
  now,
  sky,
  onMove,
}: {
  account: Account;
  session: Session;
  now: number;
  /** To look at one light whatever the time or the session (the page's ?sky=). */
  sky?: Sky;
  onMove: (session: Session) => void;
}) {
  const door = doorOf(session, now);
  const join = useRef<HTMLButtonElement>(null);
  useEffect(() => (door === "open" ? breathe(join.current) : undefined), [door]);
  // not joined ten minutes in: the session is closed and its hours are used
  useEffect(() => {
    if (door === "closed") schedule.miss(session.id);
  }, [door, session.id]);
  return (
    <>
      <Backdrop sky={sky ?? skyOf(session.start)} seed={session.start} />
      <div className={styles.over}>
        <h2>{dateLong(session.start)}</h2>
        <p className={styles.time}>
          {clock(session.start)} to {clock(endOf(session))}
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
        <div className={styles.acts}>
          {door === "in" ? (
            <p className={styles.live}>
              <i aria-hidden="true" />
              In session until {clock(endOf(session))}
            </p>
          ) : (
            <button
              type="button"
              ref={join}
              className={styles.join}
              disabled={door !== "open"}
              onClick={() => {
                chosen();
                // the meeting itself, in its own tab (a Zoom link, once the tutor's and the
                // admin's portals set one on the session)
                const meeting = meetingOf(session);
                if (meeting) window.open(meeting, "_blank", "noopener,noreferrer");
                schedule.join(session.id);
              }}
            >
              Join
              {door === "early" && (
                <small role="timer" aria-label="Time until this session">
                  in {until(session.start - now)}
                </small>
              )}
            </button>
          )}
          {door === "early" && (
            <Changes account={account} session={session} now={now} onMove={onMove} />
          )}
          {door === "open" && (
            <small>
              {now < session.start
                ? `Starts in ${Math.max(1, Math.ceil((session.start - now) / MIN))} min`
                : `Closes ${clock(session.start + RULES.graceMinutes * MIN)}`}
            </small>
          )}
        </div>
      </div>
    </>
  );
}

/** Nothing is booked: the sky as it is now, and the words. */
export function Idle({ now, sky }: { now: number; sky?: Sky }) {
  return (
    <>
      <Backdrop sky={sky ?? skyOf(now)} seed={new Date(now).setHours(0, 0, 0, 0)} />
      <div className={styles.over}>
        <h2>Nothing booked</h2>
      </div>
    </>
  );
}

type Kind = "used" | "booked" | "left";
/** The most squares drawn: beyond this the rest is said as a number. */
const MOST = 50;

/** The hours: the student's own character, the number left, and a square for every hour (green
 *  and glowing is free to book, blue is booked, clear is used; a half hour is half a square). The
 *  squares fit themselves to as many as fifty. A square that changes pops; hours just bought land
 *  one after another. */
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
  const halves = (n: number) => Math.round(n * 2);
  const row: Kind[] = [
    ...Array<Kind>(halves(used)).fill("used"),
    ...Array<Kind>(halves(booked)).fill("booked"),
    ...Array<Kind>(halves(left)).fill("left"),
  ];
  const units = Array.from({ length: Math.ceil(row.length / 2) }, (_, n) => ({
    a: row[n * 2],
    b: row[n * 2 + 1] ?? null,
  }));
  const drawn = units.slice(0, MOST);
  const key = drawn.map((u) => `${u.a[0]}${u.b?.[0] ?? "-"}`).join("");
  const cells = useRef<HTMLDivElement>(null);
  const before = useRef<string | null>(null);
  useEffect(() => {
    const el = cells.current;
    const was = before.current;
    before.current = key;
    if (!el || calm()) return;
    const all = Array.from(el.querySelectorAll<HTMLElement>("i"));
    // the first time every square arrives; after that only the ones that changed
    const changed = all.filter(
      (_, n) => was === null || key.slice(n * 2, n * 2 + 2) !== was.slice(n * 2, n * 2 + 2)
    );
    if (changed.length === 0) return;
    gsap.fromTo(
      changed,
      { scale: 0, rotate: -30, opacity: 0 },
      {
        scale: 1,
        rotate: 0,
        opacity: 1,
        duration: 0.5,
        stagger: was === null ? 0.012 : 0.06,
        ease: "back.out(2.4)",
        clearProps: "transform,opacity",
      }
    );
  }, [key]);
  return (
    <>
      <div className={hrs.buddy}>
        <Buddy size={92} cheer={cheer} />
      </div>
      <div className={hrs.hours}>
        <p className={hrs.count}>
          <b>{hoursText(shown)}</b>
          <span>{left === 1 ? "hour left" : "hours left"}</span>
        </p>
        <p className={hrs.fine}>
          <span>Use by {monthDay(expiresAt(account)).replace(/ \d+,/, "")}</span>
          {account.pack === "private-10" && <span>60 min a week</span>}
        </p>
      </div>
      <div
        className={hrs.cells}
        ref={cells}
        data-size={drawn.length > 30 ? "s" : "l"}
        role="img"
        aria-label={`${hoursText(left)} hours free, ${hoursText(booked)} booked, ${hoursText(used)} used`}
      >
        {drawn.map((u, n) => (
          <i
            key={n}
            data-kind={u.a}
            data-half={u.b && u.b !== u.a ? u.b : u.b === null ? "none" : undefined}
          />
        ))}
        {units.length > MOST && <span>+{units.length - MOST}</span>}
      </div>
      <button
        type="button"
        className={hrs.plus}
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
            <span>{tutorFirst()[0]}</span>
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

/** Offered once, on first opening: keep sessions in the family's own calendar. On a wide screen it
 *  is a small banner that slides in at the top right (after the night's music offer, if that is
 *  showing); on a phone it is the first thing on the page. Declined, the choice lives in Settings.
 *  (A stand-in: nothing is connected yet.) */
export function SyncOffer({ sync }: { sync: Sync }) {
  const el = useRef<HTMLDivElement>(null);
  const [said, setSaid] = useState<"apple" | "google" | null>(null);
  const [wide, setWide] = useState<boolean | null>(null);
  const [clear, setClear] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 960px)");
    const read = () => setWide(media.matches);
    read();
    media.addEventListener("change", read);
    // it waits its turn: the corner may be taken by the music offer
    const timer = window.setInterval(() => {
      const music = document.querySelector('[class*="musicOffer"]');
      if (!music || music.getClientRects().length === 0) {
        setClear(true);
        window.clearInterval(timer);
      }
    }, 500);
    return () => {
      media.removeEventListener("change", read);
      window.clearInterval(timer);
    };
  }, []);
  const showing = (sync === "ask" || said !== null) && wide !== null && (!wide || clear);
  useEffect(() => {
    if (!showing || !el.current || calm()) return;
    gsap.fromTo(el.current, wide ? { x: 60, opacity: 0 } : { y: -12, opacity: 0 }, {
      x: 0,
      y: 0,
      opacity: 1,
      duration: 0.6,
      ease: "expo.out",
      clearProps: "transform,opacity",
    });
  }, [showing, wide]);
  if (!showing) return null;
  const away = (then: () => void) => {
    if (!el.current || calm()) return then();
    gsap.to(el.current, {
      ...(wide ? { x: 80 } : { height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: -12 }),
      opacity: 0,
      duration: 0.4,
      ease: "power3.in",
      onComplete: then,
    });
  };
  const answer = (choice: "apple" | "google" | "later") => {
    tick();
    if (choice === "later") return away(() => schedule.sync("later"));
    setSaid(choice);
    window.setTimeout(() => away(() => schedule.sync(choice)), 1700);
  };
  const body = (
    <div className={styles.sync} ref={el} data-float={wide || undefined}>
      {said ? (
        <p role="status">
          {said === "apple" ? <AppleCalendarLogo size={22} /> : <GoogleCalendarLogo size={22} />}
          Added to {said === "apple" ? "Apple" : "Google"} Calendar
        </p>
      ) : (
        <>
          <b>Add sessions to your calendar</b>
          <button type="button" onClick={() => answer("apple")}>
            <AppleCalendarLogo size={22} />
            Apple Calendar
          </button>
          <button type="button" onClick={() => answer("google")}>
            <GoogleCalendarLogo size={22} />
            Google Calendar
          </button>
          <button type="button" data-quiet onClick={() => answer("later")}>
            Not now
          </button>
        </>
      )}
    </div>
  );
  const shell = wide ? document.querySelector(".kp-shell") : null;
  return shell ? createPortal(body, shell) : body;
}
