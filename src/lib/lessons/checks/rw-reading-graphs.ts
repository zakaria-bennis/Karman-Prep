import type { LessonChecks } from "./types";

// Solved blind by a second reader: read the graph's numbers and pick the choice that proves the whole claim.
const checks: LessonChecks = {
  examples: [
    { index: 1 }, // "the gap... shrank": print led by 50,000 in 2016, by only 2,000 in 2024
    { index: 0 }, // A 12 < B 20 in week 1; A 24 > B 14 in week 4 (started fewer, ended more)
  ],
  check: { index: 2 }, // rose 4.0 -> 5.1 in May, then fell each month to 3.7: peaked in May
  quiz: [
    { index: 2 }, // 2021: 18 vs 25 (smaller); 2023: 27 vs 21 (larger)
    { index: 0 }, // read the key first to tell the weekday line from the weekend line
    { index: 3 }, // a pattern among 20 towns does not prove cause or that it works for "any town"
    { index: 1 }, // rose each year 30k -> 46k from 2020 but 46k stays below 2019's 50k
    { index: 0 }, // 2020: wind 24% vs coal 25%, 1 point apart ("nearly matched")
  ],
};

export default checks;
