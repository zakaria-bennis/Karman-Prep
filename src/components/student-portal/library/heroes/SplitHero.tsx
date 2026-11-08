"use client";

/*
 * Option B, "One split canvas": a single painted landscape holds both courses. On the left, the
 * parabola bridge over the lake (Math); on the right, the open book in its meadow (Reading and
 * Writing), its stream running down into the same lake. Each half is a button.
 * Hover or focus one half: it brightens, the other dims, and the painting leans toward it.
 */
import { motion, type Transition } from "framer-motion";
import { useState } from "react";
import { Num } from "@/components/portal/primitives";
import PaintedSubject from "./PaintedSubject";
import { SHORT, pct, type HeroProps, type Slug } from "./types";
import styles from "./heroes.module.css";

const spring: Transition = { type: "spring", stiffness: 190, damping: 26, mass: 1 };
const lean: Transition = { type: "spring", stiffness: 260, damping: 22, mass: 0.9 };

export default function SplitHero({ courses, ready, reduce, onPick }: HeroProps) {
  const [on, setOn] = useState<Slug | null>(null);
  const side = (slug: Slug) => (slug === "math" ? "left" : "right");
  return (
    <motion.div
      className={styles.split}
      initial={false}
      animate={
        ready
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: reduce ? 0 : 28, scale: reduce ? 1 : 0.97 }
      }
      transition={{ ...spring, delay: ready ? 0.12 : 0 }}
    >
      <motion.span
        className={styles.splitArt}
        style={{ transformOrigin: on ? `${on === "math" ? "0%" : "100%"} 60%` : "50% 60%" }}
        animate={{ scale: on && !reduce ? 1.035 : 1 }}
        transition={lean}
      >
        {ready && <PaintedSubject art="split" still={reduce} delay={150} ms={2000} lively={!!on} />}
      </motion.span>
      <span className={styles.splitSeam} aria-hidden="true" />
      {courses.map((c) => {
        const lit = on === c.slug;
        const dim = on !== null && !lit;
        return (
          <motion.button
            key={c.slug}
            type="button"
            className={styles.half}
            data-side={side(c.slug)}
            data-slug={c.slug}
            layoutId={reduce ? undefined : `course-${c.slug}`}
            style={{ borderRadius: 4 }}
            onClick={() => onPick(c.slug)}
            onHoverStart={() => setOn(c.slug)}
            onHoverEnd={() => setOn((s) => (s === c.slug ? null : s))}
            onFocus={() => setOn(c.slug)}
            onBlur={() => setOn((s) => (s === c.slug ? null : s))}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={lean}
          >
            <motion.span
              className={styles.halfDim}
              initial={false}
              animate={{ opacity: dim ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            />
            <motion.span
              className={styles.halfGlow}
              initial={false}
              animate={{ opacity: lit ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            />
            <motion.span
              className={styles.halfText}
              animate={{ y: lit && !reduce ? -4 : 0 }}
              transition={lean}
            >
              <span className={styles.halfName}>{SHORT[c.slug]}</span>
              <span className={styles.halfPct}>
                <span className={styles.halfRing} aria-hidden="true">
                  <motion.span
                    className={styles.halfRingFill}
                    initial={false}
                    animate={{ scaleX: ready ? Math.max(0.02, c.progress) : 0 }}
                    transition={{ ...spring, delay: ready ? 0.6 : 0 }}
                  />
                </span>
                <span>
                  <Num>{pct(c)}%</Num> done
                </span>
              </span>
            </motion.span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
