// TEMPORARY (2026-11-13): the words the six hero designs need (HeroLab.tsx), read on the server from
// site-copy.ts section 59.
import { list, pairs, section } from "@/lib/marketing/site-copy";
import type { HeroWords } from "./HeroLab";

export function heroWords(page: "program" | "private"): HeroWords {
  const s = section(59);
  return {
    foxHeadline: s[`${page} fox headline`],
    pieces: Object.fromEntries(pairs(s[`${page} pieces`])),
    sheets: list(s.sheets),
    sheetWord: s["sheet word"],
    sheetsNote: s["sheets note"],
    clockLabel: s["clock label"],
    clockLine: s["clock line"],
  };
}
