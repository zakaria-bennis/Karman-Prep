// The public graphing calculator at /calculator: the quiz calculator full window below a slim bar,
// blank on every visit, with no sign-in. The calculator itself loads lazily in PublicCalculator.

import type { Metadata, Viewport } from "next";
import { KarmanLogo } from "@/components/shared/KarmanLogo";
import { PublicCalculator } from "./PublicCalculator";
import { CALCULATOR_PAGE_DESCRIPTION, CALCULATOR_PAGE_TITLE } from "./copy";
import styles from "./calculator-page.module.css";

export const metadata: Metadata = {
  title: { absolute: CALCULATOR_PAGE_TITLE },
  description: CALCULATOR_PAGE_DESCRIPTION,
  alternates: { canonical: "/calculator" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/calculator",
    siteName: "Karman Prep",
    title: CALCULATOR_PAGE_TITLE,
    description: CALCULATOR_PAGE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: CALCULATOR_PAGE_TITLE,
    description: CALCULATOR_PAGE_DESCRIPTION,
  },
};

// The page is dark around the calculator (the site's night bar), and the calculator declares its
// own skin's colour scheme inside. Saying so stops a phone that darkens undeclared light pages by
// itself (owner report, 2026-10-22: a black calculator on his phone) from recolouring the Classic
// calculator; the student's theme picker decides its colours.
export const viewport: Viewport = { colorScheme: "dark" };

export default function CalculatorPage() {
  return (
    <div className={styles.page}>
      <header className={`${styles.bar} border-b border-bronze/35 bg-night text-ivory`}>
        {/* Plain links: leaving loads the next page in full, so the calculator is torn down with
            the document rather than unmounted in the middle of a client-side route change. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full load on purpose */}
        <a href="/" aria-label="Karman Prep home" className={styles.home}>
          <KarmanLogo size={26} />
        </a>
        <h1 className={`${styles.title} text-taupe`}>Graphing calculator</h1>
        <a href="/questions" className={`${styles.practice} text-taupe hover:text-ivory`}>
          SAT practice
        </a>
      </header>
      <main className={styles.main}>
        <PublicCalculator />
      </main>
    </div>
  );
}
