import type { LessonChecks } from "./types";

// Solved blind by a second reader: the link between the two sentences, then the choice that names it.
const checks: LessonChecks = {
  examples: [
    // bridge closed, so drivers took a back road: cause and effect
    { index: 2 },
    // "first soak ... then spread": the next step
    { index: 3 },
  ],
  // sprained ankle, so she sat on the bench: a result
  check: { index: 1 },
  quiz: [
    // "first dig a hole", then set the tree in it: the next step
    { index: 1 },
    // try "so" between the sentences: cheaper flour, so complaints
    { index: 0 },
    // "had been" one of the hottest spots: the heat came before the trees
    { index: 3 },
    // finished homework at 7:00, then started reading: after that
    { index: 2 },
    // the railroad was finished, and later the trip took a week
    { index: 3 },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 1 }, { index: 0 }],
    [{ index: 3 }, { index: 0 }],
  ],
};

export default checks;
