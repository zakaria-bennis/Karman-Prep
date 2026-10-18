import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  error: null as null | { code?: string; message: string },
  lookup: vi.fn(),
  insert: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => {
      const query = {
        select: () => query,
        update: () => query,
        is: () => query,
        eq: () => query,
        maybeSingle: m.lookup,
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ error: m.error }).then(resolve),
        insert: m.insert,
      };
      return query;
    },
  }),
}));
import {
  enqueueFailedEmail,
  markFailedEmailSucceeded,
  recordFailedEmailRetryOutcome,
} from "./email-queue";
beforeEach(() => {
  vi.clearAllMocks();
  m.error = null;
  m.lookup.mockResolvedValue({ data: null, error: null });
  m.insert.mockResolvedValue({ error: null });
});
it("propagates failure to persist successful queue state", async () => {
  m.error = { message: "Synthetic persistence failure" };
  await expect(markFailedEmailSucceeded("fixture")).rejects.toEqual(m.error);
});
it.each([1, 5])(
  "propagates retry/give-up persistence errors at attempt %s",
  async (priorAttempts) => {
    m.error = { message: "Synthetic persistence failure" };
    await expect(
      recordFailedEmailRetryOutcome({
        id: "fixture",
        priorAttempts,
        error: new Error("Send rejected"),
      })
    ).rejects.toEqual(m.error);
  }
);
it("does not pretend a failed insert created a durable retry", async () => {
  m.insert.mockResolvedValue({ error: { message: "Synthetic insert failure" } });
  await expect(
    enqueueFailedEmail({
      kind: "booking_confirmation",
      payload: {},
      dedupeKey: "fixture",
      error: new Error("Send rejected"),
    })
  ).rejects.toMatchObject({ message: "Synthetic insert failure" });
});
it("accepts a unique-key race only after finding its durable active row", async () => {
  m.insert.mockResolvedValue({ error: { code: "23505", message: "Synthetic race" } });
  m.lookup
    .mockResolvedValueOnce({ data: null, error: null })
    .mockResolvedValueOnce({ data: { id: "existing-fixture" }, error: null });
  await expect(
    enqueueFailedEmail({
      kind: "booking_confirmation",
      payload: {},
      dedupeKey: "fixture",
      error: new Error("Send rejected"),
    })
  ).resolves.toBeUndefined();
});
