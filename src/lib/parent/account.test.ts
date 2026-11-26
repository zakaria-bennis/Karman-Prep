import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: async () => null }));
vi.mock("@/lib/plans", () => ({
  getPlan: async () => {
    throw new Error("tests pass the plan");
  },
}));
vi.mock("@/lib/school/db", () => ({
  untypedAdmin: () => {
    throw new Error("tests pass a fake client");
  },
}));

import type { UntypedAdmin } from "@/lib/school/db";
import { studentInUse } from "./account";

/** A client whose tables hold these rows for the student "clerk-1". */
function fake(tables: Record<string, number>) {
  const asked: string[] = [];
  const client = {
    from(table: string) {
      asked.push(table);
      const rows = Array.from({ length: tables[table] ?? 0 }, (_, i) => ({ id: `${table}-${i}` }));
      const query = {
        select: () => query,
        eq: () => query,
        limit: async (n: number) => ({ data: rows.slice(0, n), error: null }),
      };
      return query;
    },
  };
  return { client: client as unknown as UntypedAdmin, asked };
}

const plan = (planId: string) => async () => ({ planId });

describe("studentInUse", () => {
  it("is false for a new account: Free and nothing started", async () => {
    const db = fake({});
    expect(await studentInUse("clerk-1", db.client, plan("free"))).toBe(false);
    expect(db.asked.sort()).toEqual(["catalog_practice_sessions", "quiz_attempts", "quiz_runs"]);
  });

  it("is true for a paying student, without reading their practice", async () => {
    const db = fake({});
    expect(await studentInUse("clerk-1", db.client, plan("cohort"))).toBe(true);
    expect(db.asked).toEqual([]);
  });

  it("is true for a Free student who has started any practice", async () => {
    for (const table of ["catalog_practice_sessions", "quiz_attempts", "quiz_runs"]) {
      expect(await studentInUse("clerk-1", fake({ [table]: 2 }).client, plan("free"))).toBe(true);
    }
  });
});
