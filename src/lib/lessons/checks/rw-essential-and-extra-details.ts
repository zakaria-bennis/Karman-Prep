import type { LessonChecks } from "./types";

// Solved blind by a second reader: does the detail say which one (no commas) or add to a named one (a
// pair of matching marks)?
const checks: LessonChecks = {
  examples: [
    // "the town's only mechanic" is extra: it needs the closing comma before "fixes"
    { index: 2 },
    // "geologist Ines Marsh" is a title before a name: no commas, none before the verb
    { index: 1 },
  ],
  // "that shows a sleeping fox" says which one: no commas at all
  check: { index: 0 },
  quiz: [
    // "chef Theo Grant" is a title before a name: no commas
    { index: 3 },
    // lift the part out and see whether the sentence still says which scientist
    { index: 2 },
    // the extra part opens with a comma after "lighthouse" and must close after "island"
    { index: 0 },
    // "His only daughter" is already one person, so "a high school senior" is extra
    { index: 2 },
    // the parenthesis opened before "a stone mill" must close, with no comma before the verb
    { index: 1 },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 0 }, { index: 3 }],
    [{ index: 1 }, { index: 3 }],
  ],
};

export default checks;
