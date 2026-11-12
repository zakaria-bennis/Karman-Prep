import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FakeAnswer, FakeOp } from "@/test/fake-supabase";

const db = vi.hoisted(() => ({
  answer: (() => ({})) as (op: FakeOp) => FakeAnswer,
  fake: null as null | { ops: FakeOp[] },
}));
vi.mock("@/lib/supabase/server", async () => {
  const { fakeSupabase: make } = await import("@/test/fake-supabase");
  return {
    createAdminClient: () => {
      const f = make((op) => db.answer(op));
      db.fake = f;
      return f.client;
    },
  };
});
// the form must never send anything: these fail the test if anything reaches them
const mail = vi.hoisted(() => ({ send: vi.fn(), waitlist: vi.fn() }));
vi.mock("@/lib/integrations/resend/client", () => ({ resend: { emails: { send: mail.send } } }));
vi.mock("@/lib/integrations/resend/emails", () => ({ addToWaitlist: mail.waitlist }));

import { submitSchoolCall } from "./school-call-actions";

const good = {
  school: "Lakeview High School",
  role: "Principal",
  students: "500 to 1,000",
  start: "Next school year",
  name: "Dana Reyes",
  email: "Dana@Lakeview.org",
  phone: "512 555 0142",
  callTime: "After school",
  website: "",
};
const ops = () => db.fake?.ops ?? [];
const on = (table: string, action: FakeOp["action"]) =>
  ops().filter((o) => o.table === table && o.action === action);

beforeEach(() => {
  vi.clearAllMocks();
  db.answer = () => ({});
  db.fake = null;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test";
  vi.useFakeTimers({ now: new Date("2026-11-13T18:00:00Z"), toFake: ["Date"] }); // a Friday
});

afterEach(() => vi.useRealTimers());

describe("submitSchoolCall", () => {
  it("stores the request under school_call with its answers, and adds a CRM contact", async () => {
    expect(await submitSchoolCall(good)).toEqual({ ok: true });
    expect(on("marketing_leads", "upsert")[0]).toMatchObject({
      payload: {
        email: "dana@lakeview.org",
        source: "school_call",
        name: "Dana Reyes",
        details: {
          school: "Lakeview High School",
          schoolRole: "Principal",
          students: "500 to 1,000",
          starting: "Next school year",
          phone: "512 555 0142",
          callTime: "After school",
        },
      },
      options: { onConflict: "email,source" },
    });
    expect(on("crm_contacts", "upsert")[0]).toMatchObject({
      payload: { contact_key: "dana@lakeview.org" },
      options: { ignoreDuplicates: true },
    });
    expect(on("crm_tags", "upsert")[0]?.payload).toEqual({
      contact_key: "dana@lakeview.org",
      tag: "school",
    });
    expect(on("crm_tasks", "insert")[0]?.payload).toEqual({
      contact_key: "dana@lakeview.org",
      title: "Call back about Lakeview High School",
      due_on: "2026-11-16",
    });
    expect(mail.send).not.toHaveBeenCalled();
    expect(mail.waitlist).not.toHaveBeenCalled();
  });

  it("keeps optional answers out when they're blank, and doesn't repeat an open follow-up", async () => {
    db.answer = (op) =>
      op.table === "crm_tasks" && op.action === "select" ? { data: [{ id: "t1" }] } : {};
    await submitSchoolCall({ ...good, phone: "", callTime: "" });
    const details = (on("marketing_leads", "upsert")[0]?.payload as { details: object }).details;
    expect(details).not.toHaveProperty("phone");
    expect(details).not.toHaveProperty("callTime");
    expect(on("crm_tasks", "insert")).toHaveLength(0);
  });

  it("refuses what the screen refuses, field by field, and writes nothing", async () => {
    const r = await submitSchoolCall({ ...good, role: "Janitor", email: "dana@", school: "" });
    expect(r.ok).toBe(false);
    expect(Object.keys((r as { fields: object }).fields).sort()).toEqual([
      "email",
      "role",
      "school",
    ]);
    expect(ops()).toHaveLength(0);
  });

  it("answers a filled bot trap like a person, and keeps nothing", async () => {
    expect(await submitSchoolCall({ ...good, website: "spam" })).toEqual({ ok: true });
    expect(ops()).toHaveLength(0);
  });

  it("says it didn't go through when the request can't be stored", async () => {
    db.answer = (op) =>
      op.table === "marketing_leads" ? { error: { message: "relation does not exist" } } : {};
    expect(await submitSchoolCall(good)).toEqual({ ok: false, error: "server" });
    expect(on("crm_contacts", "upsert")).toHaveLength(0);
  });

  it("says it didn't go through when there's no database, rather than pretending", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(await submitSchoolCall(good)).toEqual({ ok: false, error: "server" });
    expect(db.fake).toBeNull();
  });

  it("still counts the request as received when only the CRM extras fail", async () => {
    db.answer = (op) => (op.table === "crm_contacts" ? { error: { message: "no table" } } : {});
    expect(await submitSchoolCall(good)).toEqual({ ok: true });
    expect(on("marketing_leads", "upsert")).toHaveLength(1);
  });
});
