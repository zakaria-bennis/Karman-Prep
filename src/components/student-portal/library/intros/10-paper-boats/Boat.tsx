/*
 * A folded paper boat, drawn in code: the hull with its two pointed ends and the tall middle
 * fold that serves as the sail. The subject's name is written on the sail in Young Serif and
 * the percent on the hull. Paper and ink colors follow the hour (boats.module.css).
 */
import type { ReactNode } from "react";
import styles from "./boats.module.css";

export default function Boat({
  name,
  lines,
  children,
}: {
  name: string;
  /** The name broken across the sail, one or two lines. */
  lines: string[];
  /** The percent, written on the hull. */
  children: ReactNode;
}) {
  return (
    <span className={styles.paper} data-name={name}>
      <svg viewBox="0 0 240 180" aria-hidden="true" className={styles.drawing}>
        {/* The boat's shadow on the water. */}
        <ellipse cx="120" cy="166" rx="104" ry="11" className={styles.shadow} />
        {/* The hull: the underside, then the front face. */}
        <path d="M10 112 L230 112 L194 160 L46 160 Z" className={styles.shade} />
        <path d="M10 112 L230 112 L218 128 L22 128 Z" className={styles.face} />
        {/* The two pointed ends. */}
        <path d="M10 112 L36 70 L64 112 Z" className={styles.face} />
        <path d="M230 112 L204 70 L176 112 Z" className={styles.shade} />
        {/* The sail: the tall middle fold, lit on one side. */}
        <path d="M44 112 L120 2 L120 112 Z" className={styles.face} />
        <path d="M120 2 L196 112 L120 112 Z" className={styles.light} />
        <path
          d="M120 2 L120 112 M44 112 L196 112 M36 70 L46 112 M204 70 L194 112 M46 160 L120 128 L194 160"
          className={styles.fold}
        />
      </svg>
      <span className={styles.name} data-lines={lines.length}>
        {lines.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </span>
      <span className={styles.pct}>{children}</span>
    </span>
  );
}
