import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Free SAT Diagnostic | Karman Prep",
  description:
    "Explore Karman Prep’s free 35-question SAT diagnostic, covering Math and Reading & Writing.",
};
export default function FreeDiagnosticPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-night text-ivory">
        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.1fr_0.9fr] md:gap-20 md:px-8 md:py-20">
          <div>
            <p className="text-sm font-medium text-gold">The free SAT diagnostic</p>
            <h1 className="mt-4 max-w-2xl font-plex-serif text-5xl leading-[1.08] tracking-tight sm:text-6xl">
              Meet your
              <br />
              starting point.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-taupe">
              Some questions click. Others take another look. Try the diagnostic to see which tested
              skills you want to work on next.
            </p>
            <Link href="/diagnostic" className="btn-primary mt-7 min-h-12">
              Start the free diagnostic <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <p className="mt-3 text-sm text-taupe">
              Sign in when you’re ready to start. Your results stay with your account.
            </p>
          </div>
          <div className="self-center border-y border-bronze py-6">
            <p className="font-plex-sans text-7xl font-semibold tracking-tight">
              35
              <span className="ml-3 text-lg font-normal tracking-normal text-taupe">questions</span>
            </p>
            <dl className="mt-6 divide-y divide-bronze">
              <div className="flex justify-between gap-4 py-4">
                <dt>Reading &amp; Writing</dt>
                <dd className="text-taupe">15 questions</dd>
              </div>
              <div className="flex justify-between gap-4 py-4">
                <dt>Math</dt>
                <dd className="text-taupe">20 questions</dd>
              </div>
              <div className="flex justify-between gap-4 py-4">
                <dt>Cost</dt>
                <dd className="font-semibold">Free</dd>
              </div>
            </dl>
          </div>
        </section>
        <section className="bg-espresso px-5 py-12 md:px-8 md:py-16">
          <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 md:gap-20">
            <div>
              <h2 className="font-plex-serif text-3xl sm:text-4xl">Make the result useful.</h2>
              <p className="mt-5 leading-relaxed text-taupe">
                Look at your correct answers and the domains covered by this set. Then choose a
                skill to practice or bring the result to a tutoring conversation.
              </p>
              <Link
                href="/questions"
                className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4"
              >
                Explore the SAT domains <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div>
              <h2 className="font-plex-serif text-3xl sm:text-4xl">Before you begin</h2>
              <ul className="mt-5 list-disc space-y-3 pl-5 leading-relaxed text-taupe">
                <li>Find a quiet place and keep your scratch paper nearby.</li>
                <li>
                  The Math section includes the Karman graphing calculator in the quiz workspace.
                </li>
                <li>
                  If you’ve already taken the diagnostic, we’ll take you to your saved results.
                </li>
              </ul>
              <p className="mt-5 text-sm leading-relaxed text-taupe">
                This question set samples SAT skills. The breakdown describes this practice attempt,
                rather than predicting an official SAT score.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
