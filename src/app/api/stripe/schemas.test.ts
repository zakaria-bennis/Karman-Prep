// Unit tests for /api/stripe schemas.

import { describe, expect, it } from "vitest";
import { stripePortalBodySchema } from "./schemas";

describe("stripePortalBodySchema", () => {
  it("accepts an empty body (standard Manage-Plan click)", () => {
    expect(stripePortalBodySchema.safeParse({}).success).toBe(true);
  });

  it("accepts { action: 'cancel' }", () => {
    expect(stripePortalBodySchema.safeParse({ action: "cancel" }).success).toBe(true);
  });

  it("accepts an unknown action string (route falls through to default)", () => {
    expect(stripePortalBodySchema.safeParse({ action: "pause" }).success).toBe(true);
  });

  it("rejects a non-string action", () => {
    expect(stripePortalBodySchema.safeParse({ action: 1 }).success).toBe(false);
  });
});
