import { useMemo } from "react";
import { useMockState, type MockState } from "@/mock";
import {
  ADMIN,
  PERIODS,
  SCHOOL_PLAN,
  staffById,
  type Licence,
  type Period,
  type Practice,
  type SchoolClass,
  type SeatKey,
  type Staff,
} from "./mock";
import type { SchoolStudent } from "./mock-students";
import { useRole, type Role } from "./nav";
import { useStore } from "./store";

/**
 * One hook gives every screen the school as the gallery state asks for it,
 * with the prototype store folded in (classes added, keys issued or revoked,
 * teachers invited, students placed, practice assigned, seats added). The
 * signed-in person is the admin (Mr. Patel) or, with the gallery's role set
 * to teacher, Ms. Ortega, who sees only her own classes and students.
 */
export interface Week {
  active: number;
  questions: number;
  daily10Done: number;
  daily10Slots: number;
}
export interface SchoolData {
  state: MockState;
  period: Period;
  role: Role;
  me: Staff;
  today: string;
  loading: boolean;
  error: boolean;
  firstDay: boolean;
  setup: boolean;
  ended: boolean;
  licence: Licence;
  seats: number;
  staff: Staff[];
  teachers: Staff[];
  classes: SchoolClass[];
  students: SchoolStudent[];
  unassigned: SchoolStudent[];
  keys: SeatKey[];
  practice: Practice[];
  week: Week;
  usedOf(keyId: string): number;
  studentsIn(classId: string | null): SchoolStudent[];
  classById(id: string | null | undefined): SchoolClass | null;
  weekOf(list: SchoolStudent[]): Week;
}

const periodOf = (state: MockState): Period =>
  state === "first-day" ? "new" : state === "empty" ? "setup" : state === "locked" ? "end" : "mid";

export const weekOf = (list: SchoolStudent[]): Week => ({
  active: list.filter((s) => s.questionsWeek > 0).length,
  questions: list.reduce((a, s) => a + s.questionsWeek, 0),
  daily10Done: list.reduce((a, s) => a + s.daily10Week, 0),
  daily10Slots: list.length * 5,
});

export function useSchoolData(): SchoolData {
  const { state, loading, error } = useMockState();
  const role = useRole();
  const store = useStore();
  return useMemo(() => {
    const p = PERIODS[periodOf(state)];
    const staff = [...p.staff, ...store.teachers];
    const me = role === "teacher" ? (staffById(staff, "ortega") ?? ADMIN) : ADMIN;
    const classes = [...p.classes, ...store.classes];
    const mine = role === "teacher" ? classes.filter((c) => c.teacher === me.id) : classes;
    const placed = p.students.map((s) =>
      store.placed[s.id] ? { ...s, classId: store.placed[s.id] } : s
    );
    const students =
      role === "teacher" ? placed.filter((s) => mine.some((c) => c.id === s.classId)) : placed;
    const keys = [...store.keys, ...p.keys].map((k) =>
      store.revoked[k.id] ? { ...k, revoked: store.revoked[k.id] } : k
    );
    const practice = [...store.practice, ...p.practice].filter((a) =>
      mine.some((c) => c.id === a.classId)
    );
    return {
      state,
      period: p.period,
      role,
      me,
      today: p.today,
      loading,
      error,
      firstDay: p.period === "new",
      setup: p.period === "setup",
      ended: p.period === "end",
      licence: p.licence,
      seats: p.licence.seats + store.seatsAdded,
      staff,
      teachers: staff.filter((s) => s.role === "teacher"),
      classes: mine,
      students,
      unassigned: placed.filter((s) => !s.classId),
      keys,
      practice,
      week: weekOf(students),
      usedOf: (keyId) => placed.filter((s) => s.keyId === keyId).length,
      studentsIn: (classId) => students.filter((s) => s.classId === classId),
      classById: (id) => classes.find((c) => c.id === id) ?? null,
      weekOf,
    };
  }, [state, loading, error, role, store]);
}

export const planPriceLabel = SCHOOL_PLAN.priceLabel;
export const perSeat = SCHOOL_PLAN.price;
export const money = (n: number) => `$${n.toLocaleString("en-US")}`;
