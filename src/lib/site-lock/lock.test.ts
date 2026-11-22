import { describe, expect, it } from "vitest";
import { LOCK_COOKIE, LOCK_PATH, lockToken, safeNext, sameText, siteLock } from "./lock";

const PASSWORD = "test-password-not-real";
const site = (path: string, init?: RequestInit) =>
  new Request(`https://karmanprep.com${path}`, init);

async function withCookie(path: string) {
  return site(path, { headers: { cookie: `a=1; ${LOCK_COOKIE}=${await lockToken(PASSWORD)}` } });
}

function post(fields: Record<string, string>) {
  return site(LOCK_PATH, { method: "POST", body: new URLSearchParams(fields) });
}

describe("site lock", () => {
  it("is off when no password is set", async () => {
    expect(await siteLock(site("/dashboard/student"), undefined)).toBeNull();
    expect(await siteLock(site("/dashboard/student"), "")).toBeNull();
  });

  it("shows the lock page in place of any page, whatever the address", async () => {
    for (const path of ["/", "/pricing", "/dashboard/student?page=library", "/some/typo"]) {
      const res = await siteLock(site(path), PASSWORD);
      expect(res?.status).toBe(401);
      expect(res?.headers.get("content-type")).toContain("text/html");
      expect(await res?.text()).toContain('name="password"');
    }
  });

  it("answers locked API calls and other methods with 401, and never lets them through", async () => {
    const api = await siteLock(site("/api/bookings/move", { method: "POST" }), PASSWORD);
    expect(api?.status).toBe(401);
    expect(await api?.json()).toEqual({ error: "This site is private for now." });
    expect((await siteLock(site("/dashboard/student", { method: "POST" }), PASSWORD))?.status).toBe(
      401
    );
  });

  it("lets webhooks, cron and calendar feeds through without a cookie", async () => {
    for (const path of [
      "/api/stripe/webhook",
      "/api/webhooks/cal",
      "/api/cron/daily",
      "/api/calendar/feed/abc123",
    ]) {
      expect(await siteLock(site(path, { method: "POST" }), PASSWORD)).toBeNull();
    }
    // look-alikes stay locked
    expect((await siteLock(site("/api/stripe/webhooks-fake"), PASSWORD))?.status).toBe(401);
    expect((await siteLock(site("/api/cronjob"), PASSWORD))?.status).toBe(401);
  });

  it("lets a visitor with the right cookie through, and not one with a wrong cookie", async () => {
    expect(await siteLock(await withCookie("/dashboard/student"), PASSWORD)).toBeNull();
    const forged = site("/", { headers: { cookie: `${LOCK_COOKIE}=deadbeef` } });
    expect((await siteLock(forged, PASSWORD))?.status).toBe(401);
    // changing the password signs everyone out
    expect((await siteLock(await withCookie("/"), "a-new-password"))?.status).toBe(401);
  });

  it("sets the cookie and goes back to the page asked for when the password is right", async () => {
    const res = await siteLock(post({ password: PASSWORD, next: "/pricing?x=1" }), PASSWORD);
    expect(res?.status).toBe(303);
    expect(res?.headers.get("location")).toBe("https://karmanprep.com/pricing?x=1");
    const cookie = res?.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${LOCK_COOKIE}=${await lockToken(PASSWORD)}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
  });

  it("sends a wrong password back to the lock page without a cookie", async () => {
    const res = await siteLock(post({ password: "nope", next: "/faq" }), PASSWORD);
    expect(res?.status).toBe(303);
    expect(res?.headers.get("location")).toBe(
      `https://karmanprep.com${LOCK_PATH}?wrong=1&next=%2Ffaq`
    );
    expect(res?.headers.get("set-cookie")).toBeNull();
    const page = await siteLock(site(`${LOCK_PATH}?wrong=1&next=%2Ffaq`), PASSWORD);
    expect(await page?.text()).toContain("didn’t work");
  });

  it("never sends a visitor to another site after unlocking", () => {
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext(null)).toBe("/");
    expect(safeNext(LOCK_PATH)).toBe("/");
    expect(safeNext("/dashboard/student")).toBe("/dashboard/student");
  });

  it("keeps the next address safe inside the page", async () => {
    const res = await siteLock(site('/x"><script>alert(1)</script>'), PASSWORD);
    const html = (await res?.text()) ?? "";
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("tells crawlers to stay away while locked", async () => {
    const res = await siteLock(site("/robots.txt"), PASSWORD);
    expect(res?.status).toBe(200);
    expect(await res?.text()).toContain("Disallow: /");
  });

  it("compares text fully", () => {
    expect(sameText("abc", "abc")).toBe(true);
    expect(sameText("abc", "abd")).toBe(false);
    expect(sameText("abc", "abcd")).toBe(false);
    expect(sameText("", "")).toBe(true);
  });
});
