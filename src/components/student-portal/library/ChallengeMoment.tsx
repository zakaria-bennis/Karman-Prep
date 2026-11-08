"use client";

/*
 * The Challenge question, full screen (founder, 2026-11-08): "a full-screen banner that pops out
 * once if the student hasn't done it yet. It has its own art, design and animation, and if he
 * clicks out of it, then it would get hidden."
 *
 * - Opens once a day when the Library opens, before anything else, if today's two questions
 *   aren't both answered. It waits for the day's painting to finish its opening first.
 * - One main button starts the Challenge. The X, Escape or a click outside closes it.
 * - Closing or starting hides it for the rest of the day (remembered on this device). Answering
 *   both questions hides it for the day on every device (the server knows).
 * - The Library keeps a quiet row back to it in the Practice card.
 */
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Chevron } from "@/components/portal/icons";
import { choosePainting } from "@/lib/painting/schedule";
import type { TimeOfDay } from "@/lib/painting/light";
import ChallengeArt from "./ChallengeArt";
import { CHALLENGE_CLOSED_KEY, challengeMoment, readStore, writeStore } from "./moment";
import styles from "./challenge.module.css";

const OPENING_ATTR = "data-paint-opening";

/** Resolves once the painting's opening has finished (or at once if it isn't playing). */
function afterPaintingOpening(): Promise<void> {
  const root = document.documentElement;
  if (!root.hasAttribute(OPENING_ATTR)) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      observer.disconnect();
      clearTimeout(timer);
      resolve();
    };
    const observer = new MutationObserver(() => !root.hasAttribute(OPENING_ATTR) && done());
    observer.observe(root, { attributes: true, attributeFilter: [OPENING_ATTR] });
    const timer = setTimeout(done, 6000);
  });
}

export default function ChallengeMoment({
  href,
  day,
  answered,
}: {
  href: string;
  /** Today's Challenge day (UTC), the same key the questions use. */
  day: string;
  /** How many of today's two questions the student has answered. */
  answered: number;
}) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState<TimeOfDay>("day");
  const [host, setHost] = useState<HTMLElement | null>(null);
  const reduce = useReducedMotion() ?? false;
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    challengeMoment.reset();
    if (answered >= 2 || readStore("local", CHALLENGE_CLOSED_KEY) === day) {
      challengeMoment.settle();
      return;
    }
    let live = true;
    void afterPaintingOpening().then(() => {
      if (!live) return;
      const dev = process.env.NODE_ENV !== "production";
      setTime(choosePainting(new Date(), location.search, dev).time);
      setHost(document.querySelector<HTMLElement>(".kp-shell") ?? document.body);
      returnFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    });
    return () => {
      live = false;
    };
  }, [answered, day]);

  const hide = useCallback(() => {
    writeStore("local", CHALLENGE_CLOSED_KEY, day);
    setOpen(false);
  }, [day]);

  /* While open: Escape closes, Tab stays inside, the page behind doesn't scroll. */
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        hide();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = dialogRef.current.querySelectorAll<HTMLElement>("a[href], button");
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const focus = requestAnimationFrame(() =>
      dialogRef.current?.querySelector<HTMLElement>("[data-start]")?.focus({ preventScroll: true })
    );
    return () => {
      cancelAnimationFrame(focus);
      document.removeEventListener("keydown", onKey);
      root.style.overflow = before;
    };
  }, [open, hide]);

  const afterClose = () => {
    challengeMoment.settle();
    const back = returnFocus.current;
    if (back && back.isConnected && back !== document.body) back.focus();
    else document.getElementById("portal-main")?.focus({ preventScroll: true });
  };

  if (!host) return null;

  const fade = { duration: reduce ? 0.2 : 0.35 };
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { type: "spring" as const, stiffness: 120, damping: 20, delay },
        };

  return createPortal(
    <AnimatePresence onExitComplete={afterClose}>
      {open && (
        <motion.div
          key="challenge"
          className={styles.layer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fade}
        >
          <div className={styles.scrim} onClick={hide} aria-hidden="true" />
          <motion.div
            ref={dialogRef}
            className={styles.frame}
            role="dialog"
            aria-modal="true"
            aria-labelledby="challenge-title"
            aria-describedby="challenge-sub"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 12 }}
            transition={reduce ? fade : { type: "spring", stiffness: 140, damping: 22 }}
          >
            <ChallengeArt time={time} still={reduce} />
            <div className={styles.copy}>
              <motion.h2 id="challenge-title" className={styles.title} {...rise(0.45)}>
                Today&rsquo;s Challenge
              </motion.h2>
              <motion.p id="challenge-sub" className={styles.sub} {...rise(0.6)}>
                {answered === 1
                  ? "You've answered one of today's two hard questions. One to go."
                  : "Two hard questions, one Math and one Reading and Writing. Every student gets the same two. Answer, then see how everyone did."}
              </motion.p>
              <motion.div {...rise(0.75)}>
                <Link
                  className="kp-cta"
                  href={href}
                  data-start=""
                  onClick={() => {
                    writeStore("local", CHALLENGE_CLOSED_KEY, day);
                    challengeMoment.settle();
                  }}
                >
                  <span>{answered === 1 ? "Finish the Challenge" : "Start the Challenge"}</span>
                  <Chevron />
                </Link>
              </motion.div>
            </div>
            <button
              type="button"
              className={styles.close}
              onClick={hide}
              aria-label="Close the Challenge for today"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    host
  );
}
