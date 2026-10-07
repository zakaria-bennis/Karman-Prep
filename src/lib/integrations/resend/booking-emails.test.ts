import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("./client", () => ({
  FROM: "fixture@example.invalid",
  resend: { emails: { send: m.send } },
}));
import {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendBookingReschedule,
} from "./booking-emails";
const base = {
  uid: "synthetic",
  studentEmail: "fixture@example.invalid",
  studentFirstName: "Fixture",
  studentFullName: "Synthetic Fixture",
  parentEmails: [],
  tutorName: "Synthetic Tutor",
  start: new Date("2026-11-01T10:00:00Z"),
  end: new Date("2026-11-01T11:00:00Z"),
  timeZone: "UTC",
};
const sends = [
  () => sendBookingConfirmation(base),
  () =>
    sendBookingCancellation({
      ...base,
      withinWindow: false,
      creditForfeited: false,
      planTier: "elite",
    }),
  () => sendBookingReschedule({ ...base, oldStart: base.start }),
];
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", () => {
    throw new Error("Network disabled in regression test");
  });
});
it.each(sends)("throws on a resolved provider error for every booking email", async (send) => {
  m.send.mockResolvedValue({
    data: null,
    error: { name: "validation_error", message: "Synthetic rejection" },
  });
  await expect(send()).rejects.toThrow("Email provider rejected send");
});
it.each(sends)("requires an accepted email ID", async (send) => {
  m.send.mockResolvedValue({ data: null, error: null });
  await expect(send()).rejects.toThrow("did not confirm acceptance");
});
it.each(sends)("preserves accepted sends, recipients and calendar attachment", async (send) => {
  m.send.mockResolvedValue({ data: { id: "synthetic-email" }, error: null });
  expect((await send()).data?.id).toBe("synthetic-email");
  expect(m.send.mock.calls[0][0]).toMatchObject({
    to: [base.studentEmail],
    attachments: [expect.objectContaining({ filename: expect.stringMatching(/\.ics$/) })],
  });
});
