// ============================================================
// Every number on /admin/revenue, from the raw rows (real ones
// from Supabase, or sample ones from ./_sample). Pure: takes
// "now", so tests can pin the clock. Buckets are Austin days,
// weeks and months (./_time).
// ============================================================

import {
  FREE_PLAN,
  MARCH_PROGRAM,
  PRACTICE_PLAN,
  PRIVATE_PACKAGES,
  PRO_PLAN,
  SCHOOL_PLAN,
  TUTOR_AFFILIATE_PLAN,
  formatPrice,
} from "@/lib/marketing/offer";
import {
  ONE_TIME_PLANS,
  RENEWING_PLANS,
  isOneTimePlan,
  isRenewingPlan,
  monthlyValue,
  paymentFor,
} from "./_economics";
import {
  FAMILIES,
  cancellationsIn,
  everPaid,
  firstPaidAt,
  holdsAt,
  installmentDates,
  ledger,
  lifetimeValue,
  liveAt,
  monthlyChurn,
  mrrAt,
  payingCustomersAt,
  subscribersAt,
  type Charge,
  type Family,
  type RawPurchase,
  type RawRefund,
  type RawSub,
} from "./_ledger";
import { buildBuckets, monthKey, zonedDate, zonedMidnight, type Grain } from "./_time";
import type {
  BucketRow,
  CohortPaymentsSummary,
  CohortRow,
  DunningEntry,
  PeriodId,
  PeriodView,
  PlanRow,
  RevenueData,
  TutorRevenueRow,
} from "./_types";

export interface RawBooking {
  tutorId: string;
  tutorName: string;
  studentClerkId: string | null;
  minutes: number;
  start: string;
  isPrivate: boolean;
}

export interface RawSchool {
  name: string;
  freeUntil: string;
  billingStatus: string;
  seats: number;
}

export interface RevenueInput {
  subs: RawSub[];
  purchases: RawPurchase[];
  refunds: RawRefund[];
  bookings: RawBooking[];
  schools: RawSchool[];
  /** Students on the Free plan now. */
  freeStudents: number;
  /** Students on a tutor's affiliate code now. */
  sponsoredStudents: number;
  snapshots: Array<{ capturedAt: string; mrr: number }>;
}

const PERIOD_SETUP: Record<
  PeriodId,
  { grain: Grain; count: number; label: string; priorLabel: string }
> = {
  "30d": { grain: "day", count: 30, label: "Last 30 days", priorLabel: "the 30 days before" },
  "90d": { grain: "week", count: 13, label: "Last 13 weeks", priorLabel: "the 13 weeks before" },
  "12m": { grain: "month", count: 12, label: "Last 12 months", priorLabel: "the 12 months before" },
};

const DAY = 86_400_000;
const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);
const zeroFamilies = () =>
  Object.fromEntries(FAMILIES.map((f) => [f, 0])) as Record<Family, number>;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function inRange(at: number, from: number, to: number) {
  return at >= from && at < to;
}

function refundDollars(refunds: RawRefund[], from: number, to: number): number {
  return Math.round(
    sum(refunds.filter((r) => inRange(ms(r.issuedAt), from, to)).map((r) => r.amountCents)) / 100
  );
}

function chargeTotal(charges: Charge[], from: number, to: number, planId?: string): number {
  return sum(
    charges
      .filter((c) => inRange(c.at, from, to) && (planId === undefined || c.planId === planId))
      .map((c) => c.amount)
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The ladder, in the founder's order: Free, Practice, Pro, Cohort, Private 10 and 20, Tutor affiliate, Schools. */
export function planLadder(
  input: RevenueInput,
  charges: Charge[],
  from: number,
  now: number
): PlanRow[] {
  const end = now + 1;
  const live = input.subs.filter((s) => liveAt(s, now, now));
  const renewing = (planId: "practice" | "pro" | "tutor-affiliate", price: string): PlanRow => {
    const subs = live.filter((s) => s.planId === planId);
    const quarterly = subs.filter(
      (s) => s.term === "quarter" && RENEWING_PLANS[planId].threeMonths !== null
    );
    const monthly = subs.length - quarterly.length;
    const note =
      planId === "tutor-affiliate"
        ? `${plural(input.sponsoredStudents, "student")} on tutors' codes`
        : subs.length === 0
          ? null
          : [
              monthly && `${monthly} monthly`,
              quarterly.length && `${quarterly.length} every 3 months`,
            ]
              .filter(Boolean)
              .join(", ");
    return {
      id: planId,
      label: RENEWING_PLANS[planId].label,
      price,
      customers: subs.length,
      unit: "subscribers",
      revenue: chargeTotal(charges, from, end, planId),
      mrr: Math.round(sum(subs.map((s) => monthlyValue(planId, s.term)))),
      note,
    };
  };
  const oneTime = (
    planId: "cohort" | "private-10" | "private-20",
    price: string,
    note: string | null
  ): PlanRow => ({
    id: planId,
    label: ONE_TIME_PLANS[planId].label,
    price,
    customers: input.purchases.filter((p) => p.planId === planId && holdsAt(p, now)).length,
    unit: planId === "cohort" ? "seats" : "students",
    revenue: chargeTotal(charges, from, end, planId),
    mrr: null,
    note,
  });

  const cohorts = input.purchases.filter((p) => p.planId === "cohort" && holdsAt(p, now));
  const full = cohorts.filter((p) => p.payment === "full").length;
  const instal = cohorts.filter((p) => p.payment === "installments").length;
  const unknown = cohorts.length - full - instal;
  const cohortNote =
    cohorts.length === 0
      ? null
      : unknown === cohorts.length
        ? "Payment option not recorded"
        : [
            full && `${full} paid in full`,
            instal && `${instal} on the deposit plan`,
            unknown && `${unknown} not recorded`,
          ]
            .filter(Boolean)
            .join(", ");

  const seats = sum(input.schools.map((s) => s.seats));
  const freeUntil = input.schools.map((s) => s.freeUntil).sort()[0];
  const pkg = (id: "private-10" | "private-20") => PRIVATE_PACKAGES.find((p) => p.id === id)!;

  return [
    {
      id: "free",
      label: FREE_PLAN.name,
      price: "Free",
      customers: input.freeStudents,
      unit: "students",
      revenue: 0,
      mrr: null,
      note: `${FREE_PLAN.questionLimit} questions and ${plural(FREE_PLAN.fullLengthTests, "full-length test")}`,
    },
    renewing(
      "practice",
      `${formatPrice(PRACTICE_PLAN.monthly)} a month or ${formatPrice(PRACTICE_PLAN.threeMonths)} for 3 months`
    ),
    renewing(
      "pro",
      `${formatPrice(PRO_PLAN.monthly)} a month or ${formatPrice(PRO_PLAN.threeMonths)} for 3 months`
    ),
    oneTime(
      "cohort",
      `${formatPrice(MARCH_PROGRAM.price)}, or ${formatPrice(MARCH_PROGRAM.depositAmount)} + ${MARCH_PROGRAM.installments.count} × ${formatPrice(MARCH_PROGRAM.installments.amount)}`,
      cohortNote
    ),
    oneTime(
      "private-10",
      `${formatPrice(pkg("private-10").price)} for ${pkg("private-10").hours} hours`,
      null
    ),
    oneTime(
      "private-20",
      `${formatPrice(pkg("private-20").price)} for ${pkg("private-20").hours} hours`,
      null
    ),
    renewing("tutor-affiliate", `${formatPrice(TUTOR_AFFILIATE_PLAN.monthly)} a month`),
    {
      id: "schools",
      label: SCHOOL_PLAN.name,
      price: `${formatPrice(SCHOOL_PLAN.pricePerStudentPerYear)} per student a year, first year free`,
      customers: seats,
      unit: "seats",
      revenue: 0,
      mrr: null,
      note:
        input.schools.length === 0
          ? "No schools yet"
          : `${plural(input.schools.length, "school")}, free until ${shortDate(freeUntil)}`,
    },
  ];
}

function tutorRevenue(input: RevenueInput, from: number, now: number): TutorRevenueRow[] {
  const hourlyByClerk = new Map<string, { hourly: number; boughtAt: number }>();
  for (const p of input.purchases) {
    if (!isOneTimePlan(p.planId)) continue;
    const plan = ONE_TIME_PLANS[p.planId];
    if (plan.hours === null) continue;
    const at = ms(p.createdAt);
    const cur = hourlyByClerk.get(p.userId);
    if (!cur || at > cur.boughtAt)
      hourlyByClerk.set(p.userId, { hourly: plan.price / plan.hours, boughtAt: at });
  }
  const byTutor = new Map<string, TutorRevenueRow>();
  for (const b of input.bookings) {
    if (!inRange(ms(b.start), from, now + 1)) continue;
    const hourly =
      b.isPrivate && b.studentClerkId ? (hourlyByClerk.get(b.studentClerkId)?.hourly ?? 0) : 0;
    const row = byTutor.get(b.tutorId) ?? {
      tutorId: b.tutorId,
      name: b.tutorName,
      sessions: 0,
      revenue: 0,
    };
    row.sessions += 1;
    row.revenue += Math.round((hourly * (b.minutes || 60)) / 60);
    byTutor.set(b.tutorId, row);
  }
  return [...byTutor.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
}

/** One period's charts, headline numbers and tables. */
export function buildPeriod(
  input: RevenueInput,
  period: PeriodId,
  now: number,
  charges = ledger(input.subs, input.purchases, now)
): PeriodView {
  const setup = PERIOD_SETUP[period];
  const buckets = buildBuckets(setup.grain, setup.count, now);
  const from = buckets[0].start;
  const priorFrom = from - (now - from);
  const firstPaid = firstPaidAt(input.subs, input.purchases);
  const paidSubs = input.subs.filter(everPaid);

  const rows: BucketRow[] = buckets.map((b) => {
    const to = Math.min(b.end, now + 1);
    const asOf = Math.min(b.end, now);
    const byFamily = zeroFamilies();
    for (const c of charges) if (inRange(c.at, b.start, to)) byFamily[c.family] += c.amount;
    const refunds = refundDollars(input.refunds, b.start, to);
    const started = paidSubs.filter((s) => inRange(ms(s.createdAt), b.start, to));
    const ended = cancellationsIn(input.subs, b.start, to);
    const value = (s: RawSub) => (isRenewingPlan(s.planId) ? monthlyValue(s.planId, s.term) : 0);
    return {
      key: b.key,
      label: b.label,
      short: b.short,
      byFamily,
      refunds,
      net: sum(Object.values(byFamily)) - refunds,
      mrr: mrrAt(input.subs, asOf, now),
      customers: payingCustomersAt(input.subs, input.purchases, asOf, now),
      newCustomers: [...firstPaid.values()].filter((at) => inRange(at, b.start, to)).length,
      churned: ended.length,
      newMrr: Math.round(sum(started.map(value))),
      lostMrr: Math.round(sum(ended.map(value))),
    };
  });

  const mrrNow = mrrAt(input.subs, now, now);
  const mrrFrom = mrrAt(input.subs, from, now);
  const churn = monthlyChurn(input.subs, from, now);
  const priorChurn = monthlyChurn(input.subs, priorFrom, from);
  const net = sum(rows.map((r) => r.net));
  const priorNet =
    chargeTotal(charges, priorFrom, from) - refundDollars(input.refunds, priorFrom, from);
  const months = Math.max(0.25, (now - from) / (30 * DAY));
  const monthlyNetNewMrr = (mrrNow - mrrFrom) / months;
  const project = (k: number) => Math.max(0, Math.round(mrrNow + monthlyNetNewMrr * k));
  const gross = chargeTotal(charges, from, now + 1);
  const refundsIn = input.refunds
    .filter((r) => inRange(ms(r.issuedAt), from, now + 1))
    .sort((a, b) => ms(b.issuedAt) - ms(a.issuedAt));
  const refundTotal = Math.round(sum(refundsIn.map((r) => r.amountCents)) / 100);

  return {
    id: period,
    label: setup.label,
    priorLabel: setup.priorLabel,
    grain: setup.grain,
    buckets: rows,
    kpis: {
      mrr: { value: mrrNow, prior: mrrFrom, spark: rows.map((r) => r.mrr) },
      arr: { value: mrrNow * 12, prior: mrrFrom * 12 },
      net: { value: net, prior: priorNet, spark: rows.map((r) => r.net) },
      customers: {
        value: payingCustomersAt(input.subs, input.purchases, now, now),
        prior: payingCustomersAt(input.subs, input.purchases, from, now),
        spark: rows.map((r) => r.customers),
      },
      ltv: {
        value: lifetimeValue(mrrNow, subscribersAt(input.subs, now, now), churn),
        prior: lifetimeValue(mrrFrom, subscribersAt(input.subs, from, now), priorChurn),
      },
      churn: { value: churn, prior: priorChurn },
    },
    plans: planLadder(input, charges, from, now),
    refunds: {
      count: refundsIn.length,
      total: refundTotal,
      rate: gross > 0 ? refundTotal / gross : 0,
      recent: refundsIn.slice(0, 5).map((r) => ({
        amount: Math.round(r.amountCents / 100),
        issuedAt: r.issuedAt,
        reason: r.reason,
      })),
    },
    gross,
    forecast: {
      monthlyNetNewMrr,
      in3Months: project(3),
      in6Months: project(6),
      in12Months: project(12),
    },
    tutors: tutorRevenue(input, from, now),
  };
}

/** Subscribers grouped by the Austin month they started, and how many were left 0, 1, 3 and 6 months on. */
export function retention(subs: RawSub[], now: number): CohortRow[] {
  const groups = new Map<string, Array<number>>();
  for (const s of subs) {
    if (!everPaid(s)) continue;
    const key = monthKey(ms(s.createdAt));
    const list = groups.get(key) ?? [];
    list.push(Number.isFinite(ms(s.canceledAt)) ? ms(s.canceledAt) : Infinity);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 6)
    .map(([month, ends]) => {
      const [y, m] = month.split("-").map(Number);
      const counts = [0, 1, 3, 6].map((later) => {
        const idx = m - 1 + later + 1;
        const checkpoint = zonedMidnight(y + Math.floor(idx / 12), (idx % 12) + 1, 1);
        if (checkpoint > now) return null;
        return ends.filter((end) => end >= checkpoint).length;
      });
      return { month, size: ends.length, counts };
    });
}

/** Cohort seats: paid in full, on the deposit plan (and how far along), or not recorded. */
export function cohortPayments(purchases: RawPurchase[], now: number): CohortPaymentsSummary {
  const seats = purchases.filter(
    (p) => p.planId === "cohort" && Number.isFinite(ms(p.createdAt)) && ms(p.createdAt) <= now
  );
  const progress = [0, 0, 0, 0];
  const upcoming = new Map<string, { at: number; count: number }>();
  let collected = 0;
  let scheduled = 0;
  let full = 0;
  let instal = 0;
  for (const p of seats) {
    if (p.payment === "full") {
      full += 1;
      collected += MARCH_PROGRAM.price;
    } else if (p.payment === "installments") {
      instal += 1;
      const dates = installmentDates(ms(p.createdAt));
      const paid = dates.filter((d) => d <= now).length;
      progress[paid] += 1;
      collected += MARCH_PROGRAM.depositAmount + paid * MARCH_PROGRAM.installments.amount;
      for (const d of dates.filter((x) => x > now)) {
        scheduled += MARCH_PROGRAM.installments.amount;
        const { y, m, d: day } = zonedDate(d);
        const key = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const cur = upcoming.get(key) ?? { at: d, count: 0 };
        cur.count += 1;
        upcoming.set(key, cur);
      }
    }
  }
  const notRecorded = seats.length - full - instal;
  return {
    seats: seats.length,
    paidInFull: full,
    onInstallments: instal,
    notRecorded,
    notRecordedValue: notRecorded * MARCH_PROGRAM.price,
    installmentProgress: progress,
    collected,
    scheduled,
    upcoming: [...upcoming.values()]
      .sort((a, b) => a.at - b.at)
      .map((u) => ({
        at: new Date(u.at).toISOString(),
        count: u.count,
        amount: u.count * MARCH_PROGRAM.installments.amount,
      })),
  };
}

function dunning(subs: RawSub[]): DunningEntry[] {
  return subs
    .filter((s) => s.status === "past_due")
    .map((s) => ({
      name: s.name || s.email || s.userId,
      email: s.email ?? null,
      tier: isRenewingPlan(s.planId) ? RENEWING_PLANS[s.planId].label : s.planId,
      amountOwed: isRenewingPlan(s.planId) ? paymentFor(s.planId, s.term) : 0,
    }));
}

/** The whole page's data, apart from the sample-mode fields the page sets. */
export function buildRevenue(
  input: RevenueInput,
  now: number
): Omit<RevenueData, "sample" | "sampleReason" | "realPaidRows" | "sampleThreshold"> {
  const charges = ledger(input.subs, input.purchases, now);
  const statusCounts: Record<string, number> = {
    active: 0,
    past_due: 0,
    canceled: 0,
    incomplete: 0,
  };
  for (const s of input.subs) statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
  return {
    asOf: new Date(now).toISOString(),
    periods: {
      "30d": buildPeriod(input, "30d", now, charges),
      "90d": buildPeriod(input, "90d", now, charges),
      "12m": buildPeriod(input, "12m", now, charges),
    },
    cohortPayments: cohortPayments(input.purchases, now),
    statusCounts,
    cohorts: retention(input.subs, now),
    dunning: dunning(input.subs),
    snapshots: input.snapshots,
  };
}

/** Paid rows in the database: subscriptions that were ever paid, and purchases. */
export function paidRowCount(input: Pick<RevenueInput, "subs" | "purchases">): number {
  return (
    input.subs.filter(everPaid).length +
    input.purchases.filter((p) => isOneTimePlan(p.planId)).length
  );
}
