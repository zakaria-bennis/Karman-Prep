import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ lookup: vi.fn(), update: vi.fn(), stripeUpdate: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "synthetic" }) }));
vi.mock("@/lib/integrations/stripe/client", () => ({
  stripe: { subscriptions: { update: m.stripeUpdate } },
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: m.lookup }) }),
      update: m.update,
    }),
  }),
}));
import { POST } from "./route";
const request = () =>
  new Request("https://example.invalid/api/stripe/portal", {
    method: "POST",
    body: JSON.stringify({ action: "cancel" }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  m.lookup.mockResolvedValue({
    data: {
      stripe_customer_id: "cus_fixture",
      stripe_subscription_id: "sub_fixture",
      status: "active",
    },
    error: null,
  });
  m.stripeUpdate.mockResolvedValue({ status: "active", cancel_at_period_end: true });
  vi.stubGlobal("fetch", () => {
    throw new Error("Network disabled in regression test");
  });
});
it.each(["active", "trialing"])(
  "retains %s access when cancellation is scheduled",
  async (status) => {
    m.lookup.mockResolvedValue({
      data: { stripe_customer_id: "cus_fixture", stripe_subscription_id: "sub_fixture", status },
      error: null,
    });
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ cancelAtPeriodEnd: true });
    expect(m.stripeUpdate).toHaveBeenCalledWith("sub_fixture", { cancel_at_period_end: true });
    expect(m.update).not.toHaveBeenCalled();
  }
);
it("does not change entitlement when Stripe fails", async () => {
  m.stripeUpdate.mockRejectedValue(new Error("Synthetic Stripe failure"));
  expect((await POST(request())).status).toBe(500);
  expect(m.update).not.toHaveBeenCalled();
});
it("cannot run the fake-subscription cancellation shortcut in production", async () => {
  m.lookup.mockResolvedValue({
    data: { stripe_customer_id: "cus_fixture", stripe_subscription_id: "sub_dev_fixture" },
    error: null,
  });
  expect((await POST(request())).status).toBe(400);
  expect(m.update).not.toHaveBeenCalled();
  expect(m.stripeUpdate).not.toHaveBeenCalled();
});
