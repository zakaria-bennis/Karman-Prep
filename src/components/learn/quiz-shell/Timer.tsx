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

  const toggle = () => {
    setHidden(!hidden);
    writeHidden(!hidden);
  };
  if (clock.kind === "none") return null;
  const shift = countdown && limit > 0 ? (1 - Math.min(1, seconds / limit)) ** 2 : 0;
  const shown = !hidden || (countdown && forceShow(seconds));
  const minutes = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  const warning = countdown && forceShow(seconds);

  return (
    <div className={styles.timer}>
      <span className={shell.srOnly} role="status" aria-live="polite">
        {said}
      </span>
      <button
        type="button"
        className={styles.clock}
        data-hidden={shown ? undefined : "true"}
        aria-label={hidden ? "Show the clock" : "Hide the clock"}
        // as a countdown runs out the clock's colour shifts toward red, slowly at first
        style={{ "--shift": shift } as React.CSSProperties}
        onClick={toggle}
      >
        {/* a small stopwatch: a crown, a button at its shoulder, twelve marks, and a hand that
            goes round once a minute */}
        <svg className={styles.face} viewBox="0 0 24 26" aria-hidden="true">
          <path d="M9.800 1.600h4.400M12 1.600v2.600" />
          <path d="M19.300 5.300l1.700 1.700" />
          <circle cx="12" cy="15" r="9.200" />
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d={i % 3 === 0 ? "M12 7.400v2.200" : "M12 7.400v1.100"}
              transform={`rotate(${i * 30} 12 15)`}
              opacity={i % 3 === 0 ? 1 : 0.55}
              strokeWidth={i % 3 === 0 ? 1.5 : 1.1}
            />
          ))}
          <g className={styles.hand}>
            <path d="M12 15V9.600" strokeWidth={1.7} />
          </g>
          <circle cx="12" cy="15" r="1.100" fill="currentColor" stroke="none" />
        </svg>
        {shown && (
          <motion.span
            key="time"
            initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0, x: -6 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, width: "auto", x: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ overflow: "hidden", display: "inline-flex" }}
          >
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
          </motion.span>
        )}
      </button>
    </div>
  );
}
