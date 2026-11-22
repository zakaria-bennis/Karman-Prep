"use client";

// The offer of classical music on late nights (founder, 2026-11-16): tired students focus better
// with it, so after 8 PM a small friendly banner comes in at the top right and offers to turn it on.
//   It gives one choice, "Turn it on", and a cross to send it away. Left alone for about six
//   seconds, it leaves by itself. Turned on, its notes dance for a moment and it slides away to
//   the right, as it does whenever it leaves.
//   Sent away twice in a row, it is never shown again. Turning it on clears that count.
//   Music can be turned off in Settings; the banner says so.
// What is remembered is kept in this browser for now (it will move to the student's settings).
// No recordings have been chosen yet, so turning it on does not play anything: it only remembers.
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import styles from "./musicOffer.module.css";
import { ping, tick } from "./sound";
import { setSetting } from "./settingsStore";

const KEY = "kp-music";
/** After this many refusals in a row the offer is not made again. */
const REFUSALS = 2;
/** How long it waits before coming in, and how long it stays if nothing is pressed. */
const WAIT = 1600;
const STAY = 4000; // founder, 2026-11-19: four seconds at most
/** How long the notes dance once music is turned on, before the banner slides away. */
const DANCE = 1300;
/** It is offered from 8 PM until the small hours. */
const late = () => {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 4;
};

type Memory = { on: boolean; refused: number };
const read = (): Memory => {
  try {
    const kept = JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Partial<Memory>;
    return { on: kept.on === true, refused: Number(kept.refused) || 0 };
  } catch {
    return { on: false, refused: 0 };
  }
};
const keep = (memory: Memory) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // a private window may not keep anything: the offer is then simply made again another night
  }
};
/** Forgets everything, so the offer can be seen again while the page is being designed. */
export const forgetMusic = () => keep({ on: false, refused: 0 });

export default function MusicOffer({ force = false }: { force?: boolean }) {
  const still = useReducedMotion() ?? false;
  const [stage, setStage] = useState<"away" | "asking" | "on">("away");
  const [held, setHeld] = useState(false);

  // after 8 PM, once, a moment after the page has settled: unless music is on or it was refused
  // twice. (`force` shows it at any hour, for looking at it while the page is being designed.)
  useEffect(() => {
    const memory = read();
    if (!force && (!late() || memory.on || memory.refused >= REFUSALS)) return;
    const timer = window.setTimeout(() => setStage("asking"), WAIT);
    return () => {
      window.clearTimeout(timer);
      setStage("away");
    };
  }, [force]);

  // it gets out of the way by itself: left alone it leaves (which is not a refusal), and once
  // music is on it says so for a moment and goes. Pointing at it or tabbing into it holds it.
  useEffect(() => {
    if (stage === "away" || (held && stage === "asking")) return;
    const timer = window.setTimeout(() => setStage("away"), stage === "on" ? DANCE : STAY);
    return () => window.clearTimeout(timer);
  }, [stage, held]);

  const accept = () => {
    keep({ on: true, refused: 0 });
    // "Turn it on" really turns the focus music on (Settings: Sounds and music)
    setSetting("music", true);
    setStage("on");
    ping();
  };
  const refuse = () => {
    keep({ on: false, refused: read().refused + 1 });
    setStage("away");
    tick();
  };
  // Escape sends it away, as the cross does
  useEffect(() => {
    if (stage !== "asking") return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") refuse();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [stage]);

  return (
    <AnimatePresence>
      {stage !== "away" && (
        <motion.aside
          className={styles.offer}
          role="status"
          aria-label="Classical music"
          data-on={stage === "on" || undefined}
          // it comes in from the right and always leaves by sliding back out to the right, quickly
          initial={still ? { opacity: 0 } : { opacity: 0, x: "110%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={
            still
              ? { opacity: 0 }
              : { opacity: 0, x: "115%", transition: { duration: 0.32, ease: [0.5, 0, 0.9, 0.4] } }
          }
          transition={still ? { duration: 0.2 } : { type: "spring", stiffness: 380, damping: 32 }}
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
        >
          {/* two notes, drawn here, that sway a little */}
          <svg
            className={styles.notes}
            viewBox="0 0 40 40"
            width="40"
            height="40"
            aria-hidden="true"
          >
            <path d="M15 28V11l15-3.500V24" />
            <path d="M15 16l15-3.500" />
            <ellipse cx="11" cy="28.500" rx="4.600" ry="3.600" transform="rotate(-18 11 28.500)" />
            <ellipse cx="26" cy="24.500" rx="4.600" ry="3.600" transform="rotate(-18 26 24.500)" />
          </svg>
          {stage === "asking" ? (
            <>
              <div className={styles.words}>
                <b>Studying late?</b>
                <p>
                  Studies show classical music can help you stay focused on late nights. You can
                  turn it off in Settings.
                </p>
                <button type="button" className={styles.on} onClick={accept}>
                  Turn it on
                </button>
              </div>
              <button
                type="button"
                className={styles.close}
                aria-label="No thanks"
                onClick={refuse}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M7 7l10 10M17 7L7 17" />
                </svg>
              </button>
            </>
          ) : (
            <div className={styles.words}>
              <b>Music is on</b>
              {/* little notes float up from the banner as it says so */}
              <span className={styles.rise} aria-hidden="true">
                {[0, 1, 2].map((n) => (
                  <i key={n} style={{ animationDelay: `${n * 0.16}s` }}>
                    ♪
                  </i>
                ))}
              </span>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
