import type { LessonChecks } from "./types";

// Solved blind by a second reader: find the noun the pronoun stands for, then match its number.
const checks: LessonChecks = {
  examples: [
    { index: 1 }, // "orchestra ... performs": one group, singular verb, so it
    { index: 3 }, // "the committee ... decision": one group owns it, so its (not it's)
  ],
  check: { index: 1 }, // the kelp keeps the otters (plural) from drifting: them
  quiz: [
    { index: 1 }, // "the team of engineers": subject is team, one group, so its
    { index: 2 }, // the antecedent is the noun that did the sending, the rovers
    { index: 3 }, // the club is one group, so it, not they
    { index: 0 }, // "the geese ... flapped ___ wings": subject geese is plural, so their
    { index: 2 }, // "each polyp ... ___ soft body": one polyp owns it, so its
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 3 }, { index: 0 }],
    [{ index: 1 }, { index: 2 }],
  ],
};

export default checks;
