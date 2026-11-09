import { COHORTS, SAT_MAY, TODAY, TUTORS, addDays, fmtDate } from "@/mock";
import { COHORT_STUDENTS, SAT_DEC } from "./mock-people";

export * from "./mock-people";
import type { CalEvent } from "@/design-system/components/Calendar";

/**
 * The tutor portal's own rows, beside the shared cast (src/mock/people.ts),
 * never a real student. The signed-in tutor is Zakaria: four Private students
 * of his own, every cohort with its tutor named (David has the December cohort
 * in session and the March cohort, rule 54). Cohort start dates follow
 * offer.ts: a Monday 61 days before the test (Dec 5: Oct 5; Mar 6: Jan 4;
 * May 1: Mar 1). Nothing here is typed twice: counts are computed from rows.
 */
export const ME = TUTORS.find((t) => t.id === "zakaria")!;
export const COHORT_START_DEC = "2026-10-05";
export const COHORT_START_MARCH = "2027-01-04";
export const COHORT_START_MAY = "2027-03-01";

export interface TutorCohort {
  id: string;
  name: string;
  tutor: string;
  satDate: string;
  seats: number;
  scholarship: number;
  classDays: number[];
  classTime: string;
  start: string;
  classesTotal: number;
  classesHeld: number;
  /** null until a test date has enough students for two cohorts. */
  split: "under" | "over" | null;
}

export const TUTOR_COHORTS: TutorCohort[] = [
  {
    id: "december",
    name: "December cohort",
    tutor: "david",
    satDate: SAT_DEC,
    seats: 5,
    scholarship: 1,
    classDays: [0, 2],
    classTime: "7:00 to 8:30 pm ET",
    start: COHORT_START_DEC,
    classesTotal: 18,
    /** Mondays and Wednesdays from Oct 5: eight held by Oct 31, class 9 on Nov 2, class 18 on Dec 2. */
    classesHeld: 8,
    split: null,
  },
  {
    id: "march",
    name: COHORTS[0].name,
    tutor: COHORTS[0].tutor,
    satDate: COHORTS[0].satDate,
    seats: COHORTS[0].seats,
    scholarship: COHORTS[0].scholarship,
    classDays: COHORTS[0].classDays,
    classTime: COHORTS[0].classTime,
    start: COHORT_START_MARCH,
    classesTotal: 18,
    classesHeld: 0,
    split: null,
  },
  {
    id: "may-under",
    name: "May cohort, under 1250",
    tutor: "zakaria",
    satDate: SAT_MAY,
    seats: 5,
    scholarship: 1,
    classDays: [2, 4],
    classTime: "7:00 to 8:30 pm ET",
    start: COHORT_START_MAY,
    classesTotal: 18,
    classesHeld: 0,
    split: "under",
  },
  {
    id: "may-over",
    name: "May cohort, 1250 and up",
    tutor: "david",
    satDate: SAT_MAY,
    seats: 5,
    scholarship: 1,
    classDays: [1, 3],
    classTime: "7:00 to 8:30 pm ET",
    start: COHORT_START_MAY,
    classesTotal: 18,
    classesHeld: 0,
    split: "over",
  },
];
export const SPLIT_SCORE = 1250;
export const cohortById = (id: string) => TUTOR_COHORTS.find((c) => c.id === id);
export const studentsOf = (cohortId: string) =>
  COHORT_STUDENTS.filter((s) => s.cohort === cohortId);
export const tutorName = (id: string) => TUTORS.find((t) => t.id === id)?.name ?? "No tutor yet";

/** Bookings. Private students book their own next session; a missing one is a flag. */
export interface Booking {
  studentId: string;
  date: string;
  start: number;
  end: number;
}
export const NEXT_SESSION: Record<string, Booking | null> = {
  maya: { studentId: "maya", date: "2026-11-03", start: 17, end: 18 },
  jonah: { studentId: "jonah", date: "2026-11-04", start: 16, end: 17 },
  leila: { studentId: "leila", date: "2026-11-05", start: 17, end: 18 },
  owen: null,
};
export const LAST_SESSION: Record<string, string> = {
  maya: "2026-10-27",
  jonah: "2026-10-28",
  leila: "2026-10-29",
  owen: "2026-10-24",
};
export const NEXT_CLASS: Record<string, string> = { december: "2026-11-02" };

export interface Note {
  id: string;
  studentId: string;
  date: string;
  session: number;
  text: string;
  sent?: boolean;
}
const note = (
  id: string,
  studentId: string,
  date: string,
  session: number,
  text: string
): Note => ({ id, studentId, date, session, text, sent: true });
export const NOTES: Note[] = [
  note(
    "n1",
    "maya",
    "2026-10-27",
    14,
    "Circles: arc length and sector area. She sets up the ratio first now. Set 12 came back 9 of 12."
  ),
  note(
    "n2",
    "maya",
    "2026-10-20",
    13,
    "Nonlinear functions, vertex form. Still rushes the sign of h. Assigned set 12."
  ),
  note(
    "n3",
    "maya",
    "2026-10-13",
    12,
    "Went through test 2 (1,340). Math module 2: the last four questions were guesses. Pacing drill next."
  ),
  note(
    "n4",
    "jonah",
    "2026-10-28",
    6,
    "Percentages and ratios. Reads the question twice now before starting. Drill due Friday."
  ),
  note(
    "n5",
    "jonah",
    "2026-10-21",
    5,
    "Test 1 review (1,180). Reading: loses the main idea on long passages. Started the two-sentence summary habit."
  ),
  note(
    "n6",
    "leila",
    "2026-10-29",
    17,
    "Test 3 review (1,420). Three misses were pacing. Reading pacing set assigned for Nov 4."
  ),
  note(
    "n7",
    "leila",
    "2026-10-22",
    16,
    "Cross-text connections and rhetorical synthesis. Solid. Next: timed reading modules."
  ),
  note(
    "n8",
    "owen",
    "2026-10-24",
    2,
    "Diagnostic reviewed (1,120). Starting with linear equations in one variable. He has not booked the next session."
  ),
];
export const notesFor = (id: string) => NOTES.filter((n) => n.studentId === id);

/** Zakaria's week (Mon Oct 26 to Sun Nov 1) and the week after, for the schedule. Day 0 is Monday. */
const ev = (
  id: string,
  day: number,
  start: number,
  end: number,
  kind: CalEvent["kind"],
  title: string,
  who?: string
): CalEvent => ({ id, day, start, end, kind, title, who });
export const WEEKS: Record<"this" | "next", { start: string; events: CalEvent[] }> = {
  this: {
    start: "2026-10-26",
    events: [
      ev("t1", 1, 17, 18, "session", "Maya, session 14", "Zakaria"),
      ev("t2", 2, 16, 17, "session", "Jonah, session 6", "Zakaria"),
      ev("t3", 3, 17, 18, "session", "Leila, session 17", "Zakaria"),
      ev("t4", 0, 19, 20.5, "class", "December cohort, class 7", "David"),
      ev("t5", 2, 19, 20.5, "class", "December cohort, class 8", "David"),
      ev("t6", 5, 9, 11.5, "test", "Maya, full-length test 4"),
      ev("t7", 5, 10, 12.5, "test", "December cohort, full-length test 2"),
      ev("t8", 6, 16, 17, "workshop", "Weekly live session: pacing", "Zakaria"),
    ],
  },
  next: {
    start: "2026-11-02",
    events: [
      ev("n1", 1, 17, 18, "session", "Maya, session 15", "Zakaria"),
      ev("n2", 2, 16, 17, "session", "Jonah, session 7", "Zakaria"),
      ev("n3", 3, 17, 18, "session", "Leila, session 18", "Zakaria"),
      ev("n4", 0, 19, 20.5, "class", "December cohort, class 9", "David"),
      ev("n5", 2, 19, 20.5, "class", "December cohort, class 10", "David"),
      ev("n6", 6, 16, 17, "workshop", "Weekly live session: test mechanics", "Zakaria"),
    ],
  },
};
export const weekDates = (start: string) =>
  Array.from({ length: 7 }, (_, i) => String(Number(addDays(start, i).slice(8))));

export const hour = (h: number) =>
  `${((Math.floor(h) + 11) % 12) + 1}${h % 1 ? ":30" : ":00"} ${h >= 12 ? "pm" : "am"}`;
export const nextSessionLabel = (id: string) => {
  const b = NEXT_SESSION[id];
  return b ? `${fmtDate(b.date)}, ${hour(b.start)} to ${hour(b.end)} ET` : null;
};
/** Updates already sent to parents, newest first. */
export const SENT_UPDATES: Record<string, { date: string; to: string }[]> = {
  maya: [
    { date: "2026-10-27", to: "Dana" },
    { date: "2026-10-20", to: "Dana" },
    { date: "2026-10-13", to: "Dana" },
  ],
  jonah: [{ date: "2026-10-28", to: "Ravi" }],
  leila: [{ date: "2026-10-29", to: "Noor" }],
  owen: [{ date: "2026-10-24", to: "Grace" }],
};

console.assert(studentsOf("december").length === 5, "the December cohort has five students");
console.assert(
  studentsOf("march").length === COHORTS[0].filled && cohortById("march")!.classesHeld === 0,
  "the March cohort has its four enrolled students and has not started"
);
console.assert(
  WEEKS.next.events
    .find((e) => e.id === "n4")
    ?.title.endsWith(`class ${cohortById("december")!.classesHeld + 1}`),
  "Monday's class is the next one after those held"
);
console.assert(
  studentsOf("may-under").every((s) => s.baseline! < SPLIT_SCORE) &&
    studentsOf("may-over").every((s) => s.baseline! >= SPLIT_SCORE),
  "the May split is at 1250"
);
console.assert(
  NEXT_SESSION.maya?.date === "2026-11-03" && LAST_SESSION.maya === "2026-10-27",
  "Maya's sessions are Tuesdays"
);
console.assert(
  WEEKS.this.events.filter((e) => e.kind === "test").length === 2,
  "two tests this Saturday"
);
console.assert(TODAY === "2026-10-31", "the fixed clock");
