// ============================================================
// Earnings queries — feeds the tutor /tutor/earnings dashboard.
//
// All reads happen through the service-role client (this is
// server-only code; never imported into a client component).
// Pages call these from Server Components after running their
// own Clerk-side role check.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";

export interface TutorEarningsSummary {
  tutor_user_id: string;
  total_hours_worked: number;
  total_earnings: number;
  pending_amount: number;
  approved_amount: number;
  paid_amount: number;
  sessions_with_recap: number;
  sessions_paid: number;
  last_refreshed_at: string;
}

export interface EnrolledStudent {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export interface TutorEarningsSession {
  id: string;
  scheduled_start: string;
  duration_minutes: number | null;
  /** Inferred from cohort.tier or "private" / "elite" if no cohort. */
  tier: string;
  recap_email_sent: boolean;
  recap_sent_at: string | null;
  payout_status: string;
  payout_amount: number | null;
  tutor_hours: number | null;
  status: string;
  cohort_id: string | null;
  cohort: { id: string; name: string; tier: string } | null;
  zoom_meeting_id: string | null;
  zoom_attended_emails: string[] | null;
  /** All bookings (i.e. enrolled students) for this session. */
  enrolled: EnrolledStudent[];
}

export type TimeRange =
  | "today"
  | "7d"
  | "14d"
  | "30d"
  | "3mo"
  | "6mo"
  | "1y"
  | "all";

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: "Today",
  "7d":  "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  "3mo": "Last 3 months",
  "6mo": "Last 6 months",
  "1y":  "Last 12 months",
  all:   "All time",
};

/** Returns ISO timestamp for the start of a range, or null for "all". */
export function rangeStartIso(range: TimeRange): string | null {
  const now = new Date();
  switch (range) {
    case "today": {
      const d = new Date(now); d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case "7d":  return new Date(now.getTime() -  7 * 86400_000).toISOString();
    case "14d": return new Date(now.getTime() - 14 * 86400_000).toISOString();
    case "30d": return new Date(now.getTime() - 30 * 86400_000).toISOString();
    case "3mo": return new Date(now.getTime() - 90  * 86400_000).toISOString();
    case "6mo": return new Date(now.getTime() - 182 * 86400_000).toISOString();
    case "1y":  return new Date(now.getTime() - 365 * 86400_000).toISOString();
    case "all": return null;
  }
}

export interface TutorPayoutRequestSummary {
  id: string;
  total_amount: number;
  total_hours: number;
  net_amount: number | null;
  payout_method: string | null;
  status: string;
  requested_at: string;
  approved_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  booking_count: number | null;
}

/** Fetch the materialized-view row for one tutor. Returns a
 *  zero-filled record if the tutor has no row yet (new account
 *  with no bookings). */
export async function fetchTutorEarningsSummary(
  tutorUserId: string
): Promise<TutorEarningsSummary> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tutor_earnings_summary")
    .select("*")
    .eq("tutor_user_id", tutorUserId)
    .maybeSingle();

  if (!data) {
    return {
      tutor_user_id: tutorUserId,
      total_hours_worked: 0,
      total_earnings: 0,
      pending_amount: 0,
      approved_amount: 0,
      paid_amount: 0,
      sessions_with_recap: 0,
      sessions_paid: 0,
      last_refreshed_at: new Date().toISOString(),
    };
  }
  return data as unknown as TutorEarningsSummary;
}

/** Recent SESSIONS for a tutor with cohort join + enrolled students.
 *  Reads from `sessions` (per-session pay) — group sessions appear
 *  as ONE row regardless of enrollment count.
 *  Filters by date range. */
export async function fetchTutorRecentSessions(
  tutorUserId: string,
  range: TimeRange = "30d",
  limit = 100,
): Promise<TutorEarningsSession[]> {
  const supabase = createAdminClient();
  let q = supabase
    .from("sessions")
    .select(`
      id, scheduled_start, duration_minutes, status, cohort_id,
      zoom_meeting_id, zoom_attended_emails,
      recap_email_sent, recap_sent_at, payout_status, payout_amount, tutor_hours,
      cohort:cohorts(id, name, tier),
      bookings(student:users!bookings_student_id_fkey(id, first_name, last_name, email))
    `)
    .eq("tutor_id", tutorUserId)
    .neq("status", "cancelled")
    .order("scheduled_start", { ascending: false })
    .limit(limit);

  const startIso = rangeStartIso(range);
  if (startIso) q = q.gte("scheduled_start", startIso);

  const { data } = await q;

  const arr = <T,>(v: unknown): T | null =>
    Array.isArray(v) ? ((v[0] as T) ?? null) : ((v as T) ?? null);

  return (data ?? []).map((row) => {
    const cohortObj = arr<TutorEarningsSession["cohort"]>(row.cohort);
    const tier = cohortObj?.tier ?? "private";
    const bookingsArr = (row.bookings as Array<{ student?: unknown }> | null) ?? [];
    const enrolled: EnrolledStudent[] = bookingsArr
      .map((b) => arr<EnrolledStudent>(b.student))
      .filter((s): s is EnrolledStudent => !!s && !!s.id);
    return {
      id:                   row.id as string,
      scheduled_start:      row.scheduled_start as string,
      duration_minutes:     (row.duration_minutes as number | null) ?? null,
      tier,
      status:               row.status as string,
      cohort_id:            (row.cohort_id as string | null) ?? null,
      zoom_meeting_id:      (row.zoom_meeting_id as string | null) ?? null,
      zoom_attended_emails: (row.zoom_attended_emails as string[] | null) ?? null,
      recap_email_sent:     row.recap_email_sent === true,
      recap_sent_at:        (row.recap_sent_at as string | null) ?? null,
      payout_status:        (row.payout_status as string) ?? "not_eligible",
      payout_amount:        (row.payout_amount as number | null) ?? null,
      tutor_hours:          (row.tutor_hours   as number | null) ?? null,
      cohort:               cohortObj,
      enrolled,
    };
  });
}

// ──────────────────────────────────────────────────────────
// Weekly earnings series — feeds the analytics chart
// ──────────────────────────────────────────────────────────
export interface WeeklyEarningsPoint {
  /** ISO date for the start of the week (Monday). */
  weekStart: string;
  /** Total payout_amount summed for sessions in that week. */
  amount: number;
  /** Total tutor_hours summed for sessions in that week. */
  hours: number;
  /** How many sessions were in that week. */
  sessions: number;
}

/** Last N weeks of weekly earnings for the analytics chart.
 *  Buckets by week-of-year (Monday-Sunday). Returns all weeks
 *  in range — including weeks with $0. Reads from sessions. */
export async function fetchTutorWeeklyEarnings(
  tutorUserId: string,
  weeks = 12,
): Promise<WeeklyEarningsPoint[]> {
  const supabase = createAdminClient();
  const startDate = new Date(Date.now() - weeks * 7 * 86400_000);

  const { data } = await supabase
    .from("sessions")
    .select("scheduled_start, payout_amount, tutor_hours")
    .eq("tutor_id", tutorUserId)
    .neq("status", "cancelled")
    .gte("scheduled_start", startDate.toISOString());

  // Bucket by Monday-anchored week
  const buckets = new Map<string, WeeklyEarningsPoint>();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * 86400_000);
    const monday = mondayOf(d);
    const key = monday.toISOString().slice(0, 10);
    buckets.set(key, { weekStart: key, amount: 0, hours: 0, sessions: 0 });
  }

  for (const row of data ?? []) {
    const d = new Date(row.scheduled_start as string);
    const monday = mondayOf(d);
    const key = monday.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.amount   += Number(row.payout_amount ?? 0);
    bucket.hours    += Number(row.tutor_hours   ?? 0);
    bucket.sessions += 1;
  }

  return [...buckets.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// ──────────────────────────────────────────────────────────
// Per-student session counts — drives the "(3)" suffix
// next to recurring students in the earnings/payouts tables.
// Counts every non-cancelled booking the student has had with
// THIS tutor (so 3 for a student who's been in 3 sessions,
// regardless of 1:1 vs group).
// ──────────────────────────────────────────────────────────
export async function fetchTutorStudentSessionCounts(
  tutorUserId: string,
): Promise<Map<string, number>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select("student_id")
    .eq("tutor_id", tutorUserId)
    .neq("status", "cancelled");

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const id = row.student_id as string | null;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function mondayOf(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay() || 7;  // Sunday=0 → 7
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - (day - 1));
  return result;
}

/** Most recent payout requests for a tutor — read-only summary
 *  rows for the dashboard's bottom section. */
export async function fetchTutorPayoutRequests(
  tutorUserId: string,
  limit = 5
): Promise<TutorPayoutRequestSummary[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("payout_requests")
    .select(`
      id, total_amount, total_hours, net_amount, payout_method,
      status, requested_at, approved_at, paid_at, cancelled_at, booking_count
    `)
    .eq("tutor_user_id", tutorUserId)
    .order("requested_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id:             row.id as string,
    total_amount:   Number(row.total_amount as number | string) || 0,
    total_hours:    Number(row.total_hours  as number | string) || 0,
    net_amount:     row.net_amount != null ? Number(row.net_amount as number | string) : null,
    payout_method:  (row.payout_method  as string | null) ?? null,
    status:         row.status as string,
    requested_at:   row.requested_at as string,
    approved_at:    (row.approved_at  as string | null) ?? null,
    paid_at:        (row.paid_at      as string | null) ?? null,
    cancelled_at:   (row.cancelled_at as string | null) ?? null,
    booking_count:  (row.booking_count as number | null) ?? null,
  }));
}
