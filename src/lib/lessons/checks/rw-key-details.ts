import type { LessonChecks } from "./types";

// Solved blind by a second reader: find the one line the question points to and restate it.
const checks: LessonChecks = {
  examples: [
    { index: 1 }, // "To keep from drifting apart while they sleep"
    { index: 2 }, // "lost most of its business and closed"
  ],
  check: { index: 3 }, // "the length of the waggle shows how far away they are"
  quiz: [
    { index: 1 }, // "Car traffic on Elm Avenue dropped slightly"
    { index: 0 }, // note the question's "before", then find that line ("after eating enough")
    { index: 2 }, // compost plants grew taller; "plain-soil plants produced more pods"
    { index: 3 }, // "what did the farmers find" is answered by one line ("a layer of fine mud")
    { index: 0 }, // "a single strip of living bark keeps the rest of the tree alive"
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 2 }, { index: 0 }],
    [{ index: 3 }, { index: 1 }],
  ],
};

export default checks;
