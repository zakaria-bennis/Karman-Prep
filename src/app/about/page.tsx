// ============================================================
// About page — company story, founders, mission, differentiators
// ============================================================

import type { Metadata } from "next";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  Award,
  Clock,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  HeartHandshake,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "About Karman — SAT Tutoring Built by Tutors",
  description:
    "Karman was founded by two 99th-percentile tutors who saw firsthand that the best SAT prep was out of reach for most families. We built the platform we wished we'd had.",
};

const STATS = [
  { icon: TrendingUp, value: "+285", label: "Average score improvement", color: "text-blue-500" },
  { icon: Users, value: "2,400+", label: "Students tutored", color: "text-purple-500" },
  { icon: Award, value: "94%", label: "Reach their target score", color: "text-teal-500" },
  { icon: Clock, value: "16 wks", label: "Median time to goal", color: "text-amber-500" },
];

const FOUNDERS = [
  {
    name: "Zakaria Bennis",
    role: "Co-Founder — Curriculum & Platform",
    initials: "ZB",
    gradient: "from-blue-500 to-purple-600",
    credential: "99th percentile SAT · 1,200+ students tutored",
    bio: "Zakaria built Karman's diagnostic engine and curriculum framework after years of 1-on-1 coaching that consistently produced 200–300+ point improvements. He leads platform development and backend systems.",
    focus: "Curriculum design, platform architecture, data & analytics",
  },
  {
    name: "Nabil Kafil Asrar",
    role: "Co-Founder — Marketing & Student Experience",
    initials: "NK",
    gradient: "from-teal-500 to-blue-600",
    credential: "99th percentile SAT · 1,200+ students tutored",
    bio: "Nabil specializes in turning math anxiety into real confidence through patient, adaptive instruction. He leads marketing strategy, content production, and the student-facing experience at Karman.",
    focus: "Student experience, content & social media, brand voice",
  },
];

const DIFFERENTIATORS = [
  {
    icon: BarChart3,
    title: "Diagnostic-first, always",
    desc: "Every student starts with a 44-question adaptive assessment that pinpoints their exact weak spots — not a generic study plan. No other platform at our price point does this.",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    icon: Users,
    title: "Live tutoring included",
    desc: "Khan Academy is free. Independent tutors charge $120/hr. We offer live, expert tutoring with a proven curriculum — starting at $40/month.",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    icon: HeartHandshake,
    title: "Parents stay in the loop",
    desc: "Weekly progress reports, score trajectory updates, and direct tutor messaging — so parents always know exactly what their child is working on and how they're improving.",
    color: "text-teal-500",
    bg: "bg-teal-50 dark:bg-teal-900/20",
  },
  {
    icon: Shield,
    title: "50-point guarantee",
    desc: "We back every subscription with a 50-point score improvement guarantee. If you follow the program and don't hit the mark, you get a full refund.",
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white dark:bg-slate-950">
        {/* Hero */}
        <section className="bg-gradient-to-b from-blue-50/80 to-white px-4 pb-16 pt-20 text-center dark:from-slate-900 dark:to-slate-950">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/30 dark:text-blue-300">
              <Zap className="h-3.5 w-3.5" />
              Built by tutors, for students
            </div>
            <h1 className="mb-5 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              We built the SAT platform{" "}
              <span className="text-blue-600 dark:text-blue-400">we wished we&apos;d had.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              The best SAT prep has always existed — but it cost $1,500 or more and was out of reach
              for most families. We saw that firsthand in hundreds of tutoring sessions. So we built
              something better.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map(({ icon: Icon, value, label, color }) => (
              <div key={label} className="glass-card p-6 text-center">
                <Icon className={`mx-auto mb-3 h-7 w-7 ${color}`} />
                <div className="mb-1 text-3xl font-extrabold text-slate-900 dark:text-white">
                  {value}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Story */}
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <h2 className="mb-5 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            The story
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              Zakaria and Nabil have each tutored over 1,200 students privately. After years of
              watching the same pattern repeat — students improving dramatically with the right
              1-on-1 instruction but unable to access it consistently — they decided to build a
              platform that could scale what works.
            </p>
            <p>
              The problem with existing prep companies isn&apos;t that they don&apos;t know how to
              teach the SAT. It&apos;s that their model isn&apos;t built around the individual
              student. Kaplan and Princeton Review use generic curricula. Khan Academy is free but
              offers zero accountability. Independent tutors are excellent but inconsistent — and at
              $120/hr, most families can&apos;t sustain it.
            </p>
            <p>
              Karman is built on a different premise: diagnose first, personalize always, and hold
              both the student and the tutor accountable to real outcomes. The 50-point guarantee
              isn&apos;t a marketing stunt — it&apos;s the standard we hold ourselves to.
            </p>
          </div>
        </section>

        {/* Founders */}
        <section className="bg-slate-50 px-4 py-16 dark:bg-slate-900/50">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                Meet the founders
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">
                Two equal partners, complementary strengths. Every major decision at Karman requires
                both founders to agree.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {FOUNDERS.map((founder) => (
                <div
                  key={founder.name}
                  className="glass-card flex flex-col items-center gap-5 p-8 text-center"
                >
                  <div
                    className={`h-24 w-24 rounded-full bg-gradient-to-br ${founder.gradient} flex shrink-0 items-center justify-center text-2xl font-extrabold text-white shadow-lg`}
                  >
                    {founder.initials}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {founder.name}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-blue-500 dark:text-blue-400">
                      {founder.role}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{founder.credential}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {founder.bio}
                  </p>
                  <div className="w-full rounded-xl bg-slate-50 px-4 py-3 text-left dark:bg-slate-800">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Focus area
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{founder.focus}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What makes us different */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              What makes Karman different
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">
              We compete against every category of prep — and we win on every dimension that
              matters.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {DIFFERENTIATORS.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="glass-card flex gap-4 p-6">
                <div
                  className={`h-12 w-12 rounded-xl ${bg} flex shrink-0 items-center justify-center`}
                >
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <div>
                  <h3 className="mb-1 font-bold text-slate-900 dark:text-white">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mission statement */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-16 text-center">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-100">
              Our mission
            </p>
            <p className="text-2xl font-bold leading-snug text-white sm:text-3xl">
              &ldquo;The only SAT platform that combines personalized diagnostics, animated concept
              lessons, and live tutoring — at a price parents actually accept.&rdquo;
            </p>
            <div className="mt-10">
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-blue-700 transition-colors hover:bg-blue-50"
              >
                Start Your Free Trial
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-3 text-sm text-blue-200">7-day free trial · Cancel anytime</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
