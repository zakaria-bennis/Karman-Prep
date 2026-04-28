// ============================================================
// Cal.com Platform API — TypeScript types
//
// Only models the fields Karman actually consumes from Cal's
// responses. Cal v2 returns more, but typing what we *use* keeps
// noise low and avoids drift if Cal adds optional fields.
// ============================================================

export type IsoDateTime = string;

/** The four delivery tiers that can produce a booking. */
export type BookingPlanTier = "group" | "small_group" | "private" | "elite";

/** Stored on every Cal booking so webhook handlers can resolve it
 *  back to a Karman user + plan tier without a separate lookup. */
export interface BookingMetadata {
  student_id: string; // Clerk user id (text) of the student
  plan_tier: BookingPlanTier;
  [k: string]: string | number | boolean; // Cal accepts arbitrary scalar metadata
}

export interface CalAttendee {
  name: string;
  email: string;
  timeZone: string;
  language?: string;
}

export interface AvailableSlot {
  start: IsoDateTime;
  end: IsoDateTime;
}

export interface CreateBookingParams {
  /** Cal.com event-type id this booking targets (per-tutor schedule). */
  eventTypeId: number | string;
  /** ISO start time. End is derived from the event type's duration. */
  start: IsoDateTime;
  attendee: CalAttendee;
  metadata: BookingMetadata;
}

/** Subset of Cal v2's booking response we rely on. */
export interface CalBookingResponse {
  uid: string;
  start: IsoDateTime;
  end: IsoDateTime;
  status: string;
  eventTypeId: number;
  /** Conferencing URL — Zoom join URL when Zoom is the event-type's location. */
  meetingUrl?: string;
  /** Some Cal versions return the host meeting URL separately. */
  hostMeetingUrl?: string;
  hosts?: Array<{ id: number; email: string; name: string }>;
  attendees?: CalAttendee[];
  metadata?: Record<string, unknown>;
}

export class CalAdapterError extends Error {
  constructor(
    public readonly operation: string,
    public readonly statusCode: number,
    public readonly body: unknown,
    message?: string
  ) {
    super(message ?? `cal-adapter:${operation} failed (status ${statusCode})`);
    this.name = "CalAdapterError";
  }
}
