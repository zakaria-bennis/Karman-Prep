// ============================================================
// Unit tests for the bookings API route body schemas.
//
// Same gate-at-the-boundary pattern as the chat schemas — these
// routes mutate the tokens + bookings tables on student traffic,
// so the validation matters even more here than on read-only
// endpoints. Locks the request shape down so a curl with a
// malformed body can't slip past TS narrowing.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  cancelBookingBodySchema,
  createBookingBodySchema,
  rescheduleBookingBodySchema,
} from "./schemas";

describe("createBookingBodySchema", () => {
  const valid = {
    eventTypeId: 1234,
    tutorClerkId: "user_tutor",
    start: "2026-06-01T15:00:00.000Z",
    timeZone: "America/New_York",
  };

  it("accepts a fully-formed request with numeric eventTypeId", () => {
    expect(createBookingBodySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a stringified eventTypeId (some clients stringify before POST)", () => {
    expect(createBookingBodySchema.safeParse({ ...valid, eventTypeId: "1234" }).success).toBe(true);
  });

  it("rejects a non-positive eventTypeId", () => {
    expect(createBookingBodySchema.safeParse({ ...valid, eventTypeId: 0 }).success).toBe(false);
    expect(createBookingBodySchema.safeParse({ ...valid, eventTypeId: -5 }).success).toBe(false);
  });

  it("rejects an empty string eventTypeId", () => {
    expect(createBookingBodySchema.safeParse({ ...valid, eventTypeId: "" }).success).toBe(false);
  });

  it("rejects empty tutorClerkId", () => {
    expect(createBookingBodySchema.safeParse({ ...valid, tutorClerkId: "" }).success).toBe(false);
  });

  it("rejects a date-only start (not ISO 8601 datetime)", () => {
    expect(createBookingBodySchema.safeParse({ ...valid, start: "2026-06-01" }).success).toBe(
      false
    );
  });

  it("rejects a free-form start string", () => {
    expect(createBookingBodySchema.safeParse({ ...valid, start: "June 1 2026 3pm" }).success).toBe(
      false
    );
  });

  it("rejects empty timeZone", () => {
    expect(createBookingBodySchema.safeParse({ ...valid, timeZone: "" }).success).toBe(false);
  });

  it("rejects when start is missing", () => {
    const { start: _omit, ...rest } = valid;
    expect(createBookingBodySchema.safeParse(rest).success).toBe(false);
  });
});

describe("cancelBookingBodySchema", () => {
  it("accepts a minimal request (bookingId only)", () => {
    expect(cancelBookingBodySchema.safeParse({ bookingId: "booking-1" }).success).toBe(true);
  });

  it("accepts a request with a reason", () => {
    expect(
      cancelBookingBodySchema.safeParse({
        bookingId: "booking-1",
        reason: "conflict",
      }).success
    ).toBe(true);
  });

  it("rejects empty bookingId", () => {
    expect(cancelBookingBodySchema.safeParse({ bookingId: "" }).success).toBe(false);
  });

  it("rejects missing bookingId", () => {
    expect(cancelBookingBodySchema.safeParse({}).success).toBe(false);
  });
});

describe("rescheduleBookingBodySchema", () => {
  const valid = {
    bookingId: "booking-1",
    newStart: "2026-06-02T16:00:00.000Z",
  };

  it("accepts a valid request without a reason", () => {
    expect(rescheduleBookingBodySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a request with a reason", () => {
    expect(
      rescheduleBookingBodySchema.safeParse({ ...valid, reason: "tutor conflict" }).success
    ).toBe(true);
  });

  it("rejects empty bookingId", () => {
    expect(rescheduleBookingBodySchema.safeParse({ ...valid, bookingId: "" }).success).toBe(false);
  });

  it("rejects a date-only newStart", () => {
    expect(
      rescheduleBookingBodySchema.safeParse({ ...valid, newStart: "2026-06-02" }).success
    ).toBe(false);
  });

  it("rejects a free-form newStart", () => {
    expect(
      rescheduleBookingBodySchema.safeParse({ ...valid, newStart: "tomorrow at 4pm" }).success
    ).toBe(false);
  });

  it("rejects missing newStart", () => {
    expect(rescheduleBookingBodySchema.safeParse({ bookingId: "booking-1" }).success).toBe(false);
  });
});
