import type { Config } from "tailwindcss";
import { fileURLToPath } from "node:url";

// Absolute globs: the config is passed inline to the PostCSS plugin and
// Tailwind 3 resolves relative content paths from process.cwd(), not from
// this file (tailwindcss/lib/lib/content.js resolveRelativePaths).
const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// Every colour is a token in the app's shape: rgb(var(--k-name) / <alpha-value>).
// The --k-* channels are written per theme in src/design-system/tokens.css.
const k = (name: string) => `rgb(var(--k-${name}) / <alpha-value>)`;
const colorNames = [
  "canvas",
  "surface",
  "raised",
  "panel",
  "line",
  "text",
  "muted",
  "border",
  "gold",
  "math",
  "reading",
  "accent",
  "accent-ink",
  "positive",
  "positive-bg",
  "positive-ink",
  "negative",
  "negative-bg",
  "negative-ink",
  "notice",
  "notice-bg",
  "notice-ink",
];

const config: Config = {
  darkMode: "class",
  content: [at("./index.html"), at("./src/**/*.{ts,tsx}")],
  theme: {
    extend: {
      colors: Object.fromEntries(colorNames.map((n) => [n, k(n)])),
      fontFamily: {
        sans: ["var(--k-font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--k-font-serif)", "Georgia", "serif"],
      },
      // The app type scale (docs/design-rules.md 49 to 58 and the portals brief):
      // title 24, section 16, body 15, dense 14 (table cells and labels), small 12,
      // KPI 24 and 36 (the one answer figure only). Nothing under 11px.
      fontSize: {
        title: ["24px", { lineHeight: "28px", letterSpacing: "-0.01em", fontWeight: "600" }],
        section: ["16px", { lineHeight: "22px", fontWeight: "600" }],
        body: ["15px", { lineHeight: "22px" }],
        dense: ["14px", { lineHeight: "20px" }],
        small: ["12px", { lineHeight: "16px" }],
        kpi: ["24px", { lineHeight: "28px", fontWeight: "500" }],
        "kpi-lg": ["36px", { lineHeight: "40px", letterSpacing: "-0.015em", fontWeight: "500" }],
      },
      borderRadius: {
        chip: "var(--k-radius-chip)",
        control: "var(--k-radius-control)",
        card: "var(--k-radius-card)",
        panel: "var(--k-radius-panel)",
        pill: "var(--k-radius-pill)",
      },
      zIndex: {
        bg: "0",
        rail: "10",
        bar: "10",
        sticky: "20",
        scrim: "39",
        sheet: "40",
        toast: "50",
        confetti: "60",
      },
      transitionTimingFunction: { k: "var(--k-ease)" },
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },
    },
  },
  plugins: [],
};
export default config;
