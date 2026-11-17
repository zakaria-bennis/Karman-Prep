// Schedule's motion, made with GSAP. Every move here answers something the student did, except the
// one arrival when the page opens. With reduced motion each of these simply lands in its last state.
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { calm } from "./homeworkMotion";

/** The page's parts come in once, one after another, when it opens. */
export function arrive(root: HTMLElement) {
  if (calm()) return;
  gsap.fromTo(
    root.querySelectorAll("[data-arrive]"),
    // (no blur here: five frosted panes blurring at once is slow on a phone)
    { y: 18, opacity: 0 },
    {
      y: 0,
      opacity: 1,
      duration: 0.7,
      stagger: 0.09,
      ease: "expo.out",
      clearProps: "transform,opacity",
    }
  );
}

/** Open times come in as a wave from the first when a day or a length is picked. */
export function wave(list: HTMLElement | null) {
  if (!list || calm()) return;
  gsap.fromTo(
    list.children,
    { y: 10, opacity: 0, scale: 0.94 },
    {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.42,
      stagger: { each: 0.028, from: "start" },
      ease: "back.out(1.6)",
      clearProps: "transform,opacity",
    }
  );
}

/** A pressed choice gives a little: it dips and springs back. */
export function press(el: Element | null) {
  if (!el || calm()) return;
  gsap.fromTo(el, { scale: 0.93 }, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.45)" });
}

/** Slides a row of days so that one of them sits in view. */
export function bring(row: HTMLElement | null, item: HTMLElement | null) {
  if (!row || !item) return;
  const left = item.offsetLeft - (row.clientWidth - item.clientWidth) / 2;
  const to = Math.max(0, Math.min(row.scrollWidth - row.clientWidth, left));
  if (calm()) row.scrollLeft = to;
  else gsap.to(row, { scrollLeft: to, duration: 0.55, ease: "power3.out", overwrite: true });
}

/** A session has been booked: the ticket lands, its ring is drawn, its check is ticked, and the
 *  words follow. Calls `then` when the student has had time to read it. */
export function confirm(card: HTMLElement, then: () => void) {
  const ring = card.querySelector("[data-ring]");
  const check = card.querySelector("[data-check]");
  const lines = card.querySelectorAll("[data-line]");
  if (calm()) {
    gsap.set([ring, check], { strokeDashoffset: 0 });
    const timer = window.setTimeout(then, 2600);
    return () => window.clearTimeout(timer);
  }
  const tl = gsap
    .timeline({ onComplete: then })
    .fromTo(
      card,
      { y: 36, opacity: 0, scale: 0.9, rotate: -3 },
      { y: 0, opacity: 1, scale: 1, rotate: 0, duration: 0.6, ease: "back.out(1.5)" }
    )
    .fromTo(
      ring,
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 0.55, ease: "power2.inOut" },
      "-=0.3"
    )
    .fromTo(
      check,
      { strokeDashoffset: 1 },
      { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" },
      "-=0.1"
    )
    .fromTo(
      card.querySelectorAll("[data-spark]"),
      { scale: 0, opacity: 1, x: 0, y: 0 },
      {
        scale: 1,
        opacity: 0,
        x: (i) => Math.cos((i / 8) * Math.PI * 2) * 46,
        y: (i) => Math.sin((i / 8) * Math.PI * 2) * 46,
        duration: 0.7,
        ease: "power2.out",
      },
      "<"
    )
    .fromTo(
      lines,
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, stagger: 0.08, ease: "power3.out" },
      "-=0.5"
    )
    .to({}, { duration: 1.7 });
  return () => tl.kill();
}

/** A row that has just been booked or moved shows itself: it swells once and its edge glows. */
export function flash(row: Element | null) {
  if (!row || calm()) return;
  gsap.fromTo(
    row,
    { scale: 0.96, opacity: 0, y: -8 },
    {
      scale: 1,
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "back.out(1.7)",
      clearProps: "transform,opacity",
    }
  );
}

/** A part folds away (a canceled session, the calendar banner once answered). */
export function fold(el: HTMLElement | null, then: () => void) {
  if (!el || calm()) return then();
  gsap.to(el, {
    height: 0,
    opacity: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
    marginBottom: -12,
    duration: 0.42,
    ease: "power3.inOut",
    onComplete: then,
  });
}

/** A number that counts to its new value (hours left, a price). */
export function useCount(value: number, places = 1) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (calm() || from.current === value) {
      from.current = value;
      return setShown(value);
    }
    const at = { n: from.current };
    const tween = gsap.to(at, {
      n: value,
      duration: 0.9,
      ease: "power2.out",
      onUpdate: () => setShown(at.n),
      onComplete: () => {
        from.current = value;
        setShown(value);
      },
    });
    return () => {
      from.current = at.n;
      tween.kill();
    };
  }, [value]);
  const step = 10 ** places;
  return Math.round(shown * step) / step;
}

/** The Join button, once it is open, breathes so it is the thing to press. */
export function breathe(el: Element | null) {
  if (!el || calm()) return () => {};
  const tween = gsap.to(el, {
    scale: 1.05,
    duration: 0.9,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
  });
  return () => {
    tween.kill();
    gsap.set(el, { clearProps: "transform" });
  };
}
