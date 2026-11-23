import type { LessonChecks } from "./types";

// Solved blind by a second reader: the link between the two sentences, then the choice that names it.
const checks: LessonChecks = {
  examples: [
    // memory foam is one case of "everyday products began as space research"
    { index: 1 },
    // "won or lost on defense" restated plainly: stopping scoring matters most
    { index: 2 },
  ],
  // fast-growing, and also strong: a further point about bamboo
  check: { index: 0 },
  quiz: [
    // lasts two days = plug in every other day, the same fact said another way
    { index: 3 },
    // first read both sentences and decide whether the second goes the same way
    { index: 1 },
    // classes are another feature of the library, not a match for the garden
    { index: 0 },
    // the fennec fox is one desert animal active only at night
    { index: 2 },
    // ants, like bees, guide nestmates to food: a parallel case
    { index: 1 },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 3 }, { index: 0 }],
    [{ index: 1 }, { index: 0 }],
  ],
};

export default checks;
