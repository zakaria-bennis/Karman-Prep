"use client";

// ============================================================
// Reveal — the site-wide "enter" primitive.
//
// Settle, per docs/brand.md "Motion": content fades in with a
// small 8px rise on a long-tailed ease — it arrives, it doesn't
// spring. Use directly, or set `as="stagger"` on a parent to
// orchestrate a stagger of child <Reveal> elements.
// ============================================================

import { motion, type HTMLMotionProps } from "framer-motion";
import { settle, settleTransition, stagger, viewportContemplative } from "@/lib/motion";

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
        viewport={viewportContemplative}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={settle}
      initial="hidden"
      whileInView="show"
      viewport={viewportContemplative}
      transition={{ ...settleTransition, delay, ...(transition ?? {}) }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
