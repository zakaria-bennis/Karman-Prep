"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { QuizClock } from "@/lib/quiz/mode";
import {
  announcementFor,
  forceShow,
  limitSeconds,
  remaining,
  type TimingAccommodation,
} from "@/lib/quiz/timer";
import styles from "./nav.module.css";
import shell from "./quiz-shell.module.css";
import { ClockIcon } from "./icons";
import { useShellMotion } from "./motion";

const HIDE_KEY = "karman-quiz-timer";
function readHidden(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === "off";
  } catch {
    return false;
  }
}
function writeHidden(hidden: boolean) {
  try {
    localStorage.setItem(HIDE_KEY, hidden ? "off" : "on");
  } catch {
    /* A per-device convenience only. */
  }
}

/** Count-up in practice, countdown in timed sections (spec: Timer). */
export function Timer({
  clock,
  startedAtMs,
  accommodation = "standard",
  onExpire,
}: {
  clock: QuizClock;
  startedAtMs: number;
  accommodation?: TimingAccommodation;
  onExpire?(): void;
}) {
  const { reduced } = useShellMotion();
  const [now, setNow] = useState(() => Date.now());
  const [hidden, setHidden] = useState(false);
  const [said, setSaid] = useState("");
  const prev = useRef<number | null>(null);
  const expired = useRef(false);
  useEffect(() => setHidden(readHidden()), []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const countdown = clock.kind === "down";
  const limit = countdown ? limitSeconds(clock.baseSeconds, accommodation) : 0;
  const seconds = countdown
    ? remaining(startedAtMs, now, limit)
    : Math.max(0, Math.floor((now - startedAtMs) / 1000));

  useEffect(() => {
    if (!countdown) return;
    const last = prev.current;
    prev.current = seconds;
    if (last !== null) {
      const message = announcementFor(last, seconds);
      if (message) setSaid(message);
    }
    if (seconds <= 0 && !expired.current) {
      expired.current = true;
      onExpire?.();
    }
  }, [countdown, seconds, onExpire]);

  if (clock.kind === "none") return null;
  const shown = !hidden || (countdown && forceShow(seconds));
  const minutes = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  const warning = countdown && forceShow(seconds);

  return (
    <div className={styles.timer}>
      <span className={shell.srOnly} role="status" aria-live="polite">
        {said}
      </span>
      {shown ? (
        <motion.span
          className={`${styles.time} ${warning ? styles.warn : ""}`}
          aria-label={
            countdown
              ? `Time remaining ${minutes} minutes ${secs} seconds`
              : `Elapsed ${minutes} minutes ${secs} seconds`
          }
          role="timer"
          animate={warning && !reduced ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 1.2 }}
          key={warning ? "warn" : "calm"}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={minutes}
              className={styles.digit}
              initial={reduced ? { opacity: 0 } : { y: "-100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduced ? { opacity: 0 } : { y: "100%", opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {minutes}
            </motion.span>
          </AnimatePresence>
          :{secs}
        </motion.span>
      ) : (
        <ClockIcon />
      )}
      <button
        type="button"
        className={shell.tool}
        aria-pressed={!hidden}
        onClick={() => {
          setHidden(!hidden);
          writeHidden(!hidden);
        }}
      >
        {hidden ? "Show" : "Hide"}
      </button>
    </div>
  );
}
