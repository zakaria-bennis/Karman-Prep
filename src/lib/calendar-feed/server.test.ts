import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Filter = [string, string, unknown];
interface QueryLog {
  table: string;
  filters: Filter[];
}

/**
 * Minimal chainable stand-in for the Supabase client. Each table returns its
 * rows filtered by the eq/in calls the code makes, so a query that forgets a
 * filter would return other people's rows and fail the test.
 */
function fakeDb(tables: Record<string, Record<string, unknown>[]>) {
  const log: QueryLog[] = [];
  const from = (table: string) => {
    const entry: QueryLog = { table, filters: [] };
    log.push(entry);
    let rows = [...(tables[table] ?? [])];
    const builder = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        entry.filters.push(["eq", column, value]);
        rows = rows.filter((row) => row[column] === value);
        return builder;
      },
      in: (column: string, values: unknown[]) => {
        entry.filters.push(["in", column, values]);
        rows = rows.filter((row) => values.includes(row[column]));
        return builder;
      },
      is: () => builder,
      not: () => builder,
      gte: () => builder,
      lte: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      single: () => Promise.resolve({ data: rows[0], error: null }),
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        Promise.resolve({ data: rows, error: null }).then(resolve),
    };
    return builder;
  };
  return { client: { from }, log };
}

const db = vi.hoisted(() => ({ current: null as null | ReturnType<typeof fakeDb> }));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => db.current!.client }));

import { buildFeedForToken, feedTokenSchema, generateFeedToken } from "./server";

const studentToken = "S".repeat(43);
const parentToken = "P".repeat(43);
const tutorToken = "T".repeat(43);

const users = {
  maya: { id: "maya", clerk_id: "c_maya", role: "student", first_name: "Maya", time_zone: "UTC" },
  leo: { id: "leo", clerk_id: "c_leo", role: "student", first_name: "Leo", time_zone: "UTC" },
  parent: { id: "par", clerk_id: "c_par", role: "parent", first_name: "Pat", time_zone: null },
  tutor: { id: "tut", clerk_id: "c_tut", role: "tutor", first_name: "Sam", time_zone: null },
};

function booking(id: string, studentId: string) {
  return {
    id,
    student_id: studentId,
    plan_tier: "private",
    status: "scheduled",
    scheduled_start: "2026-11-03T22:00:00Z",
    scheduled_end: "2026-11-03T23:00:00Z",
    zoom_join_url: null,
    tutor: { first_name: "Sam" },
  };
}

beforeEach(() => {
  db.current = fakeDb({
    calendar_feed_tokens: [
      { token: studentToken, user_id: "maya", owner: { id: "maya", role: "student" } },
      { token: parentToken, user_id: "par", owner: { id: "par", role: "parent" } },
      { token: tutorToken, user_id: "tut", owner: { id: "tut", role: "tutor" } },
    ],
    users: Object.values(users),
    parent_student_links: [{ parent_user_id: "par", student_user_id: "maya" }],
    bookings: [booking("b-maya", "maya"), booking("b-leo", "leo")],
    cohort_members: [],
    catalog_assignments: [],
  });
});

describe("generateFeedToken", () => {
  it("makes 43-character base64url tokens that differ every time", () => {
    const tokens = new Set(Array.from({ length: 50 }, generateFeedToken));
    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(feedTokenSchema.safeParse(token).success).toBe(true);
  });
});

describe("buildFeedForToken", () => {
  it("rejects malformed tokens without touching the database", async () => {
    for (const bad of ["", "short", "S".repeat(44), "S".repeat(42) + "/", "S".repeat(42) + "'"]) {
      expect(await buildFeedForToken(bad, "https://karmanprep.com")).toBeNull();
    }
    expect(db.current!.log).toEqual([]);
  });

  it("returns null for an unknown token and for tutor accounts", async () => {
    expect(await buildFeedForToken("U".repeat(43), "https://karmanprep.com")).toBeNull();
    expect(await buildFeedForToken(tutorToken, "https://karmanprep.com")).toBeNull();
  });

  it("gives a student only their own events", async () => {
    const ics = await buildFeedForToken(studentToken, "https://karmanprep.com");
    expect(ics).toContain("UID:session-b-maya-maya@karmanprep.com");
    expect(ics).not.toContain("b-leo");
    const bookingQuery = db.current!.log.find((q) => q.table === "bookings")!;
    expect(bookingQuery.filters).toContainEqual(["eq", "student_id", "maya"]);
  });

  it("gives a parent only their linked students, labelled by first name", async () => {
    const ics = (await buildFeedForToken(parentToken, "https://karmanprep.com"))!;
    expect(ics).toContain("SUMMARY:Maya: Karman 1:1 session with Sam");
    expect(ics).not.toContain("b-leo");
    expect(ics).not.toContain("Leo");
  });
});
