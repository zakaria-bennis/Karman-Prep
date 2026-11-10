// The home page's own faces. Young Serif for headlines, the same face as the portal's greeting, and Caveat
// for the handwritten promise note. Everything else, numbers included, stays in Hanken Grotesk (SitePage.tsx).
import { Caveat, Young_Serif } from "next/font/google";

export const youngSerif = Young_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-young-serif",
  display: "swap",
});

export const caveat = Caveat({
  subsets: ["latin"],
  weight: "600",
  variable: "--font-caveat",
  display: "swap",
  preload: false,
});

/** Class names that register the home page's font variables. */
export const homeFonts = `${youngSerif.variable} ${caveat.variable}`;
