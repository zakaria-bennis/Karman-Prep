import type { LessonChecks } from "./types";

// Solved blind by a second reader: does the word own something, and is the owner one or many?
const checks: LessonChecks = {
  examples: [
    { index: 2 }, // two sisters own the shop: plural possessive sisters'
    { index: 1 }, // possessive its, plain plural flippers (nothing owned by the flippers)
  ],
  check: { index: 2 }, // "___ hoping": they are hoping, so They're
  quiz: [
    { index: 2 }, // possessive its, plain plural doors ("are hidden")
    { index: 0 }, // first look at season and ask whether it is owned
    { index: 3 }, // "spotted by the volunteers": nothing owned, plain plural
    { index: 1 }, // "All three owners' shops": many owners own the shops
    { index: 2 }, // "both bakeries' best recipes": two bakeries own the recipes
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 0 }, { index: 1 }],
    [{ index: 2 }, { index: 0 }],
  ],
};

export default checks;
