import type { LessonChecks } from "./types";

// Solved blind by a second writer.
const checks: LessonChecks = {
  examples: [-3 * -4 + 10, (29 - 4) / 2.5],
  check: 5 * -2 + 3,
  quiz: [
    (100 - 20) / 8,
    { text: "Set the rule equal to 31" },
    { text: "She left out the parentheses" },
    { text: "For what value of $x$ is $f(x) = 4$?" },
    { text: "The drop in water level, in centimeters, each minute" },
  ],
};

export default checks;
