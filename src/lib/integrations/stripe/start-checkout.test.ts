import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  me: null as null | { id: string; role: string },
  subs: [] as { stripe_customer_id: string | null; status: string }[],
}));
const client = vi.hoisted(() => ({
  createCheckoutSession: vi.fn(),
  findCustomer: vi.fn(),
  getCheckoutPrice: vi.fn(),
  getOrCreateCustomer: vi.fn(),
}));
const getPlan = vi.hoisted(() => vi.fn());

vi.mock("./client", () => client);
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: async () => ({ primaryEmailAddress: { emailAddress: "mari@example.com" } }),
}));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/analytics/server", () => ({ trackServer: vi.fn() }));
vi.mock("@/lib/plans", () => ({ getPlan }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        is: () => query,
        order: () => query,
        maybeSingle: async () => ({ data: table === "users" ? db.me : null, error: null }),
        then: (done: (value: unknown) => unknown) =>
          done({ data: table === "subscriptions" ? db.subs : [], error: null }),
      };
      return query;
    },
  }),
}));

import { startCheckout } from "./start-checkout";

const APP = "http://localhost:3000";
const TUTOR = { plan: "tutor-affiliate", term: "month" };
const PRACTICE = { plan: "practice", term: "month" };
/** The addresses Stripe was given for the one checkout that opened. */
const sentTo = () => {
  const { successUrl, cancelUrl } = client.createCheckoutSession.mock.calls[0][0];
  return { successUrl, cancelUrl };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", APP);
  db.me = null;
  db.subs = [];
  client.findCustomer.mockResolvedValue(null);
  client.getCheckoutPrice.mockResolvedValue({ id: "price_1" });
  client.getOrCreateCustomer.mockResolvedValue({ id: "cus_1" });
  client.createCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/x" });
  getPlan.mockResolvedValue({ sources: [] });
});

describe("the tutor plan", () => {
  it("sends a new tutor to the page that makes the account a tutor's", async () => {
    expect(await startCheckout("user_1", TUTOR)).toEqual({
      ok: true,
      url: "https://checkout.stripe.com/x",
    });
    expect(sentTo()).toEqual({
      successUrl: `${APP}/tutors/welcome`,
      cancelUrl: `${APP}/for-tutors`,
    });
  });

  it("brings a tutor who is restarting back to their billing page when they leave Stripe", async () => {
    db.me = { id: "u1", role: "affiliate_tutor" };
    db.subs = [{ stripe_customer_id: "cus_9", status: "canceled" }];
    expect((await startCheckout("user_1", TUTOR)).ok).toBe(true);
    expect(sentTo().cancelUrl).toBe(`${APP}/tutor/billing`);
  });

  it("refuses a parent, and a student who holds a plan, before any payment", async () => {
    db.me = { id: "u1", role: "parent" };
    const parent = await startCheckout("user_1", TUTOR);
    expect(parent).toMatchObject({ ok: false, status: 403, redirect: "/tutors/welcome" });

    db.me = { id: "u2", role: "student" };
    getPlan.mockResolvedValue({ sources: [{ kind: "purchase", planId: "private-10" }] });
    expect(await startCheckout("user_2", TUTOR)).toMatchObject({ ok: false, status: 403 });

    expect(client.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("is open to a student record with no plan, and to the testing switch's pick", async () => {
    db.me = { id: "u1", role: "student" };
    getPlan.mockResolvedValue({ sources: [{ kind: "tester", planId: "pro" }] });
    expect((await startCheckout("user_1", TUTOR)).ok).toBe(true);
  });

  it("sends a tutor who already has the plan to their billing page", async () => {
    db.me = { id: "u1", role: "affiliate_tutor" };
    db.subs = [{ stripe_customer_id: "cus_9", status: "past_due" }];
    expect(await startCheckout("user_1", TUTOR)).toMatchObject({
      ok: false,
      status: 409,
      redirect: "/tutor/billing",
    });
  });
});

describe("a student's plan", () => {
  it("is never charged to a parent's own account: the parent portal opens instead", async () => {
    db.me = { id: "u1", role: "parent" };
    for (const plan of [PRACTICE, { plan: "pro", term: "quarter" }]) {
      expect(await startCheckout("user_1", plan)).toMatchObject({
        ok: false,
        status: 409,
        redirect: "/dashboard/parent",
      });
    }
    expect(client.createCheckoutSession).not.toHaveBeenCalled();
    // A private package is one payment, and a parent may make it.
    expect((await startCheckout("user_1", { plan: "private-10" })).ok).toBe(true);
  });

  it("brings a student who leaves Stripe back to Plan and billing in the portal", async () => {
    db.me = { id: "u1", role: "student" };
    expect((await startCheckout("user_1", PRACTICE)).ok).toBe(true);
    expect(sentTo()).toEqual({
      successUrl: `${APP}/dashboard/student?welcome=1`,
      cancelUrl: `${APP}/dashboard/student?page=account&folder=plan`,
    });
  });

  it("brings everyone else back to the Pricing page", async () => {
    expect((await startCheckout("user_1", PRACTICE)).ok).toBe(true);
    expect(sentTo().cancelUrl).toBe(`${APP}/pricing`);
  });
});
