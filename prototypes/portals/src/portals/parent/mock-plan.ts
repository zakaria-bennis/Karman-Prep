/**
 * The plan, billing and guarantee data the parent sees. Prices and bundles
 * come from the plan config; the deposit, the installment count, the Private
 * hours and the guarantee thresholds are mirrored from offer.ts (MARCH_PROGRAM,
 * PRIVATE_PACKAGES, GUARANTEE) and belong in the plan config in Phase 2.
 * Note: offer.ts lists three installments of $345 beside a $995 price, which
 * does not add up; here the three installments split the price after the
 * deposit, in whole dollars, so every total on screen reconciles. CONFIRM.
 */
import {
  addDays,
  daysUntil,
  fmtDate,
  TODAY,
  SAT_MARCH,
  type Student,
  type MockState,
} from "@/mock";
import { BUNDLES, LADDER, PLANS, has, type Bundle, type Plan, type PlanId } from "@/plans/plans";
import { HOURS, MAYA_SESSIONS, NEXT_SESSION, anyStudent, isNew } from "./mock";
import { testsTaken, NEXT_TEST } from "./mock-updates";

export interface Charge {
  id: string;
  date: string;
  label: string;
  amount: number;
  state: "paid" | "due" | "upcoming";
}
export type Billing =
  | { kind: "monthly"; amount: number; nextCharge: string; charges: Charge[] }
  | {
      kind: "installments";
      deposit: Charge;
      installments: Charge[];
      total: number;
      paid: number;
      left: number;
    }
  | {
      kind: "hours";
      price: number;
      bought: number;
      used: number;
      left: number;
      booked: typeof NEXT_SESSION | null;
      sessions: { date: string; with: string; minutes: number }[];
    }
  | { kind: "school"; school: string; through: string }
  | { kind: "free" };

const DEPOSIT = 95;
const INSTALLMENTS = 3;

function plusMonths(iso: string, months: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function billingFor(plan: PlanId, student: Student): Billing {
  const p = PLANS[plan];
  if (p.billing === "none") return { kind: "free" };
  if (p.billing === "student-year")
    return { kind: "school", school: "Ridgeview High", through: "2027-06-30" };
  if (p.billing === "month") {
    const charges: Charge[] = [];
    for (let n = 0; plusMonths(student.since, n) <= TODAY; n++) {
      const date = plusMonths(student.since, n);
      charges.push({ id: date, date, label: `${p.name}, monthly`, amount: p.price, state: "paid" });
    }
    return {
      kind: "monthly",
      amount: p.price,
      nextCharge: plusMonths(student.since, charges.length),
      charges: charges.reverse(),
    };
  }
  if (has(plan, "oneToOne")) {
    const bought = HOURS[plan] ?? 0;
    const fresh = isNew(student);
    const used = fresh ? 0 : MAYA_SESSIONS.length;
    return {
      kind: "hours",
      price: p.price,
      bought,
      used,
      left: bought - used,
      booked: fresh ? null : NEXT_SESSION,
      sessions: fresh
        ? []
        : MAYA_SESSIONS.map((date) => ({ date, with: "Zakaria", minutes: 60 })).reverse(),
    };
  }
  const rest = p.price - DEPOSIT;
  const base = Math.floor(rest / INSTALLMENTS);
  const extra = rest - base * INSTALLMENTS;
  const first = addDays(student.since, 7);
  const deposit: Charge = {
    id: "deposit",
    date: student.since,
    label: "Deposit, refundable",
    amount: DEPOSIT,
    state: "paid",
  };
  let dueGiven = false;
  const installments: Charge[] = Array.from({ length: INSTALLMENTS }, (_, i) => {
    const date = plusMonths(first, i);
    const state: Charge["state"] = date <= TODAY ? "paid" : dueGiven ? "upcoming" : "due";
    if (state === "due") dueGiven = true;
    return {
      id: `i${i + 1}`,
      date,
      label: `Installment ${i + 1} of ${INSTALLMENTS}`,
      amount: base + (i < extra ? 1 : 0),
      state,
    };
  });
  const total = DEPOSIT + installments.reduce((a, c) => a + c.amount, 0);
  const paid =
    DEPOSIT + installments.filter((c) => c.state === "paid").reduce((a, c) => a + c.amount, 0);
  return { kind: "installments", deposit, installments, total, paid, left: total - paid };
}

export interface Requirement {
  id: string;
  label: string;
  kind: "count" | "percent" | "date";
  current: number;
  /** How many have happened so far, for a count that grows over the program. */
  soFar?: number;
  threshold: number;
  total?: number;
  date?: string;
  ok: boolean;
  detail: string;
}

/** Each guarantee requirement with its count against its threshold; null unless the plan carries the guarantee. */
export function requirementsFor(
  plan: PlanId,
  student: Student,
  state: MockState
): { rows: Requirement[]; onTrack: boolean } | null {
  if (!PLANS[plan].guarantee) return null;
  const fresh = isNew(student) || state === "empty";
  const sat = `${fmtDate(student.satDate, "long")}, in ${daysUntil(student.satDate)} days`;
  let rows: Requirement[];
  if (has(plan, "liveClasses")) {
    const held = fresh ? 0 : 6;
    const attended = fresh ? 0 : 5;
    const b = billingFor(plan, student);
    const due = b.kind === "installments" ? b.installments.filter((c) => c.date <= TODAY) : [];
    const paid = due.filter((c) => c.state === "paid").length;
    const tests = fresh ? 0 : 1;
    const practice = fresh ? 0 : 92;
    rows = [
      {
        id: "classes",
        label: "Live classes attended, live",
        kind: "count",
        current: attended,
        soFar: held,
        threshold: 15,
        total: 18,
        ok: attended + (18 - held) >= 15,
        detail: `${attended} of ${held} so far. 15 of 18 needed.`,
      },
      {
        id: "tests",
        label: "Full-length tests taken in their week",
        kind: "count",
        current: tests,
        soFar: tests,
        threshold: 5,
        total: 5,
        ok: true,
        detail: `${tests} of ${tests} so far. All 5 needed.`,
      },
      {
        id: "practice",
        label: "Assigned weekly practice completed",
        kind: "percent",
        current: practice,
        threshold: 90,
        ok: fresh || practice >= 90,
        detail: fresh ? "Nothing assigned yet. 90% needed." : `${practice}% so far. 90% needed.`,
      },
      {
        id: "sat",
        label: "The official SAT on the program’s date",
        kind: "date",
        current: 0,
        threshold: 1,
        date: SAT_MARCH,
        ok: true,
        detail: sat,
      },
      {
        id: "payments",
        label: "Installments paid on time",
        kind: "count",
        current: paid,
        soFar: due.length,
        threshold: INSTALLMENTS,
        total: INSTALLMENTS,
        ok: paid === due.length,
        detail: `${paid} of ${due.length} due so far. All ${INSTALLMENTS} needed.`,
      },
    ];
  } else {
    const used = fresh ? 0 : MAYA_SESSIONS.length;
    const taken = fresh ? 0 : testsTaken(student).length;
    const next = NEXT_TEST[student.id];
    rows = [
      {
        id: "sessions",
        label: "Sessions attended",
        kind: "count",
        current: used,
        soFar: used,
        threshold: HOURS[plan] ?? 0,
        total: HOURS[plan] ?? 0,
        ok: true,
        detail: `${used} of ${used} so far. Every session counts.`,
      },
      {
        id: "tests",
        label: "Full-length tests taken",
        kind: "count",
        current: taken,
        threshold: 4,
        total: 4,
        ok: true,
        detail:
          next && !fresh
            ? `${taken} of 4. Test ${next.n} is ${fmtDate(next.date, "long")}.`
            : `${taken} of 4.`,
      },
      {
        id: "sat",
        label: "The official SAT within 30 days of the last session",
        kind: "date",
        current: 0,
        threshold: 1,
        date: student.satDate,
        ok: true,
        detail: sat,
      },
    ];
  }
  return { rows, onTrack: rows.every((r) => r.ok) };
}

/** The next plan up the ladder that adds something, with what it adds. A school seat climbs from the bottom. */
export function nextPlanFor(plan: PlanId): { plan: Plan; adds: Bundle[] } | null {
  const from = LADDER.indexOf(plan);
  for (const id of LADDER.slice(from + 1)) {
    const adds = PLANS[id].bundles.filter((b) => !has(plan, b));
    if (adds.length) return { plan: PLANS[id], adds: adds.map((b) => BUNDLES[b]) };
  }
  return null;
}

const cohort = billingFor("cohort", anyStudent("ava"));
console.assert(
  cohort.kind === "installments" &&
    cohort.total === PLANS.cohort.price &&
    cohort.paid + cohort.left === cohort.total,
  "the deposit and three installments add up to the cohort’s price"
);
console.assert(
  cohort.kind === "installments" &&
    cohort.installments.filter((c) => c.state === "due").length === 1,
  "exactly one installment is due next"
);
console.assert(
  nextPlanFor("private20") === null && nextPlanFor("school")?.plan.id === "plus",
  "the ladder’s ends"
);
