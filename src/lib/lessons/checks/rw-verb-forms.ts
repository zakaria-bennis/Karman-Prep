import type { LessonChecks } from "./types";

// Solved blind by a second reader: does the clause still need its main verb, or is the blank a modifier?
const checks: LessonChecks = {
  examples: [
    { index: 1 }, // "The glass sculpture ... ___": the subject has no main verb yet, so casts
    { index: 2 }, // opening modifier before "the paintings show": Discovered
  ],
  check: { index: 1 }, // parallel list "to read ..., to build ..., and to pitch"
  quiz: [
    { index: 1 }, // opening modifier before "the narrow railway now takes": Built
    { index: 3 }, // find the subject, towers, and see it still lacks a main verb
    { index: 0 }, // "The marathon runners, ..., pushing" leaves no main verb
    { index: 2 }, // "The pool on Elm Street, ..., ___ at six": subject needs its main verb
    { index: 1 }, // "colonies ... often ___ more honey": plural subject needs main verb produce
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 2 }, { index: 1 }],
    [{ index: 0 }, { index: 3 }],
  ],
};

export default checks;
