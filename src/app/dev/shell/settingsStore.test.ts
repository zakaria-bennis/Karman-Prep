import { describe, expect, it } from "vitest";
import { clock, dayName, frostOf } from "./settingsStore";

describe("settings", () => {
  it("keeps the portal's own frost at the default see-through setting", () => {
    expect(frostOf(57)).toBe(0.7);
    expect(frostOf(0)).toBe(1.5);
    expect(frostOf(100)).toBe(0.1);
  });

  it("says a time of day in words", () => {
    expect(clock(1200)).toBe("8:00 PM");
    expect(clock(960)).toBe("4:00 PM");
    expect(clock(0)).toBe("12:00 AM");
    expect(clock(750)).toBe("12:30 PM");
  });

  it("names a day without shifting it by a time zone", () => {
    expect(dayName("2026-12-05")).toBe("December 5, 2026");
  });
});
