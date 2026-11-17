"use client";

// The daily challenge question (founder, 2026-11-16).
//   ChallengeBanner  if it has not been done, a banner fills the screen when Homework opens: the
//                    fox flying over the city as a hero (HomeworkHero.tsx), the streak it keeps, "Take it on" and "Later".
//   ChallengeCard    once the banner is sent away, the question sits beside the Daily 10 in the
//                    same row, with its own look, until it is done.
// Coins are not spoken of here: they appear only on Rewards.
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { HeroFlight } from "./HomeworkHero";
import { calm, finish } from "./homeworkMotion";
import styles from "./homeworkChallenge.module.css";
import { STREAK } from "./rewardsData";
import { chosen, tick } from "./sound";

export function ChallengeBanner({
  onStart,
  onLater,
}: {
  onStart: () => void;
  onLater: () => void;
}) {
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
    return () => {
      tl.kill();
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
        <span className={styles.scene}>
          <HeroFlight />
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
  return (
    <div ref={ref} className={styles.small} data-in>
      <HeroFlight small />
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
