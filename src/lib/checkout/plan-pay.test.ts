import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  held: [] as { plan_id: string; status: string }[],
  upserts: [] as Record<string, unknown>[],
}));
const client = vi.hoisted(() => ({
  stripe: {
    checkout: { sessions: { retrieve: vi.fn() } },
    customers: { update: vi.fn(async () => ({})) },
  },
  createPlanPaySession: vi.fn(),
}));

vi.mock("@/lib/integrations/stripe/client", () => client);
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert: async (row: Record<string, unknown>) => {
        db.upserts.push(row);
        return { error: null };
      },
      select: () => ({ eq: async () => ({ data: db.held, error: null }) }),
    }),
  }),
}));

import { confirmPlanPaid, planPayment } from "./plan-pay";

const ID = "cs_test_one1234567";
const APP = "https://karmanprep.com";
/** A checkout Stripe holds for user_1's Pro plan. */
const session = (over: Record<string, unknown> = {}) => ({
  id: ID,
  mode: "subscription",
  status: "open",
  client_secret: "secret_one",
  customer: { id: "cus_1", email: "pat@example.com", phone: null },
  metadata: { userId: "user_1", planId: "pro", term: "month" },
  subscription: null,
  ...over,
});
const paid = () =>
  session({
    status: "complete",
    payment_status: "paid",
    customer_details: { phone: "+15125550142" },
    subscription: {
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      metadata: { userId: "user_1", planId: "pro", term: "month" },
      items: { data: [{ current_period_end: 1_800_000_000, price: { metadata: {} } }] },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  db.held = [];
  db.upserts = [];
  client.stripe.checkout.sessions.retrieve.mockResolvedValue(session());
  client.createPlanPaySession.mockResolvedValue({ client_secret: "secret_tap" });
});

describe("the plan payment page", () => {
  it("opens the buyer's own checkout, with a second one for the one-tap buttons", async () => {
    expect(await planPayment("user_1", ID, APP)).toMatchObject({
      state: "open",
      clientSecret: "secret_one",
      tapSecret: "secret_tap",
      email: "pat@example.com",
      phone: "",
      spec: { planId: "pro", term: "month" },
    });
    expect(client.createPlanPaySession.mock.calls[0][0]).toMatchObject({
      customerId: "cus_1",
      userId: "user_1",
      tap: true,
      returnUrl: `${APP}/checkout/pay?s={CHECKOUT_SESSION_ID}`,
    });
  });

  it("is closed to anyone else, to a made-up id and to the tutor plan", async () => {
    expect(await planPayment("user_2", ID, APP)).toBeNull();
    expect(await planPayment("user_1", "not-a-checkout", APP)).toBeNull();
    client.stripe.checkout.sessions.retrieve.mockResolvedValue(
      session({ metadata: { userId: "user_1", planId: "tutor-affiliate", term: "month" } })
    );
    expect(await planPayment("user_1", ID, APP)).toBeNull();
    expect(client.createPlanPaySession).not.toHaveBeenCalled();
  });

  it("says paid, and takes no second payment, once the account holds the plan", async () => {
    db.held = [{ plan_id: "pro", status: "active" }];
    expect(await planPayment("user_1", ID, APP)).toMatchObject({ state: "paid" });
    expect(client.createPlanPaySession).not.toHaveBeenCalled();
  });

  it("records the plan when it is opened for a checkout that is already paid", async () => {
    client.stripe.checkout.sessions.retrieve.mockResolvedValue(paid());
    expect(await planPayment("user_1", ID, APP)).toMatchObject({ state: "paid" });
    expect(db.upserts).toHaveLength(1);
  });

  it("starts again when the checkout ran out unpaid", async () => {
    client.stripe.checkout.sessions.retrieve.mockResolvedValue(session({ status: "expired" }));
    expect(await planPayment("user_1", ID, APP)).toMatchObject({ state: "gone" });
  });
});

describe("the moment a plan is paid", () => {
  it("gives the account the plan without waiting for Stripe's message", async () => {
    client.stripe.checkout.sessions.retrieve.mockResolvedValue(paid());
    expect(await confirmPlanPaid("user_1", ID)).toBe("paid");
    expect(db.upserts[0]).toMatchObject({
      user_id: "user_1",
      plan_id: "pro",
      billing_term: "month",
      status: "active",
      stripe_subscription_id: "sub_1",
    });
    // the mobile number given on the page is kept where the founder reads it
    expect(client.stripe.customers.update).toHaveBeenCalledWith("cus_1", { phone: "+15125550142" });
  });

  it("says a bank payment is on its way, with the plan already on", async () => {
    client.stripe.checkout.sessions.retrieve.mockResolvedValue({
      ...paid(),
      payment_status: "unpaid",
    });
    expect(await confirmPlanPaid("user_1", ID)).toBe("clearing");
    expect(db.upserts).toHaveLength(1);
  });

  it("gives nothing for a checkout that is unpaid, or somebody else's", async () => {
    expect(await confirmPlanPaid("user_1", ID)).toBe(false);
    client.stripe.checkout.sessions.retrieve.mockResolvedValue(paid());
    expect(await confirmPlanPaid("user_2", ID)).toBe(false);
    expect(db.upserts).toHaveLength(0);
  });
});
