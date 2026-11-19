"use client";
// Option 1, made like Homework: across the top a strip of glass with how the set went and its
// numbers in the clock's boxes; at the left the student's character inside a ring that fills to the
// score, its face and its words following the result, the level's bars, and the coins, which fly up
// into the corner by themselves; at the right the next step, chosen from the result, as the one
// green button with its reason, the others small under it, and each answer as a row of tinted glass.
import gsap from "gsap";
import { useEffect, useRef, type CSSProperties } from "react";
import { prefersStill } from "@/lib/painting/motion";
import { Buddy, Ticker } from "../shell/HomeworkBuddy";
import hw from "../shell/homework.module.css";
import lib from "../shell/library.module.css";
import {
  Frame,
  Go,
  Mood,
  Others,
  Pips,
  TONE_COLOR,
  clock,
  linesFor,
  nextFor,
  useCoins,
  type SetView,
} from "./parts";
import p from "./parts.module.css";
import o from "./homeworkEnd.module.css";

const R = 74;
const ROUND = 2 * Math.PI * R;

export function HomeworkEnd({ mode, set }: { mode: "light" | "dark"; set: SetView }) {
  const root = useRef<HTMLDivElement>(null);
  const corner = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const score = useRef<HTMLElement>(null);
  const { burst, coins } = useCoins(set, corner, 2.6);
  const next = nextFor(set);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const share = set.right / set.total;
    if (prefersStill()) {
      ring.current?.setAttribute("stroke-dashoffset", String(ROUND * (1 - share)));
      if (score.current) score.current.textContent = String(set.right);
      return;
    }
    const at = { n: 0 };
    const line = gsap.timeline();
    line
      .fromTo(
        el.querySelectorAll("[data-pane]"),
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "expo.out" }
      )
      .fromTo(
        el.querySelectorAll("[data-box]"),
        { y: 14, opacity: 0, scale: 0.8 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(2)" },
        0.4
      )
      .to(
        at,
        {
          n: set.right,
          duration: 1.1,
          ease: "power2.inOut",
          onUpdate: () => {
            ring.current?.setAttribute("stroke-dashoffset", String(ROUND * (1 - at.n / set.total)));
            if (score.current) score.current.textContent = String(Math.round(at.n));
          },
        },
        0.5
      )
      .fromTo(
        el.querySelectorAll("[data-answer]"),
        { x: 24, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "back.out(1.6)" },
        0.9
      )
      .fromTo(
        el.querySelectorAll("[data-next]"),
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, stagger: 0.12, ease: "back.out(1.5)" },
        set.tone === "tough" ? 3.4 : 2.0
      );
    return () => void line.kill();
  }, [set]);

  return (
    <Frame mode={mode} title={set.skill} corner={corner} wallet={set.wallet}>
      {burst}
      <div
        className={`${lib.library} ${hw.homework} ${o.page}`}
        ref={root}
        style={{ "--tone": TONE_COLOR[set.tone] } as CSSProperties}
      >
        <section className={`${lib.glass} ${o.strip}`} data-pane aria-label="The set">
          <div>
            <h2 className={o.verdict}>{set.verdict}</h2>
            <p className={o.sub}>
              {set.domain} · {set.total} questions
            </p>
          </div>
          <span className={`${hw.clock} ${o.boxes}`}>
            <span data-box>
              <b>
                <em ref={score}>0</em>/{set.total}
              </b>
              right
            </span>
            <span data-box>
              <b>{set.time}</b>
              time
            </span>
            <span data-box data-slow={set.paceSeconds > set.testSeconds || undefined}>
              <b>{set.pace}</b>a question
            </span>
          </span>
        </section>

        <section className={`${lib.glass} ${hw.side} ${o.side}`} data-pane aria-label="You">
          <div className={hw.ring}>
            <svg viewBox="0 0 168 168" width="168" height="168" aria-hidden="true">
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
            <Mood tone={set.tone}>
              <Buddy size={104} cheer={0} />
            </Mood>
          </div>
          <Ticker lines={linesFor(set)} />
          <p className={o.levelRow}>
            <span>Your level</span>
            <Pips set={set} play />
          </p>
          <p className={o.coinRow}>{coins}</p>
        </section>

        <section className={`${lib.glass} ${hw.main} ${o.main}`} data-pane aria-label="What next">
          <div className={o.next}>
            <h2 className={o.h} data-next>
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
          </div>
          <h2 className={o.h}>Answers</h2>
          <ol className={o.answers}>
            {set.answers.map((a, i) => (
              <li key={i} data-answer>
                <a
                  href={`#q${i + 1}`}
                  className={`${hw.work} ${o.answer}`}
                  style={{ "--kind": a.ok ? "#22c36b" : "#f0412f" } as CSSProperties}
                >
                  <i className={o.num}>{i + 1}</i>
                  <span>
                    <b>{a.ok ? "Right" : "Missed"}</b>
                    <small>{clock(a.s)}</small>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Frame>
  );
}
