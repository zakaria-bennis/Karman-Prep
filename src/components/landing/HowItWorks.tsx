// ============================================================
// How It Works section — 3-step visual explanation
// ============================================================

import { ClipboardList, BookOpen, TrendingUp } from "lucide-react";

const STEPS = [
  {
    step: "01",
    icon: ClipboardList,
    title: "Take the Diagnostic",
    description:
      "Our adaptive 20-question assessment identifies your exact weaknesses across all SAT math domains. Takes 35 minutes.",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    step: "02",
    icon: BookOpen,
    title: "Follow Your Learning Path",
    description:
      "Get a personalized sequence of lessons, videos, and practice problems targeting your specific gaps. Concepts unlock as you master them.",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    step: "03",
    icon: TrendingUp,
    title: "Track Your Rise",
    description:
      "See your predicted score improve in real time. Weekly check-ins with your tutor keep momentum high all the way to test day.",
    color: "text-teal-500",
    bg: "bg-teal-50 dark:bg-teal-900/20",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            How Strata works
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            A proven three-step system that takes you from your current score to your target score.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map(({ step, icon: Icon, title, description, color, bg }, idx) => (
            <div key={title} className="relative flex flex-col items-center text-center gap-4">
              {/* Connector line (between steps on desktop) */}
              {idx < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(50%+3rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-slate-200 to-slate-200 dark:from-slate-800 dark:to-slate-800" />
              )}

              {/* Icon circle */}
              <div className={`w-16 h-16 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-7 h-7 ${color}`} />
              </div>

              {/* Step label */}
              <span className="text-xs font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                Step {step}
              </span>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
