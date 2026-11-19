"use client";
// Option 1, made like Homework (founder's notes, 2026-11-19). A skill set is about accuracy, not
// time, so no time is shown anywhere.
//   Left    the student's character, dressed as they have it, inside a ring that fills to the score
//           and changes color as it goes (red, orange, yellow, green; gold only when every answer
//           is right); under it how the set went, the line the character says, the level's bars,
//           and the coins, which fly up into the corner by themselves.
//   Right   the score as a percent at the top right, each answer as a pane of glass (correct or
//           incorrect), and at the bottom right the next step chosen from the result: the one
//           green glowing button, the other steps small and centered under it.
// A run of right answers in a row long enough for the next level plays the level-up moment.
import gsap from "gsap";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { prefersStill } from "@/lib/painting/motion";
import { Buddy, Ticker } from "../shell/HomeworkBuddy";
import hw from "../shell/homework.module.css";
import lib from "../shell/library.module.css";
import { Intro } from "./Intro";
import { LevelUp } from "./LevelUp";
import {
  Frame,
  Go,
  Mood,
  Others,
  Pips,
  linesFor,
  nextFor,
  ringColor,
  useCoins,
  type SetView,
} from "./parts";
import o from "./homeworkEnd.module.css";

const R = 74;
const ROUND = 2 * Math.PI * R;

export function HomeworkEnd({
  mode,
  set,
  intro = false,
}: {
  mode: "light" | "dark";
  set: SetView;
  /** Open on the last question, whose glass breaks and becomes the ring (Intro.tsx). */
  intro?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const ringSvg = useRef<SVGSVGElement>(null);
  const [begun, setBegun] = useState(!intro);
  const corner = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const percent = useRef<HTMLElement>(null);
  const levelRow = useRef<HTMLParagraphElement>(null);
  const [leveled, setLeveled] = useState(false);
  const { burst, coins } = useCoins(set, corner, 2.4, begun);
  const next = nextFor(set);
  const share = set.right / set.total;
  const final = ringColor(share);

  useEffect(() => {
    const el = root.current;
    if (!el || !begun) return;
    const paint = (f: number) => {
      const c = ringColor(f);
      ring.current?.setAttribute("stroke-dashoffset", String(ROUND * (1 - f)));
      el.style.setProperty("--ring", c);
      if (percent.current) percent.current.textContent = `${Math.round(f * 100)}%`;
    };
    if (prefersStill()) {
      paint(share);
      return;
    }
    paint(0);
    const at = { f: 0 };
    // everything opens out of the ring: where its middle is on the screen
    const box = ringSvg.current?.getBoundingClientRect();
    const rx = box ? box.left + box.width / 2 : 0;
    const ry = box ? box.top + box.height / 2 : 0;
    const [side, main] = Array.from(el.querySelectorAll<HTMLElement>("[data-pane]"));
    // the panes open from the ring's own edge, so the ring is never lost
    const edge = box ? box.width / 2 + 6 : 0;
    const from = (pane: HTMLElement) => {
      const b = pane.getBoundingClientRect();
      return `${rx - b.left}px ${ry - b.top}px`;
    };
    const line = gsap.timeline();
    line
      .fromTo(
        side,
        { clipPath: `circle(${edge}px at ${from(side)})` },
        {
          clipPath: `circle(${Math.max(window.innerWidth, window.innerHeight) * 1.5}px at ${from(side)})`,
          duration: 1.2,
          ease: "power2.in",
          clearProps: "clipPath",
        },
        0
      )
      .fromTo(
        main,
        { clipPath: `circle(${edge}px at ${from(main)})` },
        {
          clipPath: `circle(${Math.max(window.innerWidth, window.innerHeight) * 1.6}px at ${from(main)})`,
          duration: 1.4,
          ease: "power2.in",
          clearProps: "clipPath",
        },
        0.2
      )
      // the character pops into the ring
      .fromTo(
        el.querySelector("[data-pop]"),
        { scale: 0, rotation: -30 },
        { scale: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" },
        0.15
      )
      // the ring fills, and its color moves with it
      .to(at, { f: share, duration: 1.4, ease: "power2.inOut", onUpdate: () => paint(at.f) }, 0.5)
      .fromTo(
        el.querySelectorAll("[data-about]"),
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.08, ease: "power3.out" },
        1.0
      );
    // the answers fly out of the ring to their places, one after another
    el.querySelectorAll<HTMLElement>("[data-answer]").forEach((a, i) => {
      const b = a.getBoundingClientRect();
      line.fromTo(
        a,
        {
          x: rx - (b.left + b.width / 2),
          y: ry - (b.top + b.height / 2),
          scale: 0.2,
          opacity: 0,
          rotation: -12,
        },
        { x: 0, y: 0, scale: 1, opacity: 1, rotation: 0, duration: 0.75, ease: "back.out(1.3)" },
        0.55 + i * 0.07
      );
    });
    line.fromTo(
      el.querySelectorAll("[data-next]"),
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.12, ease: "back.out(1.5)" },
      set.up ? 7.4 : 3.0
    );
    // a closed ring shines once it is gold
    if (share === 1)
      line.fromTo(
        ring.current,
        { strokeWidth: 10 },
        { strokeWidth: 14, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" },
        1.95
      );
    return () => void line.kill();
  }, [set, share, begun]);

  return (
    <Frame mode={mode} title={set.skill} corner={corner} wallet={set.wallet}>
      {burst}
      {intro && !begun && <Intro mode={mode} target={ringSvg} onLanded={() => setBegun(true)} />}
      {begun && set.up && (
        <LevelUp set={set} after={2.9} target={levelRow} onDone={() => setLeveled(true)} />
      )}
      <div
        className={`${lib.library} ${hw.homework} ${o.page}`}
        ref={root}
        data-held={!begun || undefined}
        style={{ "--ring": final } as CSSProperties}
      >
        <section className={`${lib.glass} ${hw.side} ${o.side}`} data-pane aria-label="You">
          <div className={`${hw.ring} ${o.ring}`} data-gold={share === 1 || undefined}>
            <svg ref={ringSvg} viewBox="0 0 168 168" width="168" height="168" aria-hidden="true">
              <circle cx="84" cy="84" r={R} className={hw.track} />
              <circle
                ref={ring}
                cx="84"
                cy="84"
                r={R}
                className={`${hw.fill} ${o.fill}`}
                strokeDasharray={ROUND}
                strokeDashoffset={ROUND}
                transform="rotate(-90 84 84)"
              />
            </svg>
            {begun && (
              <span className={o.pop} data-pop>
                <Mood tone={set.tone}>
                  <Buddy size={104} cheer={0} />
                </Mood>
              </span>
            )}
          </div>
          <div className={o.about}>
            <h2 className={o.verdict} data-about>
              {set.verdict}
            </h2>
            <p className={o.sub} data-about>
              {set.skill} · {set.domain}
            </p>
          </div>
          <Ticker lines={linesFor(set)} />
          <p className={o.levelRow} ref={levelRow} data-lit={leveled || undefined}>
            <span>Your level</span>
            <Pips set={set} play={leveled} delay={0} />
          </p>
          <p className={o.coinRow}>{coins}</p>
        </section>

        <section className={`${lib.glass} ${hw.main} ${o.main}`} data-pane aria-label="Answers">
          <header className={o.head}>
            <h2 className={o.h}>Answers</h2>
            <b className={o.percent} ref={percent} aria-label={`${set.percent} percent`}>
              0%
            </b>
          </header>
          <ol className={o.answers}>
            {set.answers.map((a, i) => (
              <li key={i} data-answer>
                <a href={`#q${i + 1}`} className={o.answer} data-ok={a.ok || undefined}>
                  <i className={o.num}>{i + 1}</i>
                  <b>{a.ok ? "Correct" : "Incorrect"}</b>
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    {a.ok ? (
                      <path d="M5 12.500l4.500 4.500L19 7.500" />
                    ) : (
                      <path d="M7 7l10 10M17 7L7 17" />
                    )}
                  </svg>
                </a>
              </li>
            ))}
          </ol>
          <div className={o.next}>
            <div data-next>
              <Go href={next.main.href}>{next.main.label}</Go>
            </div>
            <div data-next>
              <Others links={next.others} />
            </div>
          </div>
        </section>
      </div>
    </Frame>
  );
}
