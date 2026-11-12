// ============================================================
// Reads the raw rows for /admin/revenue from Supabase: what the
// Stripe webhook writes (subscriptions, plan_grants purchases,
// refunds), plus bookings, schools, the Free count and the MRR
// snapshots. Server only (service-role client).
//
// Not in Supabase today, so null here: whether a Cohort seat was
// paid in full or on the deposit plan (see the page's setup note).
// ============================================================

import "server-only";
import { untypedAdmin } from "@/lib/school/db";
import { createAdminClient } from "@/lib/supabase/server";
import type { RawPurchase, RawRefund, RawSub } from "./_ledger";
import type { RawBooking, RawSchool, RevenueInput } from "./_metrics";

const DAY = 86_400_000;

type UserRow = {
  id: string;
  clerk_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

const fullName = (u: UserRow | undefined) =>
  u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email : null;

export async function loadRevenueInput(now: number): Promise<RevenueInput> {
  const db = createAdminClient();
  // schools and school_seats are not in the generated types yet.
  const schoolDb = untypedAdmin();
  const nowIso = new Date(now).toISOString();
  const since = new Date(now - 400 * DAY).toISOString();

  const [subsRes, grantsRes, refundsRes, bookingsRes, snapsRes, schoolsRes, seatsRes, studentsRes] =
    await Promise.all([
      db
        .from("subscriptions")
        .select("user_id, plan_id, billing_term, status, created_at, canceled_at, trial_end"),
      db
        .from("plan_grants")
        .select("user_id, plan_id, source, created_at, expires_at")
        .is("revoked_at", null),
      db.from("refunds").select("amount_cents, issued_at, reason"),
      db
        .from("bookings")
        .select("plan_tier, tutor_id, student_id, duration_minutes, scheduled_start, status")
        .gte("scheduled_start", since)
        .in("status", ["scheduled", "completed"]),
      db
        .from("revenue_snapshots")
        .select("captured_at, mrr_cents")
        .order("captured_at", { ascending: false })
        .limit(400),
      schoolDb.from("schools").select("id, name, free_until, billing_status"),
      schoolDb.from("school_seats").select("school_id").is("removed_at", null),
      db.from("users").select("clerk_id").eq("role", "student"),
    ]);

  const subRows = (subsRes.data ?? []) as Array<{
    user_id: string;
    plan_id: string;
    billing_term: string;
    status: string;
    created_at: string;
    canceled_at: string | null;
    trial_end: string | null;
  }>;
  const grants = (grantsRes.data ?? []) as Array<{
    user_id: string;
    plan_id: string;
    source: string;
    created_at: string;
    expires_at: string | null;
  }>;
  const bookingRows = (bookingsRes.data ?? []) as Array<{
    plan_tier: string;
    tutor_id: string;
    student_id: string;
    duration_minutes: number | null;
    scheduled_start: string;
  }>;

  // Names: past-due subscribers (for the dunning list), tutors and booked students.
  const pastDue = subRows.filter((s) => s.status === "past_due").map((s) => s.user_id);
  const userIds = [...new Set(bookingRows.flatMap((b) => [b.tutor_id, b.student_id]))];
  const [byClerkRes, byIdRes] = await Promise.all([
    pastDue.length
      ? db
          .from("users")
          .select("id, clerk_id, first_name, last_name, email")
          .in("clerk_id", pastDue)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? db.from("users").select("id, clerk_id, first_name, last_name, email").in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);
  const byClerk = new Map(((byClerkRes.data ?? []) as UserRow[]).map((u) => [u.clerk_id, u]));
  const byId = new Map(((byIdRes.data ?? []) as UserRow[]).map((u) => [u.id, u]));

  const subs: RawSub[] = subRows.map((s) => ({
    userId: s.user_id,
    planId: s.plan_id,
    term: s.billing_term,
    status: s.status,
    createdAt: s.created_at,
    canceledAt: s.canceled_at,
    trialEnd: s.trial_end,
    name: fullName(byClerk.get(s.user_id)),
    email: byClerk.get(s.user_id)?.email ?? null,
  }));

  const purchases: RawPurchase[] = grants
    .filter((g) => g.source === "purchase")
    .map((g) => ({
      userId: g.user_id,
      planId: g.plan_id,
      createdAt: g.created_at,
      expiresAt: g.expires_at,
      payment: null,
    }));

  const refunds: RawRefund[] = (
    (refundsRes.data ?? []) as Array<{
      amount_cents: number;
      issued_at: string;
      reason: string | null;
    }>
  ).map((r) => ({ amountCents: r.amount_cents ?? 0, issuedAt: r.issued_at, reason: r.reason }));

  const bookings: RawBooking[] = bookingRows.map((b) => ({
    tutorId: b.tutor_id,
    tutorName: fullName(byId.get(b.tutor_id)) ?? "Tutor",
    studentClerkId: byId.get(b.student_id)?.clerk_id ?? null,
    minutes: b.duration_minutes ?? 60,
    start: b.scheduled_start,
    isPrivate: b.plan_tier === "private" || b.plan_tier === "elite",
  }));

  const seatsBySchool = new Map<string, number>();
  for (const s of (seatsRes.data ?? []) as Array<{ school_id: string }>) {
    seatsBySchool.set(s.school_id, (seatsBySchool.get(s.school_id) ?? 0) + 1);
  }
  const schools: RawSchool[] = (
    (schoolsRes.data ?? []) as Array<{
      id: string;
      name: string;
      free_until: string;
      billing_status: string;
    }>
  )
    .filter((s) => s.billing_status !== "canceled")
    .map((s) => ({
      name: s.name,
      freeUntil: s.free_until,
      billingStatus: s.billing_status,
      seats: seatsBySchool.get(s.id) ?? 0,
    }));

  // Free: students with no live subscription and no open grant of any kind.
  const open = (g: { expires_at: string | null }) => g.expires_at === null || g.expires_at > nowIso;
  const onAPlan = new Set<string>([
    ...subRows
      .filter((s) => ["active", "trialing", "past_due"].includes(s.status))
      .map((s) => s.user_id),
    ...grants.filter(open).map((g) => g.user_id),
  ]);
  const students = (studentsRes.data ?? []) as Array<{ clerk_id: string }>;
  const freeStudents = students.filter((s) => !onAPlan.has(s.clerk_id)).length;
  const sponsoredStudents = new Set(
    grants.filter((g) => g.source === "tutor-affiliate" && open(g)).map((g) => g.user_id)
  ).size;

  const snapshots = ((snapsRes.data ?? []) as Array<{ captured_at: string; mrr_cents: number }>)
    .map((s) => ({ capturedAt: s.captured_at, mrr: Math.round((s.mrr_cents ?? 0) / 100) }))
    .reverse();

  return {
    subs,
    purchases,
    refunds,
    bookings,
    schools,
    freeStudents,
    sponsoredStudents,
    snapshots,
  };
}
