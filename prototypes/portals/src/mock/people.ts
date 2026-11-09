import type { PlanId } from "@/plans/plans";
import { TODAY, SAT_MARCH, SAT_MAY } from "./clock";

/**
 * The cast. Initials only, no photos as people (rule 47). Hues are identity
 * tints, 60 degrees apart for people listed together, never data.
 */
export interface Student {
  id: string;
  name: string;
  initials: string;
  plan: PlanId;
  hue: number;
  /** ISO date of the first sign-in. */
  since: string;
  satDate: string;
  target: number;
  /** One number, "Karman predicted score if you tested today", or null before the diagnostic or a full-length test. */
  predicted: number | null;
  baseline: number | null;
  tutor?: string;
  cohort?: string;
  school?: string;
  grade: 11 | 12;
}

export interface Parent {
  id: string;
  name: string;
  initials: string;
  hue: number;
  students: string[];
}
export interface Tutor {
  id: string;
  name: string;
  initials: string;
  hue: number;
  students: string[];
  cohorts: string[];
}
export interface SchoolStaff {
  id: string;
  name: string;
  initials: string;
  hue: number;
  role: "teacher" | "admin";
  school: string;
  classes: string[];
}

export const STUDENTS: Student[] = [
  {
    id: "maya",
    name: "Maya",
    initials: "M",
    plan: "private20",
    hue: 200,
    since: "2026-06-08",
    satDate: SAT_MARCH,
    target: 1500,
    predicted: 1390,
    baseline: 1280,
    tutor: "zakaria",
    grade: 12,
  },
  {
    id: "noah",
    name: "Noah",
    initials: "N",
    plan: "free",
    hue: 20,
    since: TODAY,
    satDate: SAT_MAY,
    target: 1300,
    predicted: null,
    baseline: null,
    grade: 11,
  },
  {
    id: "lin",
    name: "Lin",
    initials: "L",
    plan: "platform",
    hue: 140,
    since: "2026-09-14",
    satDate: SAT_MARCH,
    target: 1400,
    predicted: 1240,
    baseline: 1180,
    grade: 11,
  },
  {
    id: "sofia",
    name: "Sofia",
    initials: "S",
    plan: "plus",
    hue: 320,
    since: "2026-08-24",
    satDate: SAT_MARCH,
    target: 1450,
    predicted: 1310,
    baseline: 1230,
    grade: 12,
  },
  {
    id: "ava",
    name: "Ava",
    initials: "A",
    plan: "cohort",
    hue: 260,
    since: "2026-10-12",
    satDate: SAT_MARCH,
    target: 1400,
    predicted: 1220,
    baseline: 1180,
    tutor: "david",
    cohort: "march",
    grade: 11,
  },
  {
    id: "theo",
    name: "Theo",
    initials: "T",
    plan: "school",
    hue: 80,
    since: "2026-09-02",
    satDate: SAT_MARCH,
    target: 1250,
    predicted: 1090,
    baseline: 1040,
    school: "ridgeview",
    grade: 11,
  },
];

export const PARENTS: Parent[] = [
  { id: "dana", name: "Dana", initials: "D", hue: 200, students: ["maya", "noah"] },
  { id: "marcus", name: "Marcus", initials: "M", hue: 260, students: ["ava"] },
  { id: "elena", name: "Elena", initials: "E", hue: 140, students: ["lin"] },
  { id: "jon", name: "Jon", initials: "J", hue: 320, students: ["sofia"] },
];

export const TUTORS: Tutor[] = [
  { id: "david", name: "David", initials: "D", hue: 20, students: ["ava"], cohorts: ["march"] },
  { id: "zakaria", name: "Zakaria", initials: "Z", hue: 200, students: ["maya"], cohorts: [] },
];

export const SCHOOL = {
  id: "ridgeview",
  name: "Ridgeview High",
  seats: 120,
  used: 84,
  term: "July 1 to June 30",
};
export const STAFF: SchoolStaff[] = [
  {
    id: "ortega",
    name: "Ms. Ortega",
    initials: "O",
    hue: 260,
    role: "teacher",
    school: "ridgeview",
    classes: ["period3", "period6"],
  },
  {
    id: "patel",
    name: "Mr. Patel",
    initials: "P",
    hue: 80,
    role: "admin",
    school: "ridgeview",
    classes: [],
  },
];

export const COHORTS = [
  {
    id: "march",
    name: "March cohort",
    tutor: "david",
    satDate: SAT_MARCH,
    seats: 5,
    filled: 4,
    scholarship: 1,
    classDays: [1, 3] as number[],
    classTime: "7:00 to 8:30 pm ET",
  },
];
export const CLASSES = [
  { id: "period3", name: "Period 3", teacher: "ortega", students: 28 },
  { id: "period6", name: "Period 6", teacher: "ortega", students: 31 },
];

export const studentById = (id: string) => STUDENTS.find((s) => s.id === id) ?? STUDENTS[0];
export const tutorById = (id: string | undefined) => TUTORS.find((t) => t.id === id);

console.assert(STUDENTS.length === 6, "six students, one per plan family");
console.assert(
  PARENTS.find((p) => p.id === "dana")?.students.length === 2,
  "one parent with two students"
);
console.assert(
  STUDENTS.every((s) => (s.predicted === null) === (s.baseline === null)),
  "a predicted score exists only once a baseline does"
);
console.assert(
  SCHOOL.used === CLASSES.reduce((a, c) => a + c.students, 0) + 25,
  "seats used: two classes plus 25 unassigned seats"
);
