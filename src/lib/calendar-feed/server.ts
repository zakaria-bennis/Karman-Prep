// ============================================================
// Calendar feed: secret links and the data behind them.
//
// A link belongs to one Karman user. A student's feed lists their own
// sessions, classes and due dates; a parent's feed lists the same for
// every linked student. Nothing else is reachable through a token.
// ============================================================

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveCalendarTimeZone } from "@/lib/learn/week-calendar";
import { buildIcsCalendar } from "./ics";
import {
  sortFeedEvents,
  studentFeedEvents,
  type FeedBookingRow,
  type FeedDueRow,
  type StudentFeedRows,
} from "./events";

/** 32 random bytes as base64url: 43 characters, no padding. */
export const feedTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/** How far back and ahead the feed reaches. */
const PAST_DAYS = 60;
const FUTURE_DAYS = 400;
const MAX_ROWS_PER_SOURCE = 500;

export function generateFeedToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Returns the user's link token, creating one on first use. */
export async function getOrCreateFeedToken(userId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data: existing, error } = await supabase
    .from("calendar_feed_tokens")
    .select("token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (existing?.token) return existing.token;

  // ignoreDuplicates keeps a concurrent first visit from replacing the other's token.
  const { error: insertError } = await supabase
    .from("calendar_feed_tokens")
    .upsert(
      { user_id: userId, token: generateFeedToken() },
      { onConflict: "user_id", ignoreDuplicates: true }
    );
  if (insertError) throw insertError;
  const { data: saved, error: readError } = await supabase
    .from("calendar_feed_tokens")
    .select("token")
    .eq("user_id", userId)
    .single();
  if (readError) throw readError;
  return saved.token;
}

/** Replaces the user's token; every calendar subscribed to the old link stops updating. */
export async function resetFeedToken(userId: string): Promise<string> {
  const supabase = createAdminClient();
  const token = generateFeedToken();
  const { error } = await supabase
    .from("calendar_feed_tokens")
    .upsert(
      { user_id: userId, token, created_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) throw error;
  return token;
}

interface FeedOwner {
  id: string;
  role: string;
}

interface StudentProfile {
  id: string;
  clerk_id: string;
  first_name: string | null;
  time_zone: string | null;
}

function firstName(join: unknown): string | null {
  const row = (Array.isArray(join) ? join[0] : join) as { first_name?: string | null } | null;
  return row?.first_name?.trim() || null;
}

async function loadStudentRows(
  supabase: ReturnType<typeof createAdminClient>,
  student: StudentProfile,
  studentLabel: string | null,
  now: Date
): Promise<StudentFeedRows> {
  const from = new Date(now.getTime() - PAST_DAYS * 86_400_000).toISOString();
  const to = new Date(now.getTime() + FUTURE_DAYS * 86_400_000).toISOString();

  const bookingsQuery = supabase
    .from("bookings")
    .select(
      "id, plan_tier, scheduled_start, scheduled_end, zoom_join_url, status, tutor:users!bookings_tutor_id_fkey ( first_name )"
    )
    .eq("student_id", student.id)
    .in("status", ["scheduled", "completed"])
    .gte("scheduled_start", from)
    .lte("scheduled_start", to)
    .order("scheduled_start", { ascending: true })
    .limit(MAX_ROWS_PER_SOURCE);

  const membershipQuery = supabase
    .from("cohort_members")
    .select("cohort_id, cohort:cohorts ( name )")
    .eq("user_id", student.id)
    .is("left_at", null);

  // catalog_assignments is not in the generated Database types yet (see
  // src/lib/catalog-assignments/store.ts), so read it through an untyped client.
  const practiceQuery = (supabase as unknown as SupabaseClient)
    .from("catalog_assignments")
    .select("id, title, catalog_skill_id, due_at")
    .eq("student_clerk_id", student.clerk_id)
    .eq("status", "active")
    .not("due_at", "is", null)
    .gte("due_at", from)
    .lte("due_at", to)
    .limit(MAX_ROWS_PER_SOURCE);

  const [bookings, memberships, practice] = await Promise.all([
    bookingsQuery,
    membershipQuery,
    practiceQuery,
  ]);
  if (bookings.error) throw bookings.error;
  if (memberships.error) throw memberships.error;
  if (practice.error) throw practice.error;

  const cohortNames = new Map<string, string>();
  for (const row of memberships.data ?? []) {
    const cohort = (Array.isArray(row.cohort) ? row.cohort[0] : row.cohort) as {
      name?: string;
    } | null;
    cohortNames.set(row.cohort_id, cohort?.name ?? "Your class");
  }

  let homework: FeedDueRow[] = [];
  if (cohortNames.size > 0) {
    const { data, error } = await supabase
      .from("cohort_homework")
      .select("id, cohort_id, title, body, due_at")
      .in("cohort_id", [...cohortNames.keys()])
      .not("due_at", "is", null)
      .gte("due_at", from)
      .lte("due_at", to)
      .limit(MAX_ROWS_PER_SOURCE);
    if (error) throw error;
    homework = (data ?? []).flatMap((row) =>
      row.due_at
        ? [
            {
              id: row.id,
              title: row.title,
              body: row.body,
              due_at: row.due_at,
              context: cohortNames.get(row.cohort_id) ?? null,
              href: null,
            },
          ]
        : []
    );
  }

  const practiceRows = (practice.data ?? []) as {
    id: string;
    title: string;
    catalog_skill_id: string;
    due_at: string;
  }[];

  return {
    studentId: student.id,
    studentLabel,
    timeZone: resolveCalendarTimeZone(student.time_zone),
    bookings: (bookings.data ?? []).map(
      (row): FeedBookingRow => ({
        id: row.id,
        plan_tier: row.plan_tier,
        scheduled_start: row.scheduled_start,
        scheduled_end: row.scheduled_end,
        zoom_join_url: row.zoom_join_url,
        tutor_name: firstName(row.tutor),
      })
    ),
    homework,
    practice: practiceRows.map((row) => ({
      id: row.id,
      title: row.title,
      body: null,
      due_at: row.due_at,
      context: null,
      href: `/learn/practice/${encodeURIComponent(row.catalog_skill_id)}?assignment=${encodeURIComponent(row.id)}`,
    })),
  };
}

async function studentsForOwner(
  supabase: ReturnType<typeof createAdminClient>,
  owner: FeedOwner
): Promise<StudentProfile[]> {
  const columns = "id, clerk_id, first_name, time_zone";
  if (owner.role === "student") {
    const { data, error } = await supabase.from("users").select(columns).eq("id", owner.id);
    if (error) throw error;
    return (data ?? []) as StudentProfile[];
  }
  if (owner.role === "parent") {
    const { data: links, error } = await supabase
      .from("parent_student_links")
      .select("student_user_id")
      .eq("parent_user_id", owner.id);
    if (error) throw error;
    const ids = (links ?? []).map((link) => link.student_user_id);
    if (!ids.length) return [];
    const { data, error: usersError } = await supabase
      .from("users")
      .select(columns)
      .in("id", ids)
      .eq("role", "student");
    if (usersError) throw usersError;
    return (data ?? []) as StudentProfile[];
  }
  return [];
}

/**
 * Builds the .ics body for a token, or null when the token is unknown or
 * belongs to an account without a calendar (tutors, admins).
 */
export async function buildFeedForToken(
  rawToken: string,
  siteUrl: string,
  now: Date = new Date()
): Promise<string | null> {
  const parsed = feedTokenSchema.safeParse(rawToken);
  if (!parsed.success) return null;
  const supabase = createAdminClient();
  const { data: link, error } = await supabase
    .from("calendar_feed_tokens")
    .select("user_id, owner:users!calendar_feed_tokens_user_id_fkey ( id, role )")
    .eq("token", parsed.data)
    .maybeSingle();
  if (error) throw error;
  const owner = (Array.isArray(link?.owner) ? link.owner[0] : link?.owner) as FeedOwner | null;
  if (!link || !owner || (owner.role !== "student" && owner.role !== "parent")) return null;

  const students = await studentsForOwner(supabase, owner);
  const isParent = owner.role === "parent";
  const perStudent = await Promise.all(
    students.map((student) =>
      loadStudentRows(supabase, student, isParent ? (student.first_name ?? "Student") : null, now)
    )
  );
  const events = sortFeedEvents(perStudent.flatMap((rows) => studentFeedEvents(rows, siteUrl)));
  return buildIcsCalendar({
    name: "Karman",
    description: isParent
      ? "Karman sessions, classes and due dates for your students."
      : "Your Karman sessions, classes and due dates.",
    generatedAt: now,
    events,
  });
}
