"use client";
// Option 2, made like Progress: three panes of glass. In the middle the score as Progress shows the
// predicted one, a big number with a line under it in the result's color, the student's character
// beside it with a face for the result, the answers as chips, a bar for each question's time against
// the SAT's pace, and the next step chosen from the result (the one green button, its reason, the
// others small); at the left the set's numbers, each with its little line, and the coins, which fly
// into the corner by themselves; at the right the month, where today's square fills in.
import gsap from "gsap";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { prefersStill } from "@/lib/painting/motion";
import { Buddy } from "@/app/dashboard/student/_portal/HomeworkBuddy";
import { Spark } from "@/app/dashboard/student/_portal/ProgressActivity";
import { Icon } from "@/app/dashboard/student/_portal/practice";
import lib from "@/app/dashboard/student/_portal/library.module.css";
import pa from "@/app/dashboard/student/_portal/progressActivity.module.css";
import pr from "@/app/dashboard/student/_portal/progress.module.css";
import {
  Frame,
  Go,
  Mood,
  Others,
  Pips,
  TONE_COLOR,
  clock,
  nextFor,
  useCoins,
  type SetView,
} from "./parts";
import p from "./parts.module.css";
import o from "./progressEnd.module.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** November 2026, made up: how hard each day before today was worked (0 to 3). Today is the 19th. */
const MONTH = [2, 1, 2, 3, 2, 2, 2, 1, 3, 2, 3, 2, 2, 2, 3, 0, 2, 2];
const TODAY_DATE = 19;
const BEFORE = { questions: 31, minutes: 41, improved: 0 };

export function ProgressEnd({
  mode,
  set,
}: {
  mode: "light" | "dark";
  set: SetView;
  /** Not used here: only option 1 has the transitions. */
  intro?: unknown;
}) {
  const root = useRef<HTMLDivElement>(null);
  const corner = useRef<HTMLDivElement>(null);
  const big = useRef<HTMLElement>(null);
  const [today, setToday] = useState(0);
  const [counted, setCounted] = useState(BEFORE);
  const [streak, setStreak] = useState(16);
  const { burst, coins } = useCoins(set, corner, 2.6);
  const next = nextFor(set);
  const slowest = Math.max(set.testSeconds, ...set.answers.map((a) => a.s));
  const after = {
    questions: BEFORE.questions + set.total,
    minutes: BEFORE.minutes + Math.round((set.paceSeconds * set.total) / 60),
    improved: set.up ? 1 : 0,
  };
  const worked = set.right >= 6 ? 3 : 2;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersStill()) {
      if (big.current) big.current.textContent = String(set.right);
      setToday(worked);
      setStreak(17);
      setCounted(after);
      return;
    }
    const at = { n: 0 };
    const line = gsap.timeline();
    line
      .fromTo(
        el.querySelectorAll("[data-pane]"),
        { y: 30, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.12, ease: "expo.out" }
      )
      .to(
        at,
        {
          n: set.right,
          duration: 1,
          ease: "power2.out",
          onUpdate: () => {
            if (big.current) big.current.textContent = String(Math.round(at.n));
          },
        },
        0.5
      )
      .fromTo(
        el.querySelectorAll("[data-chip]"),
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.35, stagger: 0.07, ease: "back.out(3)" },
        0.7
      )
      .fromTo(
        el.querySelectorAll("[data-bar]"),
        { scaleY: 0 },
        { scaleY: 1, duration: 0.6, stagger: 0.07, ease: "back.out(1.4)" },
        1.0
      )
      .fromTo(
        el.querySelector("[data-line]"),
        { scaleX: 0 },
        { scaleX: 1, duration: 0.8, ease: "power3.inOut" },
        1.4
      )
      .fromTo(
        el.querySelectorAll("[data-cell]"),
        { x: -18, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: "power3.out" },
        0.6
      )
      .fromTo(
        el.querySelectorAll("[data-next]"),
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, stagger: 0.12, ease: "back.out(1.5)" },
        set.tone === "tough" ? 3.4 : 2.2
      )
      .add(() => setToday(1), 2.3)
      .add(() => setToday(worked), 2.7)
      .add(() => {
        setStreak(17);
        const c = { ...BEFORE };
        gsap.to(c, {
          ...after,
          duration: 1,
          ease: "power2.out",
          onUpdate: () =>
            setCounted({
              questions: Math.round(c.questions),
              minutes: Math.round(c.minutes),
              improved: Math.round(c.improved),
            }),
        });
      }, 2.8);
    return () => void line.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set]);

  // today's square pops as it fills
  useEffect(() => {
    if (!today || prefersStill()) return;
    const cell = root.current?.querySelector("[data-today]");
    if (cell)
      gsap.fromTo(
        cell,
        { scale: 1.35 },
        { scale: 1, duration: 0.55, ease: "elastic.out(1, 0.45)" }
      );
  }, [today]);

  let running = 0;
  const rights = set.answers.map((a) => (running += a.ok ? 1 : 0));
  const fast = set.paceSeconds <= set.testSeconds;

  return (
    <Frame mode={mode} title={set.skill} corner={corner} wallet={set.wallet}>
      {burst}
      <div
        className={`${lib.library} ${pr.progress} ${o.page}`}
        ref={root}
        style={{ "--tone": TONE_COLOR[set.tone] } as CSSProperties}
      >
        <section className={`${lib.glass} ${pr.score} ${o.score}`} data-pane aria-label="Score">
          <div className={o.hero}>
            <Mood tone={set.tone}>
              <Buddy size={96} cheer={0} />
            </Mood>
            <div className={pr.head}>
              <h2>{set.verdict}</h2>
              <p className={`${pr.total} ${o.total}`}>
                <b ref={big}>0</b>
                <small className={o.of}> of {set.total}</small>
              </p>
              <p className={pr.ticker} data-way={fast ? "up" : "down"}>
                {fast
                  ? `Faster than the SAT by ${clock(set.testSeconds - set.paceSeconds)} a question`
                  : `Slower than the SAT by ${clock(set.paceSeconds - set.testSeconds)} a question`}
              </p>
            </div>
          </div>
          <div className={`${pr.sections} ${o.chips}`} role="group" aria-label="Your answers">
            {set.answers.map((a, i) => (
              <a
                key={i}
                href={`#q${i + 1}`}
                data-chip
                data-ok={a.ok || undefined}
                className={o.chip}
              >
                {i + 1}
              </a>
            ))}
          </div>
          <div className={o.chart} aria-label="Time on each question">
            <i
              className={o.sat}
              data-line
              style={{ bottom: `${(set.testSeconds / slowest) * 100}%` }}
            >
              <span>SAT pace {set.testPace}</span>
            </i>
            {set.answers.map((a, i) => (
              <span key={i} className={o.col}>
                <i
                  data-bar
                  data-ok={a.ok || undefined}
                  style={{ "--h": `${(a.s / slowest) * 100}%` } as CSSProperties}
                />
                <small>{clock(a.s)}</small>
              </span>
            ))}
          </div>
          <div className={o.next}>
            <p className={p.why} data-next>
              {next.main.why}
            </p>
            <div data-next>
              <Go href={next.main.href}>{next.main.label}</Go>
            </div>
            <div data-next>
              <Others links={next.others} />
            </div>
          </div>
        </section>

        <section className={`${lib.glass} ${pa.stats} ${o.stats}`} data-pane aria-label="The set">
          <ul className={pa.cells}>
            <li data-cell>
              <div className={pa.stat}>
                <span className={pa.name}>Right</span>
                <span className={pa.value}>
                  {set.right}
                  <small> of {set.total}</small>
                </span>
                <span className={pa.tick} data-way={set.right >= 4 ? "up" : "down"}>
                  {set.verdict}
                </span>
                <Spark values={rights} way={set.right >= 4 ? "up" : "down"} />
              </div>
            </li>
            <li data-cell>
              <div className={pa.stat}>
                <span className={pa.name}>Time</span>
                <span className={pa.value}>{set.time}</span>
                <span className={pa.tick} data-way="flat">
                  for {set.total} questions
                </span>
              </div>
            </li>
            <li data-cell>
              <div className={pa.stat}>
                <span className={pa.name}>Pacing</span>
                <span className={pa.value}>
                  {set.pace}
                  <small> per question</small>
                </span>
                <span className={pa.tick} data-way={fast ? "up" : "down"}>
                  SAT {set.testPace}
                </span>
                <Spark values={set.answers.map((a) => a.s)} way={fast ? "up" : "down"} flip />
              </div>
            </li>
            <li data-cell>
              <div className={`${pa.stat} ${o.levelCell}`}>
                <span className={pa.name}>Level</span>
                <span className={o.pips}>
                  <Pips set={set} play />
                </span>
                <span className={pa.tick} data-way={set.up ? "up" : "flat"}>
                  {set.up ? "Up a level" : "Same level"}
                </span>
              </div>
            </li>
            <li data-cell>
              <div className={pa.stat}>
                <span className={pa.name}>Coins</span>
                <span className={o.coins}>{coins}</span>
              </div>
            </li>
          </ul>
        </section>

        <section className={`${lib.glass} ${pa.calendar}`} data-pane aria-label="Calendar">
          <header>
            <span className={pa.month}>
              <h2>November 2026</h2>
            </span>
          </header>
          <p className={pa.tally}>
            <b>{today ? 18 : 17}</b> of {TODAY_DATE} days practiced
          </p>
          <div className={pa.grid} role="group" aria-label="Days">
            {WEEKDAYS.map((name) => (
              <span key={name} className={pa.weekday} aria-hidden="true">
                {name}
              </span>
            ))}
            {Array.from({ length: 30 }, (_, i) => i + 1).map((date) => {
              const isToday = date === TODAY_DATE;
              const lvl = date < TODAY_DATE ? MONTH[date - 1] : isToday ? today : 0;
              return (
                <span
                  key={date}
                  className={pa.day}
                  data-level={lvl}
                  data-out={date > TODAY_DATE || undefined}
                  data-today={isToday || undefined}
                  aria-pressed={isToday}
                >
                  {date}
                </span>
              );
            })}
          </div>
          <div className={pa.detail} aria-live="polite">
            <div className={pa.detailHead}>
              <h3>Thu, November 19</h3>
              <p className={pa.streak}>
                <Icon name="flame" size={18} />
                <b key={streak} className={o.pop}>
                  {streak}
                </b>{" "}
                day streak
              </p>
            </div>
            <dl>
              <div>
                <dd>{counted.questions}</dd>
                <dt>questions</dt>
              </div>
              <div>
                <dd>{counted.minutes}m</dd>
                <dt>invested</dt>
              </div>
              <div>
                <dd>{counted.improved}</dd>
                <dt>{counted.improved === 1 ? "skill improved" : "skills improved"}</dt>
              </div>
            </dl>
          </div>
        </section>
      </div>
    </Frame>
  );
}
