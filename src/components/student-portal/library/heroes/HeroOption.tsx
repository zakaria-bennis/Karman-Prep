"use client";

/*
 * Picks one of the three painted versions of the course choice the founder is comparing
 * (2026-11-08): ?hero=a (two painted windows), b (one split canvas), c (objects on a shelf).
 * Once he picks one, it replaces the current cards and the others are deleted.
 */
import ShelfHero from "./ShelfHero";
import SplitHero from "./SplitHero";
import WindowsHero from "./WindowsHero";
import type { HeroOption as Kind, HeroProps } from "./types";

export default function HeroOption({ kind, ...props }: HeroProps & { kind: Kind }) {
  if (kind === "a") return <WindowsHero {...props} />;
  if (kind === "b") return <SplitHero {...props} />;
  return <ShelfHero {...props} />;
}
