import type { LessonChecks } from "./types";

// Solved blind by a second reader: find the real subject, skip the words between, and match the verb.
const checks: LessonChecks = {
  examples: [
    // "The fossils" is plural and they are "now" on display: are
    { index: 1 },
    // "Each" is singular: shows
    { index: 1 },
  ],
  // the subject comes after the verb: "two old stone cabins" stand
  check: { index: 1 },
  quiz: [
    // "One" is singular, present like "builds": is
    { index: 2 },
    // cross out the words between to find the real subject, "list"
    { index: 0 },
    // "along with her two assistants" is extra; "coach" is singular: plans
    { index: 3 },
    // with "neither ... nor", the verb matches the nearer "players": were
    { index: 1 },
    // "The stretch" is singular: has shown
    { index: 0 },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 0 }, { index: 2 }],
    [{ index: 3 }, { index: 0 }],
  ],
};

export default checks;
