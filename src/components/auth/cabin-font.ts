// The cabin page's greeting: Fraunces italic, a soft, warm serif that sits beside Young Serif.
import localFont from "next/font/local";

export const cabinFont = localFont({
  src: "../../app/fonts/web/fraunces-latin-wght-italic.woff2",
  weight: "100 900",
  style: "italic",
  variable: "--font-fraunces",
  display: "swap",
});
