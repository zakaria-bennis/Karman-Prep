import type { LessonChecks } from "./types";

// Solved blind by a second reader: each sentence's job in order, then the choice that names them.
const checks: LessonChecks = {
  examples: [
    // stores close (problem), co-op reopens it (response), twelve jobs (result)
    { index: 0 },
    // critics' view, then "Yet" and "And" give two points against it
    { index: 1 },
  ],
  // common view (fierce loners), "however" an observation against it, then "suggest" a new idea
  check: { index: 2 },
  quiz: [
    // belief (no soap), then "Yet" and "even" give two points against it
    { index: 3 },
    // label each sentence's job first: old way, change, result
    { index: 1 },
    // the later experiments go against the sound-only idea
    { index: 0 },
    // "overall structure of the text" is the whole-text order question
    { index: 2 },
    // one measure, a survey "however" shows its limits, planners' revised view
    { index: 1 },
  ],
};

export default checks;
