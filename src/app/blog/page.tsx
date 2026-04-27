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
  title: "Blog — SAT Tips & Strategy | Karman Prep",
  description:
    "Free SAT study guides, score improvement strategies, test-taking tips, and expert advice from Karman Prep's tutors. Coming soon.",
};

const UPCOMING_TOPICS = [
  {
    icon: TrendingUp,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    title: "Score improvement guides",
    desc: "Step-by-step plans for going from 1100 to 1350, 1200 to 1400, and more — based on what actually worked for our students.",
  },
  {
    icon: BookOpen,
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    title: "Concept breakdowns",
    desc: "Deep dives into the highest-yield SAT topics — algebra, advanced math, data analysis, and reading & writing.",
  },
  {
    icon: ClipboardList,
    color: "text-teal-500",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    title: "Test strategy",
    desc: "Pacing strategies, elimination techniques, and the mental frameworks that separate 1200 from 1400 students.",
  },
];

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white dark:bg-slate-950">

        {/* Hero */}
        <section className="bg-gradient-to-b from-blue-50/80 to-white dark:from-slate-900 dark:to-slate-950 pt-20 pb-16 text-center px-4">
          <div className="max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-8 border border-amber-200/60 dark:border-amber-700/40">
              <Mail className="w-3.5 h-3.5" />
              Coming soon
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-5">
              SAT Tips &{" "}
              <span className="text-blue-600 dark:text-blue-400">Strategy</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Free SAT study guides, score improvement breakdowns, test-taking strategies, and expert advice — straight from the tutors behind Karman Prep.
            </p>
          </div>
        </section>

        {/* Upcoming content */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
          <p className="text-center text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-widest mb-8">
            What&apos;s coming
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {UPCOMING_TOPICS.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title} className="glass-card p-6 flex flex-col items-center text-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-7 h-7 ${color}`} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Free resources in the meantime */}
        <section className="bg-slate-50 dark:bg-slate-900/50 py-14 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Free resources available now
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
              While the blog is being built, these are the best free ways to start improving your score today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/#sample-quiz" className="btn-primary text-sm px-6 py-3 inline-flex">
                Take the Free Diagnostic Quiz
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/faq" className="btn-secondary text-sm px-6 py-3 inline-flex">
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
