import type { LessonChecks } from "./types";

// Solved blind by a second reader: the noun right after the comma must be the one the opening phrase describes.
const checks: LessonChecks = {
  examples: [
    { index: 2 }, // "Having trained for months": Amira trained, so "Amira kept"
    { index: 3 }, // "Built in 1888": the tower was built, so "the tower has survived"
  ],
  check: { index: 1 }, // "Peering through binoculars": Leo peered, so "Leo spotted"
  quiz: [
    { index: 0 }, // "Wrapped in old newspaper": the package was wrapped
    { index: 3 }, // ask who is hoping, then name them first after the comma
    { index: 1 }, // "Known ... for her careful field notes" describes Dr. Reyes, not research
    { index: 2 }, // "Barking at the mail carrier, the dog woke": the dog barks
    { index: 3 }, // "Unlike most spiders" must be followed by a spider: "the jumping spider hunts"
  ],
  // check-ins, solved blind: [check-in, twin] per example
  checkIns: [
    [{ index: 3 }, { index: 0 }],
    [{ index: 1 }, { index: 3 }],
  ],
};

export default checks;
