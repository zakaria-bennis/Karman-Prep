import type { LessonChecks } from "./types";

// Solved blind by a second reader: the choice must be true to the table and cover every part of the claim.
const checks: LessonChecks = {
  examples: [
    { index: 1 }, // both branches rose (Eastside 12k->19k, Riverside 9k->15k) and Central fell
    { index: 2 }, // "but only up to a point" needs the rise to 13 cm and the dip to 12 cm at 120 minutes
  ],
  check: { index: 3 }, // walkers fell 120->90 and bus riders rose 200->230 (both halves of the claim)
  quiz: [
    { index: 0 }, // rise to 80 at 10 kg and the fall to 75 at 15 kg ("only up to 10 kg")
    { index: 2 }, // the claim compares length with yearly flow; width is a distractor
    { index: 1 }, // true about Type C, but the claim is about Type A catching up with Type B
    { index: 3 }, // Beach 2 ahead in 2020 (50 vs 30), behind in 2024 (40 vs 45): Beach 1 overtook
    { index: 2 }, // "largest weekend gain" needs gains compared: Portside 600 vs 350, 200, 200
  ],
};

export default checks;
