import { describe, expect, it } from "vitest";
import { guessPlace, skyAt, sunTimes } from "./sun";

const chicago = { lat: 41.9, lon: -87.6 };
const minutes = (ms: number) => Math.round(ms / 60_000);
// Central Standard Time is six hours behind UTC
const cst = (y: number, m: number, d: number, h: number, min = 0) => Date.UTC(y, m, d, h + 6, min);

describe("sunrise and sunset", () => {
  it("are within a few minutes of the almanac for Chicago in mid November", () => {
    const { rise, set } = sunTimes(2026, 10, 17, chicago);
    // the almanac: sunrise 6:42 AM, sunset 4:28 PM CST
    expect(Math.abs(minutes(rise - cst(2026, 10, 17, 6, 42)))).toBeLessThanOrEqual(6);
    expect(Math.abs(minutes(set - cst(2026, 10, 17, 16, 28)))).toBeLessThanOrEqual(6);
  });

  it("give a long day in June and a short one in December", () => {
    const june = sunTimes(2026, 5, 21, chicago);
    const december = sunTimes(2026, 11, 21, chicago);
    expect(june.set - june.rise).toBeGreaterThan(15 * 3_600_000);
    expect(december.set - december.rise).toBeLessThan(9.5 * 3_600_000);
  });

  it("do not break in the far north", () => {
    const { rise, set } = sunTimes(2026, 5, 21, { lat: 78, lon: 15 });
    expect(Number.isFinite(rise) && Number.isFinite(set)).toBe(true);
  });
});

describe("the sky at a session's time", () => {
  it("is day at 3 PM, sunset at 4:30 PM and night at 6 PM in a Chicago November", () => {
    expect(skyAt(cst(2026, 10, 17, 15), chicago)).toBe("day");
    expect(skyAt(cst(2026, 10, 17, 16, 30), chicago)).toBe("sunset");
    expect(skyAt(cst(2026, 10, 17, 18), chicago)).toBe("night");
  });

  it("is sunrise around 6:40 AM and night before it", () => {
    expect(skyAt(cst(2026, 10, 17, 6, 30), chicago)).toBe("sunrise");
    expect(skyAt(cst(2026, 10, 17, 5), chicago)).toBe("night");
  });
});

describe("guessing where a student is", () => {
  it("uses the time zone's city when it is known", () => {
    expect(guessPlace("America/Los_Angeles", 480)).toEqual({ lat: 34.1, lon: -118.2 });
  });

  it("falls back on the longitude the clock implies", () => {
    expect(guessPlace("Mars/Olympus", 360)).toEqual({ lat: 38, lon: -90 });
    expect(guessPlace(undefined, -60)).toEqual({ lat: 38, lon: 15 });
  });
});
