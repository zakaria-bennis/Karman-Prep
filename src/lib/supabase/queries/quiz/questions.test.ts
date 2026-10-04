import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => [] as Array<[string, ...unknown[]]>);

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from(table: string) {
      calls.push(["from", table]);
      const query = {
        select(value: string) {
          calls.push(["select", value]);
          return query;
        },
        eq(column: string, value: unknown) {
          calls.push(["eq", column, value]);
          return query;
        },
        in(column: string, values: unknown[]) {
          calls.push(["in", column, values]);
          return query;
        },
        order(column: string) {
          calls.push(["order", column]);
          return query;
        },
        then(resolve: (value: { data: unknown[]; error: null }) => void) {
          resolve({ data: [], error: null });
        },
      };
      return query;
    },
  }),
}));

import { fetchQuestionsForNode } from "./questions";

describe("fetchQuestionsForNode publication boundary", () => {
  beforeEach(() => calls.splice(0));

  it("requires both the archive filter and an approved publish status for students", async () => {
    await fetchQuestionsForNode("ma-00");
    expect(calls).toContainEqual(["eq", "node_id", "ma-00"]);
    expect(calls).toContainEqual(["eq", "is_live", true]);
    expect(calls).toContainEqual([
      "in",
      "publish_status",
      ["publish_ready", "publish_ready_with_verified_repair"],
    ]);
  });

  it("lets the admin view inspect unpublished questions", async () => {
    await fetchQuestionsForNode("ma-00", { includeFlagged: true });
    expect(calls).not.toContainEqual(["eq", "is_live", true]);
    expect(calls.some((call) => call[0] === "in" && call[1] === "publish_status")).toBe(false);
  });
});
