// ============================================================
// Landing page — the conversion-optimized homepage.
// All sections are composed here in order.
// ============================================================

import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import DiagnosticTeaser from "@/components/landing/DiagnosticTeaser";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import EmailCapture from "@/components/landing/EmailCapture";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Karman — Digital SAT Practice and Tutoring",
  description:
    "Digital SAT practice and tutoring support. Explore the diagnostic, create an account, and see a suggested plan based on your starting point.",
};

export default function HomePage() {
  // Landing is always rendered in dark mode — this is a designed,
  // branded experience that ignores the visitor's theme preference.
  // All `dark:` variants inside landing sections activate via this
  // wrapper (Tailwind darkMode: 'class' matches any ancestor .dark).
  return (
    <div className="dark">
      <main className="min-h-screen bg-night">
        <Navbar />
        <Hero />
        <DiagnosticTeaser />
        <HowItWorks />
        <Pricing />
        <EmailCapture />
        <Footer />
      </main>
    </div>
  );
}
