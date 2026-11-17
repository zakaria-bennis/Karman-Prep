"use client";

// A session has been booked or moved: the whole screen celebrates (founder, 2026-11-17: "this
// should be something that's celebratory, with confetti and whatnot, and shouldn't just be a pane
// within a pane"). Confetti is thrown, the student's character cheers, and the day and time are
// said once, large. It goes away by itself, or at a press anywhere.
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Buddy } from "./HomeworkBuddy";
import { calm } from "./homeworkMotion";
import { confetti } from "./scheduleMotion";
import { clock, dateLong, lengthText, skyOf, type Length } from "./scheduleData";
import styles from "./scheduleCheer.module.css";

export default function Cheer({
  start,
  minutes,
  moved,
  onDone,
}: {
  start: number;
  minutes: Length;
  moved: boolean;
  onDone: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const leave = () => done.current();
    if (calm()) {
      const timer = window.setTimeout(leave, 2600);
      return () => window.clearTimeout(timer);
    }
    const clear = confetti(el, 70);
    const tl = gsap
      .timeline({ onComplete: leave })
      .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.25 })
      .fromTo(
        el.querySelectorAll("[data-in]"),
        { y: 26, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.08, ease: "back.out(1.8)" },
        "<"
      )
      .to({}, { duration: 2.1 })
      .to(el, { opacity: 0, duration: 0.3 });
    const key = (e: KeyboardEvent) => e.key === "Escape" && leave();
    window.addEventListener("keydown", key);
    return () => {
      tl.kill();
      clear?.();
      window.removeEventListener("keydown", key);
    };
  }, []);

  const shell = typeof document === "undefined" ? null : document.querySelector(".kp-shell");
  if (!shell) return null;
  return createPortal(
    <div
      className={styles.cheer}
      ref={root}
      role="status"
      data-sky={skyOf(start)}
      onClick={() => done.current()}
    >
      <div data-in>
        <Buddy size={148} cheer={1} />
      </div>
      <b data-in>{moved ? "Moved!" : "Booked!"}</b>
      <p data-in>{dateLong(start)}</p>
      <p data-in className={styles.when}>
        {clock(start)}, {lengthText(minutes)}
      </p>
    </div>,
    shell
  );
}
