/*
 * The portal type: Young Serif for big headings, Hanken Grotesk for everything else (all
 * numbers included), Caveat for handwritten tutor notes. next/font serves them from our own
 * domain with size-adjusted fallbacks, so text does not shift when the fonts arrive.
 */
import { Caveat, Hanken_Grotesk, Young_Serif } from "next/font/google";

export const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hanken",
  display: "swap",
});

export const youngSerif = Young_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-young-serif",
  display: "swap",
});

export const caveat = Caveat({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-caveat",
  display: "swap",
  preload: false,
});

/** Class names that register the three font variables on an element. */
export const portalFontVars = `${hanken.variable} ${youngSerif.variable} ${caveat.variable}`;
