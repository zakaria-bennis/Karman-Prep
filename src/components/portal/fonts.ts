/*
 * The portal type: Young Serif for big headings, Hanken Grotesk for everything else (all
 * numbers included), Caveat for handwritten tutor notes, Fredoka for buying hours and celebrations. They are kept in the project (src/app/fonts/web) and served from our own
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

/** A round, friendly face for the moments that should feel like a treat: buying hours and the
 *  celebrations on the Schedule tab (founder, 2026-11-17: "select a nicer font" for a "fun, engaging,
 *  point-of-payment page"). */
export const fredoka = localFont({
  src: "../../app/fonts/web/fredoka-latin-wght-normal.woff2",
  weight: "300 700",
  variable: "--font-fredoka",
  display: "swap",
  preload: false,
});

/** Class names that register the portal's font variables on an element. */
export const portalFontVars = `${hanken.variable} ${youngSerif.variable} ${caveat.variable} ${fredoka.variable}`;
