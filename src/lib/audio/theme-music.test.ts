import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LOOP_SECONDS,
  MUSIC_EVENT,
  MUSIC_KEY,
  readThemeMusicPref,
  setThemeMusicPref,
  themeScore,
} from "./theme-music";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("theme music preference", () => {
  it("is off when nothing is stored", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    expect(readThemeMusicPref()).toBe(false);
  });

  it("is off when storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(readThemeMusicPref()).toBe(false);
  });

  it("stores on and off and broadcasts the change", () => {
    const storage = fakeStorage();
    const target = new EventTarget();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("window", target);
    const seen: string[] = [];
    target.addEventListener(MUSIC_EVENT, (e) => seen.push((e as CustomEvent<string>).detail));

    setThemeMusicPref(true);
    expect(storage.getItem(MUSIC_KEY)).toBe("on");
    expect(readThemeMusicPref()).toBe(true);

    setThemeMusicPref(false);
    expect(storage.getItem(MUSIC_KEY)).toBe("off");
    expect(readThemeMusicPref()).toBe(false);
    expect(seen).toEqual(["on", "off"]);
  });
});

describe("theme score", () => {
  it("is deterministic", () => {
    expect(themeScore()).toEqual(themeScore());
  });

  it("fits one loop, in order, and loops on the first chord", () => {
    const score = themeScore();
    expect(LOOP_SECONDS).toBeGreaterThan(20);
    expect(LOOP_SECONDS).toBeLessThan(40);
    for (let i = 1; i < score.length; i++)
      expect(score[i].at).toBeGreaterThanOrEqual(score[i - 1].at);
    for (const n of score) {
      expect(n.at).toBeGreaterThanOrEqual(0);
      expect(n.at).toBeLessThan(LOOP_SECONDS);
      expect(n.dur).toBeGreaterThan(0);
      // Nothing rings on for more than one extra chord past the loop seam.
      expect(n.at + n.dur).toBeLessThan(LOOP_SECONDS + 5);
    }
    // The loop opens with a full chord and bass at time zero, so the seam lands on the tonic.
    const opening = score.filter((n) => n.at === 0);
    expect(opening.filter((n) => n.voice === "pad")).toHaveLength(4);
    expect(opening.filter((n) => n.voice === "bass")).toHaveLength(1);
  });

  it("keeps every note in a pleasant range at a quiet level", () => {
    const score = themeScore();
    for (const n of score) {
      expect(n.freq).toBeGreaterThanOrEqual(50);
      expect(n.freq).toBeLessThanOrEqual(1000);
      expect(n.gain).toBeGreaterThan(0);
      expect(n.gain).toBeLessThanOrEqual(0.5);
    }
    const voices = new Set(score.map((n) => n.voice));
    expect(voices).toEqual(new Set(["pad", "bass", "pluck"]));
    // The melody stays sparse: fewer plucks than beats in the loop.
    const plucks = score.filter((n) => n.voice === "pluck").length;
    expect(plucks).toBeGreaterThan(8);
    expect(plucks).toBeLessThan(32);
  });
});
