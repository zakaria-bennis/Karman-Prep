import type { LessonChecks } from "./types";

// Solved blind by a second reader: the link between the two sentences, then the choice that names it.
const checks: LessonChecks = {
  examples: [{ text: "In contrast" }, { text: "Nevertheless" }],
  check: { text: "By contrast" },
  quiz: [
    { text: "In contrast" },
    { text: "Still" },
    { text: "As a result" },
    { text: "Even so" },
    { text: "However" },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 2 }, { index: 0 }],
    [{ index: 1 }, { index: 3 }],
  ],
};

export default checks;
