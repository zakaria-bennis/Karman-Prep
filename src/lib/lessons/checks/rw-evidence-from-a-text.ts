import type { LessonChecks } from "./types";

// Solved blind by a second reader: split the claim into its parts; the quotation must show every part.
const checks: LessonChecks = {
  examples: [
    { index: 1 }, // laughs with new friends (enjoys new home) + rereads grandmother's letters (misses old)
    { index: 0 }, // "forty years you fought the waves and fed the town" (admires) + "I mourn" (sad)
  ],
  check: { index: 2 }, // "gave his last coat" (generous) + "hunting for keys... in his hand" (forgetful)
  quiz: [
    { index: 1 }, // "how you dazzle me" (amazed) + "shrink me to a grain of sand" (small); the speaker, not a sister
    { index: 2 }, // two-part claim: split into hardworking and lonely first
    { index: 0 }, // trembling legs show only the nervous half, not calm once the race begins
    { index: 3 }, // "Which quotation... most effectively illustrates the claim" is this question type
    { index: 2 }, // "In June the days stretched empty and slow" (dull) + "by August... could not bear to lose" (treasure)
  ],
};

export default checks;
