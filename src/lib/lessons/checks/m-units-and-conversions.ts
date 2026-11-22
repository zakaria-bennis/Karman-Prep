import type { LessonChecks } from "./types";

const checks: LessonChecks = {
  examples: [(22 * 3600) / 5280, 540 / (0.2 * 1000)],
  check: 6 * 12 ** 2,
  quiz: [
    1380 / (1.5 * 1000),
    {
      text: "\\frac{6 \\text{ cups}}{1 \\text{ hr}} \\cdot \\frac{1 \\text{ qt}}{4 \\text{ cups}}",
    },
    30 * 3 ** 2,
    { text: "3 feet by 2 feet" },
    (54 * 1000) / 18 / 60,
  ],
};

export default checks;
