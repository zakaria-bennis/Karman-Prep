import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { canAccess } from "./access";
import { PLAN_ENTITLEMENTS, type GrantPlanId } from "./catalog";
import {
  PlanGrantError,
  activeSponsoredCount,
  canManageStudent,
  canSponsorMore,
  getPlan,
  getUsage,
  grantPlan,
  recordPurchaseGrant,
  resolvePlan,
  revokeGrant,
  sponsoredStudentIds,
  type GrantSource,
  type PlanDataSource,
  type PlanGrant,
  type SubscriptionRecord,
} from "./resolve";

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => {
    throw new Error("tests use a fake data source");
  },
}));

const NOW = new Date("2026-11-08T12:00:00.000Z");
const DAY = 86_400_000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const STUDENT = "user_student";
const TUTOR = "user_tutor";

function sub(
  userId: string,
  planId: string | null,
  status = "active",
  periodEndDays = 30
): SubscriptionRecord {
  return {
    userId,
    planId,
    status,
    currentPeriodEnd: at(periodEndDays),
    stripeSubscriptionId: `sub_${userId}_${planId}_${status}`,
  };
}

let grantCount = 1000;
function grant(
  userId: string,
  planId: GrantPlanId,
  source: GrantSource,
  extra: Partial<PlanGrant> = {}
): PlanGrant {
  return {
    id: uuid(++grantCount),
    userId,
    planId,
    source,
    sourceRef: `ref_${grantCount}`,
    sponsorUserId: source === "tutor-affiliate" ? TUTOR : null,
    startsAt: at(-1),
    expiresAt: null,
    revokedAt: null,
    createdAt: at(-1),
    ...extra,
  };
}

function fakeSource(
  init: {
    subscriptions?: SubscriptionRecord[];
    grants?: PlanGrant[];
    answered?: number;
    fullLength?: number;
    satTestDate?: string | null;
  } = {}
) {
  const subscriptions = [...(init.subscriptions ?? [])];
  const grants = [...(init.grants ?? [])];
  /** The student's `users` row; set `satTestDate` to mimic a later edit. */
  const user = { satTestDate: init.satTestDate ?? null };
  let n = 0;
  const matches = (g: PlanGrant, match: Parameters<PlanDataSource["revokeGrants"]>[0]) =>
    "grantId" in match
      ? g.id === match.grantId
      : g.source === match.source && g.sourceRef === match.sourceRef && g.userId === match.userId;
  const source: PlanDataSource = {
    subscriptions: async (ids) => subscriptions.filter((s) => ids.includes(s.userId)),
    grants: async (userId) => grants.filter((g) => g.userId === userId && g.revokedAt === null),
    sponsoredGrants: async (sponsor) =>
      grants.filter(
        (g) => g.sponsorUserId === sponsor && g.source === "tutor-affiliate" && !g.revokedAt
      ),
    async insertGrant(row) {
      const existing = grants.find(
        (g) => g.source === row.source && g.sourceRef === row.sourceRef && g.userId === row.userId
      );
      if (existing) return { grant: existing, created: false };
      const created: PlanGrant = { ...row, id: uuid(++n), revokedAt: null, createdAt: at(0) };
      grants.push(created);
      return { grant: created, created: true };
    },
    async restoreGrant(id, terms) {
      const found = grants.find((g) => g.id === id)!;
      Object.assign(found, terms, { revokedAt: null });
      return found;
    },
    async revokeGrants(match, revokedAt) {
      const hits = grants.filter((g) => g.revokedAt === null && matches(g, match));
      for (const hit of hits) hit.revokedAt = revokedAt;
      return hits.length;
    },
    answeredQuestionCount: async () => init.answered ?? 0,
    completedFullLengthTests: async () => init.fullLength ?? 0,
    satTestDate: async () => user.satTestDate,
  };
  return { source, grants, subscriptions, user };
}

const planOf = (init: Parameters<typeof fakeSource>[0]) =>
  getPlan(STUDENT, fakeSource(init).source, NOW);

describe("getPlan", () => {
  it("gives the free plan to a user with nothing", async () => {
    const plan = await planOf({});
    expect(plan.planId).toBe("free");
    expect(plan.planIds).toEqual(["free"]);
    expect(plan.entitlements).toEqual(PLAN_ENTITLEMENTS.free);
    expect(plan.sources).toEqual([]);
  });

  it("counts active and trialing subscriptions", async () => {
    expect((await planOf({ subscriptions: [sub(STUDENT, "practice")] })).planId).toBe("practice");
    expect((await planOf({ subscriptions: [sub(STUDENT, "pro", "trialing")] })).planId).toBe("pro");
  });

  it("ignores canceled and incomplete subscriptions", async () => {
    for (const status of ["canceled", "incomplete"]) {
      expect((await planOf({ subscriptions: [sub(STUDENT, "pro", status)] })).planId).toBe("free");
    }
  });

  it("keeps a past_due subscription until its period ends", async () => {
    expect((await planOf({ subscriptions: [sub(STUDENT, "pro", "past_due", 3)] })).planId).toBe(
      "pro"
    );
    expect((await planOf({ subscriptions: [sub(STUDENT, "pro", "past_due", -1)] })).planId).toBe(
      "free"
    );
  });

  it("ignores an active subscription with an unknown plan id, with a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await planOf({ subscriptions: [sub(STUDENT, "elite")] })).planId).toBe("free");
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("gives a school student their own practice plan", async () => {
    const plan = await planOf({ grants: [grant(STUDENT, "practice", "school")] });
    expect(plan.planId).toBe("practice");
    expect(plan.sources[0]?.kind).toBe("school");
    expect(plan.entitlements).toEqual(PLAN_ENTITLEMENTS.practice);
  });

  it("gives an affiliate student practice while the tutor's subscription is active", async () => {
    const plan = await planOf({
      subscriptions: [sub(TUTOR, "tutor-affiliate")],
      grants: [grant(STUDENT, "practice", "tutor-affiliate")],
    });
    expect(plan.planId).toBe("practice");
    expect(plan.sources[0]).toMatchObject({ kind: "tutor-affiliate", sponsorUserId: TUTOR });
  });

  it.each([
    ["canceled", [sub(TUTOR, "tutor-affiliate", "canceled")]],
    ["past_due after the period", [sub(TUTOR, "tutor-affiliate", "past_due", -2)]],
    ["a different plan", [sub(TUTOR, "pro")]],
    ["no subscription", []],
  ])("drops an affiliate grant when the tutor has %s", async (_label, subscriptions) => {
    const plan = await planOf({
      subscriptions,
      grants: [grant(STUDENT, "practice", "tutor-affiliate")],
    });
    expect(plan.planId).toBe("free");
  });

  it("ignores expired, revoked and not-yet-started grants", async () => {
    const grants = [
      grant(STUDENT, "cohort", "purchase", { expiresAt: at(-1), startsAt: at(-400) }),
      grant(STUDENT, "pro", "admin", { revokedAt: at(-1) }),
      grant(STUDENT, "practice", "school", { startsAt: at(2) }),
    ];
    const plan = resolvePlan({
      userId: STUDENT,
      subscriptions: [],
      grants,
      satTestDate: null,
      now: NOW,
    });
    expect(plan.planId).toBe("free");
    expect(plan.sources).toEqual([]);
  });

  it("gives the most generous source: an affiliate student who buys pro gets pro", async () => {
    const plan = await planOf({
      subscriptions: [sub(TUTOR, "tutor-affiliate"), sub(STUDENT, "pro")],
      grants: [grant(STUDENT, "practice", "tutor-affiliate")],
    });
    expect(plan.planId).toBe("pro");
    expect(plan.planIds).toEqual(["pro", "practice"]);
    expect(plan.entitlements).toEqual(PLAN_ENTITLEMENTS.pro);
  });

  it.each(["cohort", "private-10", "private-20"] as const)(
    "gives %s the mastery pool and video explanations",
    async (planId) => {
      const plan = await planOf({ grants: [grant(STUDENT, planId, "purchase")] });
      expect(plan.planId).toBe(planId);
      expect(canAccess(plan, "pool:mastery")).toBe(true);
      expect(canAccess(plan, "explanations:video")).toBe(true);
      expect(canAccess(plan, "tutor-admin")).toBe(false);
    }
  );

  it("gives the tutor-affiliate subscriber pro access and tutor-admin rights", async () => {
    const plan = await getPlan(
      TUTOR,
      fakeSource({ subscriptions: [sub(TUTOR, "tutor-affiliate")] }).source,
      NOW
    );
    expect(plan.planId).toBe("tutor-affiliate");
    expect(canAccess(plan, "tutor-admin")).toBe(true);
    expect(canAccess(plan, "pool:mastery")).toBe(true);
    expect(plan.entitlements.maxSponsoredStudents).toBe(50);
  });

  it("rejects an empty user id", async () => {
    await expect(getPlan(" ", fakeSource().source, NOW)).rejects.toBeInstanceOf(ZodError);
  });
});

describe("getUsage", () => {
  it("feeds the free limits", async () => {
    const { source } = fakeSource({ answered: 100, fullLength: 1 });
    const usage = await getUsage(STUDENT, source);
    expect(usage).toEqual({ questionsAnswered: 100, fullLengthTestsCompleted: 1 });
    const plan = await getPlan(STUDENT, source, NOW);
    expect(canAccess(plan, "question:new", usage)).toBe(false);
    expect(canAccess(plan, "full-length-test:new", usage)).toBe(false);
    expect(canAccess(plan, "question:new", { ...usage, questionsAnswered: 99 })).toBe(true);
  });
});

describe("purchase grants", () => {
  it("records a one-time purchase with no expiry, once per checkout session", async () => {
    const { source, grants } = fakeSource();
    const input = { userId: STUDENT, planId: "cohort" as const, checkoutSessionId: "cs_test_1" };
    const first = await recordPurchaseGrant(input, source, NOW);
    expect(first.status).toBe("created");
    expect(first.grant).toMatchObject({
      planId: "cohort",
      source: "purchase",
      sourceRef: "cs_test_1",
      startsAt: NOW.toISOString(),
      expiresAt: null,
    });
    const retry = await recordPurchaseGrant(input, source, NOW);
    expect(retry.status).toBe("existing");
    expect(retry.grant.id).toBe(first.grant.id);
    expect(grants).toHaveLength(1);
  });

  it("dates the grant from the purchase time when given", async () => {
    const { source } = fakeSource();
    const result = await recordPurchaseGrant(
      {
        userId: STUDENT,
        planId: "private-20",
        checkoutSessionId: "cs_test_2",
        purchasedAt: "2026-10-01T00:00:00Z",
      },
      source,
      NOW
    );
    expect(result.grant).toMatchObject({ startsAt: "2026-10-01T00:00:00.000Z", expiresAt: null });
  });

  it.each(["pro", "practice", "free", "platinum", ""])(
    "refuses plan id %j for a purchase",
    async (planId) => {
      await expect(
        recordPurchaseGrant(
          { userId: STUDENT, planId: planId as "cohort", checkoutSessionId: "cs_test_3" },
          fakeSource().source,
          NOW
        )
      ).rejects.toBeInstanceOf(ZodError);
    }
  );

  it("never restores a refunded purchase on a webhook retry", async () => {
    const { source } = fakeSource();
    const input = { userId: STUDENT, planId: "cohort" as const, checkoutSessionId: "cs_test_4" };
    await recordPurchaseGrant(input, source, NOW);
    expect(
      await revokeGrant({ source: "purchase", sourceRef: "cs_test_4", userId: STUDENT }, source)
    ).toBe(1);
    const retry = await recordPurchaseGrant(input, source, NOW);
    expect(retry.status).toBe("existing");
    expect(retry.grant.revokedAt).not.toBeNull();
    expect((await getPlan(STUDENT, source, NOW)).planId).toBe("free");
  });
});

describe("purchase access ends with the SAT date", () => {
  const cohort = (extra: Partial<PlanGrant> = {}) => grant(STUDENT, "cohort", "purchase", extra);
  const planAt = async (source: PlanDataSource, iso: string) =>
    (await getPlan(STUDENT, source, new Date(iso))).planId;

  it("stays open while the student has no SAT date", async () => {
    const plan = await planOf({ grants: [cohort()], satTestDate: null });
    expect(plan.planId).toBe("cohort");
    expect(plan.sources[0]?.endsAt).toBeNull();
  });

  it("stays open through the SAT day itself", async () => {
    const { source } = fakeSource({ grants: [cohort()], satTestDate: "2026-11-08" });
    const plan = await getPlan(STUDENT, source, NOW);
    expect(plan.planId).toBe("cohort");
    expect(plan.sources[0]?.endsAt).toBe("2026-11-09T12:00:00.000Z");
    // 11:59 pm in Hawaii on the SAT day.
    expect(await planAt(source, "2026-11-09T09:59:00Z")).toBe("cohort");
  });

  it("closes the day after the SAT", async () => {
    expect((await planOf({ grants: [cohort()], satTestDate: "2026-11-07" })).planId).toBe("free");
    const { source } = fakeSource({ grants: [cohort()], satTestDate: "2026-11-08" });
    expect(await planAt(source, "2026-11-09T12:00:00Z")).toBe("free");
  });

  it("ends access once a SAT date set later is over", async () => {
    const { source, user } = fakeSource({ grants: [cohort()] });
    expect(await planAt(source, NOW.toISOString())).toBe("cohort");
    user.satTestDate = "2026-12-05";
    expect(await planAt(source, NOW.toISOString())).toBe("cohort");
    expect(await planAt(source, "2026-12-07T00:00:00Z")).toBe("free");
    // A date already past ends access at once.
    user.satTestDate = "2026-10-03";
    expect(await planAt(source, NOW.toISOString())).toBe("free");
  });

  it("ends at the grant's own expiry when that comes first", async () => {
    const plan = await planOf({
      grants: [cohort({ expiresAt: at(3) })],
      satTestDate: "2026-12-05",
    });
    expect(plan.sources[0]?.endsAt).toBe(at(3));
  });

  it("never ends school, tutor-affiliate or admin grants", async () => {
    const plan = await planOf({
      subscriptions: [sub(TUTOR, "tutor-affiliate")],
      grants: [
        cohort(),
        grant(STUDENT, "practice", "school"),
        grant(STUDENT, "practice", "tutor-affiliate"),
        grant(STUDENT, "pro", "admin"),
      ],
      satTestDate: "2026-10-03",
    });
    expect(plan.planId).toBe("pro");
    expect(plan.sources.map((s) => s.kind).sort()).toEqual(["admin", "school", "tutor-affiliate"]);
  });

  it("looks up the SAT date only for a user with a purchase", async () => {
    const { source } = fakeSource({ grants: [grant(STUDENT, "practice", "school")] });
    const lookup = vi.spyOn(source, "satTestDate");
    expect((await getPlan(STUDENT, source, NOW)).planId).toBe("practice");
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("grantPlan and revokeGrant", () => {
  const school = {
    userId: STUDENT,
    planId: "practice" as const,
    source: "school" as const,
    sourceRef: "school_license_1",
  };

  it("grants a school seat, revokes it, and restores it when granted again", async () => {
    const { source } = fakeSource();
    const created = await grantPlan(school, source, NOW);
    expect(created.status).toBe("created");
    expect((await getPlan(STUDENT, source, NOW)).planId).toBe("practice");

    expect(await revokeGrant({ grantId: created.grant.id }, source, NOW)).toBe(1);
    expect(await revokeGrant({ grantId: created.grant.id }, source, NOW)).toBe(0);
    expect((await getPlan(STUDENT, source, NOW)).planId).toBe("free");

    const restored = await grantPlan(school, source, NOW);
    expect(restored.status).toBe("restored");
    expect(restored.grant.id).toBe(created.grant.id);
    expect((await getPlan(STUDENT, source, NOW)).planId).toBe("practice");
  });

  it.each([
    ["an unknown plan id", { ...school, planId: "platinum" }],
    ["the free plan", { ...school, planId: "free" }],
    ["an unknown source", { ...school, source: "gift" }],
    ["a school seat on pro", { ...school, planId: "pro" }],
    ["a purchase of pro", { ...school, source: "purchase", planId: "pro" }],
    ["a sponsor on a school seat", { ...school, sponsorUserId: TUTOR }],
    ["an affiliate grant with no tutor", { ...school, source: "tutor-affiliate" }],
    [
      "a tutor sponsoring themselves",
      { ...school, source: "tutor-affiliate", userId: TUTOR, sponsorUserId: TUTOR },
    ],
    [
      "an expiry before the start",
      { ...school, startsAt: "2026-11-08T00:00:00Z", expiresAt: "2026-11-01T00:00:00Z" },
    ],
    ["an empty source ref", { ...school, sourceRef: " " }],
    ["an unknown field", { ...school, extra: true }],
  ])("refuses %s", async (_label, input) => {
    await expect(
      grantPlan(input as Parameters<typeof grantPlan>[0], fakeSource().source, NOW)
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("refuses a revoke by a malformed grant id", async () => {
    await expect(revokeGrant({ grantId: "nope" }, fakeSource().source)).rejects.toBeInstanceOf(
      ZodError
    );
  });
});

describe("tutor-affiliate seats", () => {
  const affiliate = (userId: string, sourceRef = `redemption_${userId}`) => ({
    userId,
    planId: "practice" as const,
    source: "tutor-affiliate" as const,
    sourceRef,
    sponsorUserId: TUTOR,
  });
  const roster = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      grant(`user_s${i}`, "practice", "tutor-affiliate", { sourceRef: `redemption_user_s${i}` })
    );

  it("caps a tutor at 50 students", async () => {
    const { source } = fakeSource({
      subscriptions: [sub(TUTOR, "tutor-affiliate")],
      grants: roster(49),
    });
    expect(await canSponsorMore(TUTOR, source, NOW)).toBe(true);
    expect((await grantPlan(affiliate("user_new"), source, NOW)).status).toBe("created");
    expect(await activeSponsoredCount(TUTOR, source, NOW)).toBe(50);
    expect(await canSponsorMore(TUTOR, source, NOW)).toBe(false);
    await expect(grantPlan(affiliate("user_51"), source, NOW)).rejects.toBeInstanceOf(
      PlanGrantError
    );
    // A retry for a student already on the roster still works at the cap.
    expect((await grantPlan(affiliate("user_new"), source, NOW)).status).toBe("existing");
  });

  it("frees a seat when a student is removed or their grant expires", async () => {
    const grants = roster(50);
    grants[0]!.expiresAt = at(-1);
    const { source } = fakeSource({ subscriptions: [sub(TUTOR, "tutor-affiliate")], grants });
    expect(await activeSponsoredCount(TUTOR, source, NOW)).toBe(49);
    await grantPlan(affiliate("user_new"), source, NOW);
    expect(await canSponsorMore(TUTOR, source, NOW)).toBe(false);
    await revokeGrant(
      { source: "tutor-affiliate", sourceRef: "redemption_user_s1", userId: "user_s1" },
      source,
      NOW
    );
    expect(await canSponsorMore(TUTOR, source, NOW)).toBe(true);
    expect(await sponsoredStudentIds(TUTOR, source, NOW)).not.toContain("user_s1");
  });

  it("refuses new students and admin rights when the tutor's subscription lapses", async () => {
    const { source } = fakeSource({
      subscriptions: [sub(TUTOR, "tutor-affiliate", "canceled")],
      grants: roster(3),
    });
    expect(await canSponsorMore(TUTOR, source, NOW)).toBe(false);
    expect(await canManageStudent(TUTOR, "user_s0", source, NOW)).toBe(false);
    await expect(grantPlan(affiliate("user_new"), source, NOW)).rejects.toBeInstanceOf(
      PlanGrantError
    );
  });

  it("gives tutor-admin rights over the tutor's own students only", async () => {
    const { source } = fakeSource({
      subscriptions: [sub(TUTOR, "tutor-affiliate")],
      grants: [...roster(2), grant("user_other", "practice", "school")],
    });
    expect(await canManageStudent(TUTOR, "user_s1", source, NOW)).toBe(true);
    expect(await canManageStudent(TUTOR, "user_other", source, NOW)).toBe(false);
  });
});
