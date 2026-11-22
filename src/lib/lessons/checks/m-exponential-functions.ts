import type { LessonChecks } from "./types";

const checks: LessonChecks = {
  examples: [(t) => 600 * 1.05 ** t, (1 - 0.85) * 100],
  check: 400 * 3 ** 4,
  quiz: [
    (1.08 - 1) * 100,
    { text: "1 - 0.06 = 0.94" },
    { text: "so it loses 30%" },
    // a percent of the current balance compounds
    { text: "3% interest each year on its balance" },
    (t) => 800 * 1.1 ** (t / 2),
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    [(t: number) => 2000 * 1.03 ** t, (t: number) => 500 * 1.08 ** t],
    // the percent drop each year is 1 minus the factor
    [(1 - 0.92) * 100, (1 - 0.75) * 100],
  ],
};

export default checks;
