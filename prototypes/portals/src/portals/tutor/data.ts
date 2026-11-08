import { useMemo } from "react";
import { TODAY, useMockState, type MockState } from "@/mock";
import { usePlan } from "@/plans/PlanProvider";
import {
  ALL_STUDENTS,
  COHORT_STUDENTS,
  PRIVATE_STUDENTS,
  TUTOR_COHORTS,
  WEEKS,
  NEXT_SESSION,
  type Booking,
  type TutorCohort,
  type TutorStudent,
} from "./mock";
import { QUEUE, type ReportUpload } from "./mock-work";
import { useHashParam } from "./nav";

/**
 * One hook gives every screen the data its gallery state asks for: long-time
 * (Zakaria, everything), first-day (one student assigned this morning, no test
 * yet, no cohort yet), empty (a new tutor with nothing assigned), loading,
 * error and locked (the viewed student sits on a plan without the bundle).
 */
export interface TutorData {
  state: MockState;
  loading: boolean;
  error: boolean;
  empty: boolean;
  locked: boolean;
  firstDay: boolean;
  students: TutorStudent[];
  privates: TutorStudent[];
  cohortStudents: TutorStudent[];
  cohorts: TutorCohort[];
  queue: ReportUpload[];
  nextSession(id: string): Booking | null;
  weeks: typeof WEEKS;
  hasSessions: boolean;
}

const FIRST_DAY_STUDENT: TutorStudent = {
  ...PRIVATE_STUDENTS.find((s) => s.id === "owen")!,
  since: TODAY,
  predicted: null,
  baseline: null,
  hoursUsed: 0,
};
const FIRST_DAY_WEEKS: typeof WEEKS = {
  this: { start: WEEKS.this.start, events: WEEKS.this.events.filter((e) => e.kind === "workshop") },
  next: { start: WEEKS.next.start, events: WEEKS.next.events.filter((e) => e.kind === "workshop") },
};
const NO_WEEKS: typeof WEEKS = {
  this: { start: WEEKS.this.start, events: [] },
  next: { start: WEEKS.next.start, events: [] },
};

export function useTutorData(): TutorData {
  const { state, loading, error, empty, locked } = useMockState();
  return useMemo(() => {
    const firstDay = state === "first-day";
    const students = empty ? [] : firstDay ? [FIRST_DAY_STUDENT] : ALL_STUDENTS;
    return {
      state,
      loading,
      error,
      empty,
      locked,
      firstDay,
      students,
      privates: empty ? [] : firstDay ? [FIRST_DAY_STUDENT] : PRIVATE_STUDENTS,
      cohortStudents: empty || firstDay ? [] : COHORT_STUDENTS,
      cohorts: empty || firstDay ? [] : TUTOR_COHORTS,
      queue: empty ? [] : firstDay ? QUEUE.filter((r) => r.studentId === "owen") : QUEUE,
      nextSession: (id) => (firstDay || empty ? null : (NEXT_SESSION[id] ?? null)),
      weeks: empty ? NO_WEEKS : firstDay ? FIRST_DAY_WEEKS : WEEKS,
      hasSessions: !empty && !firstDay,
    };
  }, [state, loading, error, empty, locked]);
}

/**
 * The student a detail screen shows: the `id` in the hash, else the first
 * student on the gallery's plan switch, else Jonah when the state is locked
 * (his Private 10 has no guarantee, so the lock shows), else the first.
 */
export function useSelectedStudent(data: TutorData): TutorStudent | null {
  const id = useHashParam("id");
  const { plan } = usePlan();
  const list = data.students;
  if (!list.length) return null;
  const byId = id ? list.find((s) => s.id === id) : null;
  if (byId) return byId;
  if (data.locked) return list.find((s) => s.plan === "private10") ?? list[0];
  return list.find((s) => s.plan === plan) ?? list[0];
}

export function useSelectedCohort(data: TutorData): TutorCohort | null {
  const id = useHashParam("id");
  const list = data.cohorts;
  if (!list.length) return null;
  return list.find((c) => c.id === id) ?? list[0];
}
