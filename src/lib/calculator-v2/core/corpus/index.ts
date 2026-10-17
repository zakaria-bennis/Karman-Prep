// The golden corpus (PR-39): every case of every file in cases/, in section 2.1 file order.
// Relative imports only, so Vitest, tsx scripts and Playwright specs load it alike.

import { CORPUS_FILES } from "./cases/index";
import type { CorpusCase } from "./types";

export const CORPUS: readonly CorpusCase[] = Object.values(CORPUS_FILES).flat();

export function casesFor(rule: string): CorpusCase[] {
  return CORPUS.filter((c) => c.rules.includes(rule));
}
