// Homework's motion, made with GSAP (founder, 2026-11-16: "start using GSAP more"). Each small
// picture has a movement of its own, played when its piece of work is pointed at or pressed.
import gsap from "gsap";
import { useEffect, useState } from "react";
import { DAY, TODAY } from "./progressData";

export const calm = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const MOVES: Record<string, (svg: SVGElement) => void> = {
  // the four squares light one after another
  skill: (svg) =>
    gsap.fromTo(
      svg.querySelectorAll("rect"),
      { opacity: 0.2, scale: 0.6, transformOrigin: "50% 50%" },
      { opacity: 1, scale: 1, duration: 0.4, stagger: 0.09, ease: "back.out(2.4)" }
    ),
  // the front card is flicked up and falls back
  cards: (svg) =>
    gsap.fromTo(
      svg.querySelector("[data-part]"),
      { rotate: 0, y: 0, transformOrigin: "50% 100%" },
      { rotate: -14, y: -3, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }
    ),
  // the stopwatch's hand goes once round
  trial: (svg) =>
    gsap.fromTo(
      svg.querySelector("[data-part]"),
      { rotate: 0, svgOrigin: "14 16" },
      { rotate: 360, duration: 0.9, ease: "power2.inOut" }
    ),
  // the compass's needle swings and settles
  strategy: (svg) =>
    gsap.fromTo(
      svg.querySelector("[data-part]"),
      { rotate: -70, svgOrigin: "14 14" },
      { rotate: 0, duration: 1.1, ease: "elastic.out(1, 0.3)" }
    ),
};

/** Plays every small picture inside `root`. */
export const stir = (root: Element) => {
  if (calm()) return;
  root.querySelectorAll<SVGElement>("svg[data-move]").forEach((svg) => {
    if (gsap.isTweening(svg.querySelectorAll("*"))) return;
    MOVES[svg.dataset.move ?? ""]?.(svg);
  });
};

/** A piece of work is finished: it swells, its check is drawn, and it slips away to the right. */
export const finish = (el: HTMLElement, then: () => void) => {
  if (calm()) return then();
  const li = el.closest("li");
  gsap
    .timeline({ onComplete: then })
    .to(el, { scale: 1.04, duration: 0.16, ease: "power2.out" })
    .fromTo(
      el.querySelector("[data-check]"),
      { strokeDashoffset: 1, opacity: 1 },
      { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" },
      "<"
    )
    .to(el, { scale: 1, duration: 0.3, ease: "elastic.out(1, 0.45)" })
    .to(el, { x: 60, opacity: 0, duration: 0.28, ease: "power2.in" }, "+=0.12")
    .to(li ?? el, { height: 0, marginBottom: -8, duration: 0.25, ease: "power2.inOut" });
};

/** The time on the page's own day (the stand-in "today", at the real time of day), each second. */
export function useClock() {
  const read = () => {
    const real = new Date();
    return TODAY.getTime() + (real.getTime() - new Date(real).setHours(0, 0, 0, 0));
  };
  const [now, setNow] = useState(read);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(read()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/** What is left of a stretch of time, cut into days, hours, minutes and seconds. */
export const cut = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor(s / 3600) % 24,
    minutes: Math.floor(s / 60) % 60,
    seconds: s % 60,
  };
};
export const two = (n: number) => String(n).padStart(2, "0");
export { DAY };

/** The pieces of a day or a week come in from the side they were stepped toward. */
export const arrive = (root: Element | null, from: number) => {
  if (!root || calm()) return;
  gsap.fromTo(
    root.querySelectorAll("[data-in]"),
    { x: from * 44, opacity: 0 },
    {
      x: 0,
      opacity: 1,
      duration: 0.45,
      stagger: 0.045,
      ease: "power3.out",
      clearProps: "transform,opacity",
    }
  );
};
