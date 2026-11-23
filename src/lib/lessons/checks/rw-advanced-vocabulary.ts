import type { LessonChecks } from "./types";

// Solved blind by a second reader: the meaning and the charge the blank needs, then the hard word.
const checks: LessonChecks = {
  examples: [
    // friends "admired" her refusal to quit: positive persistence, not obstinacy
    { index: 0 },
    // rests on "one faded label of unknown origin": doubtful
    { index: 1 },
  ],
  // "every curve a hazard", cars slide off: dangerous
  check: { index: 2 },
  quiz: [
    // eight customers, all employees: weak evidence
    { index: 3 },
    // predict a plain word such as boldness and note the blank is positive
    { index: 0 },
    // family "admires" him: stingy is an insult, frugal fits
    { index: 2 },
    // charge plus crossing out applies when the choices are hard words
    { index: 1 },
    // "plain, careful terms", "dull precision": prosaic
    { index: 0 },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 1 }, { index: 0 }],
    [{ index: 2 }, { index: 1 }],
  ],
};

export default checks;
