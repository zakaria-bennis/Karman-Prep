import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function DiagnosticTeaser() {
  return (
    <section
      id="sample-quiz"
      className="scroll-mt-24 bg-night px-5 py-16 text-ivory md:px-8 md:py-20"
    >
      <div className="mx-auto grid max-w-7xl gap-8 border-y border-bronze py-9 md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-16">
        <div>
          <p className="text-sm font-medium text-gold">The free diagnostic</p>
          <h2 className="mt-3 max-w-md font-plex-serif text-4xl leading-tight sm:text-5xl">
            A little clarity.
            <br />A place to begin.
          </h2>
        </div>
        <div>
          <p className="max-w-xl text-lg leading-relaxed text-taupe">
            Try 35 Math and Reading &amp; Writing questions. See which tested skills feel
            comfortable and which deserve your next practice session.
          </p>
          <Link
            href="/free-diagnostic"
            className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold underline underline-offset-4"
          >
            Explore the free diagnostic <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
