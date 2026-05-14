// Unit tests for /api/attendance schemas.

import { describe, expect, it } from "vitest";
import { attendanceOverrideBodySchema } from "./schemas";

describe("attendanceOverrideBodySchema", () => {
  const valid = {
    bookingId: "booking-1",
    studentClerkId: "user_clerk_abc",
    overrideValue: true,
    reason: "Student attended via phone, no Zoom join event.",
  };

  it("accepts a fully-formed payload", () => {
    expect(attendanceOverrideBodySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts overrideValue=false (marking absent)", () => {
    expect(attendanceOverrideBodySchema.safeParse({ ...valid, overrideValue: false }).success).toBe(
      true
    );
  });

  it("rejects a non-boolean overrideValue", () => {
    expect(attendanceOverrideBodySchema.safeParse({ ...valid, overrideValue: "yes" }).success).toBe(
      false
    );
    expect(attendanceOverrideBodySchema.safeParse({ ...valid, overrideValue: 1 }).success).toBe(
      false
    );
  });

  it("rejects an empty reason (we want an audit trail)", () => {
    expect(attendanceOverrideBodySchema.safeParse({ ...valid, reason: "" }).success).toBe(false);
  });

  it("rejects empty bookingId", () => {
    expect(attendanceOverrideBodySchema.safeParse({ ...valid, bookingId: "" }).success).toBe(false);
  });

  it("rejects empty studentClerkId", () => {
    expect(attendanceOverrideBodySchema.safeParse({ ...valid, studentClerkId: "" }).success).toBe(
      false
    );
  });
});
