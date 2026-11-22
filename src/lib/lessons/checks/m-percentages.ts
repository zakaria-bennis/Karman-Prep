import type { LessonChecks } from "./types";

const checks: LessonChecks = {
  examples: [80 * 1.2 * 0.75, 340 / (1 - 0.15)],
  check: 500 * 1.1 ** 2,
  quiz: [
    54 / 1.2,
    { text: "multiplier: $1.2$ and $0.8$" },
    ((100 - 80) / 80) * 100,
    { text: "rose from 48 to 60" },
    45 / 0.6 / 1.25,
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    [50 * 1.4 * 0.8, 60 * 0.75 * 1.2],
    [96 / (1 - 0.2), 150 / (1 - 0.25)],
  ],
};

export default checks;
