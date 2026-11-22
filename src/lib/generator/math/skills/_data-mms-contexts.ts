/*
 * Contexts for m-mean-median-and-spread (mean-median-and-spread.ts and _data-mms-mean.ts):
 * names, list settings, frequency-table settings, pairs of data sets and pairs of groups.
 */
export const NAMES = [
  "Ana",
  "Ben",
  "Chloe",
  "Dev",
  "Elena",
  "Farid",
  "Grace",
  "Hiro",
  "Imani",
  "Jonah",
  "Kira",
  "Luis",
  "Maya",
  "Nikhil",
  "Owen",
  "Priya",
  "Rosa",
  "Tariq",
  "Uma",
  "Victor",
  "Wen",
  "Yara",
];

export interface ListCtx {
  props: string;
  prop: string;
  unit?: string;
  prep: string;
  subject: string;
  short: string;
  lo: number;
  hi: number;
  step: number;
}

export const LIST_CTX: ListCtx[] = [
  {
    props: "masses",
    prop: "mass",
    unit: "grams",
    prep: "of",
    subject: "apples picked from an orchard",
    short: "apples",
    lo: 140,
    hi: 230,
    step: 1,
  },
  {
    props: "heights",
    prop: "height",
    unit: "centimeters",
    prep: "of",
    subject: "sunflowers in a garden",
    short: "sunflowers",
    lo: 150,
    hi: 260,
    step: 1,
  },
  {
    props: "low temperatures",
    prop: "low temperature",
    unit: "degrees Fahrenheit",
    prep: "for",
    subject: "days in March in one town",
    short: "days",
    lo: 18,
    hi: 46,
    step: 1,
  },
  {
    props: "speeds",
    prop: "speed",
    unit: "miles per hour",
    prep: "of",
    subject: "serves hit by a tennis player",
    short: "serves",
    lo: 96,
    hi: 134,
    step: 1,
  },
  {
    props: "lengths",
    prop: "length",
    unit: "millimeters",
    prep: "of",
    subject: "beetles collected in a field",
    short: "beetles",
    lo: 8,
    hi: 36,
    step: 1,
  },
  {
    props: "masses",
    prop: "mass",
    unit: "grams",
    prep: "of",
    subject: "red foxes in a wildlife study",
    short: "foxes",
    lo: 3200,
    hi: 6400,
    step: 10,
  },
  {
    props: "finishing times",
    prop: "finishing time",
    unit: "minutes",
    prep: "of",
    subject: "runners in a 5-kilometer race",
    short: "runners",
    lo: 18,
    hi: 44,
    step: 1,
  },
  {
    props: "lengths",
    prop: "length",
    unit: "seconds",
    prep: "of",
    subject: "songs on an album",
    short: "songs",
    lo: 150,
    hi: 290,
    step: 1,
  },
  {
    props: "heights",
    prop: "height",
    unit: "feet",
    prep: "of",
    subject: "trees in a park",
    short: "trees",
    lo: 18,
    hi: 72,
    step: 1,
  },
  {
    props: "numbers of pages",
    prop: "number of pages",
    prep: "in",
    subject: "books on a shelf",
    short: "books",
    lo: 120,
    hi: 480,
    step: 1,
  },
  {
    props: "numbers of visitors",
    prop: "number of visitors",
    prep: "on",
    subject: "days at a science museum",
    short: "days",
    lo: 140,
    hi: 480,
    step: 1,
  },
  {
    props: "scores",
    prop: "score",
    prep: "of",
    subject: "students on a 20-point quiz",
    short: "students",
    lo: 8,
    hi: 20,
    step: 1,
  },
  {
    props: "numbers of points scored",
    prop: "number of points scored",
    prep: "in",
    subject: "games by a basketball team",
    short: "games",
    lo: 58,
    hi: 104,
    step: 1,
  },
  {
    props: "masses",
    prop: "mass",
    unit: "kilograms",
    prep: "of",
    subject: "pumpkins at a county fair",
    short: "pumpkins",
    lo: 11,
    hi: 38,
    step: 1,
  },
];

export interface FreqCtx {
  what: (n: number) => string;
  ask: (stat: string, n: number) => string;
  head: [string, string];
  start: [number, number];
  count: [number, number];
  step: number;
}

export const FREQ_CTX: FreqCtx[] = [
  {
    what: (n) => `the number of eggs in each of ${n} nests that a biologist observed`,
    ask: (s) => `What is the ${s} number of eggs per nest?`,
    head: ["Number of eggs", "Number of nests"],
    start: [0, 2],
    count: [4, 6],
    step: 1,
  },
  {
    what: (n) => `the mass, in grams, of each of ${n} objects`,
    ask: (s, n) => `What is the ${s} mass, in grams, of these ${n} objects?`,
    head: ["Mass (grams)", "Frequency"],
    start: [1, 2],
    count: [4, 5],
    step: 10,
  },
  {
    what: (n) => `the ages, in years, of the ${n} members of a chess club`,
    ask: (s, n) => `What is the ${s} age, in years, of these ${n} members?`,
    head: ["Age (years)", "Number of members"],
    start: [13, 15],
    count: [4, 6],
    step: 1,
  },
  {
    what: (n) => `the number of books each of ${n} students read over the summer`,
    ask: (s, n) => `What is the ${s} number of books read by these ${n} students?`,
    head: ["Number of books", "Number of students"],
    start: [0, 2],
    count: [4, 6],
    step: 1,
  },
  {
    what: (n) => `the number of goals a soccer team scored in each of its ${n} games last season`,
    ask: (s) => `What is the ${s} number of goals scored per game?`,
    head: ["Goals scored", "Number of games"],
    start: [0, 1],
    count: [4, 6],
    step: 1,
  },
  {
    what: (n) => `the scores of ${n} students on a 10-point quiz`,
    ask: (s, n) => `What is the ${s} score of these ${n} students?`,
    head: ["Score", "Number of students"],
    start: [5, 6],
    count: [4, 5],
    step: 1,
  },
  {
    what: (n) => `the number of pets in each of ${n} households on one street`,
    ask: (s) => `What is the ${s} number of pets per household?`,
    head: ["Number of pets", "Number of households"],
    start: [0, 0],
    count: [4, 5],
    step: 1,
  },
  {
    what: (n) =>
      `the number of hours of sleep, to the nearest hour, that each of ${n} students reported for one night`,
    ask: (s, n) => `What is the ${s} number of hours of sleep reported by these ${n} students?`,
    head: ["Hours of sleep", "Number of students"],
    start: [5, 6],
    count: [4, 5],
    step: 1,
  },
];
