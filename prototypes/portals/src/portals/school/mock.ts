import { CLASSES, SCHOOL, STAFF, TODAY, addDays, type SchoolStaff } from "@/mock";
import { PLANS } from "@/plans/plans";
import { buildStudents, withTheo, type SchoolStudent } from "./mock-students";

/**
 * Ridgeview High (src/mock SCHOOL, STAFF, CLASSES) in four moments. The
 * gallery's state picks one: first-day is the school's first morning as a
 * founding pilot (nothing yet), empty is the setup done but no student in,
 * long-time is mid-year (Oct 31, 2026), locked is the day after the licence
 * ended (July 1, 2027). The school's licence is the school plan from the plan
 * config, read by id, never named in a component. Totals are summed from the
 * rows below; nothing is typed twice.
 */
export type Period = "new" | "setup" | "mid" | "end";
export const SCHOOL_PLAN = PLANS.school;

export interface Staff extends SchoolStaff {
  email: string;
  invited?: string;
  signedIn: boolean;
}
export interface SchoolClass {
  id: string;
  name: string;
  teacher: string;
  created: string;
}
export interface SeatKey {
  id: string;
  code: string;
  label: string;
  classId: string | null;
  /** A per-student key has one use. */
  uses: number;
  issued: string;
  issuedBy: string;
  revoked: string | null;
}
export interface Practice {
  id: string;
  title: string;
  skill: string;
  classId: string;
  due: string;
  questions: number;
  assigned: string;
  by: string;
}
export interface Licence {
  seats: number;
  starts: string;
  ends: string;
  pilot: boolean;
  /** When the renewal quote went out, or will. */
  renewalQuote: string;
  paid: { date: string; amount: number }[];
}
export interface PeriodData {
  period: Period;
  today: string;
  licence: Licence;
  staff: Staff[];
  classes: SchoolClass[];
  keys: SeatKey[];
  students: SchoolStudent[];
  practice: Practice[];
}

const ortega = STAFF.find((s) => s.id === "ortega")!;
const patel = STAFF.find((s) => s.id === "patel")!;
const staff = (
  s: SchoolStaff,
  email: string,
  signedIn: boolean,
  invited?: string,
  classes = s.classes
): Staff => ({ ...s, classes, email, signedIn, invited });
export const ADMIN = staff(patel, "r.patel@ridgeview.k12.example", true);
const ORTEGA = staff(ortega, "l.ortega@ridgeview.k12.example", true);
const NAKAMURA: Staff = {
  id: "nakamura",
  name: "Mr. Nakamura",
  initials: "N",
  hue: 140,
  role: "teacher",
  school: SCHOOL.id,
  classes: [],
  email: "k.nakamura@ridgeview.k12.example",
  signedIn: false,
  invited: "2026-10-28",
};

const key = (
  id: string,
  code: string,
  label: string,
  classId: string | null,
  uses: number,
  issued: string,
  revoked: string | null = null
): SeatKey => ({ id, code, label, classId, uses, issued, issuedBy: ADMIN.id, revoked });

const CLASS_ROWS: SchoolClass[] = CLASSES.map((c) => ({
  id: c.id,
  name: c.name,
  teacher: c.teacher,
  created: "2026-08-24",
}));
const MID_KEYS: SeatKey[] = [
  key("k-p3-old", "RHS-P3-2C8L", "Period 3", "period3", 30, "2026-08-23", "2026-08-24"),
  key("k-p3", "RHS-P3-7KQ2", "Period 3", "period3", 30, "2026-08-24"),
  key("k-p6", "RHS-P6-M4XA", "Period 6", "period6", 32, "2026-08-24"),
  key("k-all", "RHS-ALL-9B2T", "Any class", null, 40, "2026-09-08"),
  key("k-ravi", "RHS-ST-4H7N", "Ravi, Period 6", "period6", 1, "2026-10-19"),
];
const MID_PRACTICE: Practice[] = [
  {
    id: "p1",
    title: "Percentages practice",
    skill: "Percentages",
    classId: "period3",
    due: addDays(TODAY, 3),
    questions: 10,
    assigned: "2026-10-28",
    by: "ortega",
  },
  {
    id: "p2",
    title: "Transitions practice",
    skill: "Transitions",
    classId: "period6",
    due: addDays(TODAY, -1),
    questions: 10,
    assigned: "2026-10-26",
    by: "ortega",
  },
  {
    id: "p3",
    title: "Linear functions practice",
    skill: "Linear functions",
    classId: "period6",
    due: addDays(TODAY, 4),
    questions: 15,
    assigned: "2026-10-29",
    by: "ortega",
  },
];

const PILOT: Licence = {
  seats: SCHOOL.seats,
  starts: "2027-01-04",
  ends: "2027-06-30",
  pilot: true,
  renewalQuote: "2027-04-14",
  paid: [],
};
const PAID: Licence = {
  seats: SCHOOL.seats,
  starts: "2026-07-01",
  ends: "2027-06-30",
  pilot: false,
  renewalQuote: "2027-04-14",
  paid: [{ date: "2026-07-01", amount: SCHOOL.seats * SCHOOL_PLAN.price }],
};

function midStudents(): SchoolStudent[] {
  const list = buildStudents(
    [
      {
        classId: "period3",
        keyId: "k-p3",
        count: CLASSES[0].students,
        floor: 12,
        joined: "2026-08-31",
      },
      {
        classId: "period6",
        keyId: "k-p6",
        count: CLASSES[1].students - 1,
        floor: 18,
        joined: "2026-08-31",
      },
      { classId: "period6", keyId: "k-ravi", count: 1, floor: 20, joined: "2026-10-19" },
      {
        classId: null,
        keyId: "k-all",
        count: SCHOOL.used - CLASSES[0].students - CLASSES[1].students,
        floor: 8,
        joined: "2026-09-14",
      },
    ],
    1000
  );
  const ravi = list.find((s) => s.keyId === "k-ravi")!;
  ravi.name = "Ravi";
  ravi.initials = "R";
  ravi.id = "ravi";
  return withTheo(list, "period3", "k-p3");
}

function endStudents(): SchoolStudent[] {
  const list = buildStudents(
    [
      { classId: "period3", keyId: "k-p3", count: 28, floor: 34, joined: "2026-08-31" },
      { classId: "period6", keyId: "k-p6", count: 31, floor: 40, joined: "2026-08-31" },
      { classId: "period1", keyId: "k-p1", count: 30, floor: 30, joined: "2027-01-11" },
      { classId: null, keyId: "k-all", count: 23, floor: 26, joined: "2026-09-14" },
    ],
    5000,
    "2027-07-01"
  );
  return withTheo(list, "period3", "k-p3");
}

export const PERIODS: Record<Period, PeriodData> = {
  new: {
    period: "new",
    today: TODAY,
    licence: PILOT,
    staff: [ADMIN],
    classes: [],
    keys: [],
    students: [],
    practice: [],
  },
  setup: {
    period: "setup",
    today: TODAY,
    licence: PILOT,
    staff: [ADMIN, { ...ORTEGA, signedIn: false, invited: "2026-10-28" }],
    classes: CLASS_ROWS.map((c) => ({ ...c, created: "2026-10-28" })),
    keys: [
      key("k-p3", "RHS-P3-7KQ2", "Period 3", "period3", 30, "2026-10-28"),
      key("k-p6", "RHS-P6-M4XA", "Period 6", "period6", 32, "2026-10-28"),
    ],
    students: [],
    practice: [],
  },
  mid: {
    period: "mid",
    today: TODAY,
    licence: PAID,
    staff: [ADMIN, ORTEGA, NAKAMURA],
    classes: CLASS_ROWS,
    keys: MID_KEYS,
    students: midStudents(),
    practice: MID_PRACTICE,
  },
  end: {
    period: "end",
    today: "2027-07-01",
    licence: { ...PAID, paid: PAID.paid },
    staff: [
      ADMIN,
      ORTEGA,
      { ...NAKAMURA, signedIn: true, invited: undefined, classes: ["period1"] },
    ],
    classes: [
      ...CLASS_ROWS,
      { id: "period1", name: "Period 1", teacher: "nakamura", created: "2027-01-08" },
    ],
    keys: [...MID_KEYS, key("k-p1", "RHS-P1-X3DM", "Period 1", "period1", 30, "2027-01-08")],
    students: endStudents(),
    practice: [],
  },
};

export const staffById = (list: Staff[], id: string) => list.find((s) => s.id === id);
export const studentsIn = (students: SchoolStudent[], classId: string | null) =>
  students.filter((s) => s.classId === classId);
export const usedOf = (students: SchoolStudent[], keyId: string) =>
  students.filter((s) => s.keyId === keyId).length;

const mid = PERIODS.mid;
console.assert(mid.students.length === SCHOOL.used, `${SCHOOL.used} seats used mid-year`);
console.assert(
  studentsIn(mid.students, "period3").length === CLASSES[0].students &&
    studentsIn(mid.students, "period6").length === CLASSES[1].students,
  "class sizes match the shared classes"
);
console.assert(
  studentsIn(mid.students, null).length === 25,
  "25 students with a seat and no class"
);
console.assert(
  mid.keys.filter((k) => !k.revoked).every((k) => usedOf(mid.students, k.id) <= k.uses),
  "no key is used past its uses"
);
console.assert(
  mid.students.find((s) => s.id === "theo")?.classId === "period3",
  "Theo is in Period 3"
);
console.assert(PAID.paid[0].amount === 1200, "120 seats at $10 is $1,200 a year");
console.assert(
  PERIODS.end.students.length <= SCHOOL.seats,
  "year-end seats never exceed the licence"
);
