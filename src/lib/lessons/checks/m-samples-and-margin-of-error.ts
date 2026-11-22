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
  // check-ins, worked out blind from the questions alone: [check-in, twin] per example
  checkIns: [
    // the sample percent plus or minus the margin, about the population sampled
    [
      { text: `between ${40 - 3}% and ${40 + 3}% of all Elm Town adults` },
      { text: `between ${65 - 5}% and ${65 + 5}% of all Lake High School students` },
    ],
    [0.12 * 2500, 0.35 * 6000],
  ],
};

export default checks;
