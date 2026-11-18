import { describe, expect, it } from "vitest";
import { fitWithin, isHeic, needsRedraw } from "./photo";

const MB = 1024 * 1024;

describe("which photos are redrawn before upload", () => {
  it("always redraws an iPhone HEIC, however it is labelled", () => {
    expect(needsRedraw({ type: "image/heic", name: "IMG_1.HEIC", size: 100 })).toBe(true);
    expect(needsRedraw({ type: "image/heif", name: "a.heif", size: 100 })).toBe(true);
    // some browsers give a HEIC no type at all
    expect(isHeic({ type: "", name: "IMG_0042.heic" })).toBe(true);
  });

  it("leaves a small JPEG or PNG alone, and shrinks a big one", () => {
    expect(needsRedraw({ type: "image/jpeg", name: "a.jpg", size: 0.5 * MB })).toBe(false);
    expect(needsRedraw({ type: "image/png", name: "a.png", size: 1 * MB })).toBe(false);
    expect(needsRedraw({ type: "image/jpeg", name: "a.jpg", size: 4 * MB })).toBe(true);
  });

  it("never redraws a GIF", () => {
    expect(needsRedraw({ type: "image/gif", name: "a.gif", size: 4 * MB })).toBe(false);
  });
});

describe("fitWithin", () => {
  it("scales a large photo down to 2048 on its long side, keeping its shape", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1536, height: 2048 });
  });
  it("never enlarges a small one", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
