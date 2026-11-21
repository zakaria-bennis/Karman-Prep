"use client";
// Option 1, made like Homework (founder's notes, 2026-11-19). A skill set is about accuracy, not
// time, so no time is shown anywhere.
//   Left    the student's character, dressed as they have it, inside a ring that fills to the score
//           and changes color as it goes (red, orange, yellow, green; gold only when every answer
//           is right); right under it the score as a percent, then how the set went, the skill's
//           stage (Karman's tails, TailsStage.tsx), and the coins, which fly up into the corner by themselves. No subtexts a student
//           can do without (founder, 2026-11-19).
//   Right   each answer as a pane of glass (correct or incorrect), and at the bottom right the next
//           step chosen from the result: the one green glowing button, the others small under it.
// A good set is celebrated by the character once it is home in its pane.
// A run of right answers in a row long enough for the next level plays the level-up moment.
import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { confetti } from "@/components/quiz-flows/stage-motion";
import { prefersStill } from "@/lib/painting/motion";
import { Buddy } from "../shell/HomeworkBuddy";
import hw from "../shell/homework.module.css";
import lib from "../shell/library.module.css";
import { Intro, type IntroKind } from "./Intro";
import { LevelUp } from "./LevelUp";
import { TailsMark } from "./TailsStage";
import { LEVELS } from "../shell/skills72";
import { Frame, Go, Mood, Others, nextFor, ringColor, useCoins, type SetView } from "./parts";
import { unfold } from "./unfold";
import o from "./homeworkEnd.module.css";

const R = 74;
const ROUND = 2 * Math.PI * R;

export function HomeworkEnd({
  mode,
  set,
  intro = false,
  play,
}: {
  mode: "light" | "dark";
  set: SetView;
  /** A set to play through before the ending (PlayQuiz.tsx). */
  play?: { topic: string; onAnswers: (right: boolean[]) => void; onExit: () => void };
  /** Open on the last question, carried into the ending by this transition (Intro.tsx). */
  intro?: IntroKind | false;
}) {
  const root = useRef<HTMLDivElement>(null);
  const ringSvg = useRef<SVGSVGElement>(null);
  const [begun, setBegun] = useState(!intro);
  const corner = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const percent = useRef<HTMLElement>(null);
  const levelRow = useRef<HTMLParagraphElement>(null);
  const [leveled, setLeveled] = useState(false);
  const shown = leveled ? set.to : set.from;
  const hero = useRef<HTMLDivElement>(null);
  // the character is home in its pane: it may celebrate (and the level-up may follow)
  const [home, setHome] = useState(false);
  // the level-up comes once the character is home and has had its moment
  const levelAt = 2.9;
  const { burst, coins } = useCoins(set, corner, 2.4, begun);
  const next = nextFor(set);
  const share = set.right / set.total;
  const final = ringColor(share);

  // laid out before the first paint, so the ending is never seen in its place before it flies there
  useLayoutEffect(() => {
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
      const id = requestAnimationFrame(() => setHome(true));
      return () => cancelAnimationFrame(id);
    }
    paint(0);
    const at = { f: 0 };
    // the ending opens to match the transition that brought it (unfold.ts); the ring fills when it
    // says, and its color moves with it, and a closed ring shines once it is gold
    const line = gsap.timeline();
    const plan = unfold(
      intro || "none",
      el,
      line,
      ringSvg.current?.getBoundingClientRect(),
      (when, seconds) => {
        line.to(
          at,
          { f: share, duration: seconds, ease: "power2.inOut", onUpdate: () => paint(at.f) },
          when
        );
        if (share === 1)
          line.fromTo(
            ring.current,
            { strokeWidth: 10 },
            { strokeWidth: 14, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" },
            when + seconds
          );
      }
    );
    line
      .fromTo(
        el.querySelectorAll("[data-about]"),
        { y: 12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.06, ease: "power3.out" },
        plan.about
      )
      .call(() => setHome(true), [], plan.home)
      .fromTo(
        el.querySelectorAll("[data-next]"),
        { y: 16, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.5)" },
        set.up ? plan.home + 4.4 : plan.next
      );
    return () => void line.kill();
  }, [set, share, begun, intro]);

  // a good set: once home, the character celebrates and confetti bursts out of its ring
  useEffect(() => {
    if (!home || (set.tone !== "strong" && set.tone !== "perfect")) return;
    return confetti(hero.current, 0.15, set.tone === "perfect" ? 90 : 60);
  }, [home, set.tone]);

  return (
    <Frame mode={mode} title={set.skill} corner={corner} wallet={set.wallet}>
      {burst}
      {intro && (
        <Intro
          kind={intro}
          mode={mode}
          answers={set.answers.map((a) => a.ok)}
          target={ringSvg}
          onLanded={() => setBegun(true)}
          play={play}
        />
      )}
      {begun && set.up && (
        <LevelUp set={set} after={levelAt} target={levelRow} onDone={() => setLeveled(true)} />
      )}
      <div
        className={`${lib.library} ${hw.homework} ${o.page}`}
        ref={root}
        data-held={!begun || undefined}
        style={{ "--ring": final } as CSSProperties}
      >
        <section
          className={`${lib.glass} ${hw.side} ${o.side}`}
          data-pane
          aria-label="You"
          data-bare={(intro === "singularity" && !begun) || undefined}
        >
          <div className={o.hero} ref={hero} data-hero>
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
                  <Mood tone={set.tone} start={home}>
                    <Buddy size={104} cheer={0} />
                  </Mood>
                </span>
              )}
            </div>
            <b
              className={o.percent}
              ref={percent}
              data-percent
              aria-label={`${set.percent} percent`}
            >
              0%
            </b>
          </div>
          <div className={o.about}>
            <h2 className={o.verdict} data-about>
              {set.verdict}
            </h2>
          </div>
          <p className={o.levelRow} ref={levelRow} data-lit={leveled || undefined} data-about>
            <span key={shown} className={o.stageMark}>
              <TailsMark level={shown} size={44} />
            </span>
            <b>{LEVELS[shown]}</b>
          </p>
          <p className={o.coinRow} data-about>
            {coins}
          </p>
        </section>

        <section className={`${lib.glass} ${hw.main} ${o.main}`} data-pane aria-label="Answers">
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
