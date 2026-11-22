import type { LessonChecks } from "./types";

// Solved blind by a second reader: the exact claim being answered, then what the other author's
// evidence says about it.
const checks: LessonChecks = {
  examples: [
    // Text 2 "Many students ... fall behind without a teacher checking in"
    { index: 2 },
    // Text 2 "one does not always cause the other ... other habits"
    { index: 0 },
  ],
  // Text 2 "sharpen how quickly players notice ... do not appear to make players any better at schoolwork"
  check: { index: 1 },
  quiz: [
    // Text 2 "also lowered the speed limit ... painted new crosswalks": other changes may explain it
    { index: 3 },
    // first pin down exactly what the underlined claim says
    { index: 2 },
    // that is Text 1's view; the answer gives Text 1's response, not Text 2's
    { index: 0 },
    // Text 1 "readers remember more of what they read on paper": e-books would be remembered less
    { index: 1 },
    // Text 2 "do mention trouble with her eyes. Yet ... a new interest as much as a loss"
    { index: 2 },
  ],
};

export default checks;
