import type { LessonChecks } from "./types";

// Solved blind by a second reader: the conclusion that stays inside what the study measured.
const checks: LessonChecks = {
  examples: [
    // breakfast eaters also slept more, so the study cannot separate the two causes
    { index: 2 },
    // tested only in mice over a day: "may reduce soreness in mice, at least over a short time"
    { index: 1 },
  ],
  // the survey did not track which came first: a link, not a direction
  check: { index: 0 },
  quiz: [
    // 30 young honeybees in a maze: "may help young honeybees find food in a maze"
    { index: 3 },
    // first note what was measured, in whom, and the second difference (newer screens)
    { index: 0 },
    // music and grades only went together: cause from a link
    { index: 2 },
    // reporting what a study found and saying what it means is the inferring task
    { index: 1 },
    // logged patches were also near roads, so logging and noise cannot be separated
    { index: 3 },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 1 }, { index: 3 }],
    [{ index: 2 }, { index: 0 }],
  ],
};

export default checks;
