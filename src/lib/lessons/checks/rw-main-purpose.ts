import type { LessonChecks } from "./types";

// Solved blind by a second reader: what the whole text sets out to do, then the choice that names it.
const checks: LessonChecks = {
  examples: [
    // "Many people believe ... In fact": corrects a belief, then says when bats use sound
    { index: 1 },
    // keys "looked strange", then notes "clear and sure" and a released breath: nerves to calm
    { index: 2 },
  ],
  // the whole text explains why a sealed jar "can stay safe to eat for years"
  check: { index: 0 },
  quiz: [
    // "dreaded" the test, then "grinning": fear giving way to joy
    { index: 3 },
    // the turn at "However" and the closing sentence carry the purpose
    { index: 0 },
    // the telescopes are one detail of a text about the library lending more than books
    { index: 2 },
    // every sentence builds to how the catfish finds food it cannot see
    { index: 1 },
    // "Cheap books mattered, but only once people had been taught": the common account leaves out schools
    { index: 2 },
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 2 }, { index: 0 }],
    [{ index: 3 }, { index: 0 }],
  ],
};

export default checks;
