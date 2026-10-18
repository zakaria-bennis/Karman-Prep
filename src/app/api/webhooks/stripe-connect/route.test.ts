import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  processingError: false,
  saveError: false,
  nextRow: true,
  attempts: 0,
}));
vi.mock("@sentry/nextjs", () => ({
  setTag: vi.fn(),
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));
vi.mock("@/lib/integrations/resend/client", () => ({
  FROM: "fixture@example.invalid",
  resend: { emails: { send: vi.fn() } },
}));
vi.mock("stripe", () => ({
  default: class {
    static createFetchHttpClient() {
      return {};
    }
    webhooks = {
      constructEvent: () => ({
        id: "evt_fixture",
        type: "account.updated",
        data: { object: { id: "acct_fixture", payouts_enabled: true } },
      }),
    };
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      let updating = false;
      const query = {
        insert: () => query,
        select: () => query,
        update: () => {
          updating = true;
          return query;
        },
        eq: () =>
          table === "users"
            ? Promise.resolve({
                error: m.processingError ? new Error("Synthetic processing failure") : null,
              })
            : query,
        single: async () => ({
          data: !updating
            ? { id: "row_fixture", attempts: m.attempts, processed: false, gave_up_at: null }
            : m.nextRow
              ? { id: "row_fixture" }
              : null,
          error: updating && m.saveError ? new Error("Synthetic persistence failure") : null,
        }),
      };
      return query;
    },
  }),
}));
import { POST } from "./route";
const request = () =>
  new Request("https://example.invalid/api/webhooks/stripe-connect", {
    method: "POST",
    headers: { "stripe-signature": "synthetic" },
    body: "{}",
  });
beforeEach(() => {
  vi.clearAllMocks();
  m.processingError = false;
  m.saveError = false;
  m.nextRow = true;
  m.attempts = 0;
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_synthetic");
  vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "synthetic");
  vi.stubEnv("ADMIN_NOTIFICATION_EMAIL", "");
  vi.stubGlobal("fetch", () => {
    throw new Error("Network disabled in regression test");
  });
});
it("acknowledges processed Connect events after successful state persistence", async () => {
  expect((await POST(request())).status).toBe(200);
});
it.each(["success", "retry", "give-up"])(
  "does not acknowledge failed %s state persistence",
  async (phase) => {
    m.processingError = phase !== "success";
    m.attempts = phase === "give-up" ? 20 : 0;
    m.saveError = true;
    expect((await POST(request())).status).toBe(500);
  }
);
it("does not acknowledge missing state rows", async () => {
  m.nextRow = false;
  expect((await POST(request())).status).toBe(500);
});
