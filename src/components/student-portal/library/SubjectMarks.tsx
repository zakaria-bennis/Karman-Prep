"use client";

/*
 * The two course marks for the Library's first choice (founder, 2026-11-08: "a hero choice
 * between math and reading, within Karman's theme"). Drawn in code in the day painting's four
 * shades and accent, with brush edges, so they change color with the painting. No stock art.
 *
 * Math: a parabola swept over a faint grid, a painted sun resting on its vertex, a triangle.
 * Reading and Writing: an open book, its lines laid in as brush strokes, an ink swash rising.
 * Strokes draw in on entrance, then hold still.
 */
import { motion } from "framer-motion";
import styles from "./chooser.module.css";

type Slug = "math" | "reading-writing";

function drawIn(still: boolean) {
  return (delay: number, duration = 0.9) =>
    still
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: {
            pathLength: { duration, ease: [0.45, 0, 0.2, 1] as const, delay },
            opacity: { duration: 0.01, delay },
          },
        };
}

function bloomIn(still: boolean) {
  return (delay: number) =>
    still
      ? {}
      : {
          initial: { scale: 0.4, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { type: "spring" as const, stiffness: 160, damping: 14, delay },
        };
}

function Brush({ id }: { id: string }) {
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05 0.12" numOctaves="2" seed="11" />
      <feDisplacementMap in="SourceGraphic" scale="5" />
    </filter>
  );
}

function MathMark({ still }: { still: boolean }) {
  const draw = drawIn(still);
  const bloom = bloomIn(still);
  return (
    <>
      <defs>
        <Brush id="mk-brush-math" />
      </defs>
      <g filter="url(#mk-brush-math)">
        <ellipse cx="120" cy="92" rx="104" ry="58" className={styles.wash} />
        <g className={styles.grid}>
          {[40, 70, 100, 130, 160, 190].map((x) => (
            <path key={`x${x}`} d={`M${x} 30 V150`} />
          ))}
          {[45, 75, 105, 135].map((y) => (
            <path key={`y${y}`} d={`M24 ${y} H216`} />
          ))}
        </g>
        <motion.path
          d="M30 40 C70 168 170 168 210 40"
          className={styles.strokeMain}
          {...draw(0.15, 1.1)}
        />
        <motion.path
          d="M150 150 L196 150 L196 108 Z"
          className={styles.strokeSoft}
          {...draw(0.55, 0.7)}
        />
        <motion.g style={{ transformOrigin: "120px 98px" }} {...bloom(0.95)}>
          <circle cx="120" cy="104" r="16" className={styles.sun} />
        </motion.g>
      </g>
    </>
  );
}

function ReadingMark({ still }: { still: boolean }) {
  const draw = drawIn(still);
  const bloom = bloomIn(still);
  return (
    <>
      <defs>
        <Brush id="mk-brush-read" />
      </defs>
      <g filter="url(#mk-brush-read)">
        <ellipse cx="120" cy="96" rx="104" ry="56" className={styles.wash} />
        <motion.g style={{ transformOrigin: "120px 120px" }} {...bloom(0.05)}>
          <path
            d="M120 64 C96 52 60 50 34 58 L34 138 C60 130 96 132 120 144 Z"
            className={styles.page}
          />
          <path
            d="M120 64 C144 52 180 50 206 58 L206 138 C180 130 144 132 120 144 Z"
            className={styles.pageShade}
          />
          <path d="M120 64 V144" className={styles.spine} />
        </motion.g>
        {[78, 94, 110].map((y, i) => (
          <motion.path
            key={`l${y}`}
            d={`M${48} ${y - 4 + i} C70 ${y - 8} 90 ${y - 6} ${108} ${y + 2}`}
            className={styles.line}
            {...draw(0.35 + i * 0.12, 0.45)}
          />
        ))}
        {[78, 94, 110].map((y, i) => (
          <motion.path
            key={`r${y}`}
            d={`M${132} ${y + 2} C150 ${y - 6} 170 ${y - 8} ${192 - i * 10} ${y - 4 + i}`}
            className={styles.line}
            {...draw(0.6 + i * 0.12, 0.45)}
          />
        ))}
        <motion.path
          d="M150 128 C176 108 188 70 214 38"
          className={styles.strokeMain}
          {...draw(0.95, 0.8)}
        />
      </g>
    </>
  );
}

export default function SubjectMark({ slug, still }: { slug: Slug; still: boolean }) {
  return (
    <svg className={styles.mark} viewBox="0 0 240 180" aria-hidden="true" focusable="false">
      {slug === "math" ? <MathMark still={still} /> : <ReadingMark still={still} />}
    </svg>
  );
}
