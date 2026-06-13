// ============================================================
// Blog page — coming soon placeholder with email capture
// and links to existing free resources
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, TrendingUp, ClipboardList, Mail, ArrowRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import EmailCapture from "@/components/landing/EmailCapture";

export const metadata: Metadata = {
  title: "Blog — SAT Tips & Strategy | Karman",
  description:
    "Free SAT study guides, score improvement strategies, test-taking tips, and expert advice from Karman's tutors. Coming soon.",
};

const UPCOMING_TOPICS = [
  {
    icon: TrendingUp,
    color: "text-info",
    bg: "bg-info/10 dark:bg-info/20",
    title: "Score improvement guides",
    desc: "Step-by-step plans for going from 1100 to 1350, 1200 to 1400, and more — based on what actually worked for our students.",
  },
  {
    icon: BookOpen,
    color: "text-gold",
    bg: "bg-gold/10 dark:bg-gold/20",
    title: "Concept breakdowns",
    desc: "Deep dives into the highest-yield SAT topics — algebra, advanced math, data analysis, and reading & writing.",
  },
  {
    icon: ClipboardList,
    color: "text-success",
    bg: "bg-success/10 dark:bg-success/20",
    title: "Test strategy",
    desc: "Pacing strategies, elimination techniques, and the mental frameworks that separate 1200 from 1400 students.",
  },
];

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface dark:bg-night">
        {/* Hero */}
        <section className="bg-gradient-to-b from-info/80 to-white px-4 pb-16 pt-20 text-center dark:from-surface dark:to-night">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-warning/60 bg-warning/10 px-4 py-1.5 text-sm font-semibold text-warning dark:border-warning/40 dark:bg-warning/30 dark:text-warning-bright">
              <Mail className="h-3.5 w-3.5" />
              Coming soon
            </div>
            <h1 className="mb-5 text-4xl font-extrabold tracking-tight text-ivory dark:text-ivory sm:text-5xl">
              SAT Tips & <span className="text-info dark:text-info">Strategy</span>
            </h1>
            <p className="text-lg leading-relaxed text-taupe dark:text-ivory">
              Free SAT study guides, score improvement breakdowns, test-taking strategies, and
              expert advice — straight from the tutors behind Karman.
            </p>
          </div>
        </section>

        {/* Upcoming content */}
        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <p className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-taupe dark:text-taupe">
            What&apos;s coming
          </p>
          <div className="grid gap-6 sm:grid-cols-3">
            {UPCOMING_TOPICS.map(({ icon: Icon, color, bg, title, desc }) => (
              <div
                key={title}
                className="glass-card flex flex-col items-center gap-4 p-6 text-center"
              >
                <div className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center`}>
                  <Icon className={`h-7 w-7 ${color}`} />
                </div>
                <h3 className="font-bold text-ivory dark:text-ivory">{title}</h3>
                <p className="text-sm leading-relaxed text-taupe dark:text-taupe">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Free resources in the meantime */}
        <section className="bg-surface px-4 py-14 dark:bg-surface/50">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-3 text-2xl font-bold text-ivory dark:text-ivory">
              Free resources available now
            </h2>
            <p className="mb-8 text-sm text-taupe dark:text-taupe">
              While the blog is being built, these are the best free ways to start improving your
              score today.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/#sample-quiz" className="btn-primary inline-flex px-6 py-3 text-sm">
                Take the Free Diagnostic Quiz
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/faq" className="btn-secondary inline-flex px-6 py-3 text-sm">
                Read the FAQ
              </Link>
            </div>
          </div>
        </section>

        {/* Email capture */}
        <EmailCapture />
      </main>
      <Footer />
    </>
  );
}
