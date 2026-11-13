// TEMPORARY (2026-11-13): the words the hero designs need (HeroLab.tsx), read on the server from
// site-copy.ts section 59.
import { section } from "@/lib/marketing/site-copy";
import type { HeroWords } from "./HeroLab";

export function heroWords(): HeroWords {
  const s = section(59);
  return { clockLabel: s["clock label"], clockLine: s["clock line"] };
}
