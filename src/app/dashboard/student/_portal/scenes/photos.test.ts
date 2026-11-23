import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Sky } from "../scheduleData";
import { PLACES, PLACE_NAMES, pictureFor, plain, type Picture } from "./photos";

const SKIES: Sky[] = ["sunrise", "day", "sunset", "night"];
const all = PLACE_NAMES.flatMap((place) =>
  Object.values(PLACES[place] as Partial<Record<Sky, Picture>>)
);
const onDisk = (src: string) => existsSync(join(process.cwd(), "public", src));

describe("the places behind the next session", () => {
  it("has every place the founder named, each with a day, a sunset and a night", () => {
    expect(PLACE_NAMES).toEqual(
      expect.arrayContaining([
        "lake",
        "mountains",
        "cottage",
        "beach",
        "desert",
        "jungle",
        "bamboo",
        "river",
        "sakura",
        "orchard",
        "garden",
      ])
    );
    for (const place of PLACE_NAMES)
      for (const sky of ["day", "sunset", "night"] as const)
        expect(
          (PLACES[place] as Partial<Record<Sky, Picture>>)[sky],
          `${place} ${sky}`
        ).toBeDefined();
  });

  it("has a painted picture, and the photograph it came from, on disk for each", () => {
    for (const picture of all) {
      expect(onDisk(picture.src), picture.src).toBe(true);
      expect(onDisk(picture.from), picture.from).toBe(true);
      expect(plain(picture).src).toBe(picture.from);
    }
  });

  it("says where each picture's sky, water and swaying band are, inside the picture", () => {
    for (const picture of all) {
      expect(picture.horizon).toBeGreaterThanOrEqual(0);
      expect(picture.horizon).toBeLessThanOrEqual(1);
      if (picture.water !== undefined) expect(picture.water).toBeLessThan(picture.bank ?? 1.01);
      if (picture.sway) expect(picture.sway[0]).toBeLessThan(picture.sway[1]);
    }
  });

  it("gives a session the same place every time, in the light asked for", () => {
    const start = Date.UTC(2026, 10, 17, 22, 30);
    for (const sky of SKIES) {
      const picture = pictureFor(start, sky);
      expect(pictureFor(start, sky)).toBe(picture);
      expect(all).toContain(picture);
    }
  });

  it("spreads sessions over the places", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++)
      seen.add(pictureFor(Date.UTC(2026, 10, 1) + i * 5_400_000, "day").src);
    expect(seen.size).toBeGreaterThan(PLACE_NAMES.length / 2);
  });

  it("shows a place asked for by name, and lets sunrise borrow a sunset", () => {
    expect(pictureFor(0, "night", "beach")).toBe(PLACES.beach.night);
    expect(pictureFor(0, "sunrise", "jungle")).toBe(PLACES.jungle.sunset);
  });
});
