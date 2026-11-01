import { useMemo } from "react";
import { useMockState } from "@/mock/state";
import { usePlan } from "@/plans/PlanProvider";
import {
  TODAY,
  REWARDS,
  levelsFor,
  daysUntil,
  QUESTIONS,
  DAILY10_RESULT,
  type DueItem,
  type SkillLevel,
} from "@/mock";
import type { CalEvent } from "@/design-system/components/Calendar";
import { seeded } from "@/design-system/backgrounds/useCanvasLoop";
import {
  dueFor,
  eventsFor,
  tutorFor,
  testsFor,
  takenTests,
  nextTest,
  todaySet,
  BESTS,
  DIAGNOSTIC_DATE,
  type FullTest,
  type PersonalBest,
} from "./mock";

/**
 * Everything a student screen reads, derived once from the gallery's student,
 * plan and state: the first day has no history, the empty state has nothing
 * due, and the plan decides the tutor, the events and the due items. Totals
 * are computed here, never typed twice.
 */
export interface TodaySetStats {
  right: number;
  total: number;
  seconds: number;
  pace: number;
  slowest: { skill: string; seconds: number };
  hardestRight: string | null;
  hard: number;
  difficulty: string;
  changed: number;
  changedToRight: number;
  reviewed: { from: string[]; count: number; right: number };
  tokens: number;
  answers: boolean[];
}

/** A finished set for a student other than Maya, derived from today's tokens so the two agree. */
function derivedSet(studentId: string, tokensToday: number): TodaySetStats | null {
  if (tokensToday <= 0) return null;
  const rnd = seeded(studentId.length * 31 + tokensToday);
  const right = Math.min(10, Math.round(tokensToday / 10));
  const answers = Array.from({ length: 10 }, (_, i) => i < right);
  for (let i = 9; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [answers[i], answers[j]] = [answers[j], answers[i]];
  }
  const seconds = answers.map(() => 40 + Math.round(rnd() * 70));
  const total = seconds.reduce((a, b) => a + b, 0);
  const slowest = seconds.indexOf(Math.max(...seconds));
  const firstRight = answers.indexOf(true);
  return {
    right,
    total: 10,
    seconds: total,
    pace: Math.round(total / 10),
    slowest: { skill: QUESTIONS[slowest].skill, seconds: seconds[slowest] },
    hardestRight: firstRight >= 0 ? QUESTIONS[firstRight].skill : null,
    hard: 2,
    difficulty: "Medium, 2 hard",
    changed: 1,
    changedToRight: 0,
    reviewed: { from: [], count: 0, right: 0 },
    tokens: right * 10,
    answers,
  };
}

export function useStudentView() {
  const mock = useMockState();
  const planCtx = usePlan();
  const { student, empty, loading, error } = mock;
  const { plan, has } = planCtx;
  const firstDay = student.since === TODAY;
  const quiet = firstDay || empty;

  return useMemo(() => {
    const levels: SkillLevel[] = firstDay ? levelsFor("noah") : levelsFor(student.id);
    const rewards = REWARDS[student.id];
    const fullLength = has("fullLength");
    const due: DueItem[] = dueFor(student.id, quiet, fullLength);
    const events: CalEvent[] = eventsFor(plan, quiet);
    const tutor = tutorFor(plan, student.tutor);
    const tests: FullTest[] = firstDay || !fullLength ? [] : testsFor(student.id);
    const taken = firstDay || !fullLength ? [] : takenTests(student.id);
    const next = quiet || !fullLength ? undefined : nextTest(student.id);
    const predicted = firstDay ? null : student.predicted;
    const baseline = firstDay ? null : student.baseline;
    const set: TodaySetStats | null = quiet
      ? null
      : student.id === "maya"
        ? { ...todaySet(), answers: DAILY10_RESULT.answers }
        : derivedSet(student.id, rewards?.tokensToday ?? 0);
    const bests: PersonalBest[] = firstDay ? [] : (BESTS[student.id] ?? []);
    const started = levels.filter((s) => s.now > 0).length;
    const points = [
      ...(baseline !== null
        ? [{ label: "Diagnostic", date: DIAGNOSTIC_DATE, score: baseline }]
        : []),
      ...taken.map((t) => ({ label: `Test ${t.n}`, date: t.date, score: t.score })),
    ];
    return {
      ...mock,
      plan,
      has,
      planName: planCtx.name,
      firstDay,
      quiet,
      loading,
      error,
      levels,
      rewards: quiet && !firstDay ? { ...rewards, tokensToday: 0 } : rewards,
      due,
      events,
      tutor,
      tests,
      taken,
      nextTest: next,
      predicted,
      baseline,
      target: student.target,
      days: daysUntil(student.satDate),
      satDate: student.satDate,
      set,
      doneToday: set !== null,
      bests,
      started,
      points,
    };
  }, [mock, plan, has, planCtx.name, student, firstDay, quiet, loading, error]);
}

export type StudentView = ReturnType<typeof useStudentView>;
