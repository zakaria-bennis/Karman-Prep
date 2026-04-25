// ============================================================
// Booking-flow transactional emails.
//
// Each function:
//   1. Builds a .ics calendar invite (REQUEST or CANCEL)
//   2. Renders the React Email template to HTML
//   3. Sends via Resend with the .ics attached as base64
//
// Recipients = student + every linked parent. Parent emails are
// resolved by the caller (the Cal webhook handler) so this module
// stays free of Supabase queries.
// ============================================================

import { render } from "@react-email/components";
import { resend, FROM } from "./client";
import { buildBookingIcs } from "@/lib/ics/builder";
import {
  BookingConfirmation,
  type BookingConfirmationProps,
} from "@/emails/BookingConfirmation";
import {
  BookingCancellation,
  type BookingCancellationProps,
} from "@/emails/BookingCancellation";
import {
  BookingReschedule,
  type BookingRescheduleProps,
} from "@/emails/BookingReschedule";
import type { BookingPlanTier } from "@/lib/supabase/queries/bookings";

interface BaseCtx {
  /** cal_booking_uid — stable across reschedules so .ics events update in place. */
  uid: string;
  studentEmail: string;
  studentFirstName: string;
  studentFullName: string;
  parentEmails: string[];
  tutorName: string;
  start: Date;
  end: Date;
  meetingUrl?: string | null;
  /** IANA TZ for date/time formatting (e.g. America/New_York). */
  timeZone: string;
}

const ORGANIZER_EMAIL = process.env.RESEND_FROM_EMAIL || "hello@strata.com";

function formatDate(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  }).format(d);
}

function formatTime(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: tz,
  }).format(d);
}

function recipients(ctx: BaseCtx): string[] {
  return [ctx.studentEmail, ...ctx.parentEmails.filter((e) => e && e !== ctx.studentEmail)];
}

function icsAttachment(filename: string, ics: string) {
  return {
    filename,
    content: Buffer.from(ics).toString("base64"),
  };
}

// ─────────────────────────────────────────────────────────────
// Confirmation
// ─────────────────────────────────────────────────────────────
export async function sendBookingConfirmation(ctx: BaseCtx) {
  const ics = buildBookingIcs(
    {
      uid: ctx.uid,
      studentName: ctx.studentFullName,
      tutorName: ctx.tutorName,
      start: ctx.start,
      end: ctx.end,
      meetingUrl: ctx.meetingUrl,
      organizerEmail: ORGANIZER_EMAIL,
    },
    "REQUEST"
  );

  const props: BookingConfirmationProps = {
    studentFirstName: ctx.studentFirstName,
    tutorName: ctx.tutorName,
    sessionDate: formatDate(ctx.start, ctx.timeZone),
    sessionTime: formatTime(ctx.start, ctx.timeZone),
    joinUrl: ctx.meetingUrl ?? "",
  };
  const html = await render(BookingConfirmation(props));

  return resend.emails.send({
    from: FROM,
    to: recipients(ctx),
    subject: "Your Strata Session is Confirmed",
    html,
    attachments: [icsAttachment("session.ics", ics)],
  });
}

// ─────────────────────────────────────────────────────────────
// Cancellation
// ─────────────────────────────────────────────────────────────
export async function sendBookingCancellation(
  ctx: BaseCtx & {
    withinWindow: boolean;
    creditForfeited: boolean;
    planTier: BookingPlanTier;
  }
) {
  const ics = buildBookingIcs(
    {
      uid: ctx.uid,
      studentName: ctx.studentFullName,
      tutorName: ctx.tutorName,
      start: ctx.start,
      end: ctx.end,
      meetingUrl: ctx.meetingUrl,
      organizerEmail: ORGANIZER_EMAIL,
    },
    "CANCEL"
  );

  const props: BookingCancellationProps = {
    studentFirstName: ctx.studentFirstName,
    tutorName: ctx.tutorName,
    sessionDate: formatDate(ctx.start, ctx.timeZone),
    sessionTime: formatTime(ctx.start, ctx.timeZone),
    withinWindow: ctx.withinWindow,
    creditForfeited: ctx.creditForfeited,
    planTier: ctx.planTier,
  };
  const html = await render(BookingCancellation(props));

  return resend.emails.send({
    from: FROM,
    to: recipients(ctx),
    subject: "Your Strata Session Has Been Cancelled",
    html,
    attachments: [icsAttachment("cancellation.ics", ics)],
  });
}

// ─────────────────────────────────────────────────────────────
// Reschedule
// ─────────────────────────────────────────────────────────────
export async function sendBookingReschedule(ctx: BaseCtx & { oldStart: Date }) {
  // Reschedule uses METHOD:REQUEST with the same UID — calendar
  // clients update the existing event in place rather than
  // creating a duplicate.
  const ics = buildBookingIcs(
    {
      uid: ctx.uid,
      studentName: ctx.studentFullName,
      tutorName: ctx.tutorName,
      start: ctx.start,
      end: ctx.end,
      meetingUrl: ctx.meetingUrl,
      organizerEmail: ORGANIZER_EMAIL,
    },
    "REQUEST"
  );

  const props: BookingRescheduleProps = {
    studentFirstName: ctx.studentFirstName,
    tutorName: ctx.tutorName,
    oldSessionDate: formatDate(ctx.oldStart, ctx.timeZone),
    oldSessionTime: formatTime(ctx.oldStart, ctx.timeZone),
    newSessionDate: formatDate(ctx.start, ctx.timeZone),
    newSessionTime: formatTime(ctx.start, ctx.timeZone),
    joinUrl: ctx.meetingUrl ?? "",
  };
  const html = await render(BookingReschedule(props));

  return resend.emails.send({
    from: FROM,
    to: recipients(ctx),
    subject: "Your Strata Session Has Been Rescheduled",
    html,
    attachments: [icsAttachment("session.ics", ics)],
  });
}
