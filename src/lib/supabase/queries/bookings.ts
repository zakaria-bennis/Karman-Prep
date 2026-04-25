// ============================================================
// Supabase queries — bookings + booking-flow helpers.
//
// All inserts/updates use the service-role client. Read paths
// also use service-role here because the API routes do their
// own auth gating before calling these helpers.
// ============================================================

import { createAdminClient } from "@/lib/supabase/server";

/** The four delivery tiers (from `bookings.plan_tier` CHECK). */
export type BookingPlanTier = "group" | "small_group" | "private" | "elite";

/** Booking state machine. */
export type BookingStatus = "scheduled" | "completed" | "cancelled" | "no_show";

/** Subscription status values we treat as currently-paying. */
const ACTIVE_STATUSES = ["active", "trialing"] as const;

/** Plain-shape mirror of the bookings row. Matches migration 009. */
export interface BookingRow {
  id: string;
  student_id: string;
  tutor_id: string;
  plan_tier: BookingPlanTier;
  cal_booking_uid: string | null;
  cal_event_type_id: string | null;
  zoom_meeting_id: string | null;
  zoom_join_url: string | null;
  zoom_start_url: string | null;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  status: BookingStatus;
  cancelled_at: string | null;
  cancelled_within_window: boolean | null;
  credit_forfeited: boolean;
  reschedule_count: number;
  rescheduled_from: string | null;
  confirmation_email_sent: boolean;
  cancellation_email_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActiveSubscription {
  tier: BookingPlanTier;
  status: string;
}

// ─────────────────────────────────────────────────────────────
// Lookups
// ─────────────────────────────────────────────────────────────

/** Resolve a Clerk user id (text) to a Supabase users.id (UUID).
 *  Returns null if the Clerk user has never been synced. */
export async function getUserUuidByClerkId(clerkId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}

/** Most-recent active or trialing subscription for a Clerk user.
 *  Subscriptions.user_id stores the Clerk text id directly. */
export async function getActiveSubscription(
  clerkId: string
): Promise<ActiveSubscription | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", clerkId)
    .in("status", ACTIVE_STATUSES as unknown as string[])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ActiveSubscription | null) ?? null;
}

export async function findBookingById(id: string): Promise<BookingRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as BookingRow | null) ?? null;
}

export async function findBookingByCalUid(uid: string): Promise<BookingRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("cal_booking_uid", uid)
    .maybeSingle();
  if (error) throw error;
  return (data as BookingRow | null) ?? null;
}

/** Next scheduled session for a student. Used by UpcomingSession.tsx. */
export async function getUpcomingBookingForStudent(
  studentUuid: string
): Promise<BookingRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("student_id", studentUuid)
    .eq("status", "scheduled")
    .gte("scheduled_start", new Date().toISOString())
    .order("scheduled_start", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as BookingRow | null) ?? null;
}

/** Sessions that count against an Elite student's 8-per-month limit:
 *  every booking that's not cancelled, plus cancellations that
 *  forfeited a credit. Reset boundary is the start of the calendar
 *  month in the server's UTC clock. */
export async function countEliteSessionsThisMonth(studentUuid: string): Promise<number> {
  const supabase = createAdminClient();
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentUuid)
    .eq("plan_tier", "elite")
    .gte("scheduled_start", startOfMonth.toISOString())
    .or("status.neq.cancelled,credit_forfeited.eq.true");
  if (error) throw error;
  return count ?? 0;
}

// ─────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────

export interface InsertBookingInput {
  student_id: string;
  tutor_id: string;
  plan_tier: BookingPlanTier;
  cal_booking_uid: string | null;
  cal_event_type_id: string | number | null;
  zoom_meeting_id: string | null;
  zoom_join_url: string | null;
  zoom_start_url: string | null;
  scheduled_start: string;
  scheduled_end: string;
}

export async function insertBooking(input: InsertBookingInput): Promise<BookingRow> {
  const supabase = createAdminClient();
  const row = {
    ...input,
    cal_event_type_id:
      input.cal_event_type_id != null ? String(input.cal_event_type_id) : null,
  };
  const { data, error } = await supabase
    .from("bookings")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as BookingRow;
}

export interface UpdateBookingFields {
  status?: BookingStatus;
  cancelled_at?: string | null;
  cancelled_within_window?: boolean | null;
  credit_forfeited?: boolean;
  reschedule_count?: number;
  rescheduled_from?: string | null;
  scheduled_start?: string;
  scheduled_end?: string;
  zoom_join_url?: string | null;
  zoom_meeting_id?: string | null;
  zoom_start_url?: string | null;
  cal_booking_uid?: string | null;
  confirmation_email_sent?: boolean;
  cancellation_email_sent?: boolean;
}

export async function updateBooking(
  id: string,
  fields: UpdateBookingFields
): Promise<BookingRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as BookingRow;
}

// ─────────────────────────────────────────────────────────────
// Policy helpers
// ─────────────────────────────────────────────────────────────

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/** True if `scheduledStart` is less than 24 hours from now. */
export function isWithinCancellationWindow(scheduledStart: string | Date): boolean {
  const ts = typeof scheduledStart === "string" ? new Date(scheduledStart) : scheduledStart;
  return ts.getTime() - Date.now() < TWENTY_FOUR_HOURS_MS;
}

/** Per locked tier policy: only Private + Elite have an individual
 *  session credit at stake, so only they forfeit on within-window
 *  cancel/reschedule. Group + small_group never forfeit. */
export function shouldForfeitCredit(
  tier: BookingPlanTier,
  withinWindow: boolean
): boolean {
  if (!withinWindow) return false;
  return tier === "private" || tier === "elite";
}

/** Tiers allowed to self-book through the API. Group + small_group
 *  bookings come from the admin cohort-push flow (P8). */
export function canSelfBook(tier: BookingPlanTier): boolean {
  return tier === "private" || tier === "elite";
}
