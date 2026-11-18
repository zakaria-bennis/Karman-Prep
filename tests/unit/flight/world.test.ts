import { describe, expect, it } from "vitest";
import {
  COLS,
  LANDS,
  STRETCH,
  STRIP_ROWS,
  landAt,
  landIndex,
  strip,
  sunAt,
} from "@/lib/flight/world";

describe("the portals' endless world", () => {
  it("has at least twenty lands, each with its own name", () => {
    expect(LANDS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(LANDS.map((l) => l.name)).size).toBe(LANDS.length);
  });

  it("never shows the same land twice running, and shows every land in each round", () => {
    for (let i = 0; i < LANDS.length * 40; i++) expect(landIndex(i + 1)).not.toBe(landIndex(i));
    for (let round = 0; round < 5; round++) {
      const seen = new Set<number>();
      for (let k = 0; k < LANDS.length; k++) seen.add(landIndex(round * LANDS.length + k));
      expect(seen.size).toBe(LANDS.length);
    }
  });

  it("is the same world every time", () => {
    expect(landAt(1234.5)).toEqual(landAt(1234.5));
    expect(Array.from(strip(900))).toEqual(Array.from(strip(900)));
  });

  it("slides from one land into the next with no jump", () => {
    for (let d = 0; d < STRETCH * 30; d += 0.05) {
      const a = landAt(d);
      const b = landAt(d + 0.05);
      for (let k = 0; k < a.length; k++) expect(Math.abs(a[k] - b[k])).toBeLessThan(0.12);
    }
  });

  it("fills the whole table with numbers the shader can read", () => {
    const data = strip(0);
    expect(data.length).toBe(COLS * STRIP_ROWS * 4);
    for (const l of LANDS)
      for (const v of landAt(0, LANDS.indexOf(l))) expect(v).toBeGreaterThanOrEqual(0);
    for (const l of LANDS)
      for (const v of landAt(0, LANDS.indexOf(l))) expect(v).toBeLessThanOrEqual(1);
  });

  it("opens light mode at dawn and dark mode late in the sunset, then settles", () => {
    expect(sunAt(false, 0)[0]).toBeLessThan(5);
    expect(sunAt(false, 1)[0]).toBeGreaterThan(20);
    expect(sunAt(true, 0)[0]).toBeGreaterThan(0);
    expect(sunAt(true, 1)[0]).toBeLessThan(-20);
  });
});
