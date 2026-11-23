import type { LessonChecks } from "./types";

// Solved blind by a second reader: cover the mark and test whether each side could stand alone.
const checks: LessonChecks = {
  examples: [
    // "The zoo opened in 1870" | "it held only a few deer...": two full sentences, so a semicolon
    { index: 1 },
    // "the moment when the sun broke through" renames sunrise: no verb of its own, so a comma
    { index: 2 },
  ],
  // "lay their own eggs" | "Some swim hundreds of miles": two full sentences, so a period
  check: { index: 1 },
  quiz: [
    // "a three-story structure built by..." renames the mill: a comma
    { index: 0 },
    // first cover the mark and test whether each side could stand alone
    { index: 1 },
    // however is an adverb, not a conjunction: "week, however," splices two sentences
    { index: 2 },
    // "Although ... in May" is a dependent clause before the main clause: a comma
    { index: 3 },
    // "the walls stretch for nearly 5 kilometers" | "walking the loop takes two hours": a semicolon
    { index: 2 },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 3 }, { index: 0 }],
    [{ index: 1 }, { index: 3 }],
  ],
};

export default checks;
