import type { LessonChecks } from "./types";

// Solved blind by a second reader: each text's claim in one line, then the choice that fits both (or
// the difference between them).
const checks: LessonChecks = {
  examples: [
    // Text 1 "bring new visitors"; Text 2 "Allowing photos can draw new visitors"
    { index: 1 },
    // Text 1 "mainly because a huge asteroid"; Text 2 "in trouble before the asteroid arrived"
    { index: 3 },
  ],
  // Text 1 "pick up the sounds ... naturally"; Text 2 "Children do pick up the sounds ... more easily"
  check: { index: 2 },
  quiz: [
    // Text 1 "Zoos protect endangered animals"; Text 2 "conservation is a small part of what they do"
    { index: 2 },
    // first sum up each text's main claim in one line
    { index: 0 },
    // Text 1 says "for part of the day"; Text 2 warns against "standing all day": too extreme
    { index: 3 },
    // Text 1 "kept all year" (daylight saving); Text 2 "favor year-round standard time"
    { index: 1 },
    // Text 1 "a quarter of all ocean species"; Text 2 "Reefs are rich in life"
    { index: 2 },
  ],
};

export default checks;
