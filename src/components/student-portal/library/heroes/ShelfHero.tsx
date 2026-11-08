"use client";

/*
 * Option C, "Objects on a shelf": the two courses as painted things standing on a wooden
 * shelf. Math is a drafting compass in front of a set square, a ruler at their feet; Reading
 * and Writing is a stack of books, the top one bound in the painting's hue, with an inkpot and
 * a quill. Each is painted with the backdrop's brushwork and cut out along its own outline.
 * The names are lettered on the shelf's edge below.
 * At rest they breathe very slightly; hover or focus lifts one off the shelf on a spring, its
 * shadow shrinking, and a light runs across it. Press squashes it.
 */
import { motion, type Transition, type Variants } from "framer-motion";
import { useState } from "react";
import { Num } from "@/components/portal/primitives";
import PaintedSubject from "./PaintedSubject";
import { SHORT, pct, type HeroProps, type Slug } from "./types";
import styles from "./heroes.module.css";

const spring: Transition = { type: "spring", stiffness: 190, damping: 26, mass: 1 };
const lift: Transition = { type: "spring", stiffness: 340, damping: 16, mass: 0.8 };

const objectMoves = (i: number): Variants => ({
  rest: { y: 0, rotate: 0, scaleX: 1, scaleY: 1 },
  up: { y: -14, rotate: i ? 2.2 : -2.2, scaleX: 1, scaleY: 1 },
  press: { y: -4, rotate: i ? 1 : -1, scaleX: 1.04, scaleY: 0.94 },
});
const shadowMoves: Variants = {
  rest: { scaleX: 1, opacity: 0.55 },
  up: { scaleX: 0.72, opacity: 0.3 },
  press: { scaleX: 0.95, opacity: 0.5 },
};

export default function ShelfHero({ courses, ready, reduce, onPick }: HeroProps) {
  const [on, setOn] = useState<Slug | null>(null);
  const [down, setDown] = useState<Slug | null>(null);
  return (
    <motion.div
      className={styles.shelf}
      initial={false}
      animate={ready ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: reduce ? 0.2 : 0.4 }}
    >
      <span className={styles.board} aria-hidden="true">
        {ready && <PaintedSubject art="shelf" still={reduce} ms={900} brush={1.2} />}
      </span>
      {courses.map((c, i) => {
        const state = reduce ? "rest" : down === c.slug ? "press" : on === c.slug ? "up" : "rest";
        return (
          <motion.button
            key={c.slug}
            type="button"
            className={styles.item}
            data-slug={c.slug}
            data-lit={on === c.slug ? "" : undefined}
            layoutId={reduce ? undefined : `course-${c.slug}`}
            style={{ borderRadius: 4 }}
            onClick={() => onPick(c.slug)}
            onHoverStart={() => setOn(c.slug)}
            onHoverEnd={() => {
              setOn((s) => (s === c.slug ? null : s));
              setDown(null);
            }}
            onFocus={() => setOn(c.slug)}
            onBlur={() => setOn((s) => (s === c.slug ? null : s))}
            onTapStart={() => setDown(c.slug)}
            onTap={() => setDown(null)}
            onTapCancel={() => setDown(null)}
            initial={false}
            animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: reduce ? 0 : -24 }}
            transition={{ ...spring, delay: ready ? 0.2 + i * 0.14 : 0 }}
          >
            <span className={styles.stage}>
              <motion.span
                className={styles.shadow}
                variants={shadowMoves}
                initial={false}
                animate={state}
                transition={lift}
              />
              <motion.span
                className={styles.object}
                style={{ transformOrigin: "50% 100%" }}
                variants={objectMoves(i)}
                initial={false}
                animate={state}
                transition={lift}
              >
                <span className={styles.breathe} data-i={i}>
                  {ready && (
                    <PaintedSubject
                      art={c.slug === "math" ? "math-object" : "reading-object"}
                      still={reduce}
                      delay={250 + i * 300}
                      ms={1500}
                      brush={2.2}
                    >
                      <span className={styles.sheen} />
                    </PaintedSubject>
                  )}
                </span>
              </motion.span>
            </span>
            <span className={styles.plate}>
              <span className={styles.plateName}>{SHORT[c.slug]}</span>
              <span className={styles.platePct}>
                <Num>{pct(c)}%</Num> done
              </span>
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
