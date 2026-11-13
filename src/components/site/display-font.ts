// Fraunces italic: the livelier serif used for plan names on Pricing and for the promise number on the SAT
// Program page. Each page that wants it adds `fraunces.variable` to its SitePage, so no other page loads it.
import { Fraunces } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"],
  style: "italic",
  weight: "600",
  variable: "--font-fraunces",
  display: "swap",
});
