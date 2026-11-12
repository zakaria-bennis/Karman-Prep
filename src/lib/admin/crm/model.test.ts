import { describe, expect, it } from "vitest";
import type { GrantInfo } from "@/lib/admin/plans";
import { filterContacts, filterHref, isContactRouteId, parseFilters } from "./filters";
import { buildContacts, deriveStage, emailKey, mergeContacts, sourceKey } from "./model";
import { formatCents, monthsBetween, periodsStarted, purchaseCents } from "./money";
import type { CrmRaw, CrmSubscription, RawUser } from "./types";

const NOW = new Date("2026-11-12T12:00:00Z");
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function raw(over: Partial<CrmRaw> = {}): CrmRaw {
  return {
    users: [],
    leads: [],
    subs: [],
    grants: [],
    refunds: [],
    parentLinks: [],
    schools: [],
    schoolMembers: [],
    affiliates: [],
    redemptions: [],
    waitlist: [],
    cohortMembers: [],
    seats: [],
    crm: { contacts: [], tags: [], tasks: [], notes: [] },
    ...over,
  };
}

function user(
  n: number,
  role: string,
  email: string | null,
  extra: Partial<RawUser> = {}
): RawUser {
  return {
    id: U(n),
    clerkId: `clerk_${n}`,
    role,
    email,
    firstName: `First${n}`,
    lastName: null,
    createdAt: `2026-10-0${(n % 9) + 1}T00:00:00Z`,
    onboardedAt: null,
    heardAbout: null,
    parentEmail: null,
    ...extra,
  };
}

function sub(userId: string, over: Partial<CrmSubscription> = {}): CrmSubscription {
  return {
    id: `sub-${userId}`,
    userId,
    stripeSubscriptionId: "sub_x",
    planId: "practice",
    rawPlan: "practice",
    fromLegacyTier: false,
    hasPlanColumn: true,
    billingTerm: "month",
    status: "active",
    currentPeriodEnd: "2026-12-12T00:00:00Z",
    createdAt: "2026-09-12T00:00:00Z",
    canceledAt: null,
    trialEnd: null,
    stripeCustomerId: "cus_x",
    ...over,
  };
}

function grant(userId: string, over: Partial<GrantInfo> = {}): GrantInfo {
  return {
    id: `g-${userId}`,
    userId,
    planId: "cohort",
    source: "purchase",
    sourceRef: "cs_x",
    sponsorUserId: null,
    startsAt: "2026-10-01T00:00:00Z",
    expiresAt: null,
    revokedAt: null,
    ...over,
  };
}

describe("deriveStage", () => {
  it("is a lead with nothing, and talking after an application or a call request", () => {
    expect(deriveStage({ subs: [], grants: [], now: NOW })).toBe("lead");
    expect(deriveStage({ subs: [], grants: [], now: NOW, sources: ["newsletter"] })).toBe("lead");
    expect(deriveStage({ subs: [], grants: [], now: NOW, sources: ["cohort"] })).toBe("talking");
    expect(deriveStage({ subs: [], grants: [], now: NOW, sources: ["private"] })).toBe("talking");
  });

  it("is enrolled with a live subscription or a live private purchase", () => {
    expect(deriveStage({ subs: [sub("a")], grants: [], now: NOW })).toBe("enrolled");
    expect(
      deriveStage({ subs: [], grants: [grant("a", { planId: "private-10" })], now: NOW })
    ).toBe("enrolled");
  });

  it("is a deposit when the cohort is bought but the student isn't placed yet", () => {
    expect(deriveStage({ subs: [], grants: [grant("a")], now: NOW })).toBe("deposit");
    expect(deriveStage({ subs: [], grants: [grant("a")], now: NOW, inCohort: true })).toBe(
      "enrolled"
    );
  });

  it("is churned once everything paid has ended", () => {
    const ended = sub("a", { status: "canceled", canceledAt: "2026-10-20T00:00:00Z" });
    expect(deriveStage({ subs: [ended], grants: [], now: NOW, sources: ["private"] })).toBe(
      "churned"
    );
    const revoked = grant("a", { revokedAt: "2026-10-05T00:00:00Z" });
    expect(deriveStage({ subs: [], grants: [revoked], now: NOW })).toBe("churned");
  });

  it("does not count a checkout that never paid", () => {
    expect(deriveStage({ subs: [sub("a", { status: "incomplete" })], grants: [], now: NOW })).toBe(
      "lead"
    );
  });

  it("follows the school's billing for school contacts", () => {
    expect(deriveStage({ subs: [], grants: [], now: NOW, schoolStatuses: ["free_year"] })).toBe(
      "enrolled"
    );
    expect(deriveStage({ subs: [], grants: [], now: NOW, schoolStatuses: ["canceled"] })).toBe(
      "churned"
    );
  });

  it("needs a live sponsor for a tutor-code seat", () => {
    const seat = grant("kid", {
      planId: "practice",
      source: "tutor-affiliate",
      sponsorUserId: "tutor",
    });
    expect(deriveStage({ subs: [], grants: [seat], now: NOW })).toBe("lead");
    expect(deriveStage({ subs: [], grants: [seat], now: NOW, sponsors: new Set(["tutor"]) })).toBe(
      "enrolled"
    );
  });
});

describe("deriveStage with cohorts and school seats", () => {
  it("counts a place in a running cohort as enrolled, and a finished one as churned", () => {
    expect(deriveStage({ subs: [], grants: [], now: NOW, inCohort: true })).toBe("enrolled");
    expect(deriveStage({ subs: [], grants: [], now: NOW, pastCohort: true })).toBe("churned");
  });

  it("enrolls a student with a live seat at a school in its free year", () => {
    const [kid] = buildContacts(
      raw({
        users: [user(1, "student", "kid@school.test")],
        schools: [
          {
            id: "sch",
            name: "Test School",
            billingStatus: "free_year",
            freeUntil: null,
            createdAt: null,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
          },
        ],
        seats: [
          {
            schoolId: "sch",
            studentUserId: U(1),
            joinedAt: "2026-10-01T00:00:00Z",
            removedAt: null,
          },
        ],
      }),
      NOW
    );
    expect(kid.stage).toBe("enrolled");
    expect(kid.plan).toBe("school");
    expect(kid.sources).toContain("school");
  });
});

describe("mergeContacts (de-duplication)", () => {
  it("keys by lower-cased, trimmed email", () => {
    expect(emailKey("  Mom@Example.COM ")).toBe("mom@example.com");
    expect(emailKey("not an email")).toBeNull();
    expect(emailKey(null)).toBeNull();
  });

  it("joins a lead to the account with the same email, whatever the case", () => {
    const contacts = mergeContacts(
      raw({
        users: [user(1, "parent", "Mom@Example.com")],
        leads: [
          {
            id: U(50),
            email: "mom@example.com",
            source: "private",
            name: "Mom",
            role: null,
            details: {},
            createdAt: "2026-09-01T00:00:00Z",
            updatedAt: null,
          },
        ],
      })
    );
    expect(contacts).toHaveLength(1);
    expect(contacts[0].id).toBe(`u-${U(1)}`);
    expect(contacts[0].ids).toEqual([`u-${U(1)}`, `l-${U(50)}`]);
    expect(contacts[0].leads).toHaveLength(1);
  });

  it("merges one person's leads from several forms into one lead contact", () => {
    const lead = (n: number, source: string) => ({
      id: U(n),
      email: "a@b.co",
      source,
      name: null,
      role: null,
      details: {},
      createdAt: `2026-09-0${n - 49}T00:00:00Z`,
      updatedAt: null,
    });
    const contacts = mergeContacts(
      raw({ leads: [lead(51, "newsletter"), lead(50, "cohort-march-2027")] })
    );
    expect(contacts).toHaveLength(1);
    expect(contacts[0].type).toBe("lead");
    expect(contacts[0].id).toBe(`l-${U(50)}`);
  });

  it("merges duplicate accounts of the same kind, but keeps a parent and a student apart", () => {
    const contacts = mergeContacts(
      raw({
        users: [
          user(1, "student", "kid@x.com"),
          user(2, "student", "KID@x.com"),
          user(3, "parent", "kid@x.com"),
        ],
      })
    );
    expect(contacts).toHaveLength(2);
    const kid = contacts.find((c) => c.type === "student");
    const parent = contacts.find((c) => c.type === "parent");
    expect(kid?.accounts).toHaveLength(2);
    expect(kid?.key).toBe("kid@x.com");
    expect(parent?.key).toBe(`user:${U(3)}`);
  });

  it("leaves out staff, and lists school contacts and affiliate tutors", () => {
    const contacts = mergeContacts(
      raw({
        users: [
          user(1, "admin", "a@k.co"),
          user(2, "tutor", "t@k.co"),
          user(3, "tutor", "teach@s.edu"),
        ],
        schoolMembers: [{ schoolId: "s", userId: U(3), role: "admin", createdAt: null }],
        affiliates: [{ id: "aff", tutorUserId: U(2), createdAt: null }],
      })
    );
    expect(contacts.map((c) => c.type).sort()).toEqual(["school", "tutor"]);
  });

  it("adds the parent email a student gave as a parent contact, once", () => {
    const contacts = mergeContacts(
      raw({
        users: [
          user(1, "student", "k1@x.com", { parentEmail: "Dad@x.com" }),
          user(2, "student", "k2@x.com", { parentEmail: "dad@x.com" }),
        ],
      })
    );
    const dad = contacts.filter((c) => c.key === "dad@x.com");
    expect(dad).toHaveLength(1);
    expect(dad[0].type).toBe("parent");
    expect(dad[0].ids).toEqual([`pe-${U(1)}`, `pe-${U(2)}`]);
  });
});

describe("buildContacts", () => {
  it("lets a hand-set stage win and shows the family's furthest stage on the parent", () => {
    const contacts = buildContacts(
      raw({
        users: [user(1, "parent", "p@x.com"), user(2, "student", "s@x.com")],
        parentLinks: [{ parentId: U(1), studentId: U(2), createdAt: "2026-10-03T00:00:00Z" }],
        subs: [sub("clerk_2")],
        crm: {
          contacts: [
            {
              key: "s@x.com",
              stageOverride: "churned",
              stageSetAt: NOW.toISOString(),
              ownerUserId: null,
            },
          ],
          tags: [{ key: "p@x.com", tag: "hot" }],
          tasks: [
            {
              id: "t",
              key: "p@x.com",
              title: "Call",
              dueOn: "2026-11-01",
              doneAt: null,
              createdAt: "2026-10-30T00:00:00Z",
            },
          ],
          notes: [],
        },
      }),
      NOW
    );
    const parent = contacts.find((c) => c.type === "parent")!;
    const kid = contacts.find((c) => c.type === "student")!;
    expect(kid.derivedStage).toBe("enrolled");
    expect(kid.stage).toBe("churned");
    expect(kid.stageManual).toBe(true);
    expect(parent.stage).toBe("enrolled");
    expect(parent.tags).toEqual(["hot"]);
    expect(parent.overdueTasks).toBe(1);
    expect(parent.links.some((l) => l.contactId === kid.id)).toBe(true);
  });

  it("estimates what was paid from list prices, minus exact refunds", () => {
    const [c] = buildContacts(
      raw({
        users: [user(1, "student", "s@x.com")],
        subs: [sub("clerk_1", { createdAt: "2026-09-12T00:00:00Z" })],
        grants: [grant("clerk_1", { planId: "private-10" })],
        refunds: [
          {
            id: "r",
            userId: U(1),
            amountCents: 3900,
            issuedAt: "2026-10-01T00:00:00Z",
            stripeRefundId: "re_1",
          },
        ],
      }),
      NOW
    );
    // three monthly Practice payments (Sep 12, Oct 12, Nov 12) + Private 10 - one refund
    expect(c.paidCents).toBe(3 * 3900 + 149500 - 3900);
    expect(c.payments.some((p) => p.refs.some((r) => r.value === "re_1"))).toBe(true);
  });
});

describe("money", () => {
  it("counts billing periods started", () => {
    expect(monthsBetween(new Date("2026-01-31"), new Date("2026-02-28"))).toBe(0);
    expect(periodsStarted(sub("a", { createdAt: "2026-11-01T00:00:00Z" }), NOW)).toBe(1);
    expect(
      periodsStarted(sub("a", { createdAt: "2026-05-12T00:00:00Z", billingTerm: "quarter" }), NOW)
    ).toBe(3);
    expect(
      periodsStarted(
        sub("a", { createdAt: "2026-08-12T00:00:00Z", canceledAt: "2026-09-20T00:00:00Z" }),
        NOW
      )
    ).toBe(2);
    expect(periodsStarted(sub("a", { status: "incomplete" }), NOW)).toBe(0);
  });

  it("prices one-time plans from the offer and formats cents", () => {
    expect(purchaseCents("private-20")).toBe(249500);
    expect(purchaseCents("pro")).toBeNull();
    expect(formatCents(149500)).toBe("$1,495");
    expect(formatCents(-3950)).toBe("-$39.50");
    expect(formatCents(null)).toBe("—");
  });
});

describe("filters", () => {
  it("reads only known values from the address bar", () => {
    const f = parseFilters({
      type: "parent",
      stage: "nope",
      plan: "pro",
      source: "all",
      tag: "HOT",
      view: "board",
    });
    expect(f).toMatchObject({
      type: "parent",
      stage: "all",
      plan: "pro",
      source: "",
      tag: "hot",
      view: "board",
    });
    expect(filterHref(f, { stage: "deposit" })).toBe(
      "/admin/crm?view=board&type=parent&stage=deposit&plan=pro&tag=hot"
    );
    expect(filterHref(parseFilters({}), {})).toBe("/admin/crm");
  });

  it("filters by type, source, plan, tag and search", () => {
    const contacts = buildContacts(
      raw({
        users: [user(1, "student", "sam@x.com")],
        subs: [sub("clerk_1")],
        leads: [
          {
            id: U(9),
            email: "lee@y.com",
            source: "cohort-march-2027",
            name: "Lee",
            role: null,
            details: {},
            createdAt: "2026-10-01T00:00:00Z",
            updatedAt: null,
          },
        ],
      }),
      NOW
    );
    const f = parseFilters({});
    expect(filterContacts(contacts, { ...f, type: "lead" }).map((c) => c.name)).toEqual(["Lee"]);
    expect(filterContacts(contacts, { ...f, source: "cohort" })).toHaveLength(1);
    expect(filterContacts(contacts, { ...f, plan: "practice" })[0].email).toBe("sam@x.com");
    expect(filterContacts(contacts, { ...f, plan: "none" })[0].name).toBe("Lee");
    expect(filterContacts(contacts, { ...f, q: "SAM" })).toHaveLength(1);
    expect(filterContacts(contacts, { ...f, stage: "talking" })[0].name).toBe("Lee");
  });

  it("accepts only u-, l- and pe- route ids", () => {
    expect(isContactRouteId(`u-${U(1)}`)).toBe(true);
    expect(isContactRouteId(`pe-${U(1)}`)).toBe(true);
    expect(isContactRouteId("x-1")).toBe(false);
    expect(sourceKey("cohort-may-2027")).toBe("cohort");
  });
});
