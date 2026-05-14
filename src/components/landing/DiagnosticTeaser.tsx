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
    <section id="sample-quiz" className="bg-cloud-night bg-grain relative overflow-hidden py-24">
      {/* Atmospheric glow — same vocabulary as the rest of the landing. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute -right-40 top-20 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(196,167,255,0.10), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -left-20 h-[420px] w-[420px] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.10), transparent 70%)" }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        {/* Headline */}
        <div className="mb-10 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-400/15 px-4 py-1.5 text-sm font-semibold text-purple-300">
            <ClipboardCheck className="h-4 w-4" />
            Your free diagnostic
          </div>
          <h2 className="type-display-lg text-white">
            Find your SAT <span className="font-[650] italic text-purple-200">baseline</span>.
          </h2>
          <p className="type-body-lg mt-4 text-balance text-slate-400">
            35 questions across all eight Digital SAT domains. Get a difficulty-weighted score
            range, a per-domain breakdown, and the exact topics you need to start with.
          </p>
        </div>

        {/* Stat strip — three small cards reinforcing what they get. */}
        <div className="glass-cloud-strong p-6 sm:p-8">
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              value="~35 min"
              label="One sitting, untimed retakes never offered"
            />
            <StatCard
              icon={<ClipboardCheck className="h-5 w-5" />}
              value="35 questions"
              label="Math + Reading & Writing"
            />
            <StatCard
              icon={<Sparkles className="h-5 w-5" />}
              value="Foundation-aware"
              label="Tells you what to start with — not just what's lowest"
            />
          </div>

          {/* CTA */}
          <Link href="/diagnostic" className="btn-primary w-full justify-center py-4 text-base">
            Begin the diagnostic
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-center text-xs text-slate-400">
            Free · sign-in required so we can save your results
          </p>
        </div>
      </div>
    </section>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-2 flex items-center gap-2 text-purple-300">
        {icon}
        <span className="text-sm font-bold">{value}</span>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">{label}</p>
    </div>
  );
}
