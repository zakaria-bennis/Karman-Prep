// The faces of the home page and of every page in its world (SitePage's "lit" frame). Young Serif for headlines, the same face as the portal's greeting, and Caveat
// for the handwritten promise note. Everything else, numbers included, stays in Hanken Grotesk (SitePage.tsx).
import localFont from "next/font/local";

export const youngSerif = localFont({
  src: "../../../app/fonts/web/young-serif-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-young-serif",
  display: "swap",
});

export const caveat = localFont({
  src: "../../../app/fonts/web/caveat-latin-wght-normal.woff2",
  weight: "400 700",
  variable: "--font-caveat",
  display: "swap",
  preload: false,
});

/** Class names that register these font variables. */
export const litFonts = `${youngSerif.variable} ${caveat.variable}`;
