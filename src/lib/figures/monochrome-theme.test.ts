import { describe, expect, it } from "vitest";
import { MONOCHROME_FIGURE_PALETTE, themeMonochromePixels } from "./monochrome-theme";

describe("reviewed monochrome figure asset theming", () => {
  it("uses quiz tokens and retains every pixel location and ink-intensity ordering", () => {
    const source = Uint8Array.from([255, 255, 255, 255, 128, 128, 128, 255, 0, 0, 0, 255]);
    const before = source.slice();
    const themed = themeMonochromePixels(source);
    expect(source).toEqual(before);
    expect(themed).toHaveLength(source.length);
    expect([...themed.slice(0, 3)]).toEqual([...MONOCHROME_FIGURE_PALETTE.background]);
    expect([...themed.slice(8, 11)]).toEqual([...MONOCHROME_FIGURE_PALETTE.ink]);
    expect(themed[0]).toBeLessThan(themed[4]);
    expect(themed[4]).toBeLessThan(themed[8]);
    expect(themed[3]).toBe(255);
  });
  it("rejects even subtle color distinctions instead of erasing their meaning", () => {
    expect(() => themeMonochromePixels(Uint8Array.from([120, 121, 120, 255]))).toThrow(/Colored/);
  });
  it("rejects incomplete or transparent pixels", () => {
    expect(() => themeMonochromePixels(Uint8Array.from([0, 0, 0]))).toThrow(/RGBA/);
    expect(() => themeMonochromePixels(Uint8Array.from([0, 0, 0, 128]))).toThrow(/Transparent/);
  });
});
