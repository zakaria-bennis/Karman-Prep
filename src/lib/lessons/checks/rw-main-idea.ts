import type { LessonChecks } from "./types";

// Solved blind by a second reader: the point the whole text makes, not one detail or an old view.
const checks: LessonChecks = {
  examples: [
    { index: 2 }, // "Many people picture deserts as empty... though" -> deserts burst into life after rain
    { index: 1 }, // shaky start, then grandmother's humming steadies her playing
  ],
  check: { index: 2 }, // "do more than grab... act on its own" -> arms hold nerve cells, act partly alone
  quiz: [
    { index: 3 }, // "thought his small town was boring... did not want to go"
    { index: 1 }, // main idea follows the pivot "However"; read the whole text first
    { index: 0 }, // glass floors are one example of the whole point (glass now used in towers)
    { index: 3 }, // "central point the text makes" asks for the main idea; "purpose" asks for function
    { index: 2 }, // "Recent tests suggest something else: small white lumps of lime"
  ],
};

export default checks;
