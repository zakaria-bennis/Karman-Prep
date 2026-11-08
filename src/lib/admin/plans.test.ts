import { describe, expect, it } from "vitest";
import {
  effectivePlan,
  groupSchools,
  isGrantLive,
  isMissingTable,
  mapGrant,
  mapSubscription,
  planFilterOf,
  schoolRenewal,
  type GrantInfo,
} from "./plans";

const NOW = new Date("2026-11-08T12:00:00Z");

const sub = (over: Record<string, unknown> = {}) =>
  mapSubscription({
    id: "s1",
    user_id: "user_a",
    stripe_subscription_id: "sub_123",
    status: "active",
    created_at: "2026-10-01T00:00:00Z",
    ...over,
  });

const grant = (over: Partial<GrantInfo> = {}): GrantInfo => ({
  ...mapGrant({
    id: "g1",
    user_id: "user_a",
    plan_id: "practice",
    source: "admin",
    starts_at: "2026-11-01T00:00:00Z",
  }),
  ...over,
});

describe("mapSubscription", () => {
  it("reads plan_id after the pricing migration", () => {
    const s = sub({ plan_id: "pro", billing_term: "quarter", tier: null });
    expect(s.planId).toBe("pro");
    expect(s.hasPlanColumn).toBe(true);
    expect(s.fromLegacyTier).toBe(false);
  });

  it("maps old tiers the way the migration does", () => {
    expect(sub({ tier: "group" }).planId).toBe("practice");
    expect(sub({ tier: "elite" }).planId).toBe("pro");
    expect(sub({ tier: "group" }).fromLegacyTier).toBe(true);
    expect(sub({ tier: "group" }).hasPlanColumn).toBe(false);
    expect(sub({ tier: "mystery" }).planId).toBeNull();
  });
});

describe("effectivePlan", () => {
  it("is Free with no live subscription or grant", () => {
    const plan = effectivePlan([sub({ tier: "group", status: "canceled" })], [], NOW);
    expect(plan.planId).toBe("free");
    expect(plan.source).toBe("none");
    expect(planFilterOf(plan)).toBe("free");
  });

  it("picks the most generous source", () => {
    const plan = effectivePlan([sub({ plan_id: "practice" })], [grant({ planId: "pro" })], NOW);
    expect(plan.planId).toBe("pro");
    expect(plan.source).toBe("admin");
  });

  it("prefers the subscription on a tie", () => {
    const plan = effectivePlan([sub({ plan_id: "practice" })], [grant()], NOW);
    expect(plan.source).toBe("subscription");
  });

  it("ignores revoked, expired and future grants", () => {
    const grants = [
      grant({ planId: "pro", revokedAt: "2026-11-02T00:00:00Z" }),
      grant({ planId: "pro", expiresAt: "2026-11-05T00:00:00Z" }),
      grant({ planId: "pro", startsAt: "2026-12-01T00:00:00Z" }),
    ];
    expect(effectivePlan([], grants, NOW).planId).toBe("free");
  });

  it("counts past_due only until the period ends", () => {
    const due = sub({
      plan_id: "pro",
      status: "past_due",
      current_period_end: "2026-11-20T00:00:00Z",
    });
    const over = sub({
      plan_id: "pro",
      status: "past_due",
      current_period_end: "2026-11-01T00:00:00Z",
    });
    expect(effectivePlan([due], [], NOW).planId).toBe("pro");
    expect(effectivePlan([over], [], NOW).planId).toBe("free");
  });

  it("puts school seats and tutor codes under their own filter", () => {
    const school = effectivePlan([], [grant({ source: "school", sourceRef: "lincoln" })], NOW);
    expect(planFilterOf(school)).toBe("school");
    const tutor = grant({ source: "tutor-affiliate", sponsorUserId: "tutor_1" });
    expect(isGrantLive(tutor, NOW)).toBe(false);
    const viaTutor = effectivePlan([], [tutor], NOW, new Set(["tutor_1"]));
    expect(planFilterOf(viaTutor)).toBe("tutor-affiliate");
  });

  it("files both private packages under private", () => {
    const plan = effectivePlan([], [grant({ planId: "private-20", source: "purchase" })], NOW);
    expect(planFilterOf(plan)).toBe("private");
  });
});

describe("school renewals", () => {
  it("renews one year after the pilot starts", () => {
    expect(schoolRenewal("2026-09-01T00:00:00Z", NOW)).toMatchObject({
      renewsAt: "2027-09-01T00:00:00.000Z",
      status: "pilot",
    });
  });

  it("is due within 30 days and lapsed after the date", () => {
    expect(schoolRenewal("2025-11-20T00:00:00Z", NOW).status).toBe("due");
    expect(schoolRenewal("2025-11-01T00:00:00Z", NOW).status).toBe("lapsed");
  });

  it("groups seats by school and counts unrevoked students", () => {
    const schools = groupSchools(
      [
        grant({
          source: "school",
          sourceRef: "lincoln",
          userId: "a",
          startsAt: "2026-09-01T00:00:00Z",
        }),
        grant({
          source: "school",
          sourceRef: "lincoln",
          userId: "b",
          startsAt: "2026-08-15T00:00:00Z",
        }),
        grant({
          source: "school",
          sourceRef: "lincoln",
          userId: "c",
          revokedAt: "2026-10-01T00:00:00Z",
        }),
        grant({ source: "admin", userId: "d" }),
      ],
      NOW
    );
    expect(schools).toHaveLength(1);
    expect(schools[0]).toMatchObject({
      ref: "lincoln",
      studentIds: ["a", "b"],
      pilotStart: "2026-08-15T00:00:00Z",
    });
  });
});

describe("isMissingTable", () => {
  it("knows the PostgREST and Postgres codes", () => {
    expect(isMissingTable({ code: "PGRST205" })).toBe(true);
    expect(isMissingTable({ code: "42P01" })).toBe(true);
    expect(isMissingTable({ code: "23505" })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });
});
