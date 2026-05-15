// ============================================================
// POST /api/webhooks/cal — Cal.com webhook handler
//
// Verifies HMAC-SHA256 signature against CAL_WEBHOOK_SECRET, then
// dispatches by triggerEvent. Idempotent — re-deliveries from
// Cal don't double-write or double-email (gated by
// confirmation_email_sent / cancellation_email_sent flags on
// the booking row).
//
// Email is the webhook's responsibility, NOT the API routes —
// this keeps emails consistent regardless of whether the
// cancel/reschedule was triggered from our UI, Cal's native UI,
// or out-of-band tooling.
// ============================================================

import { NextResponse } from "next/server";
import { withWebhookInstrumentation } from "@/lib/observability/webhook";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import {
  findBookingByCalUid,
  isWithinCancellationWindow,
  shouldForfeitCredit,
  updateBooking,
  type BookingRow,
} from "@/lib/supabase/queries/bookings";
import { enqueueFailedEmail, serializeEmailArgs } from "@/lib/integrations/resend/email-queue";
import {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendBookingReschedule,
} from "@/lib/integrations/resend/booking-emails";
import { extractZoomMeetingId } from "@/lib/integrations/zoom/url";
import { consumeTokenForBooking, releaseTokenFromBooking } from "@/lib/supabase/queries/tokens";

// node:crypto + Buffer require Node runtime, not Edge.
export const runtime = "nodejs";

interface CalAttendeePayload {
  email?: string;
  name?: string;
  timeZone?: string;
}

interface CalBookingPayload {
  uid: string;
  type?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  metadata?: Record<string, unknown>;
  location?: string;
  organizer?: { email?: string; name?: string };
  attendees?: CalAttendeePayload[];
  eventTypeId?: number;
  cancellationReason?: string;
  rescheduleReason?: string;
}

interface CalWebhookEvent {
  triggerEvent: string;
  payload: CalBookingPayload;
  createdAt?: string;
}

interface UserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

function fullName(u: UserRow): string {
  const joined = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return joined || u.email || "Karman user";
}

async function loadBookingPeople(booking: BookingRow): Promise<{
  student: UserRow;
  tutor: UserRow;
  parentEmails: string[];
} | null> {
  const supa = createAdminClient();

  const [{ data: student }, { data: tutor }, { data: parentLinks }] = await Promise.all([
    supa
      .from("users")
      .select("id, email, first_name, last_name")
      .eq("id", booking.student_id)
      .maybeSingle(),
    supa
      .from("users")
      .select("id, email, first_name, last_name")
      .eq("id", booking.tutor_id)
      .maybeSingle(),
    supa
      .from("parent_student_links")
      .select("parent_user_id")
      .eq("student_user_id", booking.student_id),
  ]);

  if (!student || !tutor) return null;

  const parentEmails: string[] = [];
  if (parentLinks && parentLinks.length > 0) {
    const parentIds = parentLinks.map((l) => l.parent_user_id);
    const { data: parents } = await supa.from("users").select("email").in("id", parentIds);
    for (const p of parents ?? []) {
      if (p.email) parentEmails.push(p.email);
    }
  }

  return {
    student: student as UserRow,
    tutor: tutor as UserRow,
    parentEmails,
  };
}

function resolveStudentTimeZone(payload: CalBookingPayload, studentEmail: string): string {
  const direct = payload.attendees?.find((a) => a.email === studentEmail)?.timeZone;
  if (direct) return direct;
  const first = payload.attendees?.[0]?.timeZone;
  if (first) return first;
  return "America/New_York";
}

export const POST = withWebhookInstrumentation("cal", async (req: Request) => {
  const secret = process.env.CAL_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[cal-webhook] CAL_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const sig = req.headers.get("x-cal-signature-256");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const raw = await req.text();
  if (!verifySignature(raw, sig, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: CalWebhookEvent;
  try {
    event = JSON.parse(raw) as CalWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const trigger = event.triggerEvent;
  const p = event.payload;
  const uid = p?.uid;
  if (!uid) {
    return NextResponse.json({ error: "Missing booking uid" }, { status: 400 });
  }

  const booking = await findBookingByCalUid(uid);
  if (!booking) {
    // Out-of-band booking (created via Cal native UI, no metadata
    // we can use to attribute it). Acknowledge so Cal doesn't retry.
    console.warn(`[cal-webhook] ${trigger} for unknown booking uid=${uid}`);
    return NextResponse.json({ received: true, note: "unknown booking" });
  }

  const people = await loadBookingPeople(booking);
  if (!people) {
    console.error(
      `[cal-webhook] ${trigger}: missing student or tutor user for booking ${booking.id}`
    );
    return NextResponse.json({ received: true, note: "missing user records" });
  }

  const { student, tutor, parentEmails } = people;
  const tz = resolveStudentTimeZone(p, student.email);
  const studentFirstName = student.first_name || "there";
  const studentFullName = fullName(student);
  const tutorName = fullName(tutor);

  try {
    switch (trigger) {
      case "BOOKING_CREATED": {
        // Refresh zoom_join_url from payload + extract meeting id
        // so the Zoom webhook (P5) can route attendance events.
        const joinUrl = booking.zoom_join_url ?? p.location ?? null;
        const zoomId = booking.zoom_meeting_id ?? extractZoomMeetingId(joinUrl);
        if ((!booking.zoom_join_url && joinUrl) || (!booking.zoom_meeting_id && zoomId)) {
          await updateBooking(booking.id, {
            zoom_join_url: joinUrl,
            zoom_meeting_id: zoomId,
          });
        }
        if (!booking.confirmation_email_sent) {
          const confirmationArgs = {
            uid,
            studentEmail: student.email,
            studentFirstName,
            studentFullName,
            parentEmails,
            tutorName,
            start: new Date(booking.scheduled_start),
            end: new Date(booking.scheduled_end),
            meetingUrl: booking.zoom_join_url ?? p.location ?? null,
            timeZone: tz,
          };
          try {
            await sendBookingConfirmation(confirmationArgs);
            await updateBooking(booking.id, { confirmation_email_sent: true });
          } catch (err) {
            // Resend down? Queue + return 200 so Cal doesn't retry —
            // we own the retry budget now (cron at /api/cron/retry-failed-emails).
            console.error("[cal-webhook] confirmation email failed, queueing:", err);
            await enqueueFailedEmail({
              kind: "booking_confirmation",
              payload: serializeEmailArgs(confirmationArgs),
              dedupeKey: `${uid}:booking_confirmation`,
              bookingId: booking.id,
              error: err,
            });
          }
        }
        break;
      }

      case "BOOKING_CANCELLED": {
        const withinWindow = isWithinCancellationWindow(booking.scheduled_start);
        const forfeit = shouldForfeitCredit(booking.plan_tier, withinWindow);
        if (booking.status !== "cancelled") {
          await updateBooking(booking.id, {
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancelled_within_window: withinWindow,
            credit_forfeited: forfeit,
          });
        }
        // Token resolution — idempotent. Cancel API route may have
        // already done this; that's fine, our update WHERE clauses
        // make this a no-op the second time.
        if (withinWindow && forfeit) {
          await consumeTokenForBooking({
            bookingId: booking.id,
            reason: "forfeited_within_window",
          });
        } else if (!withinWindow) {
          await releaseTokenFromBooking(booking.id);
        }
        if (!booking.cancellation_email_sent) {
          const cancellationArgs = {
            uid,
            studentEmail: student.email,
            studentFirstName,
            studentFullName,
            parentEmails,
            tutorName,
            start: new Date(booking.scheduled_start),
            end: new Date(booking.scheduled_end),
            meetingUrl: booking.zoom_join_url,
            timeZone: tz,
            withinWindow,
            creditForfeited: forfeit,
            planTier: booking.plan_tier,
          };
          try {
            await sendBookingCancellation(cancellationArgs);
            await updateBooking(booking.id, { cancellation_email_sent: true });
          } catch (err) {
            console.error("[cal-webhook] cancellation email failed, queueing:", err);
            await enqueueFailedEmail({
              kind: "booking_cancellation",
              payload: serializeEmailArgs(cancellationArgs),
              dedupeKey: `${uid}:booking_cancellation`,
              bookingId: booking.id,
              error: err,
            });
          }
        }
        break;
      }

      case "BOOKING_RESCHEDULED": {
        const newStart = p.startTime ? new Date(p.startTime) : null;
        const newEnd = p.endTime ? new Date(p.endTime) : null;
        const oldStart = new Date(booking.scheduled_start);

        // Apply new times if Cal's payload differs from what we
        // have. The API route may have already updated; in that
        // case the times match and we skip the email (treat as
        // a redelivery rather than a fresh reschedule).
        const isFreshChange =
          newStart != null &&
          newEnd != null &&
          Math.abs(newStart.getTime() - oldStart.getTime()) > 1000;

        if (isFreshChange && newStart && newEnd) {
          await updateBooking(booking.id, {
            rescheduled_from: booking.scheduled_start,
            scheduled_start: newStart.toISOString(),
            scheduled_end: newEnd.toISOString(),
            zoom_join_url: p.location ?? booking.zoom_join_url,
          });

          const rescheduleArgs = {
            uid,
            studentEmail: student.email,
            studentFirstName,
            studentFullName,
            parentEmails,
            tutorName,
            start: newStart,
            end: newEnd,
            meetingUrl: p.location ?? booking.zoom_join_url ?? null,
            timeZone: tz,
            oldStart,
          };
          try {
            await sendBookingReschedule(rescheduleArgs);
          } catch (err) {
            // Reschedule has no `*_email_sent` flag (the start-time
            // freshness check above is the dedupe), so a queue retry
            // is the only safety net.
            console.error("[cal-webhook] reschedule email failed, queueing:", err);
            await enqueueFailedEmail({
              kind: "booking_reschedule",
              payload: serializeEmailArgs(rescheduleArgs),
              dedupeKey: `${uid}:booking_reschedule:${newStart.toISOString()}`,
              bookingId: booking.id,
              error: err,
            });
          }
        }
        break;
      }

      case "MEETING_ENDED":
        // Attendance + completion is driven off Zoom's
        // meeting.ended event in P5, not Cal's. No-op here.
        break;

      default:
        console.log(`[cal-webhook] ignoring trigger=${trigger}`);
    }
  } catch (err) {
    console.error(`[cal-webhook] ${trigger} processing error:`, err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
});
