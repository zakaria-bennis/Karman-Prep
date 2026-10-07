// ============================================================
// Landing page — the conversion-optimized homepage.
// All sections are composed here in order.
// ============================================================

import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import DiagnosticTeaser from "@/components/landing/DiagnosticTeaser";
import HowItWorks from "@/components/landing/HowItWorks";
import ProductPreview from "@/components/landing/ProductPreview";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Karman — Digital SAT Practice and Tutoring",
  description:
    "Digital SAT practice and tutoring support. Explore the diagnostic, create an account, and see a suggested plan based on your starting point.",
};

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-night">
        <Hero />
        <DiagnosticTeaser />
        <HowItWorks />
        <ProductPreview />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
