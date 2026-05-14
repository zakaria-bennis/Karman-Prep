// Unit tests for /api/onboarding schemas.
//
// The route layers tier-conditional rules (Private/Elite must
// declare availability) on top of these shape checks — those
// live in the route, not the schema.

import { describe, expect, it } from "vitest";
import { onboardingPayloadSchema } from "./schemas";

describe("onboardingPayloadSchema — required fields", () => {
  const valid = {
    satTestDate: "2026-08-23",
    goalSatScore: 1450,
    hsYear: "junior" as const,
  };

  it("accepts a minimal payload", () => {
    expect(onboardingPayloadSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed satTestDate (non-YYYY-MM-DD)", () => {
    expect(onboardingPayloadSchema.safeParse({ ...valid, satTestDate: "08/23/2026" }).success).toBe(
      false
    );
  });

  it("rejects a goalSatScore below 400", () => {
    expect(onboardingPayloadSchema.safeParse({ ...valid, goalSatScore: 399 }).success).toBe(false);
  });

  it("rejects a goalSatScore above 1600", () => {
    expect(onboardingPayloadSchema.safeParse({ ...valid, goalSatScore: 1601 }).success).toBe(false);
  });

  it("rejects an unknown hsYear", () => {
    expect(onboardingPayloadSchema.safeParse({ ...valid, hsYear: "graduate" }).success).toBe(false);
  });
});

describe("onboardingPayloadSchema — optional academic background", () => {
  const valid = {
    satTestDate: "2026-08-23",
    goalSatScore: 1450,
    hsYear: "junior" as const,
  };

  it("accepts recentSatMath/Reading within 200-800", () => {
    expect(
      onboardingPayloadSchema.safeParse({
        ...valid,
        recentSatMath: 700,
        recentSatReading: 650,
      }).success
    ).toBe(true);
  });

  it("rejects recentSatMath out of range", () => {
    expect(onboardingPayloadSchema.safeParse({ ...valid, recentSatMath: 199 }).success).toBe(false);
    expect(onboardingPayloadSchema.safeParse({ ...valid, recentSatMath: 801 }).success).toBe(false);
  });

  it("rejects psatScore out of range", () => {
    expect(onboardingPayloadSchema.safeParse({ ...valid, psatScore: 319 }).success).toBe(false);
    expect(onboardingPayloadSchema.safeParse({ ...valid, psatScore: 1521 }).success).toBe(false);
  });

  it("accepts null for skipped optional scores", () => {
    expect(
      onboardingPayloadSchema.safeParse({
        ...valid,
        recentSatMath: null,
        recentSatReading: null,
        psatScore: null,
      }).success
    ).toBe(true);
  });
});

describe("onboardingPayloadSchema — availability fields", () => {
  const valid = {
    satTestDate: "2026-08-23",
    goalSatScore: 1450,
    hsYear: "junior" as const,
  };

  it("accepts valid availableDays/Times/timeZone", () => {
    expect(
      onboardingPayloadSchema.safeParse({
        ...valid,
        availableDays: ["monday", "tuesday"],
        availableTimes: ["morning", "afternoon"],
        timeZone: "America/New_York",
      }).success
    ).toBe(true);
  });

  it("rejects an invalid day name", () => {
    expect(
      onboardingPayloadSchema.safeParse({
        ...valid,
        availableDays: ["funday"],
      }).success
    ).toBe(false);
  });

  it("rejects an invalid time bucket", () => {
    expect(
      onboardingPayloadSchema.safeParse({
        ...valid,
        availableTimes: ["midnight"],
      }).success
    ).toBe(false);
  });
});
