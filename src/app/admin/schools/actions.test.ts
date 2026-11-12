import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FakeAnswer, FakeOp } from "@/test/fake-supabase";

const db = vi.hoisted(() => ({
  answer: (() => ({})) as (op: FakeOp) => FakeAnswer,
  ops: [] as FakeOp[],
  admin: true,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/admin-guard", () => {
  class AdminRequiredError extends Error {}
  return {
    AdminRequiredError,
    requireAdmin: async () => {
      if (!db.admin) throw new AdminRequiredError();
      return { clerkId: "c1", userId: "admin-1" };
    },
  };
});
vi.mock("@/lib/admin/plans", async () => {
  const { fakeSupabase: make } = await import("@/test/fake-supabase");
  return {
    adminDb: () => {
      const f = make((op) => db.answer(op));
      db.ops = f.ops;
      return f.client;
    },
  };
});

import { createSchool } from "./actions";
import { createSchoolInput, oneYearOut } from "./schemas";

const REQ = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const input = {
  name: "Lakeview High School",
  freeUntil: "2030-08-31",
  adminEmail: "Dana@Lakeview.org",
  requestId: "",
};
const on = (table: string, action: FakeOp["action"]) =>
  db.ops.filter((o) => o.table === table && o.action === action);

/** A database with Dana's account, an open request, and no schools yet. */
function world(over: Partial<Record<string, FakeAnswer>> = {}) {
  db.answer = (op) => {
    const k = `${op.table}.${op.action}`;
    if (over[k]) return over[k];
    if (k === "users.select") return { data: [{ id: "user-dana", email: "dana@lakeview.org" }] };
    if (k === "marketing_leads.select")
      return { data: { id: REQ, details: { school: "Lakeview High School" } } };
    if (k === "schools.select") return { data: [] };
    if (k === "schools.insert") return { data: { id: "school-1" } };
    return {};
  };
}

beforeEach(() => {
  db.admin = true;
  db.ops = [];
  world();
});

describe("createSchoolInput", () => {
  it("tidies the name and email and treats a blank request as none", () => {
    const r = createSchoolInput.parse({ ...input, name: "  Lakeview  High " });
    expect(r).toEqual({
      name: "Lakeview High",
      freeUntil: "2030-08-31",
      adminEmail: "dana@lakeview.org",
      requestId: null,
    });
  });

  it("refuses a past free-until date, a bad email and a made-up request id", () => {
    expect(createSchoolInput.safeParse({ ...input, freeUntil: "2020-01-01" }).success).toBe(false);
    expect(createSchoolInput.safeParse({ ...input, freeUntil: "2030-02-30" }).success).toBe(false);
    expect(createSchoolInput.safeParse({ ...input, adminEmail: "dana@" }).success).toBe(false);
    expect(createSchoolInput.safeParse({ ...input, requestId: "abc" }).success).toBe(false);
  });

  it("defaults the free year to one year out", () => {
    expect(oneYearOut(new Date("2026-11-12T20:00:00Z"))).toBe("2027-11-12");
    expect(oneYearOut(new Date("2028-02-29T12:00:00Z"))).toBe("2029-03-01");
  });
});

describe("createSchool", () => {
  it("creates the school with its admin, found by email whatever its case", async () => {
    const r = await createSchool(input);
    expect(r.ok).toBe(true);
    expect(on("users", "select")[0]?.filters).toContainEqual([
      "ilike",
      "email",
      "dana@lakeview.org",
    ]);
    expect(on("schools", "insert")[0]?.payload).toEqual({
      name: "Lakeview High School",
      free_until: "2030-08-31",
    });
    expect(on("school_members", "insert")[0]?.payload).toEqual({
      school_id: "school-1",
      user_id: "user-dana",
      role: "admin",
    });
    expect(on("marketing_leads", "update")).toHaveLength(0);
  });

  it("says clearly that the school admin has to sign up first, and creates nothing", async () => {
    world({ "users.select": { data: [] } });
    const r = await createSchool(input);
    expect(r).toEqual({ ok: false, error: expect.stringContaining("need to sign up first") });
    expect(on("schools", "insert")).toHaveLength(0);
  });

  it("matches an email with _ or % in it exactly", async () => {
    await createSchool({ ...input, adminEmail: "d_r%x@lakeview.org" });
    expect(on("users", "select")[0]?.filters).toContainEqual([
      "ilike",
      "email",
      "d\\_r\\%x@lakeview.org",
    ]);
  });

  it("links the request it answers", async () => {
    const r = await createSchool({ ...input, requestId: REQ });
    expect(r.ok).toBe(true);
    expect(on("marketing_leads", "update")[0]?.payload).toEqual({
      details: { school: "Lakeview High School", schoolId: "school-1" },
    });
  });

  it("won't make a second school from the same request", async () => {
    world({
      "marketing_leads.select": { data: { id: REQ, details: { schoolId: "school-0" } } },
    });
    const r = await createSchool({ ...input, requestId: REQ });
    expect(r.ok).toBe(false);
    expect(on("schools", "insert")).toHaveLength(0);
  });

  it("won't make the same school twice for the same admin", async () => {
    world({
      "schools.select": { data: [{ id: "school-0" }] },
      "school_members.select": { data: [{ school_id: "school-0" }] },
    });
    const r = await createSchool(input);
    expect(r).toEqual({ ok: false, error: expect.stringContaining("already runs") });
    expect(on("schools", "insert")).toHaveLength(0);
  });

  it("removes the school again when its admin can't be added", async () => {
    world({ "school_members.insert": { error: { message: "fk violation" } } });
    const r = await createSchool(input);
    expect(r).toEqual({ ok: false, error: "Couldn't create the school. Try again." });
    expect(on("schools", "delete")[0]?.filters).toContainEqual(["eq", "id", "school-1"]);
  });

  it("is for admins only", async () => {
    db.admin = false;
    expect(await createSchool(input)).toEqual({ ok: false, error: "Admins only." });
    expect(db.ops).toHaveLength(0);
  });
});
