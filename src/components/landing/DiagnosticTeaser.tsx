import Link from "next/link";
import { ArrowUpRight, SearchCheck } from "lucide-react";

export default function DiagnosticTeaser() {
  return (
    <section id="sample-quiz" className="scroll-mt-24 bg-night py-16 text-ivory sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1fr_0.8fr] md:items-center md:gap-20 md:px-8">
        <div>
          <SearchCheck className="mb-6 h-9 w-9 text-gold" aria-hidden="true" />
          <h2 className="max-w-xl font-plex-sans text-3xl font-medium leading-tight tracking-tight sm:text-5xl">
            A starting point, not a score prediction.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-taupe">
            Take the 35-question Math and Reading &amp; Writing diagnostic. See how you did on the
            skills it covers, then choose where to begin.
          </p>
          <Link href="/diagnostic" className="btn-primary mt-7 min-h-12">
            Open the diagnostic <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          <p className="mt-3 text-sm text-taupe">Free to take. Sign in to save your results.</p>
        </div>
        <div className="rounded-[1.75rem] bg-surface p-6 ring-1 ring-bronze/30 sm:p-9">
          <p className="text-sm font-medium text-gold">Make the result useful</p>
          <h3 className="mt-4 font-plex-serif text-3xl leading-tight">
            Notice what clicks. Give the rest some attention.
          </h3>
          <p className="mt-5 leading-relaxed text-taupe">
            Your breakdown shows the domains covered by this question set. Use it to start a
            conversation with your tutor or explore a skill in the guide.
          </p>
          <p className="mt-6 border-t border-bronze/30 pt-5 text-sm leading-relaxed text-taupe">
            This is a practice snapshot. It does not predict an official SAT score or assess every
            skill on the test.
          </p>
        </div>
      </div>
    </section>
  );
}
