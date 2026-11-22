"use client";
// Endless mode's hearts, beside the dots in the bottom bar: the run ends when they are gone. A
// heart that is lost swells a little, cracks down the middle, and its halves tip apart and fade,
// leaving its outline. Nothing else is said (founder, 2026-11-17: no messages during a quiz); a
// screen reader is told how many are left.
import { useEffect, useId, useRef, useState } from "react";
import styles from "./rewards.module.css";
import { useShellMotion } from "./motion";

/** One heart on a 24 grid: two round lobes and a soft point. */
const HEART =
  "M12 20.25C12 20.25 3.75 15.1 3.75 9.35A4.35 4.35 0 0 1 12 7.15A4.35 4.35 0 0 1 20.25 9.35C20.25 15.1 12 20.25 12 20.25Z";
/** The crack a breaking heart splits along, top to bottom. */
const CRACK = "12.4,0 12.4,7.1 11.2,9.7 12.9,12.3 11.3,15 12.6,17.6 12,24";
const BREAK_MS = 640;

export function Hearts({ hearts, lost }: { hearts: number; lost: number }) {
  const { reduced } = useShellMotion();
  const total = Math.max(0, Math.floor(hearts));
  const gone = Math.min(total, Math.max(0, Math.floor(lost)));
  const left = total - gone;
  // the hearts lost since the last look break; any already gone when the bar first draws do not
  const was = useRef(gone);
  const [breaking, setBreaking] = useState<readonly number[]>([]);
  useEffect(() => {
    const before = was.current;
    was.current = gone;
    if (gone <= before || reduced) return;
    setBreaking(Array.from({ length: gone - before }, (_, i) => total - before - 1 - i));
    const done = window.setTimeout(() => setBreaking([]), BREAK_MS);
    return () => window.clearTimeout(done);
  }, [gone, total, reduced]);
  const id = `kp-heart-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (total === 0) return null;
  return (
    <span className={styles.hearts} data-still={reduced || undefined}>
      {Array.from({ length: total }, (_, i) => {
        const full = i < left;
        const cracking = breaking.includes(i);
        return (
          <svg
            key={i}
            className={styles.heart}
            data-full={full || undefined}
            data-breaking={cracking || undefined}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path className={styles.heartLine} d={HEART} />
            {full && <path className={styles.heartFill} d={HEART} />}
            {cracking && (
              <>
                <defs>
                  <clipPath id={`${id}-${i}-l`}>
                    <polygon points={`0,0 ${CRACK} 0,24`} />
                  </clipPath>
                  <clipPath id={`${id}-${i}-r`}>
                    <polygon points={`24,0 ${CRACK} 24,24`} />
                  </clipPath>
                </defs>
                <g className={styles.heartLeft}>
                  <path className={styles.heartFill} d={HEART} clipPath={`url(#${id}-${i}-l)`} />
                </g>
                <g className={styles.heartRight}>
                  <path className={styles.heartFill} d={HEART} clipPath={`url(#${id}-${i}-r)`} />
                </g>
              </>
            )}
          </svg>
        );
      })}
      <span className={styles.srOnly} aria-live="polite">
        {left === 1 ? "1 heart left" : `${left} hearts left`}
      </span>
    </span>
  );
}
