import { describe, expect, it } from "vitest";
import { announcementFor, forceShow, limitSeconds, remaining } from "./timer";

describe("timer maths", () => {
  it("applies the timing accommodation", () => {
    expect(limitSeconds(1920, "standard")).toBe(1920);
    expect(limitSeconds(1920, "time_and_half")).toBe(2880);
    expect(limitSeconds(1920, "double")).toBe(3840);
  });
  it("resumes from the server start time after a reload", () => {
    const now = 1_000_000;
    expect(remaining(now - 100_000, now, 1920)).toBe(1820);
    expect(remaining(now - 5_000_000, now, 1920)).toBe(0);
  });
  it("announces only at 5 minutes, 1 minute and time up", () => {
    expect(announcementFor(301, 300)).toBe("5 minutes left");
    expect(announcementFor(61, 60)).toBe("1 minute left");
    expect(announcementFor(1, 0)).toBe("Time is up");
    expect(announcementFor(200, 199)).toBeNull();
  });
  it("a hidden timer shows itself at 5 minutes left", () => {
    expect(forceShow(301)).toBe(false);
    expect(forceShow(300)).toBe(true);
  });
});
