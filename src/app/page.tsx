import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import DiagnosticTeaser from "@/components/landing/DiagnosticTeaser";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Karman Prep — SAT Practice and Tutoring",
  description:
    "Your SAT prep hub: a free diagnostic, focused Math and Reading & Writing practice, and tutoring formats for your week.",
};
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-night">
        <Hero />
        <DiagnosticTeaser />
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
