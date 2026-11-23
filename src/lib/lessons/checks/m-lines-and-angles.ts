import type { LessonChecks } from "./types";

// Parallel lines cut by a transversal: equal angles, or a pair that adds to 180.
const x0 = 15 + 10; // angles 2 and 6 are corresponding, so 2x + 15 = 3x - 10
// Angles 3 and 6 are read as same-side interior (supplementary): 5x - 30 + 3x + 10 = 180
const x1 = (180 + 30 - 10) / 8;
const q0x = (180 - 6 - 18) / 6; // acute + obtuse = 180
const q4k = (180 + 12 - 32) / 8; // not equal, so they add to 180

const checks: LessonChecks = {
  examples: [3 * x0 - 10, 5 * x1 - 30],
  check: 180 - 48,
  quiz: [
    4 * q0x + 18,
    { text: "Set the two expressions equal to each other." },
    { text: "An acute and an obtuse angle add to 180" },
    { text: "They are across from each other where two lines cross." },
    Math.min(5 * q4k - 12, 3 * q4k + 32),
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    // the two acute angles are equal; an obtuse and an acute angle add to 180
    [4 * ((35 + 5) / (4 - 2)) - 5, 5 * ((24 + 12) / (5 - 2)) - 12],
    [6 * ((180 + 10 - 30) / (6 + 2)) - 10, 5 * ((180 - 5 - 25) / (5 + 1)) + 5],
  ],
};

export default checks;
