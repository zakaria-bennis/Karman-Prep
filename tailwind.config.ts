import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // controlled by next-themes via class on <html>
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // ── Observatory palette (docs/brand.md) ───────────────────────
        // RGB channel tokens preserve opacity utilities across all account themes.
        // Foundation — warm dark canvas
        night: "rgb(var(--k-night) / <alpha-value>)", //          page background
        espresso: "rgb(var(--k-espresso) / <alpha-value>)", //       alt sections
        charcoal: "rgb(var(--k-charcoal) / <alpha-value>)", //       section dividers
        surface: "rgb(var(--k-surface) / <alpha-value>)", //        default card
        "surface-raised": "rgb(var(--k-surface-raised) / <alpha-value>)", // elevated card/modal
        ivory: "rgb(var(--k-ivory) / <alpha-value>)", //          primary text on dark
        taupe: "rgb(var(--k-taupe) / <alpha-value>)", //          secondary text
        bronze: "rgb(var(--k-bronze) / <alpha-value>)", //         default border
        // Prestige — gold (used SPARINGLY per brand brief)
        gold: "rgb(var(--k-gold) / <alpha-value>)", //           CTAs, mastery, brand moments
        "gold-bright": "rgb(var(--k-gold-bright) / <alpha-value>)", //  focus rings, twinkle
        // Constellation accents — subject signals (not full-page themes)
        rw: "rgb(var(--k-rw) / <alpha-value>)", //             R&W signal
        "rw-glow": "rgb(var(--k-rw-glow) / <alpha-value>)", //      R&W ambient/hover
        math: "rgb(var(--k-math) / <alpha-value>)", //           Math signal
        "math-glow": "rgb(var(--k-math-glow) / <alpha-value>)", //    Math ambient/hover

        // ── Semantic status palette (docs/brand.md "Status colors") ───
        // Warm-compatible so status reads on the espresso canvas without
        // the cool-green / cool-amber clash. error→rose and info→blue are
        // the same hues as the constellation signals, named semantically
        // so dashboard code reads intent (text-error) not signal (text-rw).
        success: "rgb(var(--k-success) / <alpha-value>)", //        moss — pass, mastered, paid, on-track
        "success-bright": "rgb(var(--k-success-bright) / <alpha-value>)", // emphasis / icons on dark
        warning: "rgb(var(--k-warning) / <alpha-value>)", //        amber — pending, due soon, caution
        "warning-bright": "rgb(var(--k-warning-bright) / <alpha-value>)",
        error: "rgb(var(--k-error) / <alpha-value>)", //          rose — fail, reject, overdue, error
        "error-bright": "rgb(var(--k-error-bright) / <alpha-value>)",
        info: "rgb(var(--k-info) / <alpha-value>)", //           blue — neutral info, hints
        "info-bright": "rgb(var(--k-info-bright) / <alpha-value>)",

        // ── SAT domain colors — warm subject signals ──────────────────
        // The five SAT domains collapse to two subject signals (Math blue,
        // R&W rose) per docs/brand.md. The four math sub-domains keep
        // distinguishable blue shades so domain-breakdown charts stay
        // legible; reading carries the rose signal.
        algebra: "rgb(var(--k-algebra) / <alpha-value>)", //        Math — Algebra
        "adv-math": "rgb(var(--k-adv-math) / <alpha-value>)", //     Math — Advanced
        geometry: "rgb(var(--k-geometry) / <alpha-value>)", //       Math — Geometry / Trig
        "data-analy": "rgb(var(--k-data-analy) / <alpha-value>)", //   Math — Data / Stats
        "read-write": "rgb(var(--k-read-write) / <alpha-value>)", //   Reading & Writing
      },
      fontFamily: {
        // ── Observatory type stack (docs/brand.md) ────────────────────
        // Wired in src/app/layout.tsx via next/font/google; references
        // the CSS variables exposed on <body>.
        "plex-serif": ["var(--font-plex-serif)", "Georgia", "Times New Roman", "serif"],
        "plex-sans": ["var(--font-plex-sans)", "Inter", "system-ui", "sans-serif"],
        "plex-mono": ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        atkinson: [
          "var(--font-atkinson)",
          "Verdana",
          "Geneva",
          "Tahoma",
          "system-ui",
          "sans-serif",
        ],
        // ── Legacy Geist (still used until consumers migrate) ─────────
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },

      // ── Motion tokens (docs/brand.md "Motion") ──────────────────────
      // Contemplative defaults: short for hover/focus, long-tailed for
      // settles. Old kinetic animations remain below until consumers
      // migrate.
      transitionDuration: {
        instant: "100ms", //          focus/hover responses
        fast: "200ms", //             button press, small state toggles
        normal: "400ms", //           panel transitions, modal in/out
        slow: "800ms", //             page-level transitions
        contemplative: "1600ms", //   settle reveals, long fades
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.22, 1, 0.36, 1)",
        contemplative: "cubic-bezier(0.16, 1, 0.3, 1)",
      },

      animation: {
        "fade-up": "fadeUp 0.6s ease-out both", // legacy — prefer "settle"
        "fade-in": "fadeIn 0.4s ease-out both",
        // ── Observatory primitives ──────────────────────────────────
        settle: "settle 1.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        twinkle: "twinkle 4s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        // Settle — gentler than fadeUp (8px rise vs 24px), longer ease.
        settle: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Twinkle — opacity oscillation for constellation accents.
        // Reduced-motion block in globals.css disables animations
        // globally; no per-keyframe handling needed.
        twinkle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.85" },
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 4px 12px -2px rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
