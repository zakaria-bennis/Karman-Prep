import { describe, expect, it } from "vitest";
import { findTheme, SITE_THEMES, themeTokens } from "./palettes";
export function contrast(a: string, b: string): number {
  const luminance = (hex: string) =>
    [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
describe("twelve selectable account themes", () => {
  it("has twelve distinct named palettes in four equal groups", () => {
    expect(new Set(SITE_THEMES.map((t) => t.id)).size).toBe(12);
    for (const family of new Set(SITE_THEMES.map((t) => t.family)))
      expect(SITE_THEMES.filter((t) => t.family === family)).toHaveLength(3);
  });
  for (const theme of SITE_THEMES)
    it(`${theme.name} preserves primary, muted, action and status text contrast`, () => {
      const tokens = themeTokens(theme);
      for (const surface of [theme.canvas, theme.surface, theme.raised])
        for (const color of [
          theme.text,
          theme.muted,
          theme.math,
          theme.reading,
          tokens.success,
          tokens.warning,
        ])
          expect(contrast(color, surface), `${color} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      for (const action of [theme.gold, theme.math, theme.reading])
        expect(contrast(action, theme.canvas)).toBeGreaterThanOrEqual(4.5);
    });
  it("allows only known IDs and migrates old dark/light choices", () => {
    expect(findTheme("dark")?.id).toBe("observatory");
    expect(findTheme("light")?.id).toBe("ivory");
    expect(findTheme("userSuppliedCSS")).toBeUndefined();
  });
});
