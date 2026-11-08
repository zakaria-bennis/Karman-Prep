import type { OneTimePlanId, SubscriptionPlanId } from "@/lib/plans/catalog";

/** One plan's row in the revenue table and pie. */
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

export interface MrrSnapshot {
  capturedAt: string;
  mrr: number;
  activeStudents: number;
}

export interface CohortRow {
  /** YYYY-MM */
  month: string;
  /** Cohort size at signup. */
  size: number;
  /** Active count at month 0, 1, 3, 6 since signup. null when
   *  that checkpoint is in the future. */
  counts: Array<number | null>;
}

export interface DunningEntry {
  name: string;
  email: string | null;
  tier: string;
  amountOwed: number;
}

export interface TutorRevenueRow {
  tutorId: string;
  name: string;
  sessions: number;
  revenue: number;
}

export interface RevenueData {
  asOf: string;
  totalMrr: number;
  totalArr: number;
  totalStudents: number;
  arpu: number;
  monthlyChurnRate: number;
  ltv: number | null;
  refunds30dCount: number;
  refunds30dDollars: number;
  refundRate: number;
  /** Renewing plans at monthly value plus one-time purchases from the last 30 days. */
  monthRevenue: number;
  tiers: TierBreakdown[];
  statusCounts: Record<string, number>;
  newSubs30d: number;
  cancellations30d: number;
  snapshots: MrrSnapshot[];
  forecast: {
    in3Months: number;
    in6Months: number;
    in12Months: number;
    monthlyNetNewSubs: number;
    monthlyNetNewMrr: number;
  };
  cohorts: CohortRow[];
  dunning: DunningEntry[];
  tutorRevenue: TutorRevenueRow[];
}
