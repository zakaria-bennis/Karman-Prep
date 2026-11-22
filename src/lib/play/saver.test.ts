import { describe, expect, it } from "vitest";
import { dayToSave } from "./saver";

const T = "2026-11-22";

describe("dayToSave", () => {
  it("offers yesterday when it was missed and the day before was kept", () => {
    expect(dayToSave(["2026-11-19", "2026-11-20"], T)).toBe("2026-11-21");
  });

  it("offers nothing when yesterday or today counts already", () => {
    expect(dayToSave(["2026-11-20", "2026-11-21"], T)).toBeNull();
    expect(dayToSave(["2026-11-20", T], T)).toBeNull();
  });

  it("offers nothing when the streak was already gone (two days missed)", () => {
    expect(dayToSave(["2026-11-19"], T)).toBeNull();
    expect(dayToSave([], T)).toBeNull();
  });
});
