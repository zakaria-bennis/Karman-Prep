import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const created: string[] = [];
const inserted: { cohort_id: string; channel_type: string }[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_: string, id: string) => ({
          maybeSingle: async () => ({
            data: { id, name: `Class ${id}`, tier: "group" },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/integrations/slack", () => ({
  SlackAdapterError: class extends Error {},
  createCohortChannel: vi.fn(async ({ cohortSlug, type }: { cohortSlug: string; type: string }) => {
    created.push(`${cohortSlug}:${type}`);
    return { channelId: `S-${cohortSlug}-${type}` };
  }),
}));

vi.mock("@/lib/supabase/queries/chat", () => ({
  findChannelsByCohort: vi.fn(async () => []),
  insertChatChannel: vi.fn(async (row: { cohort_id: string; channel_type: string }) => {
    inserted.push(row);
    return { id: `${row.cohort_id}-${row.channel_type}`, ...row };
  }),
}));

const { ensureClassChats } = await import("./provisioning");

describe("ensureClassChats", () => {
  beforeEach(() => {
    created.length = 0;
    inserted.length = 0;
    vi.stubEnv("SLACK_BOT_TOKEN", "test-token");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("makes the chat and Q&A channels for a class that has none", async () => {
    expect(await ensureClassChats(["c1", "c2"], ["c1"])).toBe(true);
    expect(created).toEqual(["class-c2:cohort_chat", "class-c2:qa"]);
    expect(inserted.map((r) => `${r.cohort_id}:${r.channel_type}`)).toEqual([
      "c2:cohort_chat",
      "c2:qa",
    ]);
  });

  it("does nothing when every class has its chat", async () => {
    expect(await ensureClassChats(["c1"], ["c1"])).toBe(false);
    expect(created).toEqual([]);
  });

  it("does nothing without a Slack token (local development)", async () => {
    vi.stubEnv("SLACK_BOT_TOKEN", "");
    expect(await ensureClassChats(["c1"], [])).toBe(false);
    expect(created).toEqual([]);
  });
});
