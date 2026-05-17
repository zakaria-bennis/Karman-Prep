// ============================================================
// Motion — site-wide animation vocabulary.
//
// Two generations live side by side here:
//
//  1. CONTEMPLATIVE primitives (docs/brand.md "Motion") — the
//     observatory direction. Small rises, long-tail eases, no
//     overshoot, no scale-up springs. New code should reach for
//     these.
//
//  2. LEGACY kinetic primitives (cloud-aurora aesthetic) — fadeUp,
//     respondSpring, etc. Still consumed by the existing landing +
//     auth surfaces. Marked @deprecated; will be deleted when those
//     surfaces migrate during roadmap chunk 7 (UI redesign).
// ============================================================

import type { Variants } from "framer-motion";

// ─────────────────────────────────────────────────────────────
// Contemplative — docs/brand.md
// ─────────────────────────────────────────────────────────────

/** Duration tokens (seconds — framer-motion uses seconds, not ms). */
export const DURATION = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.4,
  slow: 0.8,
  contemplative: 1.6,
} as const;

/** Ease curves. `easeStandard` is the project default; `easeContemplative`
 *  is the long-tail variant for settles and reading-surface reveals. */
export const easeStandard = [0.22, 1, 0.36, 1] as const;
export const easeContemplative = [0.16, 1, 0.3, 1] as const;

/** Default `whileInView` config — fires once, slightly before the
 *  element's top edge enters the viewport. Smaller margin than the
 *  legacy `viewportOnce` so settles don't pre-fire too early. */
export const viewportContemplative = { once: true, margin: "-40px" } as const;

/** SETTLE — fade + tiny rise. Replaces the legacy `fadeUp`. The rise
 *  is intentionally smaller (8px vs 24px) and the ease longer-tailed
 *  so content arrives rather than springs. */
export const settle: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

/** Default transition for settle reveals. Pair with the variants
 *  above on the element's `transition` prop. */
export const settleTransition = {
  duration: DURATION.contemplative,
  ease: easeContemplative,
} as const;

/** HOLD — explicit absence of motion. Use as a defensive default for
 *  reading regions (lesson body, passage text) where any animation
 *  would compromise readability. */
export const hold: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};

/** RESPOND — minimal hover/press feedback. Opacity + border-tone
 *  shifts only — no scale, no shadow burst, no springs. Apply as a
 *  `transition` prop on whileHover/whileTap, not as a Variants set. */
export const respondTone = {
  duration: DURATION.fast,
  ease: easeStandard,
} as const;

// ─────────────────────────────────────────────────────────────
// Legacy — cloud-aurora aesthetic. Existing consumers only.
// ─────────────────────────────────────────────────────────────

/** @deprecated Use `easeStandard` instead. Same curve, clearer name. */
export const ease = easeStandard;

/** @deprecated Use `viewportContemplative` (smaller margin) for new
 *  surfaces. Kept for landing/auth/onboarding which were tuned against
 *  this trigger point. */
export const viewportOnce = { once: true, margin: "-80px" } as const;

/** @deprecated Use `settle` instead. `fadeUp` rises 24px (kinetic);
 *  `settle` rises 8px (contemplative). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

/** @deprecated Mid-tier reveal — opacity only, no rise. Still safe to
 *  reach for when you want a plain fade without the rise; otherwise
 *  prefer `settle`. */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

/** Container that staggers its children's reveal. Still useful for
 *  both legacy and contemplative reveals — the children's variants
 *  determine the actual motion character. */
export function stagger(gap = 0.09, delay = 0.05): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: gap, delayChildren: delay } },
  };
}

/** @deprecated Use `settleTransition` for the observatory direction.
 *  Kept for legacy callers. */
export const revealTransition = { duration: 0.6, ease: easeStandard };

/** @deprecated Springs are explicitly forbidden by the brand brief
 *  (no overshoot, no spring physics). Use `respondTone` for hover/press
 *  feedback. */
export const respondSpring = {
  type: "spring" as const,
  stiffness: 300,
  damping: 24,
  mass: 0.6,
};
