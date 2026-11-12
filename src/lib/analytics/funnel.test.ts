import { describe, expect, it } from "vitest";
import { computeFunnel, type AnalyticsEvent } from "./funnel";

const at = "2026-11-12T18:00:00.000Z";
function e(
  name: string,
  who: { userId?: string; anonId?: string },
  extra: Partial<AnalyticsEvent> = {}
): AnalyticsEvent {
  return {
    at,
    userId: who.userId ?? null,
    anonId: who.anonId ?? null,
    sessionId: null,
    surface: extra.surface ?? (name === "page_view" || name === "cta_click" ? "site" : "server"),
    path: "/",
    name,
    props: {},
    ...extra,
  };
}

describe("computeFunnel", () => {
  it("counts people per step, who went on, who stopped and who arrived directly", () => {
    const events: AnalyticsEvent[] = [
      // Four visitors; two click Start free.
      e("page_view", { anonId: "a1" }),
      e("page_view", { anonId: "a1" }), // a second view is still one person
      e("page_view", { anonId: "a2" }),
      e("page_view", { anonId: "a3" }),
      e("page_view", { anonId: "a4" }),
      e("cta_click", { anonId: "a1" }, { props: { to: "sign_up" } }),
      e("cta_click", { anonId: "a2" }, { props: { to: "sign_up" } }),
      e("cta_click", { anonId: "a3" }, { props: { to: "sign_in" } }), // not Start free
      // a1 signs up on the same device: the device id becomes that account.
      e("signup", { userId: "u1", anonId: "a1" }, { surface: "portal" }),
      e("onboarding_done", { userId: "u1" }),
      e("test_started", { userId: "u1" }),
      // u2 declined analytics on the site: shows up first at sign-up.
      e("signup", { userId: "u2", anonId: "b9" }, { surface: "portal" }),
      e("onboarding_done", { userId: "u2" }),
      e("checkout_started", { userId: "u2" }), // skipped the free test
      e("paid", { userId: "u2" }),
    ];
    const rows = computeFunnel(events);
    expect(rows.map((r) => [r.key, r.reached, r.continued, r.dropped, r.joined])).toEqual([
      ["site_visit", 4, null, null, 4],
      ["start_click", 2, 2, 2, 0],
      ["signup", 2, 1, 1, 1],
      ["onboarding_done", 2, 2, 0, 0],
      ["test_started", 1, 1, 1, 0],
      ["checkout_started", 1, 0, 1, 1],
      ["paid", 1, 1, 0, 0],
    ]);
    expect(rows[1].rate).toBe(0.5);
    expect(rows[0].rate).toBeNull();
  });

  it("is all zeros with no events, with no division by zero", () => {
    const rows = computeFunnel([]);
    expect(rows.every((r) => r.reached === 0)).toBe(true);
    expect(rows[1].rate).toBeNull();
  });
});
