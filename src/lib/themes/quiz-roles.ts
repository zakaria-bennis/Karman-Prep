import type { SiteTheme } from "./palettes";

function channels(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
function toHex(rgb: number[]): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}
/** Mixes `amount` of `color` into `base` (0 gives base, 1 gives color). */
export function mix(color: string, base: string, amount: number): string {
  const a = channels(color);
  const b = channels(base);
  return toHex(a.map((v, i) => b[i] + (v - b[i]) * amount));
}
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) =>
    channels(hex)
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Colour roles for the quiz screen (spec: Look and themes). Values are hex. */
export function quizRoles(theme: SiteTheme): Record<string, string> {
  const success = theme.dark ? "#afcf94" : "#356343";
  const red = theme.dark ? "#f0907f" : "#a5372c";
  const highlightAmount = theme.dark ? 0.3 : 0.32;
  return {
    "quiz-bg": theme.canvas,
    "quiz-panel": theme.surface,
    "quiz-text": theme.text,
    "quiz-text-muted": theme.muted,
    "quiz-line": theme.border,
    "quiz-accent": theme.gold,
    "quiz-correct": success,
    "quiz-correct-soft": mix(success, theme.surface, 0.16),
    "quiz-wrong": theme.reading,
    "quiz-highlight-1": mix(theme.gold, theme.surface, highlightAmount),
    "quiz-highlight-2": mix(theme.math, theme.surface, highlightAmount),
    "quiz-highlight-3": mix(theme.reading, theme.surface, highlightAmount),
    "quiz-pen-1": theme.text,
    "quiz-pen-2": theme.gold,
    "quiz-pen-3": red,
    "quiz-pen-4": theme.math,
    "quiz-pen-5": success,
  };
}
