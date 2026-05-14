"use server";

// ============================================================
// Server actions for the status-draft page.
//
//  · actionSaveDraft           — write tutor edits back to
//                                bookings.status_draft
//  · actionRegenerateDraft     — re-run OpenAI on the stored
//                                transcript (overwrites the draft)
//  · actionSetManualTranscript — paste-in fallback when there's
//                                no Fireflies (or it failed). Saves
//                                transcript + auto-generates draft.
//  · actionSendRecap           — STUB until Phase 5 lands. Returns
//                                a clear "not yet implemented" so the
//                                button on the page wires up cleanly.
//
// Auth model: Clerk session → users.id → must equal bookings.tutor_id
// OR users.role='admin'.
// ============================================================

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  generateStatusDraft,
  type StatusDraft,
} from "@/lib/integrations/openai/generate-status-draft";
import { sendRecapEmail } from "@/lib/integrations/resend/recap-email";
import { computePayout } from "@/lib/payouts/compute-amount";

interface BookingForAuth {
  id: string;
  tutor_id: string;
  student_id: string;
  plan_tier: string;
  duration_minutes: number | null;
  transcript: string | null;
  scheduled_start: string;
  recap_email_sent: boolean | null;
  tutor: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    email_signature: string | null;
    hourly_rate: number | null;
  } | null;
  student: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

/** Fetch booking + verify caller is the tutor or an admin.
 *  Returns the booking on success, throws on auth failure. */
async function authForBooking(bookingId: string): Promise<{
  booking: BookingForAuth;
  callerUserId: string;
  isAdmin: boolean;
}> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("not_signed_in");

  const supabase = createAdminClient();
  const { data: caller } = await supabase
    .from("users")
    .select("id, role")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!caller) throw new Error("user_not_found");

  const role = (caller.role as string) ?? null;
  const isAdmin = role === "admin";
  if (role !== "tutor" && !isAdmin) throw new Error("forbidden");

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      `
      id, tutor_id, student_id, plan_tier, duration_minutes, transcript, scheduled_start, recap_email_sent,
      tutor:users!bookings_tutor_id_fkey (first_name, last_name, email, email_signature, hourly_rate),
      student:users!bookings_student_id_fkey (first_name, last_name, email)
    `
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) throw new Error("booking_not_found");

  // Supabase joined relations come back as either single objects or arrays
  // depending on FK shape — normalize.
  const arr = (v: unknown) => (Array.isArray(v) ? (v[0] ?? null) : v);
  const normalized: BookingForAuth = {
    id: booking.id as string,
    tutor_id: booking.tutor_id as string,
    student_id: booking.student_id as string,
    plan_tier: booking.plan_tier as string,
    duration_minutes: (booking.duration_minutes as number | null) ?? null,
    transcript: (booking.transcript as string | null) ?? null,
    scheduled_start: booking.scheduled_start as string,
    recap_email_sent: (booking.recap_email_sent as boolean | null) ?? null,
    tutor: arr(booking.tutor) as BookingForAuth["tutor"],
    student: arr(booking.student) as BookingForAuth["student"],
  };

  if (!isAdmin && normalized.tutor_id !== caller.id) throw new Error("forbidden");

  return { booking: normalized, callerUserId: caller.id as string, isAdmin };
}

// ──────────────────────────────────────────────────────────
// Save edits to the draft. Does NOT send anything.
// ──────────────────────────────────────────────────────────
export async function actionSaveDraft(
  bookingId: string,
  draft: StatusDraft
): Promise<{ ok: true; savedAt: string }> {
  await authForBooking(bookingId);
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("bookings")
    .update({
      status_draft: draft,
      status_draft_edited_at: now,
    })
    .eq("id", bookingId);
  if (error) throw new Error(`save_failed: ${error.message}`);

  revalidatePath(`/tutor/sessions/${bookingId}/status-draft`);
  return { ok: true, savedAt: now };
}

// ──────────────────────────────────────────────────────────
// Re-run OpenAI on the stored transcript.
// Useful when the first draft was off and the tutor wants
// to start fresh rather than edit by hand.
// ──────────────────────────────────────────────────────────
export async function actionRegenerateDraft(
  bookingId: string
): Promise<{ ok: true; draft: StatusDraft }> {
  const { booking } = await authForBooking(bookingId);
  if (!booking.transcript) throw new Error("no_transcript");

  const tutorName = displayName(booking.tutor) || "Tutor";
  const ctxExtra = await sessionContextFromBooking(bookingId, booking);

  const draft = await generateStatusDraft(booking.transcript, {
    sessionType: ctxExtra.sessionType,
    studentName:
      ctxExtra.sessionType === "individual" ? displayName(booking.student) || "Student" : undefined,
    cohortName: ctxExtra.cohortName,
    enrolledCount: ctxExtra.enrolledCount,
    tutorName,
    sessionDate: formatSessionDate(booking.scheduled_start),
    sessionDurationMinutes: booking.duration_minutes ?? 60,
  });

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("bookings")
    .update({
      status_draft: draft,
      status_draft_created_at: now,
      status_draft_edited_at: null,
    })
    .eq("id", bookingId);
  if (error) throw new Error(`regenerate_save_failed: ${error.message}`);

  revalidatePath(`/tutor/sessions/${bookingId}/status-draft`);
  return { ok: true, draft };
}

// ──────────────────────────────────────────────────────────
// Manual-paste fallback for when Fireflies isn't wired up
// or its transcript was lost. Tutor pastes the raw transcript;
// we save it AND auto-generate the first draft.
// ──────────────────────────────────────────────────────────
export async function actionSetManualTranscript(
  bookingId: string,
  transcript: string
): Promise<{ ok: true; draft: StatusDraft | null; draftError: string | null }> {
  const { booking } = await authForBooking(bookingId);
  if (!transcript.trim()) throw new Error("empty_transcript");

  const supabase = createAdminClient();

  // Persist transcript first so we never lose it.
  await supabase
    .from("bookings")
    .update({
      transcript,
      transcript_source: "manual",
      transcript_received_at: new Date().toISOString(),
      tutor_hours: (booking.duration_minutes ?? 60) / 60,
    })
    .eq("id", bookingId);

  // Generate draft. If OpenAI fails, save the error so the tutor
  // can still write the draft by hand without losing the transcript.
  let draft: StatusDraft | null = null;
  let draftError: string | null = null;
  try {
    const ctxExtra = await sessionContextFromBooking(bookingId, booking);
    draft = await generateStatusDraft(transcript, {
      sessionType: ctxExtra.sessionType,
      studentName:
        ctxExtra.sessionType === "individual"
          ? displayName(booking.student) || "Student"
          : undefined,
      cohortName: ctxExtra.cohortName,
      enrolledCount: ctxExtra.enrolledCount,
      tutorName: displayName(booking.tutor) || "Tutor",
      sessionDate: formatSessionDate(booking.scheduled_start),
      sessionDurationMinutes: booking.duration_minutes ?? 60,
    });
  } catch (err) {
    draftError = err instanceof Error ? err.message : String(err);
  }

  await supabase
    .from("bookings")
    .update({
      status_draft: draft ?? { error: draftError },
      status_draft_created_at: new Date().toISOString(),
      status_draft_edited_at: null,
    })
    .eq("id", bookingId);

  revalidatePath(`/tutor/sessions/${bookingId}/status-draft`);
  return { ok: true, draft, draftError };
}

// ──────────────────────────────────────────────────────────
// actionSendRecap — Phase 5+: per-session delivery + payout.
//
// Routing logic by session type:
//
//  · INDIVIDUAL (1:1 — private/elite): one booking = one session.
//    Email goes to the student on this booking + their parents.
//    Subject: "Session recap — {studentName} — {date}".
//
//  · GROUP (small_group/seminar): one session = N bookings.
//    Whichever booking the tutor opens, the recap is sent ONCE
//    to all enrolled students + each of their parents in a single
//    email. No student names in the body (handled in OpenAI prompt
//    + email template). Subject: "Class recap — {cohortName} — {date}".
//    Subsequent open-and-send attempts for other bookings in the
//    same session return 'already_sent'.
//
// Idempotency is at the SESSION level (sessions.recap_email_sent).
// ──────────────────────────────────────────────────────────
const ONE_ON_ONE_TIERS = new Set(["private", "elite"]);

interface BookingMeta {
  id: string;
  student_user_id: string;
  student_email: string | null;
}

/** For a session, return: all bookings + every linked email
 *  (each booking's student + each of that student's parents). */
async function gatherRecipientsForSession(
  supabase: ReturnType<typeof createAdminClient>,
  sessionId: string
): Promise<{ bookings: BookingMeta[]; emails: string[] }> {
  const { data: rows } = await supabase
    .from("bookings")
    .select("id, student_id, student:users!bookings_student_id_fkey(id, email)")
    .eq("session_id", sessionId);
  const arr = (v: unknown) => (Array.isArray(v) ? (v[0] ?? null) : v);

  const bookings: BookingMeta[] = [];
  const studentIds: string[] = [];
  for (const row of rows ?? []) {
    const stu = arr(row.student) as { id?: string; email?: string | null } | null;
    if (!stu?.id) continue;
    bookings.push({
      id: row.id as string,
      student_user_id: row.student_id as string,
      student_email: stu.email ?? null,
    });
    studentIds.push(row.student_id as string);
  }

  const emailSet = new Set<string>();
  for (const b of bookings) if (b.student_email) emailSet.add(b.student_email);

  if (studentIds.length > 0) {
    const { data: links } = await supabase
      .from("parent_student_links")
      .select("parent:users!parent_student_links_parent_user_id_fkey(email)")
      .in("student_user_id", studentIds);
    for (const l of links ?? []) {
      const p = arr(l.parent) as { email?: string | null } | null;
      if (p?.email) emailSet.add(p.email);
    }
  }
  return { bookings, emails: [...emailSet] };
}

export async function actionSendRecap(
  bookingId: string,
  draft: StatusDraft,
  recipientIds: string[]
): Promise<{
  ok: true;
  payoutAmount: number;
  recipientCount: number;
  messageId: string;
}> {
  const { booking } = await authForBooking(bookingId);
  const supabase = createAdminClient();

  if (!booking.tutor) throw new Error("missing_tutor_data");
  if (!booking.student) throw new Error("missing_student_data");

  // ── Find the linked session ───────────────────────────
  const { data: bookingRow } = await supabase
    .from("bookings")
    .select("session_id")
    .eq("id", bookingId)
    .maybeSingle();
  const sessionId = (bookingRow?.session_id as string | null) ?? null;
  if (!sessionId) {
    throw new Error("missing_session_link: backfill migration may not have run for this booking");
  }

  // ── Idempotency at the SESSION level ──────────────────
  const { data: sessionRow } = await supabase
    .from("sessions")
    .select("id, recap_email_sent, cohort_id, cohort:cohorts(name, tier)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!sessionRow) throw new Error("session_not_found");
  if (sessionRow.recap_email_sent) throw new Error("already_sent");

  const arr = (v: unknown) => (Array.isArray(v) ? (v[0] ?? null) : v);
  const cohort = arr(sessionRow.cohort) as { name?: string; tier?: string } | null;
  const isGroup = !!sessionRow.cohort_id || !ONE_ON_ONE_TIERS.has(booking.plan_tier);

  // ── Resolve recipients ────────────────────────────────
  let emails: string[];
  let allBookings: BookingMeta[];

  if (isGroup) {
    // GROUP: ignore client recipientIds; collect ALL enrolled students
    // + every parent across the session. Single email to all.
    const gathered = await gatherRecipientsForSession(supabase, sessionId);
    allBookings = gathered.bookings;
    emails = gathered.emails;
  } else {
    // INDIVIDUAL: respect client recipientIds (student + parent toggles)
    allBookings = [
      {
        id: bookingId,
        student_user_id: booking.student_id,
        student_email: booking.student.email ?? null,
      },
    ];
    const list: string[] = [];
    const parentIds: string[] = [];
    for (const id of recipientIds) {
      if (id === `student:${bookingId}` && booking.student.email) {
        list.push(booking.student.email);
      } else if (id.startsWith("parent:")) {
        parentIds.push(id.slice("parent:".length));
      }
    }
    if (parentIds.length > 0) {
      const { data: parents } = await supabase.from("users").select("email").in("id", parentIds);
      for (const p of parents ?? []) if (p.email) list.push(p.email);
    }
    emails = [...new Set(list)];
  }

  if (emails.length === 0) throw new Error("no_resolved_emails");

  const tutorName = displayName(booking.tutor) || "Tutor";
  const sessionDate = formatSessionDate(booking.scheduled_start);
  const studentName = displayName(booking.student) || "Student";
  const cohortName = cohort?.name ?? "Class session";

  const subject = isGroup
    ? `Class recap — ${cohortName} — ${shortDate(booking.scheduled_start)}`
    : `Session recap — ${studentName} — ${shortDate(booking.scheduled_start)}`;

  // ── Send (one email, one to: list) ────────────────────
  const sendResult = await sendRecapEmail({
    to: emails,
    tutorEmail: booking.tutor.email ?? null,
    subject,
    props: {
      sessionType: isGroup ? "group" : "individual",
      studentName: isGroup ? undefined : studentName,
      cohortName: isGroup ? cohortName : undefined,
      sessionDate,
      tutorName,
      signatureOverride: booking.tutor.email_signature ?? null,
      fields: draft,
    },
  });

  // ── Payout (per-session, $35/hr × paid_hours) ─────────
  const payout = computePayout(booking.duration_minutes ?? 60, booking.tutor.hourly_rate);
  const now = new Date().toISOString();

  // ── Update SESSION (canonical state) ──────────────────
  const { error: sessUpdErr } = await supabase
    .from("sessions")
    .update({
      status_draft: draft,
      status_draft_edited_at: now,
      recap_email_sent: true,
      recap_sent_at: now,
      payout_status: "pending",
      payout_amount: payout.payoutAmount,
      tutor_hours: payout.paidHours,
    })
    .eq("id", sessionId);
  if (sessUpdErr) {
    console.error(
      `[send-recap] CRITICAL: email sent (id=${sendResult.messageId}) but session update failed:`,
      sessUpdErr.message
    );
    throw new Error(`session_update_failed_after_send: ${sessUpdErr.message}`);
  }

  // ── Mirror to all bookings (for per-student log) ──────
  await supabase
    .from("bookings")
    .update({
      status_draft: draft,
      status_draft_edited_at: now,
      recap_email_sent: true,
      recap_sent_at: now,
      recap_resend_message_id: sendResult.messageId,
    })
    .in(
      "id",
      allBookings.map((b) => b.id)
    );

  // ── Audit log: one row per recipient student ──────────
  for (const b of allBookings) {
    await supabase.from("status_email_log").insert({
      booking_id: b.id,
      tutor_user_id: booking.tutor_id,
      student_user_id: b.student_user_id,
      recipient_emails: emails,
      channels_used: ["email"],
      status: "sent",
      resend_message_id: sendResult.messageId,
    });
  }

  // 9. Refresh materialized view (best-effort; not fatal if it fails)
  try {
    await supabase.rpc("refresh_tutor_earnings_summary");
  } catch (err) {
    console.warn("[send-recap] earnings refresh failed (non-fatal):", err);
  }

  revalidatePath(`/tutor/sessions/${bookingId}/status-draft`);
  revalidatePath("/tutor/schedule");

  return {
    ok: true,
    payoutAmount: payout.payoutAmount,
    recipientCount: emails.length,
    messageId: sendResult.messageId,
  };
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Determine if this booking is part of a 1:1 or a group session,
 *  and pull cohort name + enrollment count for prompt context. */
async function sessionContextFromBooking(
  bookingId: string,
  booking: BookingForAuth
): Promise<{
  sessionType: "individual" | "group";
  cohortName?: string;
  enrolledCount?: number;
}> {
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("bookings")
    .select("session_id, cohort_id, cohort:cohorts(name, tier)")
    .eq("id", bookingId)
    .maybeSingle();
  const arr = (v: unknown) => (Array.isArray(v) ? (v[0] ?? null) : v);
  const cohort = row ? (arr(row.cohort) as { name?: string; tier?: string } | null) : null;
  const isGroup =
    !!row?.cohort_id || (booking.plan_tier !== "private" && booking.plan_tier !== "elite");

  if (!isGroup) return { sessionType: "individual" };

  // Count enrolled students for the same session.
  let enrolledCount: number | undefined;
  if (row?.session_id) {
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("session_id", row.session_id);
    enrolledCount = count ?? undefined;
  }
  return {
    sessionType: "group",
    cohortName: cohort?.name,
    enrolledCount,
  };
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function displayName(u: { first_name: string | null; last_name: string | null } | null): string {
  if (!u) return "";
  return [u.first_name, u.last_name].filter(Boolean).join(" ");
}

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}
