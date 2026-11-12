// POST /api/track end to end with the database write mocked: the consent cookie, Do Not Track
// and Global Privacy Control decide whether public-site events reach the table.
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  cookie: null as string | null,
  headers: {} as Record<string, string>,
  userId: null as string | null,
  inserted: [] as Array<Record<string, unknown>>,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "karman_replay_consent" && state.cookie ? { value: state.cookie } : undefined,
  }),
  headers: async () => ({ get: (k: string) => state.headers[k.toLowerCase()] ?? null }),
}));
vi.mock("@/lib/auth/dev-auth", () => ({ safeAuth: async () => ({ userId: state.userId }) }));
vi.mock("@/lib/analytics/server", () => ({
  insertRows: async (rows: Array<Record<string, unknown>>) => {
    state.inserted.push(...rows);
    return true;
  },
  pruneOldEvents: async () => {},
}));

import { POST } from "./route";

const A = "11111111-1111-4111-8111-111111111111";
let session = 0;

async function send(events: Array<{ name: string; path: string; props?: object }>) {
  session++;
  const sessionId = `22222222-2222-4222-8222-${String(session).padStart(12, "0")}`;
  const res = await POST(
    new Request("http://localhost/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        anonymousId: A,
        sessionId,
        events: events.map((e) => ({ ...e, at: Date.now() })),
      }),
    })
  );
  return res.status;
}

const siteAndPortal = [
  { name: "page_view", path: "/" },
  { name: "page_view", path: "/dashboard/student" },
];

beforeEach(() => {
  state.cookie = null;
  state.headers = { "cf-ipcountry": "US", "cf-region-code": "TX" };
  state.userId = null;
  state.inserted = [];
});

describe("POST /api/track", () => {
  it("records a site page view after Allow all", async () => {
    state.cookie = "yes";
    expect(await send(siteAndPortal)).toBe(200);
    expect(state.inserted.map((r) => r.path)).toEqual(["/"]);
  });

  it("drops site events after Essentials only", async () => {
    state.cookie = "no";
    expect(await send(siteAndPortal)).toBe(200);
    expect(state.inserted).toHaveLength(0);
  });

  it("drops site events under Global Privacy Control", async () => {
    state.cookie = "yes";
    state.headers["sec-gpc"] = "1";
    await send(siteAndPortal);
    expect(state.inserted).toHaveLength(0);
  });

  it("drops site events under Do Not Track", async () => {
    state.cookie = "yes";
    state.headers["dnt"] = "1";
    await send(siteAndPortal);
    expect(state.inserted).toHaveLength(0);
  });

  it("drops site events before an answer in a region that asks first", async () => {
    state.headers = { "cf-ipcountry": "GB" };
    await send(siteAndPortal);
    expect(state.inserted).toHaveLength(0);
  });

  it("keeps portal events for a signed-in user, with their id, even with GPC on", async () => {
    state.cookie = "no";
    state.headers["sec-gpc"] = "1";
    state.userId = "user_abc";
    await send(siteAndPortal);
    expect(state.inserted).toEqual([
      expect.objectContaining({
        path: "/dashboard/student",
        surface: "portal",
        user_id: "user_abc",
      }),
    ]);
  });

  it("answers 400 to an invalid body and 413 to a large one", async () => {
    const bad = await POST(
      new Request("http://localhost/api/track", { method: "POST", body: "{}" })
    );
    expect(bad.status).toBe(400);
    const big = await POST(
      new Request("http://localhost/api/track", { method: "POST", body: "x".repeat(17_000) })
    );
    expect(big.status).toBe(413);
  });
});
