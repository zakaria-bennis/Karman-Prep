/**
 * What the plan has bought since the last charge (or since joining): the
 * practice done in that span, computed from the same weekly updates and this
 * week that the Progress screen reads, so the two agree. And the question
 * allowance on the plans with a finite bank, split by section in the share
 * of the skills started, so the parts add up to the questions answered.
 * Weeks are counted whole from the Monday on or after the charge.
 */
import type { Student, MockState } from "@/mock";
import { has, PLANS, type PlanId } from "@/plans/plans";
import { anyStudent, isNew, levelsOf, weekFor, MAYA_SESSIONS } from "./mock";
import { updatesFor, testsTaken, questionsAnswered, mondayOf } from "./mock-updates";
import { billingFor } from "./mock-plan";

export interface Period {
  since: string;
  /** What the span is measured from. */
  from: "charge" | "joining";
  questions: number;
  days: number;
  daily10: number | null;
  tests: number;
  sessions: number | null;
}

export function periodFor(plan: PlanId, student: Student, state: MockState): Period {
  const b = billingFor(plan, student);
  const charge = b.kind === "monthly" ? b.charges[0]?.date : undefined;
  const since = charge ?? student.since;
  const fresh = isNew(student) || state === "empty";
  /* Since joining, every update counts (the first week starts on the Monday
     before the sign-in), so the figure equals the total on the Progress
     screen; since a charge, the whole weeks after it. */
  const cut = charge ?? mondayOf(student.since);
  const updates = updatesFor(student, plan, state).filter((u) => u.weekStart >= cut);
  const week = weekFor(student, plan, state);
  const sum = (f: (u: (typeof updates)[number]) => number) => updates.reduce((a, u) => a + f(u), 0);
  /* A finite bank caps the count: the gallery's locked state moves a long-time
     student down to a smaller plan, and a span can never exceed the bank. */
  const bank = PLANS[plan].questions;
  const questions = sum((u) => u.questions) + week.total;
  return {
    since,
    from: charge ? "charge" : "joining",
    questions: typeof bank === "number" ? Math.min(bank, questions) : questions,
    days: sum((u) => u.daysPractised) + week.practised,
    daily10: has(plan, "daily10") ? sum((u) => u.daily10 ?? 0) + (week.daily10 ?? 0) : null,
    tests: fresh ? 0 : testsTaken(student).filter((t) => t.week >= since).length,
    sessions: has(plan, "oneToOne")
      ? fresh
        ? 0
        : MAYA_SESSIONS.filter((d) => d >= since).length
      : null,
  };
}

export interface AllowancePart {
  id: string;
  label: string;
  value: number;
}
export interface Allowance {
  bank: number;
  used: number;
  left: number;
  parts: AllowancePart[];
}

/** The question bank and what is used of it, by section; null on a plan with every question. */
export function allowanceFor(plan: PlanId, student: Student, state: MockState): Allowance | null {
  const bank = PLANS[plan].questions;
  if (bank === "all") return null;
  const used = Math.min(bank, questionsAnswered(student, plan, state));
  const started = levelsOf(student, state).filter((l) => l.now > 0);
  const share = started.length
    ? started.filter((l) => l.section === "Reading and Writing").length / started.length
    : 0.5;
  const rw = Math.round(used * share);
  return {
    bank,
    used,
    left: bank - used,
    parts: [
      { id: "rw", label: "Reading and Writing", value: rw },
      { id: "math", label: "Math", value: used - rw },
    ],
  };
}

console.assert(
  periodFor("cohort", anyStudent("ava"), "long-time").tests === 1,
  "Ava has taken one full-length test since joining the cohort"
);
const sofia = periodFor("plus", anyStudent("sofia"), "long-time");
console.assert(
  sofia.from === "charge" &&
    sofia.questions <= questionsAnswered(anyStudent("sofia"), "plus", "long-time"),
  "the span since the last charge never exceeds the total answered"
);
console.assert(
  periodFor("free", anyStudent("omar"), "long-time").questions ===
    questionsAnswered(anyStudent("omar"), "free", "long-time"),
  "since joining, the span equals every question answered"
);
const omar = allowanceFor("free", anyStudent("omar"), "long-time");
console.assert(
  omar !== null && omar.used === omar.bank && omar.left === 0,
  "Omar has used every one of Free’s questions"
);
console.assert(
  omar !== null && omar.parts.reduce((a, p) => a + p.value, 0) === omar.used,
  "the sections add up to the questions used"
);
console.assert(
  allowanceFor("plus", anyStudent("sofia"), "long-time") === null,
  "a plan with every question has no allowance"
);
