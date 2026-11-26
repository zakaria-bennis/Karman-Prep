import { describe, expect, it } from "vitest";
import { isLate, sunsetAt } from "./sunset";

const at = (iso: string) => new Date(iso);
const clock = (date: Date, zone: string) =>
  date.toLocaleTimeString("en-US", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

describe("sunset by time zone", () => {
  it("puts a late-November sunset in Chicago near 4:20 pm", () => {
    const sunset = sunsetAt(at("2026-11-25T18:00:00Z"), "America/Chicago");
    expect(clock(sunset as Date, "America/Chicago") >= "16:05").toBe(true);
    expect(clock(sunset as Date, "America/Chicago") <= "16:40").toBe(true);
  });

  it("puts a late-June sunset in Los Angeles near 8:08 pm", () => {
    const sunset = sunsetAt(at("2027-06-21T20:00:00Z"), "America/Los_Angeles");
    expect(clock(sunset as Date, "America/Los_Angeles") >= "19:50").toBe(true);
    expect(clock(sunset as Date, "America/Los_Angeles") <= "20:25").toBe(true);
  });

  it("calls it late from two hours after sunset until 4 am", () => {
    // Chicago in late November: sunset about 4:20 pm, so late begins about 6:20 pm
    expect(isLate(at("2026-11-25T23:30:00Z"), "America/Chicago")).toBe(false); // 5:30 pm
    expect(isLate(at("2026-11-26T01:00:00Z"), "America/Chicago")).toBe(true); // 7:00 pm
    expect(isLate(at("2026-11-26T08:30:00Z"), "America/Chicago")).toBe(true); // 2:30 am
    expect(isLate(at("2026-11-26T15:00:00Z"), "America/Chicago")).toBe(false); // 9:00 am
    // Los Angeles in late June: sunset about 8:08 pm, so 9 pm is not yet late
    expect(isLate(at("2027-06-22T04:00:00Z"), "America/Los_Angeles")).toBe(false); // 9:00 pm
    expect(isLate(at("2027-06-22T05:30:00Z"), "America/Los_Angeles")).toBe(true); // 10:30 pm
  });
});
