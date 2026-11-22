// The phone's bar as a carousel (founder, 2026-11-18). The bar is one strip: the plan's five, ending
// in More, and then what the five have no room for, ending in the profile picture (Account). Pressing
// More slides the strip along: the first four leave at the left, More is carried to the left end, and
// the rest come in from the right. Pressing More again turns it all back. So the second set holds at
// most four pictures beside More.
import type { Page } from "./plans";

export type Slot = { x: number; w: number };

/** The whole strip, in order: the bar's own (More last), the tucked pages, then Account. */
export const strip = (bar: readonly Page[], tucked: readonly Page[]): Page[] => [
  ...bar,
  ...tucked,
  "account",
];

/** What is in view: the bar's own, or More and everything after it. */
export const inView = (bar: readonly Page[], tucked: readonly Page[], turned: boolean): Page[] =>
  turned ? ["more", ...tucked, "account"] : [...bar];

/** Where every picture of the strip sits in a bar `width` wide. The first set shares the width
 *  evenly; so does the second, however many it holds. Pictures out of view keep their place in the
 *  strip, just past the edge they left by. */
export function slots(first: number, second: number, width: number, turned: boolean): Slot[] {
  const a = width / first;
  const b = width / second;
  const more = first - 1;
  return Array.from({ length: first + second - 1 }, (_, i) => {
    if (i < more) return { x: (turned ? i - more : i) * a, w: a };
    if (i === more) return turned ? { x: 0, w: b } : { x: more * a, w: a };
    const j = i - more;
    return turned ? { x: j * b, w: b } : { x: (more + j) * a, w: a };
  });
}

/** How long each picture waits before it moves, so the strip reads as one thing being pushed: the
 *  side that leaves goes first and the side that arrives follows it in. Seconds. */
export function waits(first: number, second: number, turned: boolean): number[] {
  const more = first - 1;
  return Array.from({ length: first + second - 1 }, (_, i) => {
    if (i === more) return 0.03;
    if (i < more) return turned ? i * 0.018 : 0.03 + (more - 1 - i) * 0.026;
    const j = i - more;
    return turned ? 0.03 + j * 0.026 : (second - 1 - j) * 0.018;
  });
}
