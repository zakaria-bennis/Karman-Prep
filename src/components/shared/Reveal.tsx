"use client";

// ============================================================
// Reveal — the site-wide "enter" primitive.
//
// Wraps any element and fades + rises it as it enters the
// viewport. Use directly, or set `as="stagger"` on a parent
// to orchestrate a stagger of child <Reveal> elements.
// ============================================================

import { motion, type HTMLMotionProps } from "framer-motion";
import { fadeUp, stagger, revealTransition, viewportOnce } from "@/lib/motion";

type Props = Omit<HTMLMotionProps<"div">, "variants" | "initial" | "whileInView" | "viewport"> & {
  as?: "item" | "stagger";
  /** Stagger gap in seconds (only when as="stagger") */
  gap?: number;
  /** Additional delay before the reveal starts */
  delay?: number;
};

export default function Reveal({
  as = "item",
  gap = 0.09,
  delay = 0,
  transition,
  children,
  ...rest
}: Props) {
  if (as === "stagger") {
    return (
      <motion.div
        variants={stagger(gap)}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      transition={{ ...revealTransition, delay, ...(transition ?? {}) }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
