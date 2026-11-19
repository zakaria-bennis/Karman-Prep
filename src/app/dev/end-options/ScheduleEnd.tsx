"use client";
// Option 3, made like Schedule: at the top left the student's character, with a face for the result,
// and how the set went, as Schedule shows the hours left, with a square for each answer (they pop in
// one by one, green for right and red for missed) and the coins, which fly into the corner by
// themselves; under it the next step, chosen from the result, on a pane tinted the result's color:
// its reason, the one green button, the others small; at the right, Work on: the questions missed,
// the pacing and the level, as the booking pane lists what to work on, and each question's time.
import gsap from "gsap";
import { useEffect, useRef, type CSSProperties } from "react";
import { prefersStill } from "@/lib/painting/motion";
import { Buddy } from "../shell/HomeworkBuddy";
import book from "../shell/scheduleBook.module.css";
import hrs from "../shell/scheduleHours.module.css";
import sch from "../shell/schedule.module.css";
import lib from "../shell/library.module.css";
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
import o from "./scheduleEnd.module.css";

const CHECK = <path d="M3.500 8.300l3 3 6-6.600" />;

export function ScheduleEnd({ mode, set }: { mode: "light" | "dark"; set: SetView }) {
  const root = useRef<HTMLDivElement>(null);
  const corner = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLElement>(null);
  const { burst, coins } = useCoins(set, corner, 2.6);
  const next = nextFor(set);
  const slowest = Math.max(...set.answers.map((a) => a.s));
  const fast = set.paceSeconds <= set.testSeconds;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersStill()) {
      if (count.current) count.current.textContent = String(set.right);
      return;
    }
    const at = { n: 0 };
    const line = gsap.timeline();
    line
      .fromTo(
        el.querySelectorAll("[data-pane]"),
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.12, ease: "expo.out" }
      )
      .fromTo(
        el.querySelectorAll("[data-sq]"),
        { scale: 0, rotate: -30, opacity: 0 },
        { scale: 1, rotate: 0, opacity: 1, duration: 0.5, stagger: 0.11, ease: "back.out(2.4)" },
        0.5
      )
      .to(
        at,
        {
          n: set.right,
          duration: 1,
          ease: "power2.out",
          onUpdate: () => {
            if (count.current) count.current.textContent = String(Math.round(at.n));
          },
        },
        0.5
      )
      .fromTo(
        el.querySelectorAll("[data-pick]"),
        { x: 30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.09, ease: "back.out(1.6)" },
        1.0
      )
      .fromTo(
        el.querySelectorAll("[data-next]"),
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, stagger: 0.12, ease: "back.out(1.5)" },
        set.tone === "tough" ? 3.4 : 2.2
      );
    return () => void line.kill();
  }, [set]);

  return (
    <Frame mode={mode} title={set.skill} corner={corner} wallet={set.wallet}>
      {burst}
      <div
        className={`${lib.library} ${sch.schedule} ${o.page}`}
        ref={root}
        style={{ "--tone": TONE_COLOR[set.tone] } as CSSProperties}
      >
        <section className={`${lib.glass} ${hrs.left}`} data-pane aria-label="How it went">
          <div className={hrs.buddy}>
            <Mood tone={set.tone}>
              <Buddy size={92} cheer={0} />
            </Mood>
          </div>
          <div className={hrs.hours}>
            <p className={hrs.count}>
              <b className={o.score}>
                <em ref={count}>0</em>
                <small>/{set.total}</small>
              </b>
              <span>{set.verdict.toLowerCase()}</span>
            </p>
            <p className={hrs.fine}>
              <span>{set.time}</span>
              <span>{set.pace} a question</span>
            </p>
          </div>
          <div
            className={`${hrs.cells} ${o.cells}`}
            data-size="l"
            role="img"
            aria-label={`${set.right} of ${set.total} right`}
          >
            {set.answers.map((a, i) => (
              <i
                key={i}
                data-sq
                data-kind={a.ok ? "left" : "used"}
                data-miss={!a.ok || undefined}
              />
            ))}
          </div>
          <p className={o.coinRow}>{coins}</p>
        </section>

        <section className={`${lib.glass} ${o.next}`} data-pane aria-label="Next">
          <h2 className={o.title} data-next>
            Next
          </h2>
          <p className={p.why} data-next>
            {next.main.why}
          </p>
          <div data-next>
            <Go href={next.main.href}>{next.main.label}</Go>
          </div>
          <div data-next>
            <Others links={next.others} />
          </div>
        </section>

        <section className={`${lib.glass} ${sch.pane} ${o.pane}`} data-pane aria-label="Work on">
          <h2 className={o.title}>Work on</h2>
          <div className={book.focus}>
            <ol className={book.picks}>
              {set.answers.map((a, i) =>
                a.ok ? null : (
                  <li key={i} data-pick>
                    <a href={`#q${i + 1}`} className={o.pick} data-kind="rw">
                      <i aria-hidden="true">
                        <svg
                          viewBox="0 0 16 16"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                        >
                          {CHECK}
                        </svg>
                      </i>
                      <b>Question {i + 1}</b>
                      <small>Missed · {clock(a.s)}</small>
                    </a>
                  </li>
                )
              )}
              <li data-pick>
                <span className={o.pick} data-kind={fast ? "math" : "rw"} aria-pressed={fast}>
                  <i aria-hidden="true">
                    <svg
                      viewBox="0 0 16 16"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                    >
                      {CHECK}
                    </svg>
                  </i>
                  <b>Pacing</b>
                  <small>
                    {set.pace} a question · SAT {set.testPace}
                  </small>
                </span>
              </li>
              <li data-pick>
                <span className={o.pick} data-kind="test" aria-pressed={set.up}>
                  <i aria-hidden="true">
                    <svg
                      viewBox="0 0 16 16"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                    >
                      {CHECK}
                    </svg>
                  </i>
                  <b>{set.skill}</b>
                  <Pips set={set} play />
                </span>
              </li>
            </ol>
          </div>
          <h3 className={o.sub}>Time on each question</h3>
          <ol className={o.strip} aria-label="Each answer's time">
            {set.answers.map((a, i) => (
              <li
                key={i}
                data-pick
                data-ok={a.ok || undefined}
                style={{ "--h": `${(a.s / slowest) * 100}%` } as CSSProperties}
              >
                <i aria-hidden="true" />
                <b>{i + 1}</b>
                <small>{clock(a.s)}</small>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Frame>
  );
}
