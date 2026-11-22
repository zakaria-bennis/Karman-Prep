import type { LessonChecks } from "./types";

// Solved blind by a second reader: the ending the text's facts lead to, no further.
const checks: LessonChecks = {
  examples: [
    // morning-only plants did as well, so full sun may not be needed (claim stays cautious)
    { index: 1 },
    // pipes and pump ruled out, so the cause left is runoff
    { index: 2 },
  ],
  // lab birds never heard adults yet sang the full song
  check: { index: 3 },
  quiz: [
    // window covered (not sunlight), air dry (not damp), so heat from the lights is left
    { index: 2 },
    // first step: mark however and because and see how the facts connect
    { index: 1 },
    // "all winter long" overstates: they came out only on warm days
    { index: 3 },
    // the "This suggests that" blank is the add-up-the-facts task
    { index: 0 },
    // normal rain and full grain rule out drought; same pottery nearby points to a move
    { index: 2 },
  ],
};

export default checks;
