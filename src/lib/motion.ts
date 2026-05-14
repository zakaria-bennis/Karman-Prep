// ============================================================
// Motion — site-wide animation vocabulary.
//
// Four primitives only: Reveal, Drift, Scrub, Respond.
// Every section uses these constants so the whole site rhymes.
// ============================================================

import type { Variants } from "framer-motion";

// Signature easing for everything that enters or settles. Matches
// the hero's stagger. Don't introduce new curves per-section.
export const ease = [0.22, 1, 0.36, 1] as const;

// Standard viewport trigger for `whileInView`. Fires once, a bit
// before the element's top edge hits the viewport.
export const viewportOnce = { once: true, margin: "-80px" } as const;

// -------- REVEAL --------
// Fade + rise on enter. Use for every section header / card / item.
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

// Container that staggers its children's reveal.
export function stagger(gap = 0.09, delay = 0.05): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: gap, delayChildren: delay } },
  };
}

// Default transition applied alongside reveal variants.
export const revealTransition = { duration: 0.6, ease };

// -------- RESPOND --------
// Spring for hover / press / magnetic interactions.
export const respondSpring = { type: "spring" as const, stiffness: 300, damping: 24, mass: 0.6 };
