"use client";

/*
 * Option A, "Two painted windows": each course is a tall framed painting of its own landscape,
 * side by side. Math is a stone bridge whose arch is a parabola over a mountain lake; Reading
 * and Writing is an open book in a meadow, the grass growing out of its pages. The name sits
 * large over the sky, the percent runs as a thin bar along the bottom of the frame.
 * Hover or focus: the frame lifts and tilts on a spring and the painting leans closer.
 */
import { motion, type Transition } from "framer-motion";
import { useState } from "react";
import { Num } from "@/components/portal/primitives";
import PaintedSubject from "./PaintedSubject";
import { SHORT, pct, type HeroProps, type Slug } from "./types";
import styles from "./heroes.module.css";

const spring: Transition = { type: "spring", stiffness: 190, damping: 26, mass: 1 };
const lift: Transition = { type: "spring", stiffness: 320, damping: 18, mass: 0.8 };

export default function WindowsHero({ courses, ready, reduce, onPick }: HeroProps) {
  const [on, setOn] = useState<Slug | null>(null);
  return (
    <div className={styles.windows}>
      {courses.map((c, i) => {
        const lit = on === c.slug;
        return (
          <motion.button
            key={c.slug}
            type="button"
            className={styles.window}
            data-slug={c.slug}
            layoutId={reduce ? undefined : `course-${c.slug}`}
            style={{ borderRadius: 4 }}
            onClick={() => onPick(c.slug)}
            onHoverStart={() => setOn(c.slug)}
            onHoverEnd={() => setOn((s) => (s === c.slug ? null : s))}
            onFocus={() => setOn(c.slug)}
            onBlur={() => setOn((s) => (s === c.slug ? null : s))}
            initial={false}
            animate={
              ready
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: reduce ? 0 : 28, scale: reduce ? 1 : 0.97 }
            }
            transition={{ ...spring, delay: ready ? 0.12 + i * 0.1 : 0 }}
            whileTap={reduce ? undefined : { scale: 0.965 }}
          >
            <motion.span
              className={styles.windowFrame}
              animate={lit && !reduce ? { y: -6, rotate: i ? 0.8 : -0.8 } : { y: 0, rotate: 0 }}
              transition={lift}
            >
              <span className={styles.windowCanvas}>
                <motion.span
                  className={styles.windowArtWrap}
                  animate={{ scale: lit && !reduce ? 1.05 : 1 }}
                  transition={lift}
                >
                  {ready && (
                    <PaintedSubject
                      art={c.slug}
                      still={reduce}
                      delay={150 + i * 260}
                      lively={lit}
                    />
                  )}
                </motion.span>
                <span className={styles.windowScrim} />
                <span className={styles.windowText}>
                  <span className={styles.windowName}>{SHORT[c.slug]}</span>
                  <span className={styles.windowPct}>
                    <Num>{pct(c)}%</Num> done
                  </span>
                </span>
                <span className={styles.windowBar} aria-hidden="true">
                  <motion.span
                    className={styles.windowBarFill}
                    initial={false}
                    animate={{ scaleX: ready ? Math.max(0.015, c.progress) : 0 }}
                    transition={{ ...spring, delay: ready ? 0.5 + i * 0.1 : 0 }}
                  />
                </span>
              </span>
            </motion.span>
          </motion.button>
        );
      })}
    </div>
  );
}
