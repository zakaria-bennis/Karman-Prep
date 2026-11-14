import { describe, expect, it } from "vitest";
import { cleanName, okName, slotInWindow } from "./lead-rules";

describe("names on the call form", () => {
  it("takes letters, spaces, hyphens and apostrophes, and nothing else", () => {
    for (const ok of ["Amira", "O'Neil", "Anne-Marie", "José", "de la Cruz", "Zoë"])
      expect(okName(ok)).toBe(true);
    for (const bad of ["", "Zak4ria", "<script>", "Robert'); DROP TABLE leads;--", "-", "a@b"])
      expect(okName(bad)).toBe(false);
  });

  it("drops what a name cannot hold as it is typed", () => {
    expect(cleanName("Zak4ria9")).toBe("Zakria");
    expect(cleanName("<script>alert(1)</script>")).toBe("scriptalertscript");
    expect(cleanName("  -O'Neil")).toBe("O'Neil");
  });
});

describe("call slots", () => {
  const now = new Date("2026-11-13T18:00:00Z");
  it("accepts only an offered hour on a day from today to about a month ahead", () => {
    expect(slotInWindow("2026-11-15 9:00 am", now)).toBe(true);
    expect(slotInWindow("2026-11-15 11:00 pm", now)).toBe(true);
    expect(slotInWindow("2026-11-15 3:00 am", now)).toBe(false);
    expect(slotInWindow("2026-10-01 9:00 am", now)).toBe(false);
    expect(slotInWindow("2027-03-01 9:00 am", now)).toBe(false);
    expect(slotInWindow("tomorrow", now)).toBe(false);
  });
});
