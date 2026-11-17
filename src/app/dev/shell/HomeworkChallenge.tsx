"use client";

// The daily challenge question (founder, 2026-11-16).
//   ChallengeBanner  if it has not been done, a banner fills the screen when Homework opens: the
//                    student's character as a hero, the streak it keeps, "Take it on" and "Later".
//   ChallengeCard    once the banner is sent away, the question sits beside the Daily 10 in the
//                    same row, with its own look, until it is done.
// Coins are not spoken of here: they appear only on Rewards.
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { Dressed } from "./accessories";
import { useEquipped } from "./equipped";
import { wearing } from "./HomeworkBits";
import { calm, finish } from "./homeworkMotion";
import styles from "./homeworkChallenge.module.css";
import { STREAK } from "./rewardsData";
import { chosen, tick } from "./sound";

/** A hexagon with a question mark that tips from side to side. */
function Mark({ size }: { size: number }) {
  return (
    <svg className={styles.mark} viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path d="M24 3l18 10.500v21L24 45 6 34.500v-21Z" />
      <path
        d="M18.500 19a5.500 5.500 0 1 1 8.300 4.700c-1.800 1.100-2.800 2-2.800 4.300M24 33.500v.500"
        data-ink
      />
    </svg>
  );
}

export function ChallengeBanner({
  onStart,
  onLater,
}: {
  onStart: () => void;
  onLater: () => void;
}) {
  const { face, outfit } = useEquipped();
  const ref = useRef<HTMLDivElement>(null);
  // it arrives: the dark comes up, the card springs in, and its pieces follow one after another
  useEffect(() => {
    const el = ref.current;
    if (!el || calm()) return;
    const tl = gsap
      .timeline()
      .fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 })
      .fromTo(
        el.querySelector("[data-card]"),
        { y: 60, scale: 0.9, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.6)" },
        "<0.05"
      )
      .fromTo(
        el.querySelectorAll("[data-rise]"),
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: "power3.out" },
        "<0.2"
      );
    const hover = gsap.to(el.querySelector("[data-hero]"), {
      y: -8,
      duration: 1.8,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    return () => {
      tl.kill();
      hover.kill();
    };
  }, []);
  // Escape sends it away, as Later does
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && leave(onLater);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const leave = (then: () => void) => {
    const el = ref.current;
    if (!el || calm()) return then();
    gsap.to(el.querySelector("[data-card]"), {
      y: 40,
      scale: 0.94,
      duration: 0.25,
      ease: "power2.in",
    });
    gsap.to(el, { opacity: 0, duration: 0.28, onComplete: then });
  };
  return (
    <div
      ref={ref}
      className={styles.screen}
      role="dialog"
      aria-modal="true"
      aria-label="Today's challenge question"
    >
      <div className={styles.card} data-card>
        <span className={styles.glow} aria-hidden="true" />
        <span className={styles.hero} data-hero aria-hidden="true">
          <Dressed face={face} outfit={{ ...outfit, ...wearing("Hero mask", "Cape") }} size={150} />
        </span>
        <h2 data-rise>Challenge question</h2>
        <p data-rise>One hard question a day. This one is waiting.</p>
        <p className={styles.streak} data-rise>
          <b>{STREAK}</b> days in a row
        </p>
        <div className={styles.pair} data-rise>
          <button
            type="button"
            className={styles.go}
            autoFocus
            onClick={() => {
              chosen();
              leave(onStart);
            }}
          >
            Take it on
          </button>
          <button
            type="button"
            className={styles.later}
            onClick={() => {
              tick();
              leave(onLater);
            }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChallengeCard({ onStart }: { onStart: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || calm()) return;
    const tip = gsap.to(ref.current.querySelector("svg"), {
      rotate: 10,
      duration: 1.6,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      transformOrigin: "50% 50%",
    });
    return () => {
      tip.kill();
    };
  }, []);
  return (
    <div ref={ref} className={styles.small} data-in>
      <Mark size={40} />
      <p>
        <b>Challenge</b>
        <small>{STREAK} days in a row</small>
      </p>
      <button
        type="button"
        className={styles.begin}
        aria-label="Start the challenge question"
        onClick={(e) => {
          chosen();
          e.currentTarget.disabled = true;
          if (ref.current) finish(ref.current, onStart);
          else onStart();
        }}
      >
        Start
      </button>
    </div>
  );
}
