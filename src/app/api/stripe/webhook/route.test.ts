import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  event: {} as { type: string; data: { object: unknown } },
  error: null as null | Error,
  rows: true,
  clientError: false,
  writes: vi.fn(),
  restore: vi.fn(),
  drop: vi.fn(),
  welcome: vi.fn(),
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
vi.mock("@/lib/supabase/queries/cohorts", () => ({
  restoreLastCohort: m.restore,
  dropFromActiveCohort: m.drop,
}));
vi.mock("@/lib/chat/provisioning", () => ({ ensureCohortChannels: async () => undefined }));
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
const subscription = {
  id: "sub_fixture",
  customer: "cus_fixture",
  status: "active",
  trial_end: null,
  metadata: { userId: "synthetic", tier: "group" },
};
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
beforeEach(() => {
  vi.clearAllMocks();
  m.error = null;
  m.rows = true;
  m.clientError = false;
  m.restore.mockResolvedValue(null);
  m.drop.mockResolvedValue(null);
  m.event = { type: events[0], data: { object: subscription } };
  vi.stubGlobal("fetch", () => {
    throw new Error("Network disabled in regression test");
  });
});
function setEvent(type: string) {
  m.event = {
    type,
    data: {
      object:
        type === "charge.refunded"
          ? { metadata: {}, refunds: { data: [{ id: "re_fixture", amount: 100, created: 1 }] } }
          : subscription,
    },
  };
}
it.each(events)("returns retryable failure when %s persistence errors", async (type) => {
  setEvent(type);
  m.error = new Error("Synthetic database rejection");
  expect((await POST(request())).status).toBe(500);
  expect(m.restore).not.toHaveBeenCalled();
  expect(m.drop).not.toHaveBeenCalled();
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
