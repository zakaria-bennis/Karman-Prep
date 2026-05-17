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
        // Sourced from CSS variables in globals.css :root so any future
        // theme override (e.g. high-contrast mode) flows through a single
        // place. Tailwind class names are short descriptive nouns that
        // match the "Brand name" column in docs/brand.md.
        //
        // Foundation — warm dark canvas
        night: "var(--bg-night)", //              #070605  page background
        espresso: "var(--bg-espresso)", //        #0D0A08  alt sections
        charcoal: "var(--bg-charcoal)", //        #12110D  section dividers
        surface: "var(--surface)", //             #171611  default card
        "surface-raised": "var(--surface-raised)", // #222018 elevated card/modal
        ivory: "var(--text-primary)", //          #F3ECDD  primary text on dark
        taupe: "var(--text-muted)", //            #B8B0A1  secondary text
        bronze: "var(--border)", //               #3B3426  default border
        // Prestige — gold (used SPARINGLY per brand brief)
        gold: "var(--accent-gold)", //            #C8AB6A  CTAs, mastery, brand moments
        "gold-bright": "var(--accent-gold-bright)", // #E4C86A focus rings, twinkle
        // Constellation accents — subject signals (not full-page themes)
        rw: "var(--subject-rw)", //               #D84F73  R&W signal
        "rw-glow": "var(--subject-rw-glow)", //   #F06A8C  R&W ambient/hover
        math: "var(--subject-math)", //           #2FA8FF  Math signal
        "math-glow": "var(--subject-math-glow)", // #42D9FF Math ambient/hover

        // ── Legacy SAT domain colors (old cloud palette) ──────────────
        // Kept until every consumer migrates to the constellation accents
        // above. Targeted for removal in roadmap chunk 7 (UI redesign).
        algebra: "#3B82F6",
        "adv-math": "#A855F7",
        geometry: "#14B8A6",
        "data-analy": "#F59E0B",
        "read-write": "#FB7185",
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
