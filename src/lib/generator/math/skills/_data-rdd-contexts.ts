/*
 * Contexts for m-reading-data-displays (reading-data-displays.ts): frequency displays, grouped
 * data for histograms and tables, and box plots.
 */
export interface ReadCtx {
  what: (n: number) => string;
  head: [string, string];
  count: (v: number) => string;
  valueName: string;
  start: [number, number];
  k: [number, number];
}

export const READ_CTX: ReadCtx[] = [
  {
    what: (n) => `the UV index recorded at noon on each of ${n} days`,
    head: ["UV index", "Number of days"],
    count: (v) => `On how many days was a UV index of ${v} recorded?`,
    valueName: "UV index",
    start: [1, 3],
    k: [4, 6],
  },
  {
    what: (n) => `the number of eggs in each of ${n} nests`,
    head: ["Number of eggs", "Number of nests"],
    count: (v) => `How many nests had exactly ${v} eggs?`,
    valueName: "number of eggs in a nest",
    start: [1, 3],
    k: [4, 6],
  },
  {
    what: (n) => `the number of raspberries in each of ${n} cartons at a grocery store`,
    head: ["Raspberries per carton", "Number of cartons"],
    count: (v) => `How many cartons contain exactly ${v} raspberries?`,
    valueName: "number of raspberries in a carton",
    start: [72, 78],
    k: [4, 6],
  },
  {
    what: (n) => `the number of books each of ${n} students read over the summer`,
    head: ["Number of books", "Number of students"],
    count: (v) => `How many students read exactly ${v} books?`,
    valueName: "number of books read",
    start: [1, 3],
    k: [4, 6],
  },
  {
    what: (n) => `the number of goals a hockey team scored in each of its ${n} games`,
    head: ["Goals scored", "Number of games"],
    count: (v) => `In how many games did the team score exactly ${v} goals?`,
    valueName: "number of goals scored in a game",
    start: [1, 2],
    k: [4, 5],
  },
  {
    what: (n) => `the scores of ${n} students on a 10-point quiz`,
    head: ["Score", "Number of students"],
    count: (v) => `How many students had a score of exactly ${v}?`,
    valueName: "score",
    start: [4, 6],
    k: [4, 5],
  },
];

export interface BinCtx {
  what: (n: number) => string;
  items: string;
  measure: string;
  unit: string;
  axis: string;
  width: number;
  lo: [number, number];
}

export const BIN_CTX: BinCtx[] = [
  {
    what: (n) => `the number of complete years each of ${n} employees has worked at a company`,
    items: "employees",
    measure: "complete years at the company",
    unit: "years",
    axis: "Complete years at the company",
    width: 5,
    lo: [0, 0],
  },
  {
    what: (n) => `the lengths, in feet, of ${n} boats in a harbor`,
    items: "boats",
    measure: "length",
    unit: "feet",
    axis: "Length (feet)",
    width: 10,
    lo: [10, 20],
  },
  {
    what: (n) => `the times, in minutes, that ${n} runners took to finish a race`,
    items: "runners",
    measure: "finishing time",
    unit: "minutes",
    axis: "Finishing time (minutes)",
    width: 5,
    lo: [20, 30],
  },
  {
    what: (n) => `the heights, in centimeters, of ${n} plants in an experiment`,
    items: "plants",
    measure: "height",
    unit: "centimeters",
    axis: "Height (centimeters)",
    width: 4,
    lo: [8, 16],
  },
  {
    what: (n) => `the masses, in grams, of ${n} eggs from a farm`,
    items: "eggs",
    measure: "mass",
    unit: "grams",
    axis: "Mass (grams)",
    width: 5,
    lo: [45, 50],
  },
];

export interface BoxCtx {
  one: (n: number) => string;
  two: string;
  axis: string;
  names: [string, string];
  unit: string;
  lo: number;
  hi: number;
  step: number;
}

export const BOX_CTX: BoxCtx[] = [
  {
    one: (n) =>
      `The box plot summarizes the lengths, in centimeters, of a sample of ${n} bass caught in a lake.`,
    two: "The box plots summarize the lengths, in centimeters, of bass caught in two lakes.",
    axis: "Length (centimeters)",
    names: ["Lake A", "Lake B"],
    unit: "centimeters",
    lo: 30,
    hi: 54,
    step: 1,
  },
  {
    one: (n) =>
      `The box plot summarizes the number of units of a product a store sold each day for ${n} days.`,
    two: "The box plots summarize the number of units of a product two stores sold each day for one month.",
    axis: "Units sold per day",
    names: ["Store A", "Store B"],
    unit: "units",
    lo: 80,
    hi: 140,
    step: 5,
  },
  {
    one: (n) =>
      `The box plot summarizes the number of books read over the summer by each of ${n} students.`,
    two: "The box plots summarize the number of books read over the summer by the students in two English classes.",
    axis: "Number of books",
    names: ["Class A", "Class B"],
    unit: "books",
    lo: 0,
    hi: 12,
    step: 1,
  },
  {
    one: (n) =>
      `The box plot summarizes the commuting times, in minutes, of ${n} employees at a company.`,
    two: "The box plots summarize the commuting times, in minutes, of the employees at two offices.",
    axis: "Commuting time (minutes)",
    names: ["Office A", "Office B"],
    unit: "minutes",
    lo: 10,
    hi: 70,
    step: 5,
  },
  {
    one: (n) =>
      `The box plot summarizes the heights, in inches, of ${n} players in a basketball league.`,
    two: "The box plots summarize the heights, in inches, of the players on two basketball teams.",
    axis: "Height (inches)",
    names: ["Team A", "Team B"],
    unit: "inches",
    lo: 64,
    hi: 84,
    step: 1,
  },
];
