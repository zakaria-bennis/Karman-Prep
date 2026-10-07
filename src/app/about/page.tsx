import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "About Karman — Digital SAT Practice and Tutoring",
  description:
    "Learn how Karman connects a signed-in SAT diagnostic, focused practice, and tutoring support.",
};

const PATHS = [
  {
    title: "See a starting point",
    description:
      "The signed-in 35-question diagnostic shows how you did on the Math and Reading & Writing skills it covers. It does not predict an official SAT score.",
    href: "/diagnostic",
    action: "Explore the diagnostic",
  },
  {
    title: "Work on a skill",
    description:
      "Students can open available lessons and practice by skill. The questions and explanations you see depend on reviewed content available in the product.",
    href: "/auth/sign-up",
    action: "Create an account",
  },
  {
    title: "Ask for support",
    description:
      "Questions about the current offer, lesson coverage, or tutoring availability deserve a direct answer before you choose a plan.",
    href: "mailto:support@karmanprep.com",
    action: "Email Karman support",
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-night text-ivory">
        <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 pt-24 md:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.7fr)] md:gap-20 md:px-8 md:pt-32">
          <div>
            <h1 className="max-w-3xl font-plex-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl">
              SAT practice with a clearer reason for every next step.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-taupe">
              Karman brings a limited-scope diagnostic, skill practice, and tutoring support into
              one place. We want students to understand what a result shows, what to practice, and
              where to ask for help.
            </p>
          </div>
          <aside className="self-end border-l-2 border-gold pl-6 text-base leading-relaxed text-taupe">
            The diagnostic is a starting point. It covers a sample of SAT skills; it cannot stand in
            for an official SAT score.
          </aside>
        </section>

        <section className="bg-espresso py-20" aria-labelledby="about-paths-heading">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <h2 id="about-paths-heading" className="font-plex-serif text-3xl sm:text-4xl">
              What you can do here
            </h2>
            <div className="mt-10 border-t border-bronze">
              {PATHS.map((path, index) => (
                <article
                  key={path.title}
                  className="grid gap-5 border-b border-bronze py-8 md:grid-cols-[3rem_minmax(12rem,0.7fr)_minmax(0,1.3fr)] md:gap-8"
                >
                  <span className="font-plex-mono text-sm text-gold" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <h3 className="font-plex-serif text-2xl">{path.title}</h3>
                  <div>
                    <p className="max-w-xl leading-relaxed text-taupe">{path.description}</p>
                    <Link
                      href={path.href}
                      className="mt-5 inline-flex items-center gap-2 font-semibold text-gold-bright underline-offset-4 hover:underline focus-visible:underline"
                    >
                      {path.action}
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
