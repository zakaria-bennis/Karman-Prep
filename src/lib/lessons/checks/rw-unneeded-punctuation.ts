import type { LessonChecks } from "./types";

// Solved blind by a second reader: no mark between a subject and its verb, a verb and what it takes,
// or a preposition and its object.
const checks: LessonChecks = {
  examples: [
    // the long subject "The students who signed up ... park" runs straight into "meet"
    { index: 1 },
    // "found that": no mark between a verb and its "that" clause
    { index: 2 },
  ],
  // "of more than 500 teenagers": no mark after a preposition
  check: { index: 0 },
  quiz: [
    // "showed that": no mark between a verb and its "that" clause
    { index: 3 },
    // read with no mark and ask what the spot sits between (here subject and verb)
    { index: 1 },
    // a colon cannot follow a verb like "showed"
    { index: 0 },
    // a comma after an opening "Because" clause is right; the others split subject and verb or verb and object
    { index: 2 },
    // the subject "tips on ... good boots" runs straight into "help"
    { index: 1 },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 0 }, { index: 2 }],
    [{ index: 1 }, { index: 3 }],
  ],
};

export default checks;
