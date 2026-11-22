import type { LessonChecks } from "./types";

const checks: LessonChecks = {
  examples: [
    // predicted score at x = 6.5
    5 * 6.5 + 52,
    // residual = actual - predicted
    205 - (12 * 15 + 40),
  ],
  // a negative slope: each extra hour goes with a shorter predicted time
  check: { text: "12 milliseconds shorter" },
  quiz: [
    64 - (3 * 30 - 20),
    { text: "Put 6 in for x to find the predicted price" },
    // predicted 2.5 * 8 + 10 = 30, actual 34, so the residual is 34 - 30 = 4
    { text: "Maya subtracted in the wrong order" },
    // 25 years sits inside the data's 5 to 40 years
    { text: "About how tall is a 25-year-old tree likely to be?" },
    0.03 * 400 + 1.2 - (0.03 * 250 + 1.2),
  ],
};

export default checks;
