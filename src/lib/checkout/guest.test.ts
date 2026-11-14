import { beforeEach, describe, expect, it, vi } from "vitest";

const stripe = vi.hoisted(() => ({
  checkout: { sessions: { retrieve: vi.fn(), update: vi.fn() } },
  subscriptions: { update: vi.fn() },
  customers: { update: vi.fn() },
}));
const createGuestCheckoutSession = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() => vi.fn());
const usersWithEmail = vi.hoisted(() => ({ rows: [] as { id: string }[] }));
const recordPurchaseGrant = vi.hoisted(() => vi.fn());

vi.mock("@/lib/integrations/stripe/client", () => ({ stripe, createGuestCheckoutSession }));
vi.mock("@/lib/integrations/resend/client", () => ({
  FROM: "hello@karmanprep.com",
  resend: { emails: { send: vi.fn() } },
}));
vi.mock("@/lib/plans", () => ({ recordPurchaseGrant }));
vi.mock("@/lib/analytics/server", () => ({ trackServer: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) =>
      table === "subscriptions"
        ? { upsert }
        : {
            select: () => ({
              ilike: () => ({ limit: async () => ({ data: usersWithEmail.rows }) }),
            }),
          },
  }),
}));

import { claimGuestPurchase, guestPurchase, startGuestCheckout } from "./guest";

const ID = "cs_test_a1B2c3D4e5F6g7H8";
const paid = (over: Record<string, unknown> = {}) => ({
  id: ID,
  status: "complete",
  payment_status: "paid",
  customer: "cus_1",
  customer_details: { email: "Mari@Example.com" },
  metadata: { guest: "1", planId: "pro", term: "month" },
  subscription: {
    id: "sub_1",
    status: "active",
    items: { data: [{ current_period_end: 1800000000 }] },
  },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  usersWithEmail.rows = [];
  upsert.mockResolvedValue({ error: null });
});

describe("paying before having an account", () => {
  it("opens Stripe for Practice, Pro and the private packages, and for nothing else", async () => {
    createGuestCheckoutSession.mockResolvedValue({ url: "https://checkout.stripe.com/x" });
    expect(await startGuestCheckout({ plan: "pro", term: "month" })).toBe(
      "https://checkout.stripe.com/x"
    );
    expect(await startGuestCheckout({ plan: "private-10" })).toBeTruthy();
    for (const no of [
      { plan: "cohort" },
      { plan: "tutor-affiliate" },
      { plan: "pro" }, // no term
      { plan: "gold" },
    ])
      expect(await startGuestCheckout(no)).toBeNull();
  });

  it("knows a paid purchase from a link that is not one", async () => {
    stripe.checkout.sessions.retrieve.mockResolvedValue(paid());
    expect(await guestPurchase(ID)).toEqual({
      state: "open",
      email: "mari@example.com",
      hasAccount: false,
    });
    usersWithEmail.rows = [{ id: "u1" }];
    expect(await guestPurchase(ID)).toMatchObject({ state: "open", hasAccount: true });

    for (const not of [
      paid({ payment_status: "unpaid" }),
      paid({ status: "open" }),
      paid({ metadata: { userId: "user_1", planId: "pro", term: "month" } }), // a signed-in checkout
    ]) {
      stripe.checkout.sessions.retrieve.mockResolvedValue(not);
      expect(await guestPurchase(ID)).toEqual({ state: "missing" });
    }
    expect(await guestPurchase("not-a-session")).toEqual({ state: "missing" });
    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalledWith("not-a-session", {
      expand: ["subscription"],
    });
  });

  it("gives a renewing plan to the account that claims it, once", async () => {
    stripe.checkout.sessions.retrieve.mockResolvedValue(paid());
    expect(await claimGuestPurchase(ID, "user_1")).toBe("ok");
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user_1",
        stripe_subscription_id: "sub_1",
        plan_id: "pro",
        billing_term: "month",
        status: "active",
      }),
      { onConflict: "stripe_subscription_id" }
    );
    expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_1", {
      metadata: { userId: "user_1", planId: "pro", term: "month" },
    });
    expect(stripe.customers.update).toHaveBeenCalledWith("cus_1", {
      metadata: { userId: "user_1" },
    });
    expect(stripe.checkout.sessions.update).toHaveBeenCalledWith(ID, {
      metadata: { guest: "1", planId: "pro", term: "month", claimedBy: "user_1" },
    });

    // the same account again is fine; another account is refused and nothing is written
    const claimed = paid({
      metadata: { guest: "1", planId: "pro", term: "month", claimedBy: "user_1" },
    });
    stripe.checkout.sessions.retrieve.mockResolvedValue(claimed);
    expect(await claimGuestPurchase(ID, "user_1")).toBe("ok");
    vi.clearAllMocks();
    stripe.checkout.sessions.retrieve.mockResolvedValue(claimed);
    expect(await claimGuestPurchase(ID, "user_2")).toBe("taken");
    expect(upsert).not.toHaveBeenCalled();
    expect(stripe.subscriptions.update).not.toHaveBeenCalled();
  });

  it("grants a one-payment plan by its checkout", async () => {
    stripe.checkout.sessions.retrieve.mockResolvedValue(
      paid({ metadata: { guest: "1", planId: "private-10", term: "once" }, subscription: null })
    );
    expect(await claimGuestPurchase(ID, "user_1")).toBe("ok");
    expect(recordPurchaseGrant).toHaveBeenCalledWith({
      userId: "user_1",
      planId: "private-10",
      checkoutSessionId: ID,
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("refuses a link that is not a paid guest purchase", async () => {
    stripe.checkout.sessions.retrieve.mockRejectedValue(new Error("No such session"));
    expect(await claimGuestPurchase(ID, "user_1")).toBe("missing");
  });
});
