// Karman alive while awake (founder, 2026-11-20: "blinking, and just make it look alive"). Small
// things at their own uneven times, so it never feels like a loop:
//   a blink every few seconds, sometimes two in a row
//   an ear flicking, one or the other
//   his head tilting to look, then back
// Breathing and the tails' sway run all the time in TailsStage's drawing. With less motion asked for,
// none of this runs.
import gsap from "gsap";
import { prefersStill } from "@/lib/painting/motion";
import type { FoxState } from "./foxLight";

/** Starts his life; `awake` says whether he is free to move now. Returns a stop. */
export function live(s: () => FoxState, awake: () => boolean) {
  if (prefersStill()) return () => {};
  let dead = false;
  const calls: gsap.core.Tween[] = [];
  const every = (min: number, max: number, act: () => void) => {
    const call = gsap.delayedCall(min + Math.random() * (max - min), () => {
      if (dead) return;
      if (awake()) act();
      every(min, max, act);
    });
    calls.push(call);
  };
  every(1.8, 4.2, () => blink(s(), Math.random() < 0.3 ? 2 : 1));
  every(3, 6.5, () => {
    const key = Math.random() < 0.5 ? "earL" : "earR";
    const way = key === "earL" ? -1 : 1;
    gsap.to(s(), {
      keyframes: { [key]: [way * 14, way * -4, way * 9, 0] },
      duration: 0.42,
      ease: "none",
    });
  });
  every(4, 8, () => {
    const to = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 5);
    gsap
      .timeline()
      .to(s(), { tilt: to, duration: 0.45, ease: "back.out(2)" })
      .to(s(), { tilt: 0, duration: 0.6, ease: "sine.inOut" }, 1.4 + Math.random());
  });
  return () => {
    dead = true;
    calls.forEach((c) => c.kill());
  };
}

/** His eyes close and open, `times` times. */
export function blink(s: FoxState, times = 1) {
  return gsap.to(s, {
    blink: 1,
    duration: 0.07,
    ease: "power2.in",
    yoyo: true,
    repeat: times * 2 - 1,
    repeatDelay: 0.04,
  });
}
