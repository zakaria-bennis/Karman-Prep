import { describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({
  members: [] as unknown[],
  assignments: [] as unknown[],
  user: { id: "u1" } as unknown,
  filters: [] as string[],
}));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const result =
        table === "users"
          ? { data: rows.user, error: null }
          : { data: table === "cohort_members" ? rows.members : rows.assignments, error: null };
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: (column: string, value: null) => {
          rows.filters.push(`${table}.${column}=${value}`);
          return chain;
        },
        limit: () => chain,
        maybeSingle: async () => result,
        then: (resolve: (v: unknown) => void) => resolve(result),
      };
      return chain;
    },
  }),
}));
import { hasTutor } from "./tutor-link";

describe("hasTutor", () => {
  it("is false with no cohort and no 1:1 tutor", async () => {
    expect(await hasTutor("user_x")).toBe(false);
  });
  it("is true with a 1:1 tutor", async () => {
    rows.assignments = [{ tutor_user_id: "t" }];
    expect(await hasTutor("user_x")).toBe(true);
    rows.assignments = [];
  });
  it("is true in a cohort", async () => {
    rows.members = [{ cohort_id: "c" }];
    expect(await hasTutor("user_x")).toBe(true);
  });
  it("counts only current links: a left cohort or an ended 1:1 does not count", async () => {
    rows.filters = [];
    rows.user = { id: "u1" };
    await hasTutor("user_x");
    expect(rows.filters).toEqual(
      expect.arrayContaining(["cohort_members.left_at=null", "tutor_assignments.ended_at=null"])
    );
  });
  it("is false for an unknown user", async () => {
    rows.user = null;
    expect(await hasTutor("user_none")).toBe(false);
  });
});
