// ============================================================
// Sample lesson section — YouTube embed placeholder + CTA
// ============================================================

import { Play, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SampleLesson() {
  return (
    <section id="sample-lesson" className="py-20 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Watch a sample lesson
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            See how our tutors break down SAT Algebra in under 10 minutes.
          </p>
        </div>

        {/* Video embed placeholder */}
        <Link
          href="/auth/sign-up"
          className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video shadow-2xl group block"
          aria-label="Start free trial to watch sample lesson"
        >
          {/* Thumbnail overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 to-purple-900/60 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-white/30">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
              <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                Start free trial to watch <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Fake video thumbnail content */}
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-center text-white/20 select-none pointer-events-none">
              <div className="text-6xl font-bold">▶</div>
              <p className="mt-2 text-sm">SAT Algebra Masterclass — Lesson 1</p>
            </div>
          </div>

          {/* Lesson info overlay at bottom */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 p-4 z-10">
            <p className="text-white font-semibold text-sm">Linear Equations & Inequalities</p>
            <p className="text-white/60 text-xs mt-0.5">8 min · Algebra · Beginner</p>
          </div>
        </Link>

        {/* Locked content teaser */}
        <div className="mt-8 glass-card p-5">
          <div className="flex items-center gap-3 mb-5">
            <Lock className="w-5 h-5 text-slate-400" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Unlock 150+ more lessons with your free trial
            </p>
          </div>

          {/* Reading & Writing */}
          <p className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2">Reading &amp; Writing</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {[
              "Rhetorical synthesis",
              "Cross-text connections",
              "Command of evidence (quantitative)",
              "Transitional logic",
              "Authorial purpose and tone",
              "Inferences from data-rich passages",
            ].map((lesson) => (
              <div
                key={lesson}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-xs text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/40"
              >
                <Lock className="w-3 h-3 shrink-0 opacity-60" />
                {lesson}
              </div>
            ))}
          </div>

          {/* Math */}
          <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-2">Math</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              "Nonlinear functions & exponential models",
              "Systems of equations (linear & quadratic)",
              "Circle equations in standard form",
              "Trigonometric identities",
              "Statistical inference & margin of error",
              "Complex numbers & polynomial roots",
            ].map((lesson) => (
              <div
                key={lesson}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40"
              >
                <Lock className="w-3 h-3 shrink-0 opacity-60" />
                {lesson}
              </div>
            ))}
          </div>

          <Link href="/auth/sign-up" className="btn-primary w-full mt-5 text-sm py-3">
            Start Free Trial — Unlock Everything
          </Link>
        </div>
      </div>
    </section>
  );
}
