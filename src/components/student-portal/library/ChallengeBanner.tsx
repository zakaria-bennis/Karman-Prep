"use client";

/*
 * The Challenge question banner (founder, 2026-11-07): two hard questions a day, one Math and
 * one Reading and Writing, the same for every student. It shows when the Library opens and can
 * be dismissed for the day (remembered on this device).
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./library.module.css";

const KEY = "karman-challenge-dismissed";

export default function ChallengeBanner({ href, today }: { href: string; today: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === today) setHidden(true);
    } catch {
      /* storage blocked: the banner stays */
    }
  }, [today]);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, today);
    } catch {
      /* storage blocked: hidden until the page reloads */
    }
  };

  return (
    <div className={`kp-banner ${styles.banner}`} role="region" aria-label="Challenge question">
      <div className={styles.bannerText}>
        <b>Challenge question</b>
        <span>Two hard questions today, one Math and one Reading and Writing.</span>
      </div>
      <div className={styles.bannerActions}>
        <Link className="kp-more" href={href}>
          Try it
        </Link>
        <button
          type="button"
          className={styles.dismiss}
          aria-label="Dismiss the Challenge question for today"
          onClick={dismiss}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
