import { describe, expect, it, vi } from "vitest";

const tables: string[] = [];
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      tables.push(table);
      if (table !== "parent_student_links") {
        throw new Error(`Queried ${table} before verifying the parent link`);
      }
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return query;
    },
  }),
}));

import { loadLinkedStudentWeek } from "./weekly-server";

describe("linked parent read boundary", () => {
  it("does not read another child's activity when the exact link is absent", async () => {
    tables.length = 0;
    const result = await loadLinkedStudentWeek("parent-a", {
      id: "other-child",
      clerk_id: "other-clerk",
      first_name: "Other",
      last_name: null,
    });
    expect(result).toBeNull();
    expect(tables).toEqual(["parent_student_links"]);
  });
});
