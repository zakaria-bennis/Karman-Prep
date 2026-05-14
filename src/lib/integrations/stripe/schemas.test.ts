// ============================================================
// Unit tests for the Stripe boundary schemas.
//
// These tests pin down the exact accept/reject behavior at the
// Stripe boundary so changes to the rules surface explicitly.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  chargeMetadataSchema,
  createCheckoutBodySchema,
  subscriptionMetadataSchema,
  subscriptionTierSchema,
} from "./schemas";

describe("subscriptionTierSchema", () => {
  it.each(["group", "small_group", "private", "elite"] as const)("accepts %s", (tier) => {
    expect(subscriptionTierSchema.parse(tier)).toBe(tier);
  });

  it("rejects an unknown tier string", () => {
    expect(subscriptionTierSchema.safeParse("groupp").success).toBe(false);
    expect(subscriptionTierSchema.safeParse("ELITE").success).toBe(false);
    expect(subscriptionTierSchema.safeParse("").success).toBe(false);
  });

  it("rejects non-string tiers", () => {
    expect(subscriptionTierSchema.safeParse(1).success).toBe(false);
    expect(subscriptionTierSchema.safeParse(null).success).toBe(false);
    expect(subscriptionTierSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("subscriptionMetadataSchema", () => {
  it("accepts a well-formed metadata bag", () => {
    const parsed = subscriptionMetadataSchema.parse({ userId: "user_abc123", tier: "elite" });
    expect(parsed).toEqual({ userId: "user_abc123", tier: "elite" });
  });

  it("rejects missing userId — a subscription created outside our flow must not silently insert", () => {
    const r = subscriptionMetadataSchema.safeParse({ tier: "group" });
    expect(r.success).toBe(false);
  });

  it("rejects empty-string userId — defends against the {tier: 'group'} fallback the old code allowed", () => {
    const r = subscriptionMetadataSchema.safeParse({ userId: "", tier: "group" });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown tier — guards against a typo flowing into the DB", () => {
    const r = subscriptionMetadataSchema.safeParse({ userId: "user_abc", tier: "groupp" });
    expect(r.success).toBe(false);
  });

  it("rejects missing tier — defends against the old `|| 'group'` silent fallback", () => {
    const r = subscriptionMetadataSchema.safeParse({ userId: "user_abc" });
    expect(r.success).toBe(false);
  });

  it("rejects null / undefined metadata", () => {
    expect(subscriptionMetadataSchema.safeParse(null).success).toBe(false);
    expect(subscriptionMetadataSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("chargeMetadataSchema", () => {
  it("accepts a well-formed metadata bag with userId only", () => {
    const parsed = chargeMetadataSchema.parse({ userId: "user_abc" });
    expect(parsed.userId).toBe("user_abc");
  });

  it("rejects missing userId", () => {
    expect(chargeMetadataSchema.safeParse({}).success).toBe(false);
  });

  it("rejects empty-string userId", () => {
    expect(chargeMetadataSchema.safeParse({ userId: "" }).success).toBe(false);
  });
});

describe("createCheckoutBodySchema", () => {
  it("accepts a well-formed checkout body", () => {
    const parsed = createCheckoutBodySchema.parse({ tier: "private" });
    expect(parsed.tier).toBe("private");
  });

  it("rejects an empty body — old code returned 400 with 'Tier is required'; new code surfaces a Zod issue", () => {
    expect(createCheckoutBodySchema.safeParse({}).success).toBe(false);
  });

  it("rejects an unknown tier string", () => {
    expect(createCheckoutBodySchema.safeParse({ tier: "bogus" }).success).toBe(false);
  });

  it("rejects a numeric tier", () => {
    expect(createCheckoutBodySchema.safeParse({ tier: 1 }).success).toBe(false);
  });
});
