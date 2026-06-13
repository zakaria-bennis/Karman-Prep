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
        // Hex literals (NOT the CSS vars from globals.css) so Tailwind can
        // generate opacity modifiers — `border-bronze/60`, `text-taupe/70`
        // etc. don't work against `var(...)` colors in Tailwind v3. The
        // :root variables remain for plain-CSS consumers; keep both in
        // sync with the "Brand name" table in docs/brand.md.
        //
        // Foundation — warm dark canvas
        night: "#070605", //          page background
        espresso: "#0D0A08", //       alt sections
        charcoal: "#12110D", //       section dividers
        surface: "#171611", //        default card
        "surface-raised": "#222018", // elevated card/modal
        ivory: "#F3ECDD", //          primary text on dark
        taupe: "#B8B0A1", //          secondary text
        bronze: "#3B3426", //         default border
        // Prestige — gold (used SPARINGLY per brand brief)
        gold: "#C8AB6A", //           CTAs, mastery, brand moments
        "gold-bright": "#E4C86A", //  focus rings, twinkle
        // Constellation accents — subject signals (not full-page themes)
        rw: "#D84F73", //             R&W signal
        "rw-glow": "#F06A8C", //      R&W ambient/hover
        math: "#2FA8FF", //           Math signal
        "math-glow": "#42D9FF", //    Math ambient/hover

        // ── Semantic status palette (docs/brand.md "Status colors") ───
        // Warm-compatible so status reads on the espresso canvas without
        // the cool-green / cool-amber clash. error→rose and info→blue are
        // the same hues as the constellation signals, named semantically
        // so dashboard code reads intent (text-error) not signal (text-rw).
        success: "#8BA86A", //        moss — pass, mastered, paid, on-track
        "success-bright": "#A6C486", // emphasis / icons on dark
        warning: "#E0A24A", //        amber — pending, due soon, caution
        "warning-bright": "#F0BE72",
        error: "#D84F73", //          rose — fail, reject, overdue, error
        "error-bright": "#F06A8C",
        info: "#2FA8FF", //           blue — neutral info, hints
        "info-bright": "#42D9FF",

        // ── SAT domain colors — warm subject signals ──────────────────
        // The five SAT domains collapse to two subject signals (Math blue,
        // R&W rose) per docs/brand.md. The four math sub-domains keep
        // distinguishable blue shades so domain-breakdown charts stay
        // legible; reading carries the rose signal.
        algebra: "#2FA8FF", //        Math — Algebra
        "adv-math": "#42D9FF", //     Math — Advanced
        geometry: "#7FC4FF", //       Math — Geometry / Trig
        "data-analy": "#2B7FC4", //   Math — Data / Stats
        "read-write": "#D84F73", //   Reading & Writing
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
