import type { LessonChecks } from "./types";

const checks: LessonChecks = {
  examples: [
    // 56 - 4 to 56 + 4, for the population sampled (Pine City voters)
    { text: "between 52% and 60% of all Pine City voters" },
    0.18 * 3000,
  ],
  // plausible range is 62 - 3 = 59 to 62 + 3 = 65
  check: 64,
  quiz: [
    0.16 * 4500,
    { text: "Add the margin to the estimate" },
    { text: "not random and may be biased" },
    // the largest random sample from the whole city
    { text: "Survey 1,200 adults chosen at random from the city." },
    { text: "The mean for all students at Lakeside High is plausibly between" },
  ],
};

export default checks;
