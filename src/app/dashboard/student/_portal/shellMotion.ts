// The portal's motion: how its menu, bar and pages move.
/* Springs, in Apple's terms (Designing Fluid Interfaces): a quick response with a little bounce where a
   press or a flick carried the motion, none where a surface simply opens. */
export const SLIDE = { type: "spring", stiffness: 520, damping: 34, mass: 1 } as const;
export const POP = { type: "spring", stiffness: 600, damping: 18, mass: 0.8 } as const;
export const OPEN = { type: "spring", stiffness: 380, damping: 36, mass: 1 } as const;
export const STILL = { duration: 0 } as const;
/* the phone's bar turning to its second set and back: one strip pushed along, settling softly */
export const TURN = { type: "spring", stiffness: 300, damping: 30, mass: 1 } as const;
/* a page that slides over: it comes in from the side it is headed (1 forward, -1 back) on a spring, and
   the page it replaces leaves quickly the other way */
export const SLIDE_OVER = {
  from: (dir: number) => ({ x: dir * 56, opacity: 0 }),
  here: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 560, damping: 40, mass: 1 },
  },
  gone: (dir: number) => ({
    x: dir * -56,
    opacity: 0,
    transition: { duration: 0.09, ease: "easeIn" as const },
  }),
};
