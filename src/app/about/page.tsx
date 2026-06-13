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
  { icon: TrendingUp, value: "+285", label: "Average score improvement", color: "text-info" },
  { icon: Users, value: "2,400+", label: "Students tutored", color: "text-gold" },
  { icon: Award, value: "94%", label: "Reach their target score", color: "text-success" },
  { icon: Clock, value: "16 wks", label: "Median time to goal", color: "text-warning" },
];

const FOUNDERS = [
  {
    name: "Zakaria Bennis",
    role: "Co-Founder — Curriculum & Platform",
    initials: "ZB",
    gradient: "from-info to-gold",
    credential: "99th percentile SAT · 1,200+ students tutored",
    bio: "Zakaria built Karman's diagnostic engine and curriculum framework after years of 1-on-1 coaching that consistently produced 200–300+ point improvements. He leads platform development and backend systems.",
    focus: "Curriculum design, platform architecture, data & analytics",
  },
  {
    name: "Nabil Kafil Asrar",
    role: "Co-Founder — Marketing & Student Experience",
    initials: "NK",
    gradient: "from-success to-info",
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
    color: "text-info",
    bg: "bg-info/10 dark:bg-info/20",
  },
  {
    icon: Users,
    title: "Live tutoring included",
    desc: "Khan Academy is free. Independent tutors charge $120/hr. We offer live, expert tutoring with a proven curriculum — starting at $40/month.",
    color: "text-gold",
    bg: "bg-gold/10 dark:bg-gold/20",
  },
  {
    icon: HeartHandshake,
    title: "Parents stay in the loop",
    desc: "Weekly progress reports, score trajectory updates, and direct tutor messaging — so parents always know exactly what their child is working on and how they're improving.",
    color: "text-success",
    bg: "bg-success/10 dark:bg-success/20",
  },
  {
    icon: Shield,
    title: "50-point guarantee",
    desc: "We back every subscription with a 50-point score improvement guarantee. If you follow the program and don't hit the mark, you get a full refund.",
    color: "text-warning",
    bg: "bg-warning/10 dark:bg-warning/20",
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface dark:bg-night">
        {/* Hero */}
        <section className="bg-gradient-to-b from-info/80 to-white px-4 pb-16 pt-20 text-center dark:from-surface dark:to-night">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-info/60 bg-info/10 px-4 py-1.5 text-sm font-semibold text-info dark:border-info/40 dark:bg-info/30 dark:text-info-bright">
              <Zap className="h-3.5 w-3.5" />
              Built by tutors, for students
            </div>
            <h1 className="mb-5 text-4xl font-extrabold tracking-tight text-ivory dark:text-ivory sm:text-5xl">
              We built the SAT platform{" "}
              <span className="text-info dark:text-info">we wished we&apos;d had.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-taupe dark:text-ivory">
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
                <div className="mb-1 text-3xl font-extrabold text-ivory dark:text-ivory">
                  {value}
                </div>
                <div className="text-sm text-taupe dark:text-taupe">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Story */}
        <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <h2 className="mb-5 text-2xl font-bold text-ivory dark:text-ivory sm:text-3xl">
            The story
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-taupe dark:text-ivory">
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
        <section className="bg-surface px-4 py-16 dark:bg-surface/50">
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-bold text-ivory dark:text-ivory sm:text-3xl">
                Meet the founders
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-taupe dark:text-taupe">
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
                    className={`h-24 w-24 rounded-full bg-gradient-to-br ${founder.gradient} flex shrink-0 items-center justify-center text-2xl font-extrabold text-ivory shadow-lg`}
                  >
                    {founder.initials}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-ivory dark:text-ivory">{founder.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-info dark:text-info">
                      {founder.role}
                    </p>
                    <p className="mt-1 text-xs text-taupe">{founder.credential}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-taupe dark:text-ivory">
                    {founder.bio}
                  </p>
                  <div className="w-full rounded-xl bg-surface px-4 py-3 text-left dark:bg-surface-raised">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-taupe">
                      Focus area
                    </p>
                    <p className="text-sm text-taupe dark:text-ivory">{founder.focus}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What makes us different */}
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold text-ivory dark:text-ivory sm:text-3xl">
              What makes Karman different
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-taupe dark:text-taupe">
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
                  <h3 className="mb-1 font-bold text-ivory dark:text-ivory">{title}</h3>
                  <p className="text-sm leading-relaxed text-taupe dark:text-taupe">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mission statement */}
        <section className="bg-gradient-to-r from-info to-gold px-4 py-16 text-center">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-info-bright">
              Our mission
            </p>
            <p className="text-2xl font-bold leading-snug text-ivory sm:text-3xl">
              &ldquo;The only SAT platform that combines personalized diagnostics, animated concept
              lessons, and live tutoring — at a price parents actually accept.&rdquo;
            </p>
            <div className="mt-10">
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 rounded-xl bg-surface px-8 py-4 font-semibold text-info transition-colors hover:bg-info/10"
              >
                Start Your Free Trial
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="mt-3 text-sm text-info-bright">7-day free trial · Cancel anytime</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
