import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ send: vi.fn(), success: vi.fn(), retry: vi.fn(), booking: vi.fn() }));
vi.mock("@/lib/integrations/resend/client", () => ({
  FROM: "fixture@example.invalid",
  resend: { emails: { send: m.send } },
}));
vi.mock("@/lib/integrations/resend/email-queue", () => ({
  listPendingFailedEmails: async () => [
    {
      id: "fixture-email",
      kind: "booking_confirmation",
      attempts: 1,
      booking_id: "fixture-booking",
      payload: {
        uid: "fixture",
        studentEmail: "fixture@example.invalid",
        studentFirstName: "Fixture",
        studentFullName: "Synthetic Fixture",
        parentEmails: [],
        tutorName: "Synthetic Tutor",
        timeZone: "UTC",
      },
    },
  ],
  markFailedEmailSucceeded: m.success,
  recordFailedEmailRetryOutcome: m.retry,
  deserializeEmailArgs: (args: Record<string, unknown>) => ({
    ...args,
    start: new Date("2026-11-01T10:00:00Z"),
    end: new Date("2026-11-01T11:00:00Z"),
  }),
}));
vi.mock("@/lib/supabase/queries/bookings", () => ({ updateBooking: m.booking }));
vi.mock("@/lib/observability/cron", () => ({
  withCronInstrumentation: (_: string, handler: unknown) => handler,
}));
import { POST } from "./route";
const request = () =>
  new Request("https://example.invalid/api/cron/retry-failed-emails", {
    method: "POST",
    headers: { authorization: "Bearer synthetic-secret" },
  });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "synthetic-secret");
  m.success.mockResolvedValue(undefined);
  m.retry.mockResolvedValue(undefined);
  m.booking.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", () => {
    throw new Error("Network disabled in regression test");
  });
});
it("keeps resolved provider errors pending and never sets successful booking/queue flags", async () => {
  m.send.mockResolvedValue({ data: null, error: { name: "validation_error" } });
  const res = await POST(request());
  expect(await res.json()).toEqual({ processed: 1, succeeded: 0, failed: 1, gaveUp: 0 });
  expect(m.success).not.toHaveBeenCalled();
  expect(m.booking).not.toHaveBeenCalled();
  expect(m.retry).toHaveBeenCalledWith(
    expect.objectContaining({ id: "fixture-email", priorAttempts: 1 })
  );
});
it("marks a provider-accepted email successful", async () => {
  m.send.mockResolvedValue({ data: { id: "accepted-fixture" }, error: null });
  expect(await (await POST(request())).json()).toMatchObject({ succeeded: 1, failed: 0 });
  expect(m.booking).toHaveBeenCalledWith("fixture-booking", { confirmation_email_sent: true });
  expect(m.success).toHaveBeenCalledWith("fixture-email");
});
it("does not report success when the queue success update rejects", async () => {
  m.send.mockResolvedValue({ data: { id: "accepted-fixture" }, error: null });
  m.success.mockRejectedValue(new Error("Synthetic database failure"));
  expect(await (await POST(request())).json()).toMatchObject({ succeeded: 0, failed: 1 });
  expect(m.retry).toHaveBeenCalledOnce();
});
