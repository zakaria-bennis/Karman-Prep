import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import StudyPreview from "@/components/landing/StudyPreview";

export const metadata: Metadata = {
  title: "SAT Questions & Skills | Karman Prep",
  description:
    "Explore all four Reading & Writing and four Math domains, then choose a skill to practice.",
};
export default function QuestionsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-night text-ivory">
        <section className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-20">
          <p className="text-sm font-medium text-gold">SAT questions &amp; skills</p>
          <h1 className="mt-4 font-plex-serif text-5xl leading-tight tracking-tight sm:text-6xl">
            Follow your curiosity.
            <br />
            Find your focus.
          </h1>
          <p className="mb-9 mt-5 max-w-2xl text-lg leading-relaxed text-taupe">
            Eight domains. Pick one, explore its skills, and start with the question in front of
            you.
          </p>
          <StudyPreview />
          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-taupe">
            Practice opens in your student workspace. Sign in at that step; each skill shows the
            reviewed questions currently available to you.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
