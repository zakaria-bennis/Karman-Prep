import type { LessonChecks } from "./types";

// Solved blind by a second writer.
const checks: LessonChecks = {
  examples: [
    // (4(x + 2) - 3(x - 2)) / (x^2 - 4) = (x + 14) / (x^2 - 4)
    (x) => (x + 14) / (x ** 2 - 4),
    // (x - 3)(x + 3) / 2x times 4x^2 / (x + 3) = 2x(x - 3). As text, since the reader takes
    // "x(" for a function call.
    { text: "2x(x - 3)" },
  ],
  // x(x + 5) / ((x - 5)(x + 5)) = x / (x - 5)
  check: (x) => x / (x - 5),
  quiz: [
    // (x - 4)(x + 4) / 3x times 6x^2 / (x - 4) = 2x(x + 4)
    // By index: the reader takes "x(" for a function call, and the text "2x(x + 4)" also sits
    // inside choice A's bottom. Choice 2 is $2x(x + 4)$.
    { index: 2 },
    { text: "common bottom $x(x + 3)$" },
    { text: "canceled a term, not a factor" },
    (x) => 1 / x + 1 / (2 * x),
    // (2(x + 3) - (x + 1)) / (x^2 - 9) = (x + 5) / (x^2 - 9)
    (x) => (2 * (x + 3) - (x + 1)) / (x ** 2 - 9),
  ],
};

export default checks;
