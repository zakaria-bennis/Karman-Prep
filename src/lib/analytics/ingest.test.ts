import { describe, expect, it } from "vitest";
import { ingest, type IngestRequest } from "./ingest";
import { SessionRateLimiter } from "./rate-limit";
import { normalizePath, surfaceOf } from "./shared";

const NOW = Date.UTC(2026, 10, 12, 18);
const A = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const Q = "33333333-3333-4333-8333-333333333333";

function body(events: unknown[], extra: Record<string, unknown> = {}) {
  return JSON.stringify({ anonymousId: A, sessionId: S, device: "phone", events, ...extra });
}
const ev = (name: string, path: string, props?: Record<string, unknown>) => ({
  name,
  path,
  at: NOW - 1000,
  ...(props ? { props } : {}),
});

function run(over: Partial<IngestRequest>, limiter = new SessionRateLimiter(120)) {
  return ingest(
    {
      body: body([ev("page_view", "/pricing")]),
      userId: null,
      consentCookie: "yes",
      region: { country: "US", region: "TX" },
      dnt: null,
      gpc: null,
      ...over,
    },
    { now: NOW, limiter }
  );
}

describe("validation", () => {
  it("accepts a valid batch and keeps only the allowed columns", () => {
    const r = run({});
    expect(r.status).toBe(200);
    expect(r.rows).toEqual([
      expect.objectContaining({
        name: "page_view",
        path: "/pricing",
        surface: "site",
        user_id: null,
        anonymous_id: A,
        session_id: S,
        device: "phone",
        props: {},
      }),
    ]);
    expect(JSON.stringify(r.rows)).not.toMatch(/ip|email/i);
  });

  it("rejects bad JSON, unknown events, unknown fields and oversize bodies", () => {
    expect(run({ body: "{nope" }).status).toBe(400);
    expect(run({ body: body([ev("buy_stuff", "/")]) }).status).toBe(400);
    expect(run({ body: body([ev("page_view", "/")], { ip: "1.2.3.4" }) }).status).toBe(400);
    expect(run({ body: body([]) }).status).toBe(400);
    expect(run({ body: body([ev("page_view", "/")], { pad: "x".repeat(20_000) }) }).status).toBe(
      413
    );
    const many = Array.from({ length: 26 }, () => ev("page_view", "/"));
    expect(run({ body: body(many) }).status).toBe(400);
  });

  it("drops events whose props are not on the event's list (no free text)", () => {
    const r = run({
      body: body([
        ev("page_view", "/", { note: "my email is a@b.com" }),
        ev("ui_click", "/", { target: "hello there friend" }),
        ev("question_viewed", "/learn/practice/x", { questionId: "not-a-uuid" }),
        ev("page_time", "/", { seconds: 42 }),
      ]),
    });
    expect(r.rows.map((x) => x.name)).toEqual(["page_time"]);
    expect(r.dropped).toBe(3);
  });

  it("rejects campaign tags that hold an address", () => {
    const r = run({
      body: body([ev("page_view", "/")], { entry: { utmSource: "kid@example.com" } }),
    });
    expect(r.status).toBe(400);
  });

  it("cleans paths: no query, ids replaced", () => {
    expect(normalizePath("/learn/practice/3f2c8a1e-1111-4111-8111-111111111111?x=1#y")).toBe(
      "/learn/practice/:id"
    );
    expect(normalizePath("/admin/students/user_2abcDEF123")).toBe("/admin/students/:id");
    expect(normalizePath("/join/someone@example.com")).toBe("/join/:id");
    expect(surfaceOf("/")).toBe("site");
    expect(surfaceOf("/pricing")).toBe("site");
    expect(surfaceOf("/dashboard/student")).toBe("portal");
  });

  it("puts where the visit came from on its first site page view only", () => {
    const r = run({
      body: body([ev("page_view", "/"), ev("page_view", "/pricing")], {
        entry: { referrerHost: "Google.com", utmSource: "newsletter", utmCampaign: "fall" },
      }),
    });
    expect(r.rows[0]).toMatchObject({ referrer_host: "google.com", utm_source: "newsletter" });
    expect(r.rows[1].referrer_host).toBeUndefined();
  });

  it("replaces a browser time from the future with the server's", () => {
    const r = run({ body: body([{ name: "page_view", path: "/", at: NOW + 99_999_999 }]) });
    expect(r.rows[0].occurred_at).toBe(new Date(NOW).toISOString());
  });
});

describe("consent gate", () => {
  const mixed = body([
    ev("page_view", "/pricing"),
    ev("cta_click", "/pricing", { to: "sign_up" }),
    ev("page_view", "/dashboard/student"),
    ev("question_viewed", "/learn/practice/:id", { questionId: Q, mode: "instant" }),
  ]);

  it("drops site events after Essentials only, keeps signed-in portal events", () => {
    const r = run({ body: mixed, consentCookie: "no", userId: "user_1" });
    expect(r.rows.map((x) => x.surface)).toEqual(["portal", "portal"]);
    expect(r.rows.every((x) => x.user_id === "user_1")).toBe(true);
  });

  it("drops site events under Global Privacy Control or Do Not Track", () => {
    expect(run({ body: mixed, gpc: "1" }).rows).toHaveLength(0);
    expect(run({ body: mixed, dnt: "1" }).rows).toHaveLength(0);
    expect(run({ body: mixed, dnt: "1", userId: "user_1" }).rows.map((x) => x.surface)).toEqual([
      "portal",
      "portal",
    ]);
  });

  it("drops site events before an answer where the banner asks first", () => {
    const r = run({ body: mixed, consentCookie: null, region: { country: "DE", region: null } });
    expect(r.rows).toHaveLength(0);
  });

  it("records nothing from a portal page when signed out", () => {
    const r = run({ body: body([ev("page_view", "/dashboard/student")]) });
    expect(r.rows).toHaveLength(0);
  });
});

describe("rate limit", () => {
  it("caps one visit's events per minute", () => {
    const limiter = new SessionRateLimiter(30);
    const batch = body(Array.from({ length: 25 }, () => ev("page_view", "/")));
    expect(run({ body: batch }, limiter).rows).toHaveLength(25);
    expect(run({ body: batch }, limiter).rows).toHaveLength(5);
    expect(run({ body: batch }, limiter).rows).toHaveLength(0);
    expect(limiter.take(S, 10, NOW + 61_000)).toBe(10);
  });
});
