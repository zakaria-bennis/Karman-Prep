// ============================================================
// Landing page — the conversion-optimized homepage.
// All sections are composed here in order.
// ============================================================

import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import SampleQuiz from "@/components/landing/SampleQuiz";
import HowItWorks from "@/components/landing/HowItWorks";
import SocialProof from "@/components/landing/SocialProof";
import SampleLesson from "@/components/landing/SampleLesson";
import FounderSection from "@/components/landing/FounderSection";
import Pricing from "@/components/landing/Pricing";
import EmailCapture from "@/components/landing/EmailCapture";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Strata — SAT Tutoring That Gets Results",
  description:
    "Personalized SAT prep with expert tutors, adaptive diagnostics, and a 50-point score improvement guarantee. Start free today.",
};

export default function HomePage() {
  // Landing is always rendered in dark mode — this is a designed,
  // branded experience that ignores the visitor's theme preference.
  // All `dark:` variants inside landing sections activate via this
  // wrapper (Tailwind darkMode: 'class' matches any ancestor .dark).
  return (
    <div className="dark">
      <main className="min-h-screen">
        <Navbar />
        <Hero />
        <SampleQuiz />
        <HowItWorks />
        <SocialProof />
        <FounderSection />
        <SampleLesson />
        <Pricing />
        <EmailCapture />
        <Footer />
      </main>
    </div>
  );
}
