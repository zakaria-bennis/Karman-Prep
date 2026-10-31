// The marketing site's own root (2026-10-31): the home page, the SAT Program, private tutoring, the free
// practice test, pricing, the guarantee, About, FAQ, research and the legal pages. It carries nothing the
// student app needs (Clerk, cookies, the account themes, Tailwind, the app fonts), so every page here is built
// once and served as a static file. Each page draws its own frame with SitePage. The sheets every page shares
// load here; the rest come with the page or the component that uses them.
import type { Metadata } from "next";
import { Anton, Hanken_Grotesk } from "next/font/google";
import "./styles/film.css";
import "./styles/phone.css";
import "./styles/kit.css";
import "./styles/photos.css";
import "./styles/alive.css";
import "./styles/site.css";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hanken",
  display: "swap",
});

/** The Impact-style headline face, on trial: only pages opened with ?type=impact use it (film.css). */
const impact = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-impact",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  // Resolves the canonical address and the share image to the production domain.
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://karmanprep.com"),
  robots: { index: true, follow: true },
};

/** Nothing under this layout reads cookies or headers: every page is built once and cached at the edge. */
export const dynamic = "force-static";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${hanken.variable} ${impact.variable}`}>
      <body>{children}</body>
    </html>
  );
}
