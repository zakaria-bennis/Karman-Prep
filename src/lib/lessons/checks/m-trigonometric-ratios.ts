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
};

export default checks;
