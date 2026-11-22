import type { LessonChecks } from "./types";

// Solved blind by a second reader: the goal's key words, then the choice whose main point meets them.
const checks: LessonChecks = {
  examples: [
    // "how short a time": only C says the flower lasts only one night
    { index: 2 },
    // "generalization": B states the group claim (some animals store food) with examples
    { index: 1 },
  ],
  // "introduce ... unfamiliar": B says what the kora is (a string instrument from West Africa)
  check: { index: 1 },
  quiz: [
    // "generalization about seeds that travel by wind": D names the group, the others give cases
    { index: 3 },
    // the first step is to mark the goal's verb and its point
    { index: 1 },
    // the fast building sits in a "which" clause; the main clause is about the length
    { index: 2 },
    // "one example ... uses its light to hunt": the anglerfish lure draws prey
    { index: 0 },
    // "explain why ... frozen mountain": B gives the reason (frozen rock keeps seeds cold)
    { index: 1 },
  ],
};

export default checks;
