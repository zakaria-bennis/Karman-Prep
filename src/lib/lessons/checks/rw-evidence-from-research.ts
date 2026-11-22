import type { LessonChecks } from "./types";

// Solved blind by a second reader: name the hypothesis's link, then pick the finding that shows (or
// breaks) that link for the same subjects.
const checks: LessonChecks = {
  examples: [
    { index: 0 }, // same species, warm tanks grew faster than cool tanks
    { index: 1 }, // weaken: sitting students remembered about as many words as walkers
  ],
  check: { index: 3 }, // most bee visits -> most seeds, for this wildflower
  quiz: [
    { index: 2 }, // weaken: phone users fell asleep at about the same time as non-users
    { index: 0 }, // restate the link first: more acidic water, slower growth, this coral
    { index: 3 }, // "about the same number" of shops shows no link, so it weakens the hypothesis
    { index: 1 }, // "Which finding, if true, would most directly weaken" is the hypothesis type
    { index: 0 }, // same city sites: higher notes on noisy weekdays than quiet Sundays ties pitch to traffic
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 2 }, { index: 0 }],
    [{ index: 3 }, { index: 0 }],
  ],
};

export default checks;
