import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  event: {} as { type: string; data: { object: unknown } },
  error: null as null | Error,
  rows: true,
  clientError: false,
  writes: vi.fn(),
  welcome: vi.fn(),
  grant: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({
  setTag: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));
vi.mock("@/lib/integrations/stripe/client", () => ({
  stripe: { webhooks: { constructEventAsync: async () => m.event } },
}));
vi.mock("@/lib/integrations/resend/emails", () => ({ sendWelcomeEmail: m.welcome }));
vi.mock("@/lib/plans", () => ({ recordPurchaseGrant: m.grant }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => {
    if (m.clientError) throw new Error("Synthetic client failure");
    return {
      from: (table: string) => {
        const query = {
          upsert: (payload: unknown, options: unknown) => {
            m.writes(table, "upsert", payload, options);
            return query;
          },
          update: (payload: unknown) => {
            m.writes(table, "update", payload);
            return query;
          },
          select: () => query,
          eq: () => query,
          single: async () => ({
            data: m.rows ? { id: "persisted-fixture" } : null,
            error: m.error,
          }),
          maybeSingle: async () => ({ data: null, error: null }),
        };
        return query;
      },
    };
  },
}));
import { POST } from "./route";
const PERIOD_END = 1798761600; // 2027-01-01T00:00:00Z
const subscription = (
  meta: Record<string, string> = { userId: "synthetic", planId: "practice", term: "month" },
  priceMeta: Record<string, string> = { plan_id: "practice", term: "month" }
) => ({
  id: "sub_fixture",
  customer: "cus_fixture",
  status: "active",
  metadata: meta,
  items: { data: [{ current_period_end: PERIOD_END, price: { metadata: priceMeta } }] },
});
const session = (overrides: Record<string, unknown> = {}) => ({
  id: "cs_fixture",
  mode: "payment",
  payment_status: "paid",
  metadata: { userId: "synthetic", planId: "cohort", term: "once" },
  ...overrides,
});
const request = () =>
  new Request("https://example.invalid/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": "synthetic-verified-by-mock" },
    body: "{}",
  });
const events = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "charge.refunded",
];
function setEvent(type: string, object?: unknown) {
  m.event = {
    type,
    data: {
      object:
        object ??
        (type === "charge.refunded"
          ? { metadata: {}, refunds: { data: [{ id: "re_fixture", amount: 100, created: 1 }] } }
          : subscription()),
    },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  m.error = null;
  m.rows = true;
  m.clientError = false;
  m.grant.mockResolvedValue(undefined);
  setEvent(events[0]);
  vi.stubGlobal("fetch", () => {
    throw new Error("Network disabled in regression test");
  });
});
it.each(events)("returns retryable failure when %s persistence errors", async (type) => {
  setEvent(type);
  m.error = new Error("Synthetic database rejection");
  expect((await POST(request())).status).toBe(500);
  expect(m.welcome).not.toHaveBeenCalled();
});
it.each(events)("does not acknowledge an unpersisted %s row", async (type) => {
  setEvent(type);
  m.rows = false;
  expect((await POST(request())).status).toBe(500);
});
it.each(events)("acknowledges a successfully persisted %s", async (type) => {
  setEvent(type);
  const res = await POST(request());
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ received: true });
});
it("uses Stripe subscription identity for idempotent repeat upserts", async () => {
  await POST(request());
  await POST(request());
  expect(m.writes).toHaveBeenCalledWith(
    "subscriptions",
    "upsert",
    expect.objectContaining({ stripe_subscription_id: "sub_fixture" }),
    { onConflict: "stripe_subscription_id" }
  );
});
it("stores the plan id, billing term, status and period end", async () => {
  await POST(request());
  expect(m.writes).toHaveBeenCalledWith(
    "subscriptions",
    "upsert",
    {
      user_id: "synthetic",
      stripe_customer_id: "cus_fixture",
      stripe_subscription_id: "sub_fixture",
      plan_id: "practice",
      billing_term: "month",
      status: "active",
      current_period_end: "2027-01-01T00:00:00.000Z",
      canceled_at: null,
    },
    { onConflict: "stripe_subscription_id" }
  );
});
it("takes the plan from the price after a plan switch in the Stripe portal", async () => {
  setEvent(
    "customer.subscription.updated",
    subscription(
      { userId: "synthetic", planId: "practice", term: "month" },
      { plan_id: "pro", term: "quarter" }
    )
  );
  expect((await POST(request())).status).toBe(200);
  expect(m.writes).toHaveBeenCalledWith(
    "subscriptions",
    "upsert",
    expect.objectContaining({ plan_id: "pro", billing_term: "quarter" }),
    { onConflict: "stripe_subscription_id" }
  );
});
it.each([
  ["no userId", { planId: "practice", term: "month" }, {}],
  ["an old tier id", { userId: "synthetic", tier: "group" }, {}],
  ["a one-time plan", { userId: "synthetic", planId: "cohort", term: "month" }, {}],
  ["no term", { userId: "synthetic", planId: "pro" }, {}],
])("skips a subscription with %s without writing", async (_label, meta, priceMeta) => {
  setEvent("customer.subscription.created", subscription(meta, priceMeta));
  const res = await POST(request());
  expect(res.status).toBe(200);
  expect(m.writes).not.toHaveBeenCalled();
  expect(m.welcome).not.toHaveBeenCalled();
});
it("records a purchase grant for a paid one-payment checkout", async () => {
  setEvent("checkout.session.completed", session());
  expect((await POST(request())).status).toBe(200);
  expect(m.grant).toHaveBeenCalledWith({
    userId: "synthetic",
    planId: "cohort",
    checkoutSessionId: "cs_fixture",
  });
});
it.each(["private-10", "private-20"])("records a %s purchase grant", async (planId) => {
  setEvent(
    "checkout.session.async_payment_succeeded",
    session({ metadata: { userId: "synthetic", planId, term: "once" } })
  );
  expect((await POST(request())).status).toBe(200);
  expect(m.grant).toHaveBeenCalledWith(expect.objectContaining({ planId }));
});
it("returns retryable failure when the purchase grant cannot be saved", async () => {
  setEvent("checkout.session.completed", session());
  m.grant.mockRejectedValue(new Error("Synthetic grant failure"));
  expect((await POST(request())).status).toBe(500);
});
it.each([
  ["a subscription checkout", { mode: "subscription" }],
  ["an unpaid checkout", { payment_status: "unpaid" }],
  ["a checkout with a renewing plan id", { metadata: { userId: "synthetic", planId: "pro" } }],
  ["a checkout without a userId", { metadata: { planId: "cohort" } }],
])("does not grant anything for %s", async (_label, overrides) => {
  setEvent("checkout.session.completed", session(overrides));
  expect((await POST(request())).status).toBe(200);
  expect(m.grant).not.toHaveBeenCalled();
});
it("preserves retryable failure for unexpected errors outside the handler try block", async () => {
  m.clientError = true;
  expect((await POST(request())).status).toBe(500);
});
it("rejects an invalid signature before persistence", async () => {
  const res = await POST(
    new Request("https://example.invalid/api/stripe/webhook", { method: "POST", body: "{}" })
  );
  expect(res.status).toBe(400);
  expect(m.writes).not.toHaveBeenCalled();
});
