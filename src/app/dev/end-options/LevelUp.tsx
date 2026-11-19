"use client";
// The level-up moment (founder, 2026-11-19: "there needs to be a whole level-up animation"). A skill
// goes up a level after a run of right answers in a row (3, 4 or 5, by the level reached). The screen
// dims a little; a pane of glass rises in the middle with the skill's name and its three level bars,
// big; the new bar fills with light, the level's name turns over to the new one, confetti bursts and
// the level-up sound plays; then the pane shrinks and flies down into the level row it belongs to,
// which takes the new level as it lands. A press anywhere skips to the end. With less motion asked
// for, none of it plays: the row simply shows the new level.
import gsap from "gsap";
import { useEffect, useRef, useState, type RefObject } from "react";
import { confetti } from "@/components/quiz-flows/stage-motion";
import { prefersStill } from "@/lib/painting/motion";
import { playRewardSound } from "@/lib/quiz/reward-sound";
import lib from "../shell/library.module.css";
import { LEVELS } from "../shell/skills72";
import type { SetView } from "./parts";
import l from "./levelUp.module.css";

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
  const [level, setLevel] = useState(set.from);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (prefersStill()) {
      done.current();
      return;
    }
    const timer = window.setTimeout(() => setOn(true), after * 1000);
    return () => window.clearTimeout(timer);
  }, [after]);

  useEffect(() => {
    if (!on || !pane.current || !veil.current) return;
    const card = pane.current;
    const bar = card.querySelectorAll("i")[set.to - 1];
    let undo: (() => void) | undefined;
    const line = gsap.timeline({
      onComplete: () => {
        setOn(false);
        done.current();
      },
    });
    line
      .fromTo(veil.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" })
      .fromTo(
        card,
        { y: 80, scale: 0.6, opacity: 0, rotation: -4 },
        { y: 0, scale: 1, opacity: 1, rotation: 0, duration: 0.7, ease: "back.out(1.7)" },
        0.1
      )
      .fromTo(
        card.querySelectorAll("[data-in]"),
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power3.out" },
        0.45
      )
      // the new bar fills with light from the left
      .fromTo(
        bar?.querySelector("b") ?? [],
        { scaleX: 0 },
        { scaleX: 1, duration: 0.9, ease: "power2.inOut" },
        1.0
      )
      .add(() => {
        setLevel(set.to);
        playRewardSound("levelUp");
        undo = confetti(card.parentElement, 0, 70);
      }, 1.85)
      .fromTo(
        card,
        { scale: 1 },
        { scale: 1.08, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" },
        1.85
      )
      // then into the level row it belongs to
      .add(() => {
        const to = target.current?.getBoundingClientRect();
        const from = card.getBoundingClientRect();
        if (!to) return;
        gsap.to(card, {
          x: to.left + to.width / 2 - (from.left + from.width / 2),
          y: to.top + to.height / 2 - (from.top + from.height / 2),
          scale: Math.min(0.4, to.width / from.width),
          opacity: 0,
          duration: 0.7,
          ease: "power3.in",
        });
      }, 3.9)
      .to(veil.current, { opacity: 0, duration: 0.5, ease: "power2.in" }, 4.1)
      .to({}, { duration: 0.1 }, 4.6);
    // a press anywhere skips to the end
    const skip = () => line.progress(1);
    veil.current.addEventListener("click", skip);
    const v = veil.current;
    return () => {
      line.kill();
      undo?.();
      v.removeEventListener("click", skip);
    };
  }, [on, set.to, target]);

  if (!on) return null;
  return (
    <div className={l.veil} ref={veil} role="status" aria-live="polite">
      <div className={l.pane} ref={pane}>
        <h2 className={l.title} data-in>
          Level up
        </h2>
        <span className={l.bars} data-level={level} data-in aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <i key={n} data-on={n <= set.from || undefined} data-new={n === set.to || undefined}>
              <b />
            </i>
          ))}
        </span>
        <p className={l.name} data-in>
          <span key={level} className={l.flip}>
            {LEVELS[level]}
          </span>
        </p>
        <p className={`${lib.library} ${l.run}`} data-in>
          {set.skill} · {set.runNeeded} right in a row
        </p>
      </div>
    </div>
  );
}
