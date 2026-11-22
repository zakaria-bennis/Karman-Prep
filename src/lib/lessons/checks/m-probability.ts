import type { LessonChecks } from "./types";

const checks: LessonChecks = {
  examples: [
    // the table: sport column is grade 9: 30, grade 10: 42, total 72
    42 / 72,
    28 / (28 + 54),
  ],
  check: 5 / 30,
  quiz: [
    20 / (20 + 21),
    { text: "Find the total number of voters under 40." },
    // given a case: 36 of the 150 case users have cracked screens
    { text: "Sam flipped the condition" },
    // 10 junior chess players out of 10 + 21 chess players
    { text: "A chess player is chosen at random" },
    // not adults: 100 - 64 = 36 sparrows, 140 - 80 = 60 finches
    (100 - 64) / (100 - 64 + (140 - 80)),
  ],
};

export default checks;
