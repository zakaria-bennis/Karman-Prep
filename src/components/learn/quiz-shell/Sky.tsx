"use client";
import { useMemo } from "react";
import styles from "./quiz-shell.module.css";

/** Faint stars and a few joining lines in the wide-screen margins (rule 49). It drifts slowly,
 * pauses while ink is being drawn (data-drawing on the shell) and stands still under reduced motion. */
export function Sky() {
  const { stars, lines } = useMemo(() => {
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const stars = Array.from({ length: 70 }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      r: 0.06 + rand() * 0.12,
      o: 0.25 + rand() * 0.45,
    }));
    const lines = Array.from({ length: 9 }, (_, i) => [stars[i * 3], stars[i * 3 + 1]] as const);
    return { stars, lines };
  }, []);
  return (
    <svg className={styles.sky} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <g className={styles.skyDrift}>
        {lines.map(([a, b], i) => (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={styles.skyLine} />
        ))}
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} className={styles.skyStar} />
        ))}
      </g>
    </svg>
  );
}
