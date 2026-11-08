import type { ChooserCourse } from "../CourseChooser";

export type Slug = ChooserCourse["slug"];

/** The three versions of the course choice the founder is comparing (2026-11-08). */
export type HeroOption = "a" | "b" | "c";
export const HERO_OPTIONS: readonly HeroOption[] = ["a", "b", "c"];

export const SHORT: Record<Slug, string> = {
  math: "Math",
  "reading-writing": "Reading and Writing",
};

/** What each version needs from the chooser. Every option's buttons carry
 *  `layoutId="course-<slug>"`, so the pick flies into the toggle. */
export interface HeroProps {
  courses: ChooserCourse[];
  /** The Challenge moment is out of the way: play the entrance. */
  ready: boolean;
  reduce: boolean;
  onPick: (slug: Slug) => void;
}

export const pct = (c: ChooserCourse) => Math.round(c.progress * 100);
