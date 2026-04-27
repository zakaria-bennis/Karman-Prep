// ============================================================
// DiagnosticTeaser — landing-page replacement for the old
// 22-question SampleQuiz.
//
// The marketing funnel now points visitors to the real
// 35-question diagnostic instead of solving a tasting-menu
// quiz inline. Anonymous visitors get bounced to sign-in,
// then dropped on /diagnostic via Clerk's redirect_url.
//
// Visually mirrors the landing's cloud-night aesthetic so it
// drops in without a visual seam.
// ============================================================

import Link from "next/link";
import { ArrowRight, ClipboardCheck, Clock, Sparkles } from "lucide-react";

export default function DiagnosticTeaser() {
  return (
    <section
      id="sample-quiz"
      className="relative py-24 bg-cloud-night bg-grain overflow-hidden"
    >
      {/* Atmospheric glow — same vocabulary as the rest of the landing. */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-20 -right-40 w-[520px] h-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(196,167,255,0.10), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-20 w-[420px] h-[420px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.10), transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
        {/* Headline */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-purple-400/15 text-purple-300 px-4 py-1.5 rounded-full text-sm font-semibold mb-5 border border-purple-400/20">
            <ClipboardCheck className="w-4 h-4" />
            Your free diagnostic
          </div>
          <h2 className="type-display-lg text-white">
            Find your SAT <span className="italic text-purple-200 font-[650]">baseline</span>.
          </h2>
          <p className="type-body-lg mt-4 text-slate-400 text-balance">
            35 questions across all eight Digital SAT domains. Get a difficulty-weighted
            score range, a per-domain breakdown, and the exact topics you need to start with.
          </p>
        </div>

        {/* Stat strip — three small cards reinforcing what they get. */}
        <div className="glass-cloud-strong p-6 sm:p-8">
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              value="~35 min"
              label="One sitting, untimed retakes never offered"
            />
            <StatCard
              icon={<ClipboardCheck className="w-5 h-5" />}
              value="35 questions"
              label="Math + Reading & Writing"
            />
            <StatCard
              icon={<Sparkles className="w-5 h-5" />}
              value="Foundation-aware"
              label="Tells you what to start with — not just what's lowest"
            />
          </div>

          {/* CTA */}
          <Link
            href="/diagnostic"
            className="btn-primary w-full text-base py-4 justify-center"
          >
            Begin the diagnostic
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-3 text-xs text-slate-400 text-center">
            Free · sign-in required so we can save your results
          </p>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-purple-300 mb-2">
        {icon}
        <span className="text-sm font-bold">{value}</span>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{label}</p>
    </div>
  );
}
