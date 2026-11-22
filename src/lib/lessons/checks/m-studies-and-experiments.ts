import type { LessonChecks } from "./types";

// Random assignment allows cause; random sampling allows generalizing to the population sampled.
const checks: LessonChecks = {
  examples: [
    // assigned at random, but volunteers: cause, only for runners like these
    { text: "Stretching likely caused fewer injuries among runners like those in the study." },
    // sampled at random, not assigned: link, for the city's adults
    { text: "Among the city's adults, more park use is linked to higher health ratings." },
  ],
  // neither: a link among those who replied only
  check: { text: "Among the 90 members who replied" },
  quiz: [
    { text: "Among the chain's shoppers, more app use is linked to more spending." },
    { text: "Whether the plants were randomly assigned to the two fertilizers" },
    { text: "No one was randomly assigned to eat breakfast" },
    { text: "Randomly select 300 of the district's students, then randomly assign" },
    { text: "Standing desks likely reduce back pain for the company's employees." },
  ],
};

export default checks;
