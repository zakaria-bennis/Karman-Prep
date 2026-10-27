import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ upsert: vi.fn(), error: null as null | { message: string } }));
const mail = vi.hoisted(() => ({ send: vi.fn(), waitlist: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert: (...a: unknown[]) => (db.upsert(...a), Promise.resolve({ error: db.error })),
    }),
  }),
}));
vi.mock("@/lib/integrations/resend/client", () => ({
  resend: { emails: { send: mail.send } },
  FROM: "hello@karmanprep.com",
}));
vi.mock("@/lib/integrations/resend/emails", () => ({ addToWaitlist: mail.waitlist }));

import { submitLead } from "./lead-actions";

beforeEach(() => {
  vi.clearAllMocks();
  db.error = null;
  mail.send.mockResolvedValue({ data: { id: "1" }, error: null });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test";
  process.env.ADMIN_NOTIFICATION_EMAIL = "admin@example.com";
  process.env.RESEND_API_KEY = "re_test";
});

describe("submitLead", () => {
  it("records a program application with its answers, under the cohort's source", async () => {
    const r = await submitLead("apply", {
      email: " Parent@Example.com ",
      latest: "1180",
      target: "1400",
      date: "March 1",
      company: "",
    });
    expect(r).toEqual({ ok: true });
    expect(db.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "parent@example.com",
        source: "cohort-may-2027",
        details: { latest: "1180", target: "1400", startDate: "March 1" },
      }),
      { onConflict: "email,source" }
    );
    expect(mail.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "admin@example.com", replyTo: "parent@example.com" })
    );
  });

  it("refuses what the screen refuses, field by field, and writes nothing", async () => {
    const r = await submitLead("apply", {
      email: "parent@",
      latest: "1234",
      target: "",
      date: "January 4",
    });
    expect(r.ok).toBe(false);
    expect(Object.keys((r as { fields: object }).fields).sort()).toEqual([
      "email",
      "latest",
      "target",
    ]);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it("only accepts the dates the form offers", async () => {
    const r = await submitLead("call", { email: "a@b.co", latest: "", date: "Tomorrow" });
    expect(r.ok).toBe(false);
  });

  it("answers a filled bot trap like a person, and keeps nothing", async () => {
    const r = await submitLead("seat", {
      email: "a@b.co",
      name: "Ava",
      grade: "11th",
      date: "March 6",
      company: "spam inc",
    });
    expect(r).toEqual({ ok: true });
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it("sends the whole lead to the admin inbox when the database fails, and says received", async () => {
    db.error = { message: "table missing" };
    const r = await submitLead("seat", {
      email: "a@b.co",
      name: "Ava",
      grade: "11th",
      date: "Not sure yet",
      company: "",
    });
    expect(r).toEqual({ ok: true });
    const sent = mail.send.mock.calls[0][0] as { to: string; text: string };
    expect(sent.to).toBe("admin@example.com");
    expect(sent.text).toContain("only record of this lead");
    expect(sent.text).toContain("a@b.co");
    expect(sent.text).toContain("Ava");
  });

  it("says so when both the database and the admin email fail", async () => {
    db.error = { message: "down" };
    mail.send.mockResolvedValue({ data: null, error: { message: "resend down" } });
    const r = await submitLead("seat", {
      email: "a@b.co",
      name: "Ava",
      grade: "11th",
      date: "Not sure yet",
      company: "",
    });
    expect(r).toEqual({ ok: false, error: "server" });
    expect(mail.waitlist).not.toHaveBeenCalled();
  });
});
