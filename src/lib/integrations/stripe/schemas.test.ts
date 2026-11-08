// ============================================================
// Unit tests for the Stripe boundary schemas.
//
// These pin down the exact accept/reject behavior at the Stripe
// boundary so changes to the rules surface explicitly.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  chargeMetadataSchema,
  createCheckoutBodySchema,
  purchaseMetadataSchema,
  subscriptionMetadataSchema,
} from "./schemas";

describe("createCheckoutBodySchema", () => {
  it.each([
    { plan: "practice", term: "month" },
    { plan: "practice", term: "quarter" },
    { plan: "pro", term: "month" },
    { plan: "pro", term: "quarter" },
    { plan: "cohort" },
    { plan: "private-10" },
    { plan: "private-20" },
    { plan: "tutor-affiliate" },
  ])("accepts %o", (body) => {
    expect(createCheckoutBodySchema.parse(body)).toEqual(body);
  });

  it("accepts and ignores a term on a plan with one price", () => {
    expect(createCheckoutBodySchema.safeParse({ plan: "cohort", term: "month" }).success).toBe(
      true
    );
  });

  it.each(["practice", "pro"])("requires a term for %s", (plan) => {
    expect(createCheckoutBodySchema.safeParse({ plan }).success).toBe(false);
  });

  it.each(["free", "school", "group", "small_group", "private", "elite", "bogus", ""])(
    "rejects the plan %j",
    (plan) => {
      expect(createCheckoutBodySchema.safeParse({ plan, term: "month" }).success).toBe(false);
    }
  );

  it("accepts a cohort id as a uuid and rejects anything else", () => {
    const cohortId = "3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f";
    expect(createCheckoutBodySchema.parse({ plan: "cohort", cohortId })).toEqual({
      plan: "cohort",
      cohortId,
    });
    expect(createCheckoutBodySchema.safeParse({ plan: "cohort", cohortId: "jan" }).success).toBe(
      false
    );
  });

  it("rejects an unknown term", () => {
    expect(createCheckoutBodySchema.safeParse({ plan: "pro", term: "year" }).success).toBe(false);
  });

  it("rejects an empty body and the old { tier } body", () => {
    expect(createCheckoutBodySchema.safeParse({}).success).toBe(false);
    expect(createCheckoutBodySchema.safeParse({ tier: "group" }).success).toBe(false);
  });
});

describe("subscriptionMetadataSchema", () => {
  it("accepts a well-formed metadata bag", () => {
    const meta = { userId: "user_abc123", planId: "tutor-affiliate", term: "month" };
    expect(subscriptionMetadataSchema.parse(meta)).toEqual(meta);
  });

  it("rejects missing or empty userId — a subscription made outside our flow must not insert", () => {
    expect(subscriptionMetadataSchema.safeParse({ planId: "pro", term: "month" }).success).toBe(
      false
    );
    expect(
      subscriptionMetadataSchema.safeParse({ userId: "", planId: "pro", term: "month" }).success
    ).toBe(false);
  });

  it.each(["cohort", "private-10", "free", "school", "elite", "group"])(
    "rejects %s, which is not a renewing plan",
    (planId) => {
      expect(
        subscriptionMetadataSchema.safeParse({ userId: "user_abc", planId, term: "month" }).success
      ).toBe(false);
    }
  );

  it("rejects a missing term", () => {
    expect(
      subscriptionMetadataSchema.safeParse({ userId: "user_abc", planId: "pro" }).success
    ).toBe(false);
  });

  it("rejects null / undefined metadata", () => {
    expect(subscriptionMetadataSchema.safeParse(null).success).toBe(false);
    expect(subscriptionMetadataSchema.safeParse(undefined).success).toBe(false);
  });
});

describe("purchaseMetadataSchema", () => {
  it.each(["cohort", "private-10", "private-20"])("accepts %s", (planId) => {
    expect(purchaseMetadataSchema.parse({ userId: "user_abc", planId, term: "once" })).toEqual({
      userId: "user_abc",
      planId,
    });
  });

  it.each(["practice", "pro", "tutor-affiliate", "free"])("rejects %s", (planId) => {
    expect(purchaseMetadataSchema.safeParse({ userId: "user_abc", planId }).success).toBe(false);
  });

  it("rejects a missing userId", () => {
    expect(purchaseMetadataSchema.safeParse({ planId: "cohort" }).success).toBe(false);
  });
});

describe("chargeMetadataSchema", () => {
  it("accepts a well-formed metadata bag with userId only", () => {
    expect(chargeMetadataSchema.parse({ userId: "user_abc" }).userId).toBe("user_abc");
  });

  it("rejects missing or empty userId", () => {
    expect(chargeMetadataSchema.safeParse({}).success).toBe(false);
    expect(chargeMetadataSchema.safeParse({ userId: "" }).success).toBe(false);
  });
});
