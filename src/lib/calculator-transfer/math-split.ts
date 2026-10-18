// The math splitter the lazy classifier keys items with (TR-6): MathText's own splitMathText from
// components/learn/math-segments.ts, handed in by the eager loader (transfer-classifier.ts) before
// the lazy Transfer chunk resolves. AR-33: a value import of math-segments from the lazy chunk
// makes it a module shared by the quiz routes' eager code and that chunk, and the bundler then
// regroups the routes' eager chunks (about 400 gzip bytes on /learn/daily), so lazy code calls it
// through here and math-segments stays eager-only. Vitest installs it in src/test/setup.ts.

import type { splitMathText as SplitMathText } from "../../components/learn/math-segments"; // type-only

let installed: typeof SplitMathText | null = null;

/** Called by transfer-classifier.ts with the eager splitMathText (and by the test setup). */
export function installMathSplit(split: typeof SplitMathText): void {
  installed = split;
}

export const splitMathText: typeof SplitMathText = (...args) => {
  if (installed === null) throw new Error("splitMathText is not installed (transfer-classifier)");
  return installed(...args);
};
