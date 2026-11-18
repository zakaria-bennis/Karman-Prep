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

const PARTY = ["#2fd08c", "#5aa9ff", "#ff3d9a", "#ffc94a", "#a08cff", "#ff8a5c"];

/** Confetti: paper thrown up from the middle of `host`, which then tumbles down and is cleared
 *  away. `host` must be positioned; the paper is drawn over whatever is in it. */
export function confetti(host: HTMLElement, pieces = 44) {
  if (calm()) return;
  const box = host.getBoundingClientRect();
  const made: HTMLElement[] = [];
  for (let i = 0; i < pieces; i++) {
    const bit = document.createElement("i");
    const wide = 6 + Math.random() * 6;
    bit.setAttribute("aria-hidden", "true");
    bit.style.cssText = `position:absolute;left:50%;top:38%;width:${wide}px;height:${
      wide * (Math.random() < 0.5 ? 1 : 0.45)
    }px;border-radius:${Math.random() < 0.3 ? "50%" : "2px"};background:${
      PARTY[i % PARTY.length]
    };pointer-events:none;z-index:3`;
    host.appendChild(bit);
    made.push(bit);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
    const far = 80 + Math.random() * Math.max(120, box.width * 0.42);
    gsap
      .timeline({ onComplete: () => bit.remove() })
      .fromTo(
        bit,
        { x: 0, y: 0, scale: 0.4, rotation: 0 },
        {
          x: Math.cos(angle) * far,
          y: Math.sin(angle) * far * 0.9,
          scale: 1,
          rotation: (Math.random() - 0.5) * 540,
          duration: 0.55 + Math.random() * 0.25,
          ease: "power3.out",
        }
      )
      .to(bit, {
        y: `+=${box.height * 0.7 + Math.random() * 120}`,
        x: `+=${(Math.random() - 0.5) * 80}`,
        rotation: `+=${(Math.random() - 0.5) * 720}`,
        opacity: 0,
        duration: 1.3 + Math.random() * 0.7,
        ease: "power1.in",
      });
  }
  return () => made.forEach((bit) => bit.remove());
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
