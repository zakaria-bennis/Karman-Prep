export interface TierBreakdown {
  tier: "group" | "small_group" | "private" | "elite";
  label: string;
  color: string;
  model: "subscription" | "per_session";
  price: number;
  studentCount: number;
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
  tiers: TierBreakdown[];
  statusCounts: Record<string, number>;
  newSubs30d: number;
  cancellations30d: number;
  usedBookingFallback: boolean;
  estimatedSessionsPerStudent: number;
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
