"use client";
// The level-up moment (founder, 2026-11-19: "there needs to be a whole level-up animation"; then
// 2026-11-20: a metamorphosis from one stage to the next, the celebration as big as the step, and
// the skill's name, not the run, in front). A skill goes up a level after a run of right answers in
// a row (3, 4 or 5, by the level reached). The world behind blurs and a soft pool of shade gathers
// in the middle; in it, out in the open with no box round them (founder, 2026-11-20), stand Karman,
// the skill's name and its stage. Karman grows his tails (TailsStage.tsx), the stage's name turns
// over, and it is celebrated by the size of the step:
//   to Learning       a burst of confetti
//   to Understanding  more, and it all jumps
//   to Proficient     the most, in two waves, a gold aura, and the screen shakes
// then it shrinks and flies down into the level row it belongs to, which takes the new level as it
// lands. A press anywhere skips to the end. With less motion asked for, none of it plays: the row
// simply shows the new level. Played by a skill set's ending (ActivityEnd.tsx).
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { confetti } from "@/components/quiz-flows/stage-motion";
import { prefersStill } from "@/lib/painting/motion";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import { LEVELS } from "../skills72";
import type { Level } from "./end-view";
import { TailsStage } from "./fox/TailsStage";
import l from "./levelUp.module.css";

/** How long the new stage is held once complete, by the size of the step, before the pane flies
 *  down into its row. */
const HOLD = [0, 1.6, 2, 2.6];

export function LevelUp({
  skill,
  from,
  to,
  after,
  target,
  onDone,
}: {
  /** The skill's name, in front. */
  skill: string;
  from: Level;
  to: Level;
  /** Seconds after the screen opens. */
  after: number;
  /** The level row the pane flies into. */
  target: RefObject<HTMLElement | null>;
  onDone: () => void;
}) {
  const veil = useRef<HTMLDivElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [changing, setChanging] = useState(false);
  const [level, setLevel] = useState<number>(from);
  const done = useRef(onDone);
  const undo = useRef<((() => void) | undefined)[]>([]);
  /** The pane's flight down into its row, started once the change is complete. */
  const flight = useRef<gsap.core.Timeline | null>(null);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  // how big the step is: 1 to Learning, 2 to Understanding, 3 to Proficient
  const step = to;

  useEffect(() => {
    if (prefersStill()) {
      done.current();
      return;
    }
    const timer = window.setTimeout(() => setOn(true), after * 1000);
    return () => window.clearTimeout(timer);
  }, [after]);

  // the moment it bursts into the new stage: the celebration, as big as the step
  const burst = useCallback(() => {
    const card = pane.current;
    if (!card) return;
    setLevel(to);
    playRewardSound("levelUp");
    undo.current.push(confetti(card.parentElement, 0, [50, 90, 150][step - 1] ?? 50));
    gsap.fromTo(
      card,
      { scale: 1, y: 0 },
      {
        scale: 1 + 0.04 * step,
        y: step >= 2 ? -18 : 0,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: "power2.out",
      }
    );
    if (step === 3) {
      // a second wave, and the whole screen shakes
      window.setTimeout(() => {
        if (card.parentElement) undo.current.push(confetti(card.parentElement, 0, 120));
      }, 450);
      gsap.fromTo(
        card.parentElement,
        { x: 0, y: 0 },
        { keyframes: { x: [10, -8, 6, -4, 0], y: [-6, 5, -3, 2, 0] }, duration: 0.4, ease: "none" }
      );
    }
    flight.current?.restart(true);
  }, [to, step]);

  useEffect(() => {
    if (!on || !pane.current || !veil.current) return;
    const card = pane.current;
    const v = veil.current;
    const finish = () => {
      setOn(false);
      done.current();
    };
    const line = gsap.timeline();
    line
      .fromTo(v, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" })
      .fromTo(
        card,
        { y: 80, scale: 0.6, opacity: 0, rotation: -4 },
        { y: 0, scale: 1, opacity: 1, rotation: 0, duration: 0.55, ease: "back.out(1.7)" },
        0.05
      )
      .fromTo(
        card.querySelectorAll("[data-in]"),
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.35, stagger: 0.07, ease: "power3.out" },
        0.3
      )
      // the stage changes once the pane has settled; it says when it is complete (burst)
      .add(() => setChanging(true), 0.6);
    // then, after a moment to take it in, into the level row it belongs to
    const away = gsap.timeline({ paused: true, delay: HOLD[step] ?? 1.6, onComplete: finish });
    away
      .add(() => {
        const to = target.current?.getBoundingClientRect();
        const from = card.getBoundingClientRect();
        if (!to) return;
        gsap.to(card, {
          x: to.left + to.width / 2 - (from.left + from.width / 2),
          y: to.top + to.height / 2 - (from.top + from.height / 2),
          scale: Math.min(0.4, to.width / from.width),
          opacity: 0,
          duration: 0.6,
          ease: "power3.in",
        });
      }, 0)
      .to(v, { opacity: 0, duration: 0.45, ease: "power2.in" }, 0.2)
      .to({}, { duration: 0.1 }, 0.65);
    flight.current = away;
    // a press anywhere skips to the end
    const skip = () => {
      line.kill();
      away.kill();
      finish();
    };
    v.addEventListener("click", skip);
    const leftovers = undo.current;
    return () => {
      line.kill();
      away.kill();
      leftovers.forEach((u) => u?.());
      v.removeEventListener("click", skip);
    };
  }, [on, step, target]);

  if (!on) return null;
  return (
    <div className={l.veil} ref={veil} role="status" aria-live="polite" data-step={step}>
      <div className={l.pane} ref={pane} data-step={step}>
        <span className={l.stage} data-in>
          <TailsStage
            from={from}
            to={to}
            play={changing}
            size={window.innerWidth < 600 ? 320 : 400}
            onPeak={burst}
          />
        </span>
        <h2 className={l.title} data-in>
          {skill}
        </h2>
        <p className={l.name} data-level={level} data-in>
          <span key={level} className={l.flip}>
            {LEVELS[level]}
          </span>
        </p>
      </div>
    </div>
  );
}
