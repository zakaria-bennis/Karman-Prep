"use client";
// The level-up moment (founder, 2026-11-19: "there needs to be a whole level-up animation"; then
// 2026-11-20: a metamorphosis from one stage to the next, the celebration as big as the step, and
// the skill's name, not the run, in front). A skill goes up a level after a run of right answers in
// a row (3, 4 or 5, by the level reached). The screen dims; a pane of glass rises in the middle with
// the skill's name and its stage, big; the stage changes into the next (Metamorph.tsx), the level's
// name turns over, and it is celebrated by the size of the step:
//   to Learning       a burst of confetti
//   to Understanding  more, and the pane jumps
//   to Proficient     the most, in two waves, gold rays, and the screen shakes
// then the pane shrinks and flies down into the level row it belongs to, which takes the new level
// as it lands. A press anywhere skips to the end. With less motion asked for, none of it plays: the
// row simply shows the new level.
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { confetti } from "@/components/quiz-flows/stage-motion";
import { prefersStill } from "@/lib/painting/motion";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import { LEVELS } from "../shell/skills72";
import { Metamorph } from "./Metamorph";
import type { SetView } from "./parts";
import l from "./levelUp.module.css";

/** When the stage bursts into the next, in seconds after the pane is up. */
const CHANGE = 0.75;

export function LevelUp({
  set,
  after,
  target,
  onDone,
}: {
  set: SetView;
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
  const [level, setLevel] = useState(set.from);
  const done = useRef(onDone);
  const undo = useRef<((() => void) | undefined)[]>([]);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  // how big the step is: 1 to Learning, 2 to Understanding, 3 to Proficient
  const step = set.to;

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
    setLevel(set.to);
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
  }, [set.to, step]);

  useEffect(() => {
    if (!on || !pane.current || !veil.current) return;
    const card = pane.current;
    const hold = 1.4 + step * 0.5;
    const line = gsap.timeline({
      onComplete: () => {
        setOn(false);
        done.current();
      },
    });
    line
      .fromTo(veil.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" })
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
      // the stage changes once the pane has settled (Metamorph plays its own part)
      .add(() => setChanging(true), 0.55)
      // then into the level row it belongs to
      .add(
        () => {
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
        },
        0.55 + CHANGE + hold
      )
      .to(veil.current, { opacity: 0, duration: 0.45, ease: "power2.in" }, 0.75 + CHANGE + hold)
      .to({}, { duration: 0.1 }, 1.2 + CHANGE + hold);
    // a press anywhere skips to the end
    const skip = () => line.progress(1);
    const v = veil.current;
    v.addEventListener("click", skip);
    const leftovers = undo.current;
    return () => {
      line.kill();
      leftovers.forEach((u) => u?.());
      v.removeEventListener("click", skip);
    };
  }, [on, step, target]);

  if (!on) return null;
  return (
    <div className={l.veil} ref={veil} role="status" aria-live="polite" data-step={step}>
      <div className={l.pane} ref={pane} data-step={step}>
        <span className={l.stage} data-in>
          <Metamorph from={set.from} to={set.to} play={changing} onPeak={burst} />
        </span>
        <h2 className={l.title} data-in>
          {set.skill}
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
