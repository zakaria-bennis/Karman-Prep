import { PARENTS, SAT_MARCH, SAT_MAY, studentById, type Student } from "@/mock";
import type { PlanId } from "@/plans/plans";

/**
 * The tutor portal's own students, beside the shared cast (src/mock/people.ts),
 * never a real student. Zakaria has four Private students. David has two
 * cohorts (rule 54): the December cohort, running since Oct 5 with five
 * students, and the March cohort, four enrolled, opening Jan 4, 2027 (the
 * start date in offer.ts). The May date has enough students for two cohorts
 * split at 1250. Hues are identity tints 60 degrees apart within each list.
 */
export const SAT_DEC = "2026-12-05";

export interface TutorStudent extends Student {
  parent: { id: string; name: string };
  /** Private plans: hours of the package used so far. */
  hoursUsed?: number;
  hoursTotal?: number;
  /** Cohort plans: the scholarship seat. */
  scholarship?: boolean;
}

const parentOf = (id: string) => {
  const p = PARENTS.find((x) => x.id === id)!;
  return { id: p.id, name: p.name };
};

/** id, name, plan, hue, since, SAT date, target, predicted, baseline, parent, hours used, hours total */
type PrivateRow = [
  string,
  string,
  PlanId,
  number,
  string,
  string,
  number,
  number,
  number,
  string,
  number,
  number,
];
const PRIVATE: PrivateRow[] = [
  ["jonah", "Jonah", "private10", 40, "2026-09-21", SAT_MARCH, 1350, 1210, 1150, "Ravi", 6, 10],
  ["leila", "Leila", "private20", 100, "2026-07-13", SAT_DEC, 1450, 1430, 1310, "Noor", 17, 20],
  ["owen", "Owen", "private10", 160, "2026-10-05", SAT_MAY, 1300, 1120, 1120, "Grace", 2, 10],
];
/** id, name, hue, since, cohort, tutor, SAT date, target, baseline, predicted, parent, scholarship */
type CohortRow = [
  string,
  string,
  number,
  string,
  string,
  string,
  string,
  number,
  number,
  number,
  string,
  boolean?,
];
const COHORT: CohortRow[] = [
  ["jamal", "Jamal", 320, "2026-09-28", "december", "david", SAT_DEC, 1350, 1210, 1260, "Aisha"],
  ["chloe", "Chloe", 20, "2026-09-30", "december", "david", SAT_DEC, 1400, 1240, 1300, "Beth"],
  [
    "ruben",
    "Ruben",
    80,
    "2026-10-01",
    "december",
    "david",
    SAT_DEC,
    1300,
    1120,
    1150,
    "Carlos",
    true,
  ],
  ["mei", "Mei", 140, "2026-10-02", "december", "david", SAT_DEC, 1450, 1290, 1340, "Lian"],
  ["priya", "Priya", 200, "2026-10-03", "december", "david", SAT_DEC, 1400, 1180, 1240, "Anjali"],
  ["luis", "Luis", 20, "2026-10-19", "march", "david", SAT_MARCH, 1350, 1200, 1200, "Marta"],
  ["tess", "Tess", 80, "2026-10-23", "march", "david", SAT_MARCH, 1400, 1260, 1260, "Helen"],
  ["kofi", "Kofi", 140, "2026-10-27", "march", "david", SAT_MARCH, 1300, 1140, 1140, "Ama"],
  ["nora", "Nora", 200, "2026-10-21", "may-under", "zakaria", SAT_MAY, 1350, 1190, 1190, "Sana"],
  ["sam", "Sam", 260, "2026-10-23", "may-under", "zakaria", SAT_MAY, 1300, 1210, 1210, "Tom"],
  ["isla", "Isla", 320, "2026-10-26", "may-under", "zakaria", SAT_MAY, 1300, 1160, 1160, "Fiona"],
  ["diego", "Diego", 20, "2026-10-28", "may-under", "zakaria", SAT_MAY, 1350, 1230, 1230, "Rosa"],
  ["hana", "Hana", 80, "2026-10-22", "may-over", "david", SAT_MAY, 1500, 1310, 1310, "Yuki"],
  ["elliot", "Elliot", 140, "2026-10-27", "may-over", "david", SAT_MAY, 1520, 1390, 1390, "Claire"],
  ["zoe", "Zoe", 200, "2026-10-29", "may-over", "david", SAT_MAY, 1550, 1420, 1420, "Ben"],
];

export const PRIVATE_STUDENTS: TutorStudent[] = [
  { ...studentById("maya"), parent: parentOf("dana"), hoursUsed: 14, hoursTotal: 20 },
  ...PRIVATE.map(
    ([
      id,
      name,
      plan,
      hue,
      since,
      satDate,
      target,
      predicted,
      baseline,
      parent,
      hoursUsed,
      hoursTotal,
    ]) => ({
      id,
      name,
      initials: name[0],
      plan,
      hue,
      since,
      satDate,
      target,
      predicted,
      baseline,
      tutor: "zakaria",
      grade: 11 as const,
      parent: { id: parent.toLowerCase(), name: parent },
      hoursUsed,
      hoursTotal,
    })
  ),
];

export const COHORT_STUDENTS: TutorStudent[] = [
  { ...studentById("ava"), parent: parentOf("marcus") },
  ...COHORT.map(
    ([
      id,
      name,
      hue,
      since,
      cohort,
      tutor,
      satDate,
      target,
      baseline,
      predicted,
      parent,
      scholarship,
    ]) => ({
      id,
      name,
      initials: name[0],
      plan: "cohort" as const,
      hue,
      since,
      satDate,
      target,
      predicted,
      baseline,
      tutor,
      cohort,
      grade: 11 as const,
      parent: { id: parent.toLowerCase(), name: parent },
      scholarship: !!scholarship,
    })
  ),
];

export const ALL_STUDENTS = [...PRIVATE_STUDENTS, ...COHORT_STUDENTS];
export const tutorStudentById = (id: string) => ALL_STUDENTS.find((s) => s.id === id);

console.assert(
  PRIVATE_STUDENTS.length === 4 && COHORT_STUDENTS.length === 16,
  "4 private, 16 cohort"
);
console.assert(
  COHORT_STUDENTS.filter((s) => s.scholarship).length === 1,
  "one scholarship seat is taken"
);
console.assert(
  PRIVATE_STUDENTS.every((s) => s.hoursUsed! <= s.hoursTotal!),
  "hours used never exceed the package"
);
console.assert(
  ALL_STUDENTS.every((s) => (s.predicted === null) === (s.baseline === null)),
  "a predicted score exists only once a baseline does"
);
