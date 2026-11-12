import type { OneTimePlanId, SubscriptionPlanId } from "@/lib/plans/catalog";
import type { Family } from "./_ledger";
import type { Grain } from "./_time";

export type { Family };

/** One plan's line in a revenue snapshot (revenue_snapshots.by_tier). */
export interface TierBreakdown {
  tier: SubscriptionPlanId | OneTimePlanId;
  label: string;
  color: string;
  /** Renewing (subscriptions) or one payment (plan_grants purchases). */
  model: "subscription" | "one_time";
  /** The monthly price for a renewing plan, the full price for a one-time plan. */
  price: number;
  /** Active subscribers, or students who hold the one-time plan now. */
  studentCount: number;
  /** Monthly value for a renewing plan; purchases in the last 30 days for a one-time plan. */
  revenue: number;
  unitsLabel: string;
}

export const PERIODS = ["30d", "90d", "12m"] as const;
export type PeriodId = (typeof PERIODS)[number];

/** One headline number, with where it stood one period earlier. */
export interface Kpi {
  value: number | null;
  prior: number | null;
  /** One value per chart bucket, oldest first, for the tile's small line. */
  spark?: number[];
}

/** One bar on the time charts. */
export interface BucketRow {
  key: string;
  label: string;
  short: string;
  /** Charges in the bucket by plan family, dollars. */
  byFamily: Record<Family, number>;
  refunds: number;
  /** Charges less refunds. */
  net: number;
  /** MRR as of the bucket's end (or now, for the current bucket). */
  mrr: number;
  /** Paying customers as of the bucket's end. */
  customers: number;
  /** People whose first payment fell in the bucket. */
  newCustomers: number;
  /** Subscriptions that ended in the bucket. */
  churned: number;
  /** Monthly value of subscriptions started / ended in the bucket. */
  newMrr: number;
  lostMrr: number;
}

/** One rung of the plan ladder, Free to Schools. */
export interface PlanRow {
  id: string;
  label: string;
  /** "$39 a month or $89 for 3 months", from offer.ts. */
  price: string;
  /** Who holds the plan now (students, seats or subscribers). */
  customers: number;
  /** What the count means: "subscribers", "students", "seats". */
  unit: string;
  /** Collected in the period, dollars. */
  revenue: number;
  /** Monthly value now, for renewing plans. */
  mrr: number | null;
  /** A short fact under the row ("2 every 3 months", "first year free until Aug 31, 2027"). */
  note: string | null;
}

export interface RefundLine {
  amount: number;
  issuedAt: string;
  reason: string | null;
}

export interface TutorRevenueRow {
  tutorId: string;
  name: string;
  sessions: number;
  revenue: number;
}

/** Everything that changes with the 30 days / 90 days / 12 months switch. */
export interface PeriodView {
  id: PeriodId;
  /** "Last 30 days" */
  label: string;
  /** "the 30 days before" */
  priorLabel: string;
  grain: Grain;
  buckets: BucketRow[];
  kpis: {
    mrr: Kpi;
    arr: Kpi;
    net: Kpi;
    customers: Kpi;
    ltv: Kpi;
    churn: Kpi;
  };
  plans: PlanRow[];
  refunds: { count: number; total: number; rate: number; recent: RefundLine[] };
  gross: number;
  forecast: { monthlyNetNewMrr: number; in3Months: number; in6Months: number; in12Months: number };
  tutors: TutorRevenueRow[];
}

export interface CohortRow {
  /** YYYY-MM, Austin time */
  month: string;
  size: number;
  /** Active count at month 0, 1, 3, 6 after signup; null while that month is still ahead. */
  counts: Array<number | null>;
}

export interface DunningEntry {
  name: string;
  email: string | null;
  tier: string;
  amountOwed: number;
}

export interface CohortPaymentsSummary {
  seats: number;
  paidInFull: number;
  onInstallments: number;
  /** Seats whose payment option wasn't recorded (counted at the full price). */
  notRecorded: number;
  /** Those seats at the full price, dollars. */
  notRecordedValue: number;
  /** Instalment seats by how many of the three payments are in: index 0 to 3. */
  installmentProgress: number[];
  collected: number;
  /** Still to come from instalment seats. */
  scheduled: number;
  /** Upcoming instalment dates with how many payments fall on each. */
  upcoming: Array<{ at: string; count: number; amount: number }>;
}

export interface RevenueData {
  asOf: string;
  /** True when every number on the page is sample data. */
  sample: boolean;
  /** Why the page is in sample mode. */
  sampleReason: "asked" | "thin" | null;
  /** Paid rows (subscriptions and purchases) in the real database. */
  realPaidRows: number;
  /** Paid rows needed before the page shows real numbers by itself. */
  sampleThreshold: number;
  periods: Record<PeriodId, PeriodView>;
  cohortPayments: CohortPaymentsSummary;
  statusCounts: Record<string, number>;
  cohorts: CohortRow[];
  dunning: DunningEntry[];
  /** Captured MRR points from revenue_snapshots, to check the rebuilt line against. */
  snapshots: Array<{ capturedAt: string; mrr: number }>;
}
