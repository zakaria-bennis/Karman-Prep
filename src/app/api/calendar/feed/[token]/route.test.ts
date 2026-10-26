import { afterEach, describe, expect, it, vi } from "vitest";

const buildFeedForToken = vi.hoisted(() => vi.fn());
vi.mock("@/lib/calendar-feed/server", () => ({ buildFeedForToken }));

import { GET } from "./route";

const token = "a".repeat(43);

function call(path: string) {
  const raw = path.split("/").pop()!;
  return GET(new Request(`https://karmanprep.com/api/calendar/feed/${raw}`), {
    params: Promise.resolve({ token: raw }),
  });
}

afterEach(() => {
  buildFeedForToken.mockReset();
  vi.unstubAllEnvs();
});

describe("GET /api/calendar/feed/[token]", () => {
  it("serves the calendar for a known token, stripping the .ics suffix", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://karmanprep.com");
    buildFeedForToken.mockResolvedValue("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");
    const response = await call(`${token}.ics`);
    expect(buildFeedForToken).toHaveBeenCalledWith(token, "https://karmanprep.com");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.text()).toContain("BEGIN:VCALENDAR");
  });

  it("returns a plain 404 for unknown tokens", async () => {
    buildFeedForToken.mockResolvedValue(null);
    const response = await call(`${token}.ics`);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found.");
  });

  it("returns 503 without details when the data cannot load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    buildFeedForToken.mockRejectedValue(new Error("db down: secret detail"));
    const response = await call(`${token}.ics`);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
  });
});
