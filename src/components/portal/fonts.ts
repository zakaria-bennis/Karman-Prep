/*
 * The portal type: Young Serif for big headings, Hanken Grotesk for everything else (all
 * numbers included), Caveat for handwritten tutor notes. They are kept in the project (src/app/fonts/web) and served from our own
 * domain with size-adjusted fallbacks, so text does not shift when the fonts arrive.
 */
import localFont from "next/font/local";

export const hanken = localFont({
  src: "../../app/fonts/web/hanken-grotesk-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-hanken",
  display: "swap",
});

export const youngSerif = localFont({
  src: "../../app/fonts/web/young-serif-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-young-serif",
  display: "swap",
});

export const caveat = localFont({
  src: "../../app/fonts/web/caveat-latin-wght-normal.woff2",
  weight: "400 700",
  variable: "--font-caveat",
  display: "swap",
  preload: false,
});

/** Class names that register the three font variables on an element. */
export const portalFontVars = `${hanken.variable} ${youngSerif.variable} ${caveat.variable}`;
