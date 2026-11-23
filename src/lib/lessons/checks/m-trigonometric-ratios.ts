import type { LessonChecks } from "./types";

// SOH CAH TOA, and the sine of one acute angle equals the cosine of the other.
const checks: LessonChecks = {
  examples: [
    12 / 13, // cos A = adjacent AC / hypotenuse AB
    8 / 17, // cos Q = sin P
  ],
  check: 21 / 20, // tan D = opposite EF / adjacent DF
  quiz: [
    7 / 25, // sin K = cos J
    { text: "$\\tan 40^\\circ = \\frac{BC}{15}$" },
    { text: "Her calculator is in radians" },
    { text: "$\\sin A = \\frac{3}{5}$" },
    // cos R = 5/13 = RT / RS, so RS = 10 / (5/13); ST = RS * sin R
    (10 / (5 / 13)) * (12 / 13),
  ],
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    // cos A = adjacent / hypotenuse = AC / AB
    [8 / 17, 24 / 25],
    // the two acute angles are complementary, so cos of one is sin of the other
    [5 / 13, 3 / 5],
  ],
};

export default checks;
