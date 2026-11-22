import type { LessonChecks } from "./types";

// Solved blind by a second reader: the goal's two things and its word (similarity or difference),
// then the choice that names both and meets it.
const checks: LessonChecks = {
  examples: [
    // similarity: "both rocky planets" and "about 95% as wide as Earth"
    { index: 2 },
    // difference in how they are held: under the chin versus resting on the floor
    { index: 3 },
  ],
  // similarity: "both receive very little rain or snow each year"
  check: { index: 1 },
  quiz: [
    // difference in shape: "puffy and heaped" versus "flat, gray layers"
    { index: 2 },
    // first read the goal: the two things it names and the word similarity
    { index: 1 },
    // the sentence contrasts where they flow, a difference, but the goal asks for a similarity
    { index: 3 },
    // difference in diet: krill versus squid
    { index: 0 },
    // similarity: "both study distant galaxies from space"
    { index: 2 },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 0 }, { index: 3 }],
    [{ index: 1 }, { index: 3 }],
  ],
};

export default checks;
