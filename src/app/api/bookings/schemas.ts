// ============================================================
// Zod schemas for the bookings API route bodies.
//
// Same gate-at-the-boundary pattern as the admin server-action
// schemas. The bookings routes mutate the bookings table on
// student traffic, so the validation matters more here than on a
// pure-read endpoint.
// ============================================================

import { z } from "zod";

const nonEmptyString = z.string().min(1);

// ── bookings/create ─────────────────────────────────────────

export const createBookingBodySchema = z.object({
  // Cal.com event-type id. Their API returns it as a number, but
  // some clients stringify it before POST — accept both shapes.
  eventTypeId: z.union([z.number().int().positive(), nonEmptyString]),
  tutorClerkId: nonEmptyString,
  // ISO 8601 datetime — Zod's .datetime() rejects "2026-05-01"
  // (date-only) and "May 1 2026" (free-form), which is what we
  // want; the booking system stores precise instants.
  start: z.string().datetime({ message: "start must be ISO 8601 datetime" }),
  // IANA TZ identifier (e.g. "America/New_York"). An unknown name
  // falls back to Central in the rules (src/lib/bookings/rules.ts).
  timeZone: nonEmptyString,
  // The session's length. Which lengths a plan may book is the rules'
  // call; absent means the plain 60 minutes (older pages send none).
  minutes: z.union([z.literal(60), z.literal(90), z.literal(120)]).optional(),
});

// ── bookings/cancel ─────────────────────────────────────────

export const cancelBookingBodySchema = z.object({
  bookingId: nonEmptyString,
  reason: z.string().optional(),
});

// ── bookings/reschedule ─────────────────────────────────────

export const rescheduleBookingBodySchema = z.object({
  bookingId: nonEmptyString,
  newStart: z.string().datetime({ message: "newStart must be ISO 8601 datetime" }),
  reason: z.string().optional(),
  // The student's own time zone, for the month the move counts in.
  timeZone: z.string().optional(),
});
