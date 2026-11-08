import data from "./themes.json";

/** One account theme: the values from src/lib/themes/palettes.ts plus its accent. */
export interface Theme {
  id: string;
  name: string;
  family: "Dark" | "Light" | "Soft color" | "Rose & plum";
  dark: boolean;
  canvas: string;
  surface: string;
  raised: string;
  text: string;
  muted: string;
  border: string;
  gold: string;
  math: string;
  reading: string;
  accent: string;
  accentInk: string;
  accentName: string;
}

export interface StatusSet {
  positive: string;
  positiveBg: string;
  positiveInk: string;
  negative: string;
  negativeBg: string;
  negativeInk: string;
  notice: string;
  noticeBg: string;
  noticeInk: string;
}

export const THEMES = data.themes as Theme[];
export const THEME_IDS = THEMES.map((t) => t.id);
export type ThemeId = (typeof THEMES)[number]["id"];
export const LIGHT_FALLBACK = data.lightFallback;
export const DARK_FALLBACK = data.darkFallback;
export const COIN = data.coin;

export function themeById(id: string | null | undefined): Theme | undefined {
  return THEMES.find((t) => t.id === id);
}

export function statusFor(dark: boolean): StatusSet {
  return (dark ? data.status.dark : data.status.light) as StatusSet;
}

/** "#rrggbb" to [r, g, b]. */
export function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** "r g b" channels for a CSS var in the app's shape. */
export function channels(hex: string): string {
  return hexToRgb(hex).join(" ");
}

/** rgba() string from a hex and an alpha. */
export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
