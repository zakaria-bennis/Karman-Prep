// Unit tests for /api/sessions schemas.

import { describe, expect, it } from "vitest";
import { pushSessionBodySchema } from "./schemas";

describe("pushSessionBodySchema", () => {
  const valid = {
    cohortId: "cohort-1",
    sessionStart: "2026-06-01T18:00:00.000Z",
    sessionEnd: "2026-06-01T19:30:00.000Z",
    zoomJoinUrl: "https://zoom.us/j/12345",
  };

  it("accepts a minimal valid payload", () => {
    expect(pushSessionBodySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a payload with all optionals", () => {
    expect(
      pushSessionBodySchema.safeParse({
        ...valid,
        zoomMeetingId: "98765",
        zoomStartUrl: "https://zoom.us/s/start",
        timeZone: "America/Chicago",
      }).success
    ).toBe(true);
  });

  it("rejects empty cohortId", () => {
    expect(pushSessionBodySchema.safeParse({ ...valid, cohortId: "" }).success).toBe(false);
  });

  it("rejects missing zoomJoinUrl", () => {
    const { zoomJoinUrl: _omit, ...rest } = valid;
    expect(pushSessionBodySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects a date-only sessionStart", () => {
    expect(pushSessionBodySchema.safeParse({ ...valid, sessionStart: "2026-06-01" }).success).toBe(
      false
    );
  });

  it("rejects a non-ISO sessionEnd", () => {
    expect(pushSessionBodySchema.safeParse({ ...valid, sessionEnd: "soon" }).success).toBe(false);
  });
});
