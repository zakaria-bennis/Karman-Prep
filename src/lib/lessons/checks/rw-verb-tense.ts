import type { LessonChecks } from "./types";

// Solved blind by a second reader: the time words in the passage set the tense.
const checks: LessonChecks = {
  examples: [
    { index: 1 }, // "Since then ... now sells": past into the present, has developed
    { index: 1 }, // the blocking came before "found" in the past: had blocked
  ],
  check: { index: 2 }, // "If the test goes well ... next spring": will expand
  quiz: [
    { index: 3 }, // "By the time the firefighters arrived": earlier past, had moved
    { index: 0 }, // first find the time words, before and 1937
    { index: 2 }, // stands is the skeleton now; "last Saturday" puts the visit in the past
    { index: 1 }, // "Since the new factory opened": present perfect, has grown
    { index: 2 }, // rested for 300 years "before the team's discovery" in 2019 (past): had rested
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 2 }, { index: 0 }],
    [{ index: 3 }, { index: 0 }],
  ],
};

export default checks;
