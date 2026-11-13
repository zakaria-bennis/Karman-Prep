// Fraunces italic: the livelier serif used for plan names on Pricing and for the promise number on the SAT
// Program page. Each page that wants it adds `fraunces.variable` to its SitePage, so no other page loads it.
import localFont from "next/font/local";

export const fraunces = localFont({
  src: "../../app/fonts/web/fraunces-latin-wght-italic.woff2",
  weight: "100 900",
  style: "italic",
  variable: "--font-fraunces",
  display: "swap",
});
