import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function DiagnosticTeaser() {
  return (
    <section id="sample-quiz" className="bg-espresso py-20 text-ivory sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)] md:items-start md:gap-20 md:px-8">
        <div>
          <h2 className="max-w-xl font-plex-serif text-4xl leading-tight sm:text-5xl">
            A starting point, not a score prediction.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-taupe">
            The signed-in diagnostic asks 35 Math and Reading &amp; Writing questions. It shows how
            you did on the skills covered by those questions, so you can review where to begin.
          </p>
          <Link
            href="/diagnostic"
            className="btn-primary mt-8 inline-flex min-h-12 gap-3 px-6 py-3 text-base"
          >
            Open the diagnostic
            <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          <p className="mt-3 text-sm text-taupe">Free to take · Sign-in required to save results</p>
        </div>
        <div className="border-t-2 border-gold pt-5">
          <h3 className="font-plex-serif text-2xl">What the result can tell you</h3>
          <p className="mt-3 leading-relaxed text-taupe">
            How you answered this set of questions, with a breakdown of the covered domains.
          </p>
          <div className="mt-8 border-t border-bronze pt-5">
            <h3 className="font-plex-serif text-2xl">What it cannot tell you</h3>
            <p className="mt-3 leading-relaxed text-taupe">
              A validated official SAT score or a complete picture of every skill on the test.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
