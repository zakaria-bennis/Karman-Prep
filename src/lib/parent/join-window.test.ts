import { describe, expect, it } from "vitest";
import { joinOpen, safeZoomUrl } from "./join-window";

describe("joinOpen", () => {
  const start = "2026-11-14T16:00:00Z";
  const end = "2026-11-14T17:00:00Z";
  it("opens 10 minutes before the start and closes at the end", () => {
    expect(joinOpen(start, end, new Date("2026-11-14T15:49:00Z"))).toBe(false);
    expect(joinOpen(start, end, new Date("2026-11-14T15:50:00Z"))).toBe(true);
    expect(joinOpen(start, end, new Date("2026-11-14T16:30:00Z"))).toBe(true);
    expect(joinOpen(start, end, new Date("2026-11-14T17:00:01Z"))).toBe(false);
  });
});

describe("safeZoomUrl", () => {
  it("keeps https Zoom links and drops anything else", () => {
    expect(safeZoomUrl("https://us02web.zoom.us/j/123?pwd=x")).toBe(
      "https://us02web.zoom.us/j/123?pwd=x"
    );
    expect(safeZoomUrl("https://zoom.us/j/123")).toBe("https://zoom.us/j/123");
    expect(safeZoomUrl("http://zoom.us/j/123")).toBeNull();
    expect(safeZoomUrl("https://zoom.us.evil.example/j/1")).toBeNull();
    expect(safeZoomUrl("javascript:alert(1)")).toBeNull();
    expect(safeZoomUrl(null)).toBeNull();
  });
});
