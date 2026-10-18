import { describe, expect, it, vi } from "vitest";
const client = vi.hoisted(() => ({
  marker: "real-client-context",
  rpc: vi.fn(function (this: { marker?: string }, name: string) {
    if (this?.marker !== "real-client-context") throw new Error("Missing RPC client context");
    return Promise.resolve({ data: name === "catalog_practice_owned" ? null : {}, error: null });
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => client }));
import { supabaseCatalogSessionStore } from "./supabase-store";
describe("catalog practice database RPC boundary", () => {
  it("retains the database client receiver when loading an owned session", async () => {
    await expect(supabaseCatalogSessionStore.getOwned("session", "student")).resolves.toBeNull();
    expect(client.rpc).toHaveBeenCalledWith("catalog_practice_owned", {
      p_session_id: "session",
      p_student_id: "student",
    });
  });
});
