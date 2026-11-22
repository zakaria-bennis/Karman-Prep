import type { LessonChecks } from "./types";

// Solved blind by a second reader: commas between simple items, semicolons when items hold commas, and
// no mark between the last item and the verb.
const checks: LessonChecks = {
  examples: [
    // items hold commas ("coding, which starts in January"), so a semicolon, as after March
    { index: 1 },
    // "potatoes" is the last item of the subject: no mark before the verb "grow"
    { index: 2 },
  ],
  // no mark after "such as"; a comma between simple items
  check: { index: 2 },
  quiz: [
    // "raccoons" ends the subject: no mark before "hunt"
    { index: 1 },
    // items already have commas inside them, so semicolons separate them
    { index: 3 },
    // "Turin, Italy" holds a comma, so a semicolon after Italy, matching the one after France
    { index: 2 },
    // city-and-state items hold commas, so they need semicolons
    { index: 0 },
    // matches the earlier "Arctic;": semicolon, then "and" with no comma
    { index: 3 },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 0 }, { index: 2 }],
    [{ index: 1 }, { index: 3 }],
  ],
};

export default checks;
