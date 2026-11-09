import { describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ keys: new Set<string>(), rows: [] as unknown[] }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      upsert: (row: { award_key: string }, opts: { ignoreDuplicates: boolean }) => {
        expect(opts.ignoreDuplicates).toBe(true);
        const fresh = !store.keys.has(row.award_key);
        if (fresh) {
          store.keys.add(row.award_key);
          store.rows.push(row);
        }
        return { select: async () => ({ data: fresh ? [row] : [], error: null }) };
      },
    }),
  }),
}));

import { awardPoints, pointsFor } from "./points";

describe("points", () => {
  it("10 for a correct answer, 15 on a hard one, 0 for a wrong one", () => {
    expect(pointsFor(true, 4)).toBe(10);
    expect(pointsFor(true, 5)).toBe(15);
    expect(pointsFor(true, 7)).toBe(15);
    expect(pointsFor(false, 7)).toBe(0);
  });
  it("one graded answer awards once, even when retried", async () => {
    expect(await awardPoints("lesson:r1", "user_s", 10, "ma-03")).toBe(10);
    expect(await awardPoints("lesson:r1", "user_s", 10, "ma-03")).toBe(0);
    expect(store.rows).toEqual([
      { award_key: "lesson:r1", student_id: "user_s", points: 10, skill_id: "ma-03" },
    ]);
  });
});
