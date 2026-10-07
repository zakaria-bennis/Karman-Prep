// ============================================================
// DiagnosticTeaser — points visitors to the real 35-question
// diagnostic. Anonymous visitors get bounced to sign-in, then
// dropped on /diagnostic via Clerk's redirect_url.
//
// Observatory treatment: espresso section on the night canvas,
// surface card, taupe prose. Gold appears once — on the CTA.
// ============================================================

import Link from "next/link";
import { ArrowRight, ClipboardCheck, Clock, Sparkles } from "lucide-react";

export default function DiagnosticTeaser() {
  return (
    <section id="sample-quiz" className="bg-grain relative overflow-hidden bg-espresso py-24">
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
        {/* Headline */}
        <div className="mb-10 text-center">
          <span className="type-label text-taupe">Signed-in diagnostic</span>
          <h2 className="type-display-lg mt-4 text-ivory">
            See where to <span className="italic text-gold-bright">begin</span>.
          </h2>
          <p className="type-body-lg mt-4 text-balance text-taupe">
            Answer 35 Math and Reading &amp; Writing questions. Your results show how you did on the
            skills covered here, not a predicted official SAT score.
          </p>
        </div>

        {/* Stat strip — three small cards reinforcing what they get. */}
        <div className="card-surface p-6 sm:p-8">
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              value="~35 min"
              label="Allow time to finish in one sitting"
            />
            <StatCard
              icon={<ClipboardCheck className="h-5 w-5" />}
              value="35 questions"
              label="Math + Reading & Writing"
            />
            <StatCard
              icon={<Sparkles className="h-5 w-5" />}
              value="Skill breakdown"
              label="Review your results across the covered skills"
            />
          </div>

          {/* CTA */}
          <Link href="/diagnostic" className="btn-primary w-full justify-center py-4 text-base">
            Open the diagnostic
            <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="mt-3 text-center text-xs text-taupe/80">
            Free · sign-in required so we can save your results
          </p>
        </div>
      </div>
    </section>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-bronze/70 bg-charcoal p-4">
      <div className="mb-2 flex items-center gap-2 text-ivory">
        <span className="text-gold">{icon}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
      <p className="text-xs leading-relaxed text-taupe">{label}</p>
    </div>
  );
}
