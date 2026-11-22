import type { LessonChecks } from "./types";

// Solved blind by a second reader: find the main clause, then join the dependent clause to it.
const checks: LessonChecks = {
  examples: [
    // "Because ... night games" opens the sentence, so a comma before the main clause
    { index: 1 },
    // a "because" clause after the main clause needs no mark
    { index: 2 },
  ],
  // "When ... playground" opens the sentence, so a comma before "the children ran"
  check: { index: 0 },
  quiz: [
    // "because" clause after the main clause: no mark
    { index: 3 },
    // first find the main clause, the part that could stand alone
    { index: 0 },
    // "and" leaves the because clause with no main clause to attach to
    { index: 1 },
    // "although" clause after the main clause, set off by a comma; "however" would splice
    { index: 2 },
    // "When ..., using ... size" opens the sentence, so a comma before "they found"
    { index: 0 },
  ],
};

export default checks;
